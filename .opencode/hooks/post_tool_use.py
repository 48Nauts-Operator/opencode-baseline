#!/usr/bin/env python3
"""
Post-Tool Use Hook
==================
Runs AFTER each tool call completes.

Input (stdin): JSON with tool_name, tool_input, tool_output, success
Output: Optional logging or notifications

Use this to:
- Log tool usage for auditing
- Send notifications on certain events
- Track metrics
- Trigger follow-up actions
"""

import json
import sys
from pathlib import Path
from datetime import datetime


def log_tool_use(input_data: dict) -> None:
    """Log tool usage to a file."""
    log_dir = Path.cwd() / "logs"
    log_dir.mkdir(parents=True, exist_ok=True)
    log_path = log_dir / "post_tool_use.json"

    try:
        if log_path.exists():
            with open(log_path, "r") as f:
                log_data = json.load(f)
        else:
            log_data = []

        # Add timestamp
        entry = {**input_data, "timestamp": datetime.now().isoformat()}

        # Truncate large outputs
        if "tool_output" in entry and len(str(entry.get("tool_output", ""))) > 1000:
            entry["tool_output"] = str(entry["tool_output"])[:1000] + "... [truncated]"

        log_data.append(entry)

        # Keep only last 500 entries
        if len(log_data) > 500:
            log_data = log_data[-500:]

        with open(log_path, "w") as f:
            json.dump(log_data, f, indent=2)
    except Exception:
        pass


def check_for_errors(input_data: dict) -> None:
    """Check for errors that might need attention."""
    tool_name = input_data.get("tool_name", "")
    success = input_data.get("success", True)
    tool_output = str(input_data.get("tool_output", ""))

    # Track consecutive failures (could trigger notification)
    if not success:
        error_count_file = Path.cwd() / "logs" / ".error_count"
        try:
            if error_count_file.exists():
                count = int(error_count_file.read_text())
            else:
                count = 0
            count += 1
            error_count_file.write_text(str(count))

            # After 5 consecutive errors, could send notification
            if count >= 5:
                # Placeholder for notification logic
                pass
        except Exception:
            pass
    else:
        # Reset error count on success
        error_count_file = Path.cwd() / "logs" / ".error_count"
        try:
            if error_count_file.exists():
                error_count_file.unlink()
        except Exception:
            pass


def track_file_changes(input_data: dict) -> None:
    """Track which files were modified."""
    tool_name = input_data.get("tool_name", "")
    tool_input = input_data.get("tool_input", {})

    if tool_name in ["Edit", "Write"]:
        file_path = tool_input.get("file_path", "") or tool_input.get("filePath", "")
        if file_path:
            changes_file = Path.cwd() / "logs" / "file_changes.json"
            try:
                if changes_file.exists():
                    changes = json.loads(changes_file.read_text())
                else:
                    changes = []

                changes.append(
                    {
                        "file": file_path,
                        "tool": tool_name,
                        "timestamp": datetime.now().isoformat(),
                    }
                )

                # Keep last 100 changes
                if len(changes) > 100:
                    changes = changes[-100:]

                changes_file.write_text(json.dumps(changes, indent=2))
            except Exception:
                pass


def main():
    try:
        input_data = json.load(sys.stdin)

        # Log the tool use
        log_tool_use(input_data)

        # Check for errors
        check_for_errors(input_data)

        # Track file changes
        track_file_changes(input_data)

        sys.exit(0)

    except json.JSONDecodeError:
        sys.exit(0)
    except Exception:
        sys.exit(0)


if __name__ == "__main__":
    main()
