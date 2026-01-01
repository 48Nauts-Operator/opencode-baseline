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

# Dangerous command patterns
DANGEROUS_RM_PATTERNS = [
    r"\brm\s+.*-[a-z]*r[a-z]*f",
    r"\brm\s+.*-[a-z]*f[a-z]*r",
    r"\brm\s+--recursive\s+--force",
    r"\brm\s+--force\s+--recursive",
]

# Dangerous paths for recursive delete
DANGEROUS_PATHS = [
    r"\/\s*$",  # Root
    r"\/\*",  # Root wildcard
    r"~",  # Home
    r"\$HOME",  # Home env
    r"\.\.",  # Parent traversal
    r"^\*",  # Wildcard start
]

# Sensitive file patterns
SENSITIVE_FILE_PATTERNS = [
    (r"\.env(?!\.example)", "Access to .env files blocked. Use .env.example instead."),
    (r"credentials\.json", "Access to credentials files blocked."),
    (r"secrets?\.(json|yaml|yml)", "Access to secrets files blocked."),
    (r"\.ssh\/", "Access to SSH directory blocked."),
    (r"id_rsa", "Access to SSH keys blocked."),
    (r"\.aws\/credentials", "Access to AWS credentials blocked."),
    (r"\.npmrc", "Access to npm credentials blocked."),
    (r"\.netrc", "Access to netrc credentials blocked."),
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


def is_sensitive_file_access(tool: str, args: dict) -> tuple[bool, str]:
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

            if is_dangerous_rm_command(command):
                print(
                    json.dumps(
                        {
                            "error": f"BLOCKED: Dangerous rm command detected.\nCommand: {command}\nUse safer alternatives or be more specific."
                        }
                    )
                )
                sys.exit(2)

        # Check for sensitive file access
        is_blocked, reason = is_sensitive_file_access(tool_name, tool_input)
        if is_blocked:
            print(json.dumps({"error": f"BLOCKED: {reason}"}))
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
