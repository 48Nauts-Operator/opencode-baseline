#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = [
#     "requests",
# ]
# ///
"""
Kokoro Local TTS - British Voice (JARVIS-style)
Uses local Kokoro TTS service for fast, free, high-quality voice synthesis.

Kokoro runs locally on port 8880 with OpenAI-compatible API.
Setup: https://github.com/remsky/Kokoro-FastAPI

Voice: British Emma (67%) + American Sarah (33%) blend for JARVIS-like sound
"""

import sys
import os
import subprocess
import tempfile


def speak_with_kokoro(text: str, port: int = 8880) -> bool:
    """
    Use local Kokoro TTS with British voice blend.

    Args:
        text: Text to speak
        port: Kokoro server port (default: 8880)

    Returns:
        True if successful, False otherwise
    """
    try:
        import requests

        # Kokoro service - OpenAI-compatible API format
        response = requests.post(
            f"http://localhost:{port}/v1/audio/speech",
            headers={"Content-Type": "application/json"},
            json={
                "model": "tts-1",
                "input": text,
                "voice": "bf_emma(2)+af_sarah(1)",  # 67% British Emma + 33% American Sarah
            },
            timeout=30,
        )

        if response.status_code == 200:
            # Save audio to temp file
            with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as f:
                f.write(response.content)
                temp_file = f.name

            # Play with afplay (macOS) or aplay (Linux)
            if sys.platform == "darwin":
                subprocess.run(["afplay", temp_file], check=True)
            else:
                # Try aplay for Linux
                try:
                    subprocess.run(["aplay", temp_file], check=True)
                except FileNotFoundError:
                    # Try mpv as fallback
                    subprocess.run(["mpv", "--no-video", temp_file], check=True)

            # Clean up
            os.unlink(temp_file)
            return True

        return False

    except Exception as e:
        # Kokoro not available or error
        return False


def speak_with_macos_say(text: str) -> bool:
    """
    Fallback to macOS 'say' command with British voice.
    """
    try:
        # Use Daniel (British male) voice
        subprocess.run(["say", "-v", "Daniel", text], check=True)
        return True
    except FileNotFoundError:
        # Not on macOS
        return False
    except Exception:
        return False


def main():
    if len(sys.argv) < 2:
        print("Usage: kokoro_tts.py <text to speak>")
        sys.exit(1)

    text = " ".join(sys.argv[1:])

    # Get custom port from environment if set
    port = int(os.getenv("KOKORO_PORT", "8880"))

    # Try Kokoro first (local, free, fast)
    if speak_with_kokoro(text, port):
        sys.exit(0)

    # Fallback to macOS say
    if speak_with_macos_say(text):
        sys.exit(0)

    # If all else fails, just print
    print(f"TTS unavailable. Message: {text}")
    sys.exit(1)


if __name__ == "__main__":
    main()
