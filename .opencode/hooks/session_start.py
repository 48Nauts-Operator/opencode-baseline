#!/usr/bin/env python3
"""
Session start hook for OpenCode.
Loads project context and provides useful information at session start.
"""

import json
import os
import subprocess
import sys
from pathlib import Path


def get_git_status() -> dict:
    """Get current git status."""
    try:
        result = subprocess.run(
            ["git", "status", "--porcelain", "-b"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        if result.returncode == 0:
            lines = result.stdout.strip().split("\n")
            branch = lines[0] if lines else "unknown"
            changes = len([l for l in lines[1:] if l.strip()])
            return {
                "branch": branch.replace("## ", "").split("...")[0],
                "uncommitted_changes": changes,
            }
    except Exception:
        pass
    return {}


def get_project_context() -> str:
    """Load project context from OPENCODE.md if exists."""
    project_dir = os.environ.get("PROJECT_DIR", os.getcwd())
    context_file = Path(project_dir) / "OPENCODE.md"

    if context_file.exists():
        try:
            content = context_file.read_text()
            # Return first 2000 chars
            if len(content) > 2000:
                return content[:2000] + "\n\n... (truncated)"
            return content
        except Exception:
            pass
    return ""


def get_recent_todos() -> list:
    """Get any pending todos from previous session."""
    project_dir = os.environ.get("PROJECT_DIR", os.getcwd())
    todo_file = Path(project_dir) / ".opencode" / "logs" / "todos.json"

    if todo_file.exists():
        try:
            with open(todo_file, "r") as f:
                todos = json.load(f)
                return [
                    t for t in todos if t.get("status") in ["pending", "in_progress"]
                ]
        except Exception:
            pass
    return []


def main():
    """Main hook logic."""
    try:
        context = {
            "type": "session_context",
            "git": get_git_status(),
            "pending_todos": get_recent_todos(),
        }

        # Add project context if available
        project_context = get_project_context()
        if project_context:
            context["project_context_loaded"] = True

        # Output context as JSON for OpenCode to consume
        print(json.dumps(context, indent=2))

    except Exception as e:
        sys.stderr.write(f"Session start hook error: {e}\n")

    sys.exit(0)


if __name__ == "__main__":
    main()
