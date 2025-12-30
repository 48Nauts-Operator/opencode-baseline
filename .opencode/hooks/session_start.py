#!/usr/bin/env python3
"""
Session Start Hook
==================
Runs when a new OpenCode session starts.

Input (stdin): JSON with session_id, source ("startup", "resume", "clear")
Output (stdout): JSON with optional additionalContext

Use this to:
- Load project context
- Check git status
- Load recent issues
- Initialize session state
"""

import json
import sys
import subprocess
from pathlib import Path
from datetime import datetime


def get_git_status() -> dict:
    """Get current git status information."""
    result = {"branch": None, "uncommitted_changes": 0, "ahead": 0, "behind": 0}

    try:
        # Get current branch
        branch = subprocess.run(
            ["git", "rev-parse", "--abbrev-ref", "HEAD"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        if branch.returncode == 0:
            result["branch"] = branch.stdout.strip()

        # Get uncommitted changes
        status = subprocess.run(
            ["git", "status", "--porcelain"], capture_output=True, text=True, timeout=5
        )
        if status.returncode == 0:
            changes = [l for l in status.stdout.strip().split("\n") if l]
            result["uncommitted_changes"] = len(changes)

        # Get ahead/behind status
        status_sb = subprocess.run(
            ["git", "status", "-sb"], capture_output=True, text=True, timeout=5
        )
        if status_sb.returncode == 0:
            output = status_sb.stdout
            if "ahead" in output:
                import re

                match = re.search(r"ahead (\d+)", output)
                if match:
                    result["ahead"] = int(match.group(1))
            if "behind" in output:
                import re

                match = re.search(r"behind (\d+)", output)
                if match:
                    result["behind"] = int(match.group(1))

    except Exception:
        pass

    return result


def load_context_files() -> list[str]:
    """Load content from project context files."""
    context_parts = []

    context_files = [
        "OPENCODE.md",
        ".opencode/context/project/project-context.md",
        "TODO.md",
        ".github/ISSUE_TEMPLATE.md",
    ]

    for file_path in context_files:
        path = Path(file_path)
        if path.exists():
            try:
                content = path.read_text()[:2000]  # Limit to 2000 chars
                context_parts.append(f"--- {file_path} ---\n{content}")
            except Exception:
                pass

    return context_parts


def get_recent_github_issues() -> str | None:
    """Get recent GitHub issues if gh CLI is available."""
    try:
        # Check if gh is available
        which = subprocess.run(["which", "gh"], capture_output=True)
        if which.returncode != 0:
            return None

        result = subprocess.run(
            ["gh", "issue", "list", "--limit", "5", "--state", "open"],
            capture_output=True,
            text=True,
            timeout=10,
        )
        if result.returncode == 0 and result.stdout.strip():
            return result.stdout.strip()
    except Exception:
        pass

    return None


def log_session_start(input_data: dict) -> None:
    """Log session start for auditing."""
    log_dir = Path("logs")
    log_dir.mkdir(parents=True, exist_ok=True)
    log_path = log_dir / "sessions.json"

    try:
        if log_path.exists():
            with open(log_path, "r") as f:
                log_data = json.load(f)
        else:
            log_data = []

        log_data.append({**input_data, "timestamp": datetime.now().isoformat()})

        # Keep only last 100 sessions
        if len(log_data) > 100:
            log_data = log_data[-100:]

        with open(log_path, "w") as f:
            json.dump(log_data, f, indent=2)
    except Exception:
        pass


def main():
    try:
        input_data = json.load(sys.stdin)
        session_id = input_data.get("session_id", "unknown")
        source = input_data.get("source", "unknown")

        # Log the session start
        log_session_start(input_data)

        # Build context
        context_parts = []
        context_parts.append(
            f"Session started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
        )
        context_parts.append(f"Session type: {source}")

        # Add git status
        git_status = get_git_status()
        if git_status["branch"]:
            context_parts.append(f"Git branch: {git_status['branch']}")
            if git_status["uncommitted_changes"] > 0:
                context_parts.append(
                    f"Uncommitted changes: {git_status['uncommitted_changes']} files"
                )
            if git_status["ahead"] > 0:
                context_parts.append(f"Commits ahead of remote: {git_status['ahead']}")
            if git_status["behind"] > 0:
                context_parts.append(f"Commits behind remote: {git_status['behind']}")

        # Add context files
        file_contexts = load_context_files()
        if file_contexts:
            context_parts.extend(file_contexts)

        # Add recent issues
        issues = get_recent_github_issues()
        if issues:
            context_parts.append("--- Recent GitHub Issues ---")
            context_parts.append(issues)

        # Output context
        output = {
            "hookSpecificOutput": {
                "hookEventName": "SessionStart",
                "additionalContext": "\n\n".join(context_parts),
            }
        }
        print(json.dumps(output))
        sys.exit(0)

    except json.JSONDecodeError:
        sys.exit(0)
    except Exception:
        sys.exit(0)


if __name__ == "__main__":
    main()
