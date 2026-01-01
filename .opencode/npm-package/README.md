# opencode-baseline-hooks

Security validation, logging, context monitoring, and Kokoro TTS voice notifications for OpenCode.

## Features

- **Security**: Block dangerous commands and sensitive file access
- **Logging**: Track tool usage, file changes, errors, sessions
- **Context Monitoring**: Track token usage, backup before context overflow
- **Pre-Compact Backup**: Automatically backup state before context compaction
- **Prompt Logging**: Log all user prompts for session recovery
- **Voice**: Kokoro TTS announcements for task completion and alerts

## Installation

```bash
npm install -g opencode-baseline-hooks
```

## CLI Commands

After global installation, these commands are available:

| Command | Description |
|---------|-------------|
| `opencode-pre-tool` | Pre-tool validation (security checks) |
| `opencode-post-tool` | Post-tool logging (errors, stats) |
| `opencode-session-start` | Session initialization |
| `opencode-pre-compact` | Pre-compaction backup |
| `opencode-user-prompt` | User prompt logging |
| `opencode-context-monitor` | Context/token monitoring |

### Usage in opencode.json

```json
{
  "hooks": {
    "PreToolUse": [{
      "matcher": "",
      "hooks": [{
        "type": "command",
        "command": "opencode-pre-tool"
      }]
    }],
    "PostToolUse": [{
      "matcher": "",
      "hooks": [{
        "type": "command",
        "command": "opencode-post-tool"
      }]
    }],
    "SessionStart": [{
      "matcher": "",
      "hooks": [{
        "type": "command",
        "command": "opencode-session-start"
      }]
    }],
    "PreCompact": [{
      "matcher": "",
      "hooks": [{
        "type": "command",
        "command": "opencode-pre-compact --backup --verbose"
      }]
    }],
    "UserPromptSubmit": [{
      "matcher": "",
      "hooks": [{
        "type": "command",
        "command": "opencode-user-prompt --log-only --store-last-prompt"
      }]
    }],
    "Notification": [{
      "matcher": "",
      "hooks": [{
        "type": "command",
        "command": "opencode-context-monitor"
      }]
    }]
  }
}
```

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `KOKORO_URL` | `http://localhost:8880` | Kokoro TTS API endpoint |
| `KOKORO_VOICE` | `bf_emma` | Voice to use |
| `OPENCODE_VOICE` | (enabled) | Set to `off` to disable voice |
| `PROJECT_DIR` | (current dir) | Project root directory |

## Security Patterns Blocked

### Dangerous Commands
- `rm -rf /`, recursive delete with dangerous paths
- `sudo`, `su` commands
- `chmod 777`, world-writable permissions
- Piping curl/wget to shell
- Docker system prune
- Disk formatting commands

### Sensitive Files
- `.env` (allows `.env.example`)
- `credentials.json`, `secrets.json`
- `.ssh/` directory, SSH keys
- `.aws/credentials`, `.kube/config`

### Secret Detection (in writes)
- AWS access keys
- GitHub/GitLab tokens
- Stripe keys
- Private keys, JWTs
- Database URLs with passwords

## Context Monitoring

The context monitor tracks cumulative token usage and creates backups at thresholds:
- **70%**: Warning backup created
- **85%**: Critical backup created

Backups include:
- Current todos
- Recent prompts
- Session state
- Recovery instructions

Backups are stored in `.opencode/backup/`.

## Log Files

All logs are stored in `.opencode/logs/`:

| File | Contents |
|------|----------|
| `pre_tool_use.json` | Tool calls with arguments |
| `post_tool_use.json` | Tool outputs |
| `blocked.json` | Blocked dangerous commands |
| `errors.json` | Detected errors |
| `sessions.json` | Session lifecycle |
| `daily_stats.json` | Daily usage statistics |
| `user_prompts.json` | User prompt history |
| `context_state.json` | Current context state |
| `messages.jsonl` | Message log for token tracking |

## Kokoro TTS Setup

Run Kokoro TTS locally with Docker:

```bash
docker run -d -p 8880:8880 ghcr.io/remsky/kokoro-fastapi-cpu:latest
```

## Plugin API

The package also exports a plugin for OpenCode's plugin system:

```typescript
import plugin from "opencode-baseline-hooks"

const hooks = await plugin({ directory: "/path/to/project" })
```

## License

MIT

## Repository

[github.com/48Nauts-Operator/opencode-baseline](https://github.com/48Nauts-Operator/opencode-baseline)
