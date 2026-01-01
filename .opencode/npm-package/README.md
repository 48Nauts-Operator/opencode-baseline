# opencode-baseline-hooks

Security validation, logging, and Kokoro TTS voice notifications for OpenCode.

## Features

- **Security**: Block dangerous `rm` commands and sensitive file access
- **Logging**: Track tool usage, file changes, errors, sessions
- **Voice**: Kokoro TTS announcements for task completion and alerts
- **Fallback**: macOS notifications when Kokoro unavailable

## Installation

```bash
npm install -g opencode-baseline-hooks
```

## Configuration

Set environment variables to customize behavior:

| Variable | Default | Description |
|----------|---------|-------------|
| `KOKORO_URL` | `http://localhost:8880` | Kokoro TTS API endpoint |
| `KOKORO_VOICE` | `bf_emma` | Voice to use (British female) |
| `OPENCODE_VOICE` | (enabled) | Set to `off` to disable voice |

## What It Does

### Pre-Tool Validation

Blocks dangerous operations before they execute:

- Recursive delete commands (`rm -rf`, etc.)
- Access to sensitive files (`.env`, credentials, SSH keys)

### Post-Tool Logging

Logs all tool usage to `.opencode/logs/`:

- `pre_tool_use.json` - Tool calls with arguments
- `post_tool_use.json` - Tool outputs
- `errors.json` - Detected errors
- `sessions.json` - Session lifecycle

### Voice Notifications

When Kokoro TTS is running:

| Event | Announcement |
|-------|--------------|
| Session start | "OpenCode session started for {project}" |
| Task complete | "Task complete after N minutes. Used N tools." |
| Blocked command | "Blocked a dangerous command. Please review." |
| Error | "An error occurred. Your attention is needed." |

## Kokoro TTS Setup

Run Kokoro TTS locally with Docker:

```bash
docker run -d -p 8880:8880 ghcr.io/remsky/kokoro-fastapi-cpu:latest
```

Or use your existing Kokoro instance by setting `KOKORO_URL`.

## Security Patterns Blocked

### Dangerous Commands
- `rm -rf /`
- `rm -rf ~`
- `rm -rf *`
- Any recursive delete with force flag

### Sensitive Files
- `.env` (but allows `.env.example`)
- `credentials.json`
- `secrets.json`, `secrets.yaml`
- `.ssh/` directory
- `id_rsa` keys
- `.aws/credentials`

## License

MIT

## Repository

[github.com/48Nauts-Operator/opencode-baseline](https://github.com/48Nauts-Operator/opencode-baseline)
