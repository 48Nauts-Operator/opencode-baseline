#!/usr/bin/env python3
"""
Post-tool-use hook for OpenCode.
Logs tool usage for monitoring and debugging.
"""

import json
import os
import sys
from datetime import datetime
from pathlib import Path


def ensure_log_dir() -> Path:
    """Ensure log directory exists."""
    project_dir = os.environ.get("PROJECT_DIR", os.getcwd())
    log_dir = Path(project_dir) / ".opencode" / "logs"
    log_dir.mkdir(parents=True, exist_ok=True)
    return log_dir


def append_log(log_path: Path, entry: dict, max_entries: int = 500):
    """Append entry to JSON log file with rotation."""
    try:
        log_data = []
        if log_path.exists():
            with open(log_path, "r") as f:
                log_data = json.load(f)

        entry["timestamp"] = datetime.now().isoformat()
        log_data.append(entry)

        # Rotate if too many entries
        if len(log_data) > max_entries:
            log_data = log_data[-max_entries:]

        with open(log_path, "w") as f:
            json.dump(log_data, f, indent=2)

    except Exception:
        pass  # Logging should never break execution


def main():
    """Main hook logic."""
    try:
        # Read input from stdin
        input_data = json.loads(sys.stdin.read())

        tool_name = input_data.get("tool_name", "")
        tool_input = input_data.get("tool_input", {})
        tool_output = input_data.get("tool_output", {})
        tool_error = input_data.get("tool_error", None)

        # Prepare log entry
        log_entry = {
            "tool": tool_name,
            "success": tool_error is None,
        }

        # Add relevant input info (truncated)
        if tool_name.lower() == "bash":
            command = tool_input.get("command", "")
            log_entry["command"] = (
                command[:200] + "..." if len(command) > 200 else command
            )
        elif tool_name.lower() in ["read", "write", "edit"]:
            log_entry["file"] = tool_input.get(
                "filePath", tool_input.get("file_path", "")
            )

        # Add error if present
        if tool_error:
            log_entry["error"] = str(tool_error)[:500]

        # Write to log
        log_dir = ensure_log_dir()
        append_log(log_dir / "tool_usage.json", log_entry)

        # Track file changes
        if tool_name.lower() in ["write", "edit"] and not tool_error:
            file_path = tool_input.get("filePath", tool_input.get("file_path", ""))
            if file_path:
                append_log(
                    log_dir / "file_changes.json",
                    {
                        "action": tool_name.lower(),
                        "file": file_path,
                    },
                    max_entries=200,
                )

    except Exception as e:
        # Log errors but don't fail
        sys.stderr.write(f"Post-hook error: {e}\n")

    # Always exit successfully
    sys.exit(0)


if __name__ == "__main__":
    main()
