#!/usr/bin/env python3
"""
Pre-Tool Use Hook
=================
Runs BEFORE each tool call. Can block dangerous operations.

Exit codes:
- 0: Allow tool execution
- 2: Block tool execution and show error message

Input (stdin): JSON with tool_name and tool_input
Output (stderr): Error message if blocking
"""

import json
import sys
import re
from pathlib import Path


def is_dangerous_rm_command(command: str) -> bool:
    """
    Detect dangerous rm commands that could delete important files.
    """
    normalized = " ".join(command.lower().split())

    # Pattern: rm -rf, rm -fr, rm --recursive --force, etc.
    dangerous_patterns = [
        r"\brm\s+.*-[a-z]*r[a-z]*f",
        r"\brm\s+.*-[a-z]*f[a-z]*r",
        r"\brm\s+--recursive\s+--force",
        r"\brm\s+--force\s+--recursive",
    ]

    for pattern in dangerous_patterns:
        if re.search(pattern, normalized):
            return True

    # Check for dangerous paths with recursive flag
    if re.search(r"\brm\s+.*-[a-z]*r", normalized):
        dangerous_paths = [r"/", r"/\*", r"~", r"~/", r"\$HOME", r"\.\.", r"\*"]
        for path in dangerous_paths:
            if re.search(path, normalized):
                return True

    return False


def is_sensitive_file_access(tool_name: str, tool_input: dict) -> tuple[bool, str]:
    """
    Check if tool is accessing sensitive files.
    Returns (is_blocked, reason).
    """
    sensitive_patterns = [
        (
            r"\.env(?!\.example)",
            "Access to .env files is blocked. Use .env.example instead.",
        ),
        (r"credentials\.json", "Access to credentials files is blocked."),
        (r"secrets?\.(json|yaml|yml)", "Access to secrets files is blocked."),
        (r"\.ssh/", "Access to SSH directory is blocked."),
        (r"id_rsa", "Access to SSH keys is blocked."),
    ]

    file_path = ""
    if tool_name in ["Read", "Edit", "Write"]:
        file_path = tool_input.get("file_path", "") or tool_input.get("filePath", "")
    elif tool_name == "Bash":
        file_path = tool_input.get("command", "")

    for pattern, reason in sensitive_patterns:
        if re.search(pattern, file_path, re.IGNORECASE):
            return True, reason

    return False, ""


def log_tool_use(input_data: dict) -> None:
    """Log tool usage to a file for auditing."""
    log_dir = Path.cwd() / "logs"
    log_dir.mkdir(parents=True, exist_ok=True)
    log_path = log_dir / "pre_tool_use.json"

    try:
        if log_path.exists():
            with open(log_path, "r") as f:
                log_data = json.load(f)
        else:
            log_data = []

        log_data.append(input_data)

        # Keep only last 1000 entries
        if len(log_data) > 1000:
            log_data = log_data[-1000:]

        with open(log_path, "w") as f:
            json.dump(log_data, f, indent=2)
    except Exception:
        pass  # Don't fail on logging errors


def main():
    try:
        input_data = json.load(sys.stdin)
        tool_name = input_data.get("tool_name", "")
        tool_input = input_data.get("tool_input", {})

        # Log the tool use
        log_tool_use(input_data)

        # Check for dangerous rm commands
        if tool_name == "Bash":
            command = tool_input.get("command", "")
            if is_dangerous_rm_command(command):
                print("BLOCKED: Dangerous rm command detected.", file=sys.stderr)
                print(f"Command: {command}", file=sys.stderr)
                print("Use safer alternatives or be more specific.", file=sys.stderr)
                sys.exit(2)

        # Check for sensitive file access
        is_blocked, reason = is_sensitive_file_access(tool_name, tool_input)
        if is_blocked:
            print(f"BLOCKED: {reason}", file=sys.stderr)
            sys.exit(2)

        # Allow the tool execution
        sys.exit(0)

    except json.JSONDecodeError:
        sys.exit(0)
    except Exception as e:
        # Log error but don't block
        print(f"Hook error (non-blocking): {e}", file=sys.stderr)
        sys.exit(0)


if __name__ == "__main__":
    main()
