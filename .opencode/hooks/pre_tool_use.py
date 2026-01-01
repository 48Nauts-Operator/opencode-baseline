#!/usr/bin/env python3
"""
Pre-tool-use hook for OpenCode.
Validates commands before execution and blocks dangerous operations.

Exit codes:
- 0: Allow tool execution
- 2: Block tool execution (with error message)
"""

import json
import os
import re
import sys
from typing import Tuple, List

# ============================================================================
# Dangerous rm patterns
# ============================================================================

DANGEROUS_RM_PATTERNS = [
    r"\brm\s+.*-[a-z]*r[a-z]*f",
    r"\brm\s+.*-[a-z]*f[a-z]*r",
    r"\brm\s+--recursive\s+--force",
    r"\brm\s+--force\s+--recursive",
]

DANGEROUS_PATHS = [
    r"\/\s*$",  # Root
    r"\/\*",  # Root wildcard
    r"~",  # Home
    r"\$HOME",  # Home env
    r"\.\.",  # Parent traversal
    r"^\*",  # Wildcard start
]

# ============================================================================
# Sensitive file patterns
# ============================================================================

SENSITIVE_FILE_PATTERNS: List[Tuple[str, str]] = [
    (
        r"\.env(?!\.example)",
        "Environment file access blocked. Use .env.example instead.",
    ),
    (r"credentials\.json", "Credentials file access blocked."),
    (r"secrets?\.(json|yaml|yml)", "Secrets file access blocked."),
    (r"\.ssh\/", "SSH directory access blocked."),
    (r"id_rsa", "SSH key access blocked."),
    (r"\.aws\/credentials", "AWS credentials access blocked."),
    (r"\.npmrc", "npm credentials access blocked."),
    (r"\.netrc", "netrc credentials access blocked."),
    (r"\.docker\/config\.json", "Docker config access blocked."),
    (r"\.kube\/config", "Kubernetes config access blocked."),
]

# ============================================================================
# Dangerous command patterns (NEW)
# ============================================================================

DANGEROUS_COMMAND_PATTERNS: List[Tuple[str, str]] = [
    # Privilege escalation
    (r"\bsudo\s+", "sudo commands blocked - request explicit permission"),
    (r"\bsu\s+-", "su commands blocked - request explicit permission"),
    # Dangerous permissions
    (r"\bchmod\s+777\b", "chmod 777 blocked - use more restrictive permissions"),
    (r"\bchmod\s+-R\s+777\b", "Recursive chmod 777 blocked - extremely dangerous"),
    (r"\bchmod\s+a\+rwx\b", "World-writable permissions blocked"),
    # Piping to shell (supply chain attack vector)
    (
        r"\bcurl\s+.*\|\s*(ba)?sh",
        "Piping curl to shell blocked - download and review first",
    ),
    (
        r"\bwget\s+.*\|\s*(ba)?sh",
        "Piping wget to shell blocked - download and review first",
    ),
    (r"\bcurl\s+.*\|\s*sudo", "Piping curl to sudo blocked - extremely dangerous"),
    # Docker dangerous operations
    (
        r"\bdocker\s+system\s+prune\s+-a",
        "docker system prune -a blocked - removes all unused data",
    ),
    (r"\bdocker\s+rm\s+-f\s+\$\(docker\s+ps", "Mass docker container removal blocked"),
    (r"\bdocker\s+rmi\s+-f\s+\$\(docker\s+images", "Mass docker image removal blocked"),
    # Process killing
    (r"\bkill\s+-9\s+1\b", "Killing init process blocked"),
    (r"\bkillall\s+-9", "killall -9 blocked - use gentler signals first"),
    (r"\bpkill\s+-9\s+(systemd|init|launchd)", "Killing system processes blocked"),
    # Disk operations
    (r"\bmkfs\.", "Filesystem creation blocked - extremely destructive"),
    (r"\bdd\s+.*of=\/dev\/", "dd to device blocked - extremely destructive"),
    (r"\bfdisk\s+\/dev\/", "Partition editing blocked"),
    # Network dangerous
    (r"\biptables\s+-F", "Flushing iptables blocked - could lock you out"),
]

