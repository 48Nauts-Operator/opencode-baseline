#!/usr/bin/env python3
"""
Pre-Compact Hook for OpenCode.
Runs before context compaction to backup state.

Adapted from BETTY's pre_compact.py pattern.
"""

import argparse
import json
import os
import sys
import shutil
from pathlib import Path
from datetime import datetime


def get_log_dir() -> Path:
    project_dir = os.environ.get("PROJECT_DIR", os.getcwd())
    log_dir = Path(project_dir) / ".opencode" / "logs"
    log_dir.mkdir(parents=True, exist_ok=True)
    return log_dir


def log_pre_compact(input_data):
    log_dir = get_log_dir()
    log_file = log_dir / "pre_compact.json"

    log_data = []
    if log_file.exists():
        try:
            with open(log_file, "r") as f:
                log_data = json.load(f)
        except (json.JSONDecodeError, ValueError):
            log_data = []

    input_data["logged_at"] = datetime.now().isoformat()
    log_data.append(input_data)

    if len(log_data) > 100:
        log_data = log_data[-100:]

    with open(log_file, "w") as f:
        json.dump(log_data, f, indent=2)


def backup_transcript(transcript_path: str, trigger: str) -> str:
    if not transcript_path or not os.path.exists(transcript_path):
        return None

    try:
        project_dir = os.environ.get("PROJECT_DIR", os.getcwd())
        backup_dir = Path(project_dir) / ".opencode" / "backup" / "transcripts"
        backup_dir.mkdir(parents=True, exist_ok=True)

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        session_name = Path(transcript_path).stem
        backup_name = f"{session_name}_pre_compact_{trigger}_{timestamp}.jsonl"
        backup_path = backup_dir / backup_name

        shutil.copy2(transcript_path, backup_path)

        backups = sorted(backup_dir.glob("*.jsonl"))
        for old_backup in backups[:-10]:
            old_backup.unlink()

        return str(backup_path)
    except Exception:
        return None


def backup_todos():
    project_dir = os.environ.get("PROJECT_DIR", os.getcwd())
    todo_file = Path(project_dir) / ".opencode" / "logs" / "todos.json"

    if not todo_file.exists():
        return None

    try:
        backup_dir = Path(project_dir) / ".opencode" / "backup"
        backup_dir.mkdir(parents=True, exist_ok=True)

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_path = backup_dir / f"todos_pre_compact_{timestamp}.json"

        shutil.copy2(todo_file, backup_path)
        return str(backup_path)
    except Exception:
        return None


def main():
    try:
        parser = argparse.ArgumentParser()
        parser.add_argument(
            "--backup",
            action="store_true",
            help="Create backup of transcript before compaction",
        )
        parser.add_argument(
            "--verbose", action="store_true", help="Print verbose output"
        )
        args = parser.parse_args()

        input_data = json.loads(sys.stdin.read())

        session_id = input_data.get("session_id", "unknown")
        transcript_path = input_data.get("transcript_path", "")
        trigger = input_data.get("trigger", "unknown")
        custom_instructions = input_data.get("custom_instructions", "")

        log_pre_compact(input_data)

        backup_path = None
        todos_backup = None

        if args.backup:
            if transcript_path:
                backup_path = backup_transcript(transcript_path, trigger)
            todos_backup = backup_todos()

        if args.verbose:
            if trigger == "manual":
                message = (
                    f"Preparing for manual compaction (session: {session_id[:8]}...)"
                )
                if custom_instructions:
                    message += f"\nCustom instructions: {custom_instructions[:100]}..."
            else:
                message = f"Auto-compaction triggered - context window full (session: {session_id[:8]}...)"

            if backup_path:
                message += f"\nTranscript backed up to: {backup_path}"
            if todos_backup:
                message += f"\nTodos backed up to: {todos_backup}"

            print(message)

        sys.exit(0)

    except json.JSONDecodeError:
        sys.exit(0)
    except Exception:
        sys.exit(0)


if __name__ == "__main__":
    main()
