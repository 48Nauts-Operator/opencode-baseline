#!/usr/bin/env python3
"""
User Prompt Submit Hook for OpenCode.
Logs user prompts and manages session data.

Adapted from BETTY's user_prompt_submit.py pattern.
"""

import argparse
import json
import os
import sys
from pathlib import Path
from datetime import datetime


def get_log_dir() -> Path:
    project_dir = os.environ.get("PROJECT_DIR", os.getcwd())
    log_dir = Path(project_dir) / ".opencode" / "logs"
    log_dir.mkdir(parents=True, exist_ok=True)
    return log_dir


def get_sessions_dir() -> Path:
    project_dir = os.environ.get("PROJECT_DIR", os.getcwd())
    sessions_dir = Path(project_dir) / ".opencode" / "data" / "sessions"
    sessions_dir.mkdir(parents=True, exist_ok=True)
    return sessions_dir


def log_user_prompt(input_data):
    log_dir = get_log_dir()
    log_file = log_dir / "user_prompts.json"

    log_data = []
    if log_file.exists():
        try:
            with open(log_file, "r") as f:
                log_data = json.load(f)
        except (json.JSONDecodeError, ValueError):
            log_data = []

    input_data["logged_at"] = datetime.now().isoformat()
    log_data.append(input_data)

    if len(log_data) > 500:
        log_data = log_data[-500:]

    with open(log_file, "w") as f:
        json.dump(log_data, f, indent=2)


def store_session_prompt(session_id: str, prompt: str):
    sessions_dir = get_sessions_dir()
    session_file = sessions_dir / f"{session_id}.json"

    session_data = {"session_id": session_id, "prompts": [], "created_at": None}

    if session_file.exists():
        try:
            with open(session_file, "r") as f:
                session_data = json.load(f)
        except (json.JSONDecodeError, ValueError):
            pass

    if not session_data.get("created_at"):
        session_data["created_at"] = datetime.now().isoformat()

    session_data["prompts"].append(
        {"timestamp": datetime.now().isoformat(), "content": prompt[:500]}
    )

    if len(session_data["prompts"]) > 50:
        session_data["prompts"] = session_data["prompts"][-50:]

    session_data["last_updated"] = datetime.now().isoformat()

    with open(session_file, "w") as f:
        json.dump(session_data, f, indent=2)


def store_last_prompt(prompt: str):
    log_dir = get_log_dir()
    last_prompt_file = log_dir / "last_prompt.json"

    data = {"timestamp": datetime.now().isoformat(), "prompt": prompt[:1000]}

    with open(last_prompt_file, "w") as f:
        json.dump(data, f, indent=2)


def validate_prompt(prompt: str) -> tuple:
    blocked_patterns = [
        ("rm -rf /", "Dangerous root deletion command detected"),
        (":(){ :|:& };:", "Fork bomb detected"),
    ]

    prompt_lower = prompt.lower()

    for pattern, reason in blocked_patterns:
        if pattern.lower() in prompt_lower:
            return False, reason

    return True, None


def main():
    try:
        parser = argparse.ArgumentParser()
        parser.add_argument(
            "--validate", action="store_true", help="Enable prompt validation"
        )
        parser.add_argument(
            "--log-only",
            action="store_true",
            help="Only log prompts, no validation or blocking",
        )
        parser.add_argument(
            "--store-last-prompt",
            action="store_true",
            help="Store the last prompt for status line display",
        )
        args = parser.parse_args()

        input_data = json.loads(sys.stdin.read())

        session_id = input_data.get("session_id", "unknown")
        prompt = input_data.get("prompt", "")

        log_user_prompt(input_data)

        if prompt:
            store_session_prompt(session_id, prompt)

        if args.store_last_prompt and prompt:
            store_last_prompt(prompt)

        if args.validate and not args.log_only:
            is_valid, reason = validate_prompt(prompt)
            if not is_valid:
                print(f"Prompt blocked: {reason}", file=sys.stderr)
                sys.exit(2)

        sys.exit(0)

    except json.JSONDecodeError:
        sys.exit(0)
    except Exception:
        sys.exit(0)


if __name__ == "__main__":
    main()
