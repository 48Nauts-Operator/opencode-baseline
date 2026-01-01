#!/usr/bin/env python3
"""
Post-tool-use hook for OpenCode.
Logs tool usage, tracks statistics, and monitors for errors.
"""

import json
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List

COST_PER_1K_INPUT_TOKENS = 0.003
COST_PER_1K_OUTPUT_TOKENS = 0.015


def ensure_log_dir() -> Path:
    project_dir = os.environ.get("PROJECT_DIR", os.getcwd())
    log_dir = Path(project_dir) / ".opencode" / "logs"
    log_dir.mkdir(parents=True, exist_ok=True)
    return log_dir


def append_log(log_path: Path, entry: dict, max_entries: int = 500):
    try:
        log_data = []
        if log_path.exists():
            with open(log_path, "r") as f:
                log_data = json.load(f)

        entry["timestamp"] = datetime.now().isoformat()
        log_data.append(entry)

        if len(log_data) > max_entries:
            log_data = log_data[-max_entries:]

        with open(log_path, "w") as f:
            json.dump(log_data, f, indent=2)

    except Exception:
        pass


def estimate_tokens(text: str) -> int:
    return len(text) // 4


def update_daily_stats(log_dir: Path, updates: Dict[str, Any]):
    today = datetime.now().strftime("%Y-%m-%d")
    stats_path = log_dir / "daily_stats.json"

    try:
        all_stats: Dict[str, Dict[str, Any]] = {}
        if stats_path.exists():
            with open(stats_path, "r") as f:
                all_stats = json.load(f)

        if today not in all_stats:
            all_stats[today] = {
                "date": today,
                "sessions": 0,
                "toolCalls": 0,
                "blockedCommands": 0,
                "errors": 0,
                "estimatedTokens": 0,
                "estimatedCost": 0.0,
            }

        if updates.get("sessions"):
            all_stats[today]["sessions"] += updates["sessions"]
        if updates.get("toolCalls"):
            all_stats[today]["toolCalls"] += updates["toolCalls"]
        if updates.get("blockedCommands"):
            all_stats[today]["blockedCommands"] += updates["blockedCommands"]
        if updates.get("errors"):
            all_stats[today]["errors"] += updates["errors"]
        if updates.get("estimatedTokens"):
            tokens = updates["estimatedTokens"]
            all_stats[today]["estimatedTokens"] += tokens
            input_tokens = tokens * 0.5
            output_tokens = tokens * 0.5
            all_stats[today]["estimatedCost"] += (
                input_tokens / 1000
            ) * COST_PER_1K_INPUT_TOKENS + (
                output_tokens / 1000
            ) * COST_PER_1K_OUTPUT_TOKENS

        cutoff = datetime.now()
        cutoff = cutoff.replace(day=max(1, cutoff.day - 90))
        cutoff_str = cutoff.strftime("%Y-%m-%d")
        all_stats = {k: v for k, v in all_stats.items() if k >= cutoff_str}

        with open(stats_path, "w") as f:
            json.dump(all_stats, f, indent=2)

    except Exception:
        pass


def detect_error_indicators(output: str) -> List[str]:
    indicators = ["error:", "failed:", "exception:", "fatal:", "panic:", "traceback"]
    found = []
    lower_output = output.lower()
    for indicator in indicators:
        if indicator in lower_output:
            found.append(indicator)
    return found


def main():
    try:
        input_data = json.loads(sys.stdin.read())

        tool_name = input_data.get("tool_name", "")
        tool_input = input_data.get("tool_input", {})
        tool_output = input_data.get("tool_output", {})
        tool_error = input_data.get("tool_error", None)

        log_dir = ensure_log_dir()

        log_entry = {
            "tool": tool_name,
            "success": tool_error is None,
        }

        if tool_name.lower() == "bash":
            command = tool_input.get("command", "")
            log_entry["command"] = (
                command[:200] + "..." if len(command) > 200 else command
            )
        elif tool_name.lower() in ["read", "write", "edit"]:
            log_entry["file"] = tool_input.get(
                "filePath", tool_input.get("file_path", "")
            )

        if tool_error:
            log_entry["error"] = str(tool_error)[:500]

        append_log(log_dir / "tool_usage.json", log_entry)

        input_str = json.dumps(tool_input)
        output_str = (
            str(tool_output.get("output", ""))
            if isinstance(tool_output, dict)
            else str(tool_output)
        )
        tokens = estimate_tokens(input_str) + estimate_tokens(output_str)

        stats_update = {"toolCalls": 1, "estimatedTokens": tokens}

        output_text = output_str[:2000] if len(output_str) > 2000 else output_str
        error_indicators = detect_error_indicators(output_text)
        if error_indicators or tool_error:
            stats_update["errors"] = 1
            append_log(
                log_dir / "errors.json",
                {
                    "tool": tool_name,
                    "indicators": error_indicators,
                    "output": output_text[:500],
                },
                max_entries=100,
            )

        update_daily_stats(log_dir, stats_update)

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
        sys.stderr.write(f"Post-hook error: {e}\n")

    sys.exit(0)


if __name__ == "__main__":
    main()