# ============================================================================
# Git safety patterns (NEW)
# ============================================================================

GIT_DANGEROUS_PATTERNS: List[Tuple[str, str, str]] = [
    # Force push to protected branches
    (
        r"\bgit\s+push\s+.*--force.*\s+(origin\s+)?(main|master|production|prod)\b",
        "Force push to protected branch blocked",
        "block",
    ),
    (
        r"\bgit\s+push\s+-f\s+.*\s+(origin\s+)?(main|master|production|prod)\b",
        "Force push to protected branch blocked",
        "block",
    ),
    (
        r"\bgit\s+push\s+.*\s+(origin\s+)?(main|master|production|prod)\s+--force",
        "Force push to protected branch blocked",
        "block",
    ),
    # Dangerous resets
    (
        r"\bgit\s+reset\s+--hard\s+(HEAD~|origin\/)",
        "Hard reset may lose commits - proceed with caution",
        "warn",
    ),
    # Clean operations
    (
        r"\bgit\s+clean\s+-[a-z]*f[a-z]*d",
        "git clean -fd removes untracked files permanently",
        "warn",
    ),
    (
        r"\bgit\s+clean\s+-[a-z]*d[a-z]*f",
        "git clean -df removes untracked files permanently",
        "warn",
    ),
    # Dangerous rebases
    (r"\bgit\s+rebase\s+.*--force", "Force rebase may rewrite shared history", "warn"),
]

# ============================================================================
# Secret detection patterns (NEW)
# ============================================================================

SECRET_PATTERNS: List[Tuple[str, str]] = [
    # API Keys
    (r"['\"][A-Za-z0-9_-]{20,}['\"]", "Potential API key detected"),
    (r"api[_-]?key\s*[:=]\s*['\"][^'\"]+['\"]", "API key assignment detected"),
    (r"secret[_-]?key\s*[:=]\s*['\"][^'\"]+['\"]", "Secret key assignment detected"),
    # AWS
    (r"AKIA[0-9A-Z]{16}", "AWS Access Key ID detected"),
    (r"aws[_-]?secret[_-]?access[_-]?key\s*[:=]", "AWS Secret Key pattern detected"),
    # GitHub/GitLab
    (r"ghp_[A-Za-z0-9]{36}", "GitHub Personal Access Token detected"),
    (r"github[_-]?token\s*[:=]\s*['\"][^'\"]+['\"]", "GitHub token detected"),
    (r"glpat-[A-Za-z0-9-]{20}", "GitLab Personal Access Token detected"),
    # Stripe
    (r"sk_live_[A-Za-z0-9]{24}", "Stripe Live Secret Key detected"),
    (r"sk_test_[A-Za-z0-9]{24}", "Stripe Test Secret Key detected"),
    # JWT
    (r"eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+", "JWT token detected"),
    # Private keys
    (r"-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----", "Private key detected"),
    (r"-----BEGIN\s+OPENSSH\s+PRIVATE\s+KEY-----", "SSH private key detected"),
    # Database URLs with passwords
    (r"postgres(ql)?:\/\/[^:]+:[^@]+@", "Database URL with password detected"),
    (r"mysql:\/\/[^:]+:[^@]+@", "MySQL URL with password detected"),
    (r"mongodb(\+srv)?:\/\/[^:]+:[^@]+@", "MongoDB URL with password detected"),
    # npm tokens
    (r"npm_[A-Za-z0-9]{36}", "npm token detected"),
    # Generic patterns
    (r"password\s*[:=]\s*['\"][^'\"]{8,}['\"]", "Hardcoded password detected"),
    (r"bearer\s+[A-Za-z0-9_-]{20,}", "Bearer token detected"),
]


