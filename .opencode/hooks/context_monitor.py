#!/usr/bin/env python3
"""
Context Monitor Hook for OpenCode.
Monitors context usage and backs up state before issues arise.

Adapted from BETTY's approach - uses Notification hook since OpenCode
may not have PreCompact/UserPromptSubmit hooks like Claude Code.

Strategy:
- Track cumulative message sizes via Notification hook
- At thresholds, backup current state (todos, context summary)
- Provide warnings to AI before context becomes critical
"""

import json
import os
import sys
import shutil
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional

MAX_CONTEXT_TOKENS = 180000
WARNING_THRESHOLD = 0.70
CRITICAL_THRESHOLD = 0.85
CHARS_PER_TOKEN = 4


def get_log_dir() -> Path:
    project_dir = os.environ.get("PROJECT_DIR", os.getcwd())
    log_dir = Path(project_dir) / ".opencode" / "logs"
    log_dir.mkdir(parents=True, exist_ok=True)
    return log_dir


def get_backup_dir() -> Path:
    project_dir = os.environ.get("PROJECT_DIR", os.getcwd())
    backup_dir = Path(project_dir) / ".opencode" / "backup"
    backup_dir.mkdir(parents=True, exist_ok=True)
    return backup_dir


def get_state_file() -> Path:
    return get_log_dir() / "context_state.json"


def estimate_tokens(text: str) -> int:
    return len(text) // CHARS_PER_TOKEN


def load_state() -> Dict[str, Any]:
    state_file = get_state_file()
    if state_file.exists():
        try:
            with open(state_file, "r") as f:
                return json.load(f)
        except Exception:
            pass
    return {
        "session_id": datetime.now().strftime("%Y%m%d_%H%M%S"),
        "session_start": datetime.now().isoformat(),
        "cumulative_tokens": 0,
        "message_count": 0,
        "last_backup": None,
        "warnings_issued": 0,
        "prompts": [],
    }


def save_state(state: Dict[str, Any]):
    state_file = get_state_file()
    state_file.parent.mkdir(parents=True, exist_ok=True)
    state["last_updated"] = datetime.now().isoformat()
    with open(state_file, "w") as f:
        json.dump(state, f, indent=2)


def get_pending_todos() -> list:
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


def backup_context(state: Dict[str, Any], trigger: str = "threshold") -> Optional[Path]:
    backup_dir = get_backup_dir()
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_file = backup_dir / f"context_backup_{trigger}_{timestamp}.json"

    todos = get_pending_todos()
    usage_ratio = state.get("cumulative_tokens", 0) / MAX_CONTEXT_TOKENS

    backup_data = {
        "timestamp": datetime.now().isoformat(),
        "session_id": state.get("session_id"),
        "trigger": trigger,
        "stats": {
            "cumulative_tokens": state.get("cumulative_tokens", 0),
            "message_count": state.get("message_count", 0),
            "usage_percent": int(usage_ratio * 100),
            "session_duration": state.get("session_start"),
        },
        "pending_todos": todos,
        "recent_prompts": state.get("prompts", [])[-5:],
        "recovery_instructions": (
            "To continue from this backup:\n"
            "1. Review pending_todos for incomplete work\n"
            "2. Check recent_prompts for context\n"
            "3. Resume with the next pending task"
        ),
    }

    with open(backup_file, "w") as f:
        json.dump(backup_data, f, indent=2)

    backups = sorted(backup_dir.glob("context_backup_*.json"))
    for old_backup in backups[:-5]:
        old_backup.unlink()

    return backup_file


def log_message(state: Dict[str, Any], role: str, content: str):
    log_dir = get_log_dir()
    log_file = log_dir / "messages.jsonl"

    entry = {
        "timestamp": datetime.now().isoformat(),
        "session_id": state.get("session_id"),
        "role": role,
        "content_length": len(content),
        "tokens_estimate": estimate_tokens(content),
    }

    with open(log_file, "a") as f:
        f.write(json.dumps(entry) + "\n")

    max_lines = 1000
    try:
        with open(log_file, "r") as f:
            lines = f.readlines()
        if len(lines) > max_lines:
            with open(log_file, "w") as f:
                f.writelines(lines[-max_lines:])
    except Exception:
        pass


def main():
    try:
        input_data = json.loads(sys.stdin.read())

        message = input_data.get("message", {})
        content = message.get("content", "")
        role = message.get("role", "")

        if not content:
            sys.exit(0)

        state = load_state()
        new_tokens = estimate_tokens(str(content))
        state["cumulative_tokens"] += new_tokens
        state["message_count"] += 1

        if role == "user" and len(content) > 10:
            state["prompts"].append(
                {"timestamp": datetime.now().isoformat(), "content": content[:200]}
            )
            if len(state["prompts"]) > 20:
                state["prompts"] = state["prompts"][-20:]

        log_message(state, role, content)

        usage_ratio = state["cumulative_tokens"] / MAX_CONTEXT_TOKENS

        if usage_ratio >= CRITICAL_THRESHOLD:
            backup_file = backup_context(state, "critical")
            state["last_backup"] = str(backup_file)
            state["warnings_issued"] += 1

            todos = get_pending_todos()
            output = {
                "type": "context_warning",
                "level": "critical",
                "message": (
                    f"⚠️ CRITICAL: Context at {int(usage_ratio * 100)}% capacity!\n"
                    f"Backup saved: {backup_file.name}\n"
                    f"Pending todos: {len(todos)}\n\n"
                    "RECOMMEND: Wrap up current task. Context will compact soon."
                ),
                "usage_percent": int(usage_ratio * 100),
                "backup_file": str(backup_file),
            }
            print(json.dumps(output))

        elif usage_ratio >= WARNING_THRESHOLD and state["warnings_issued"] == 0:
            backup_file = backup_context(state, "warning")
            state["last_backup"] = str(backup_file)
            state["warnings_issued"] += 1

            todos = get_pending_todos()
            output = {
                "type": "context_warning",
                "level": "warning",
                "message": (
                    f"📊 Context at {int(usage_ratio * 100)}% capacity.\n"
                    f"Backup saved: {backup_file.name}\n"
                    f"Pending todos: {len(todos)}\n\n"
                    "Consider wrapping up current task soon."
                ),
                "usage_percent": int(usage_ratio * 100),
            }
            print(json.dumps(output))

        save_state(state)
        sys.exit(0)

    except json.JSONDecodeError:
        sys.exit(0)
    except Exception as e:
        sys.stderr.write(f"Context monitor error: {e}\n")
        sys.exit(0)


if __name__ == "__main__":
    main()
