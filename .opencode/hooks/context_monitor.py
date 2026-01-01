#!/usr/bin/env python3
"""
Context monitor hook for OpenCode.
Monitors context size and triggers compaction warnings before hitting limits.

Runs on Notification events to track cumulative context usage.
"""

import json
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, Any

# Approximate token limits (conservative estimates)
MAX_CONTEXT_TOKENS = 180000  # ~200k with buffer
WARNING_THRESHOLD = 0.70  # Warn at 70%
CRITICAL_THRESHOLD = 0.85  # Critical at 85%

# Approximate chars per token
CHARS_PER_TOKEN = 4


def get_backup_dir() -> Path:
    """Get or create backup directory."""
    project_dir = os.environ.get("PROJECT_DIR", os.getcwd())
    backup_dir = Path(project_dir) / ".opencode" / "backup"
    backup_dir.mkdir(parents=True, exist_ok=True)
    return backup_dir


def get_state_file() -> Path:
    """Get context state tracking file."""
    project_dir = os.environ.get("PROJECT_DIR", os.getcwd())
    return Path(project_dir) / ".opencode" / "logs" / "context_state.json"


def estimate_tokens(text: str) -> int:
    """Estimate token count from text."""
    return len(text) // CHARS_PER_TOKEN


def load_state() -> Dict[str, Any]:
    """Load current context tracking state."""
    state_file = get_state_file()
    if state_file.exists():
        try:
            with open(state_file, "r") as f:
                return json.load(f)
        except Exception:
            pass
    return {
        "session_id": datetime.now().strftime("%Y%m%d_%H%M%S"),
        "cumulative_tokens": 0,
        "message_count": 0,
        "last_backup": None,
        "warnings_issued": 0,
    }


def save_state(state: Dict[str, Any]):
    """Save context tracking state."""
    state_file = get_state_file()
    state_file.parent.mkdir(parents=True, exist_ok=True)
    with open(state_file, "w") as f:
        json.dump(state, f, indent=2)


def backup_context(state: Dict[str, Any], todos: list, summary: str):
    """Backup current context state for recovery."""
    backup_dir = get_backup_dir()
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_file = backup_dir / f"context_backup_{timestamp}.json"

    backup_data = {
        "timestamp": datetime.now().isoformat(),
        "session_id": state.get("session_id"),
        "cumulative_tokens": state.get("cumulative_tokens"),
        "message_count": state.get("message_count"),
        "pending_todos": todos,
        "continuation_summary": summary,
        "recovery_instructions": (
            "To continue from this point:\n"
            "1. Review pending_todos for incomplete work\n"
            "2. Read continuation_summary for context\n"
            "3. Resume with the next pending task"
        ),
    }

    with open(backup_file, "w") as f:
        json.dump(backup_data, f, indent=2)

    # Keep only last 5 backups
    backups = sorted(backup_dir.glob("context_backup_*.json"))
    for old_backup in backups[:-5]:
        old_backup.unlink()

    return backup_file


def get_pending_todos() -> list:
    """Get pending todos from logs."""
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
    """Main hook logic - runs on each notification."""
    try:
        input_data = json.loads(sys.stdin.read())

        # Extract message content
        message = input_data.get("message", {})
        content = message.get("content", "")
        role = message.get("role", "")

        if not content:
            sys.exit(0)

        # Load and update state
        state = load_state()
        new_tokens = estimate_tokens(str(content))
        state["cumulative_tokens"] += new_tokens
        state["message_count"] += 1

        usage_ratio = state["cumulative_tokens"] / MAX_CONTEXT_TOKENS

        # Check thresholds
        if usage_ratio >= CRITICAL_THRESHOLD:
            # Critical - backup and warn urgently
            todos = get_pending_todos()
            summary = f"Session at {int(usage_ratio * 100)}% context capacity. Last message from {role}."
            backup_file = backup_context(state, todos, summary)
            state["last_backup"] = str(backup_file)
            state["warnings_issued"] += 1

            print(
                json.dumps(
                    {
                        "type": "context_warning",
                        "level": "critical",
                        "message": (
                            f"⚠️ CRITICAL: Context at {int(usage_ratio * 100)}% capacity!\n"
                            f"Backup saved to: {backup_file}\n"
                            f"Pending todos: {len(todos)}\n\n"
                            "RECOMMEND: Compact now or start fresh session.\n"
                            "To continue: /compact or review backup file."
                        ),
                        "usage_percent": int(usage_ratio * 100),
                        "tokens_used": state["cumulative_tokens"],
                        "tokens_max": MAX_CONTEXT_TOKENS,
                    }
                )
            )

        elif usage_ratio >= WARNING_THRESHOLD and state["warnings_issued"] == 0:
            # First warning
            todos = get_pending_todos()
            summary = f"Session at {int(usage_ratio * 100)}% context capacity."
            backup_file = backup_context(state, todos, summary)
            state["last_backup"] = str(backup_file)
            state["warnings_issued"] += 1

            print(
                json.dumps(
                    {
                        "type": "context_warning",
                        "level": "warning",
                        "message": (
                            f"📊 Context at {int(usage_ratio * 100)}% capacity.\n"
                            f"Backup saved to: {backup_file}\n"
                            f"Pending todos: {len(todos)}\n\n"
                            "Consider wrapping up current task soon."
                        ),
                        "usage_percent": int(usage_ratio * 100),
                        "tokens_used": state["cumulative_tokens"],
                    }
                )
            )

        save_state(state)
        sys.exit(0)

    except json.JSONDecodeError:
        sys.exit(0)
    except Exception as e:
        sys.stderr.write(f"Context monitor error: {e}\n")
        sys.exit(0)


if __name__ == "__main__":
    main()
