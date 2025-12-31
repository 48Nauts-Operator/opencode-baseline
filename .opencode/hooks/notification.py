#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = [
#     "python-dotenv",
# ]
# ///

import argparse
import json
import os
import sys
import subprocess
import random
from pathlib import Path
from datetime import datetime

try:
    from dotenv import load_dotenv

    load_dotenv()
except ImportError:
    pass


def get_project_info(workspace_dir: str) -> dict:
    project_path = Path(workspace_dir)
    project_name = project_path.name

    git_branch = None
    try:
        result = subprocess.run(
            ["git", "-C", workspace_dir, "symbolic-ref", "--short", "HEAD"],
            capture_output=True,
            text=True,
            timeout=2,
        )
        if result.returncode == 0:
            git_branch = result.stdout.strip()
    except Exception:
        pass

    project_type = "Unknown"
    if (project_path / "package.json").exists():
        project_type = "Node.js"
    elif (project_path / "requirements.txt").exists() or (
        project_path / "pyproject.toml"
    ).exists():
        project_type = "Python"
    elif (project_path / "go.mod").exists():
        project_type = "Go"
    elif (project_path / "Cargo.toml").exists():
        project_type = "Rust"
    elif any(project_path.glob("*.xcodeproj")):
        project_type = "iOS/Swift"
    elif (project_path / "docker-compose.yml").exists():
        project_type = "Docker"

    return {
        "name": project_name,
        "path": str(project_path),
        "type": project_type,
        "branch": git_branch,
    }


def get_notification_message(input_data: dict) -> str:
    workspace = input_data.get("workspace", {})
    current_dir = workspace.get("current_dir", os.getcwd())
    project_info = get_project_info(current_dir)

    message = input_data.get("message", "")
    engineer_name = os.getenv("ENGINEER_NAME", "").strip() or "Sir"
    project_name = project_info["name"]

    if "waiting for your input" in message.lower() or "question" in message.lower():
        templates = [
            f"{engineer_name}, I need your input on {project_name}",
            f"Shall I render {project_name} for you, {engineer_name}?",
            f"{engineer_name}, {project_name} requires your attention",
            f"If you please {engineer_name}, {project_name} awaits your decision",
            f"{engineer_name}, there's only so much I can do when {project_name} needs attention",
        ]
    elif "error" in message.lower() or "failed" in message.lower():
        templates = [
            f"{engineer_name}, we have a problem with {project_name}",
            f"{engineer_name}, there is a potentially fatal issue in {project_name}",
            f"I'm afraid {project_name} is malfunctioning, {engineer_name}",
            f"Not good {engineer_name}. {project_name} has experienced a severe issue",
        ]
    elif (
        "complete" in message.lower()
        or "finished" in message.lower()
        or "done" in message.lower()
    ):
        templates = [
            f"All wrapped up with {project_name}, {engineer_name}. Will there be anything else?",
            f"As always {engineer_name}, a great pleasure working on {project_name}",
            f"{project_name} is online and ready, {engineer_name}",
            f"Congratulations {engineer_name}, {project_name} is operational",
            f"{engineer_name}, might I say {project_name} turned out rather well",
        ]
    else:
        templates = [
            f"{engineer_name}, you have an update on {project_name}",
            f"{engineer_name}, I have an update from {project_name}",
            f"{engineer_name}, {project_name} requires your attention",
            f"I've got something on {project_name}, {engineer_name}",
        ]

    return random.choice(templates)


def get_tts_script_path():
    script_dir = Path(__file__).parent
    tts_dir = script_dir / "utils" / "tts"

    kokoro_script = tts_dir / "kokoro_tts.py"
    if kokoro_script.exists():
        return str(kokoro_script)

    return None


def announce_notification(message: str):
    try:
        tts_script = get_tts_script_path()
        if not tts_script:
            return

        subprocess.run(
            ["uv", "run", tts_script, message], timeout=60, capture_output=True
        )

    except subprocess.TimeoutExpired:
        pass
    except (subprocess.SubprocessError, FileNotFoundError):
        pass
    except Exception:
        pass


def log_notification(input_data: dict, project_info: dict):
    try:
        project_path = Path(project_info["path"])
        log_dir = project_path / "logs"
        log_dir.mkdir(exist_ok=True)

        log_file = log_dir / "notifications.jsonl"

        log_entry = {
            "timestamp": datetime.now().isoformat(),
            "project": project_info["name"],
            "project_type": project_info["type"],
            "branch": project_info.get("branch"),
            "type": input_data.get("type"),
            "message": input_data.get("message"),
        }

        with open(log_file, "a") as f:
            f.write(json.dumps(log_entry) + "\n")

    except Exception:
        pass


def main():
    try:
        parser = argparse.ArgumentParser()
        parser.add_argument(
            "--notify", action="store_true", help="Enable TTS notifications"
        )
        parser.add_argument(
            "--silent", action="store_true", help="Disable TTS (log only)"
        )
        args = parser.parse_args()

        input_data = json.loads(sys.stdin.read())

        workspace = input_data.get("workspace", {})
        current_dir = workspace.get("current_dir", os.getcwd())
        project_info = get_project_info(current_dir)

        log_notification(input_data, project_info)

        notification_message = get_notification_message(input_data)

        if args.notify and not args.silent:
            if input_data.get("message") != "Claude is waiting for your input":
                announce_notification(notification_message)

        sys.exit(0)

    except json.JSONDecodeError:
        sys.exit(0)
    except Exception:
        sys.exit(0)


if __name__ == "__main__":
    main()