def is_dangerous_rm_command(command: str) -> bool:
    """Check if command is a dangerous rm operation."""
    normalized = command.lower()

    # Check for dangerous rm patterns
    for pattern in DANGEROUS_RM_PATTERNS:
        if re.search(pattern, normalized, re.IGNORECASE):
            return True

    # Check for recursive rm with dangerous paths
    if re.search(r"\brm\s+.*-[a-z]*r", normalized, re.IGNORECASE):
        for path_pattern in DANGEROUS_PATHS:
            if re.search(path_pattern, normalized):
                return True

    return False


def check_dangerous_command(command: str) -> Tuple[bool, str]:
    """Check if command matches any dangerous patterns."""
    for pattern, reason in DANGEROUS_COMMAND_PATTERNS:
        if re.search(pattern, command, re.IGNORECASE):
            return True, reason
    return False, ""


def check_git_command(command: str) -> Tuple[bool, str, str]:
    """Check if git command is dangerous. Returns (is_dangerous, reason, action)."""
    for pattern, reason, action in GIT_DANGEROUS_PATTERNS:
        if re.search(pattern, command, re.IGNORECASE):
            return True, reason, action
    return False, "", "warn"


def is_sensitive_file_access(tool: str, args: dict) -> Tuple[bool, str]:
    """Check if tool is accessing sensitive files."""
    file_path = ""

    if tool.lower() in ["read", "edit", "write"]:
        file_path = str(args.get("filePath", args.get("file_path", "")))
    elif tool.lower() == "bash":
        file_path = str(args.get("command", ""))

    for pattern, reason in SENSITIVE_FILE_PATTERNS:
        if re.search(pattern, file_path, re.IGNORECASE):
            return True, reason

    return False, ""


def detect_secrets(content: str) -> List[str]:
    """Detect potential secrets in content."""
    detected = []
    for pattern, reason in SECRET_PATTERNS:
        if re.search(pattern, content, re.IGNORECASE):
            detected.append(reason)
    return detected


def main():
    """Main hook logic."""
    try:
        # Read input from stdin
        input_data = json.loads(sys.stdin.read())

        tool_name = input_data.get("tool_name", "")
        tool_input = input_data.get("tool_input", {})

        # Check for dangerous bash commands
        if tool_name.lower() == "bash":
            command = tool_input.get("command", "")

            # Check rm commands
            if is_dangerous_rm_command(command):
                print(
                    json.dumps(
                        {
                            "error": f"BLOCKED: Dangerous rm command detected.\nCommand: {command}\nUse safer alternatives or be more specific."
                        }
                    )
                )
                sys.exit(2)

            # Check other dangerous commands
            is_dangerous, reason = check_dangerous_command(command)
            if is_dangerous:
                print(json.dumps({"error": f"BLOCKED: {reason}\nCommand: {command}"}))
                sys.exit(2)

            # Check git commands
            is_git_dangerous, git_reason, git_action = check_git_command(command)
            if is_git_dangerous:
                if git_action == "block":
                    print(
                        json.dumps(
                            {"error": f"BLOCKED: {git_reason}\nCommand: {command}"}
                        )
                    )
                    sys.exit(2)
                else:
                    # Warn but allow - just log to stderr
                    sys.stderr.write(f"WARNING: {git_reason}\n")

        # Check for sensitive file access
        is_blocked, reason = is_sensitive_file_access(tool_name, tool_input)
        if is_blocked:
            print(json.dumps({"error": f"BLOCKED: {reason}"}))
            sys.exit(2)

        # Check for secrets in write operations
        if tool_name.lower() in ["write", "edit"]:
            content = str(tool_input.get("content", tool_input.get("newString", "")))
            secrets = detect_secrets(content)
            if secrets:
                print(
                    json.dumps(
                        {
                            "error": f"BLOCKED: Potential secrets detected in content:\n- {chr(10).join('- ' + s for s in secrets)}\n\nUse environment variables instead."
                        }
                    )
                )
                sys.exit(2)

        # Allow execution
        sys.exit(0)

    except json.JSONDecodeError:
        # If no valid JSON input, allow execution
        sys.exit(0)
    except Exception as e:
        # Log error but don't block
        sys.stderr.write(f"Hook error: {e}\n")
        sys.exit(0)


if __name__ == "__main__":
    main()
