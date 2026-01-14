# opencode-baseline-hooks

Security validation, logging, context monitoring, and Kokoro TTS voice notifications for OpenCode and Claude Code.

## Features

- **Security**: Block dangerous commands and sensitive file access
- **Logging**: Track tool usage, file changes, errors, sessions
- **Context Monitoring**: Track token usage, backup before context overflow
- **Pre-Compact Backup**: Automatically backup state before context compaction
- **Prompt Logging**: Log all user prompts for session recovery
- **Voice**: Kokoro TTS announcements for task completion and alerts

## What's new in v0.8.0

- Hardened Bash command detection so the plugin no longer crashes when `output.args` is missing (fixes the `TypeError: undefined is not an object (evaluating 'output.args.command')` failure mode)
- Published a rebuilt npm package so both global installations and per-project dependencies can consume the fix immediately
- Build stays compatible with v0.7.0’s smart notification aggregation so we can continue implementing the queue/channel phases without tool crashes

## Installation

```bash
npm install -g opencode-baseline-hooks
```

## Usage

> **IMPORTANT**: OpenCode and Claude Code use DIFFERENT configuration systems!

### For OpenCode (Plugin System)

OpenCode uses a **plugin system**. Add to your `~/.config/opencode/opencode.json`:

```json
{
  "plugin": [
    "opencode-baseline-hooks"
  ]
}
```

Or for project-level config in `.opencode/opencode.json`:

```json
{
  "plugin": [
    "opencode-baseline-hooks"
  ]
}
```

That's it! The plugin handles all hook events automatically.

### For Claude Code (Hooks Config)

Claude Code uses a **hooks config** with CLI commands. Add to `~/.claude/settings.json`:

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

### Platform Comparison

| Feature | OpenCode | Claude Code |
|---------|----------|-------------|
| Config file | `opencode.json` | `~/.claude/settings.json` |
| Hook system | `"plugin": [...]` | `"hooks": { ... }` |
| Hook format | TypeScript plugin | CLI commands |

## CLI Commands

These CLI commands are available after global installation (used by Claude Code):

| Command | Description |
|---------|-------------|
| `opencode-pre-tool` | Pre-tool validation (security checks) |
| `opencode-post-tool` | Post-tool logging (errors, stats) |
| `opencode-session-start` | Session initialization |
| `opencode-pre-compact` | Pre-compaction backup |
| `opencode-user-prompt` | User prompt logging |
| `opencode-context-monitor` | Context/token monitoring |

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `KOKORO_URL` | `http://localhost:8880` | Kokoro TTS API endpoint |
| `KOKORO_VOICE` | `bf_emma` | Voice to use |
| `OPENCODE_VOICE` | (enabled) | Set to `off` to disable voice |
| `PROJECT_DIR` | (current dir) | Project root directory |
| `NOTIFICATION_MODE` | `verbose` | `verbose`, `smart`, or `quiet` |
| `NOTIFICATION_SPEAK` | `completion,error` | Categories to speak in smart mode |

## Smart Notifications (v0.7.0)

Control notification behavior to reduce voice spam while staying informed.

### Notification Modes

| Mode | Behavior |
|------|----------|
| `verbose` | Speak every notification (original behavior) |
| `smart` | Aggregate blocked commands, speak summary on completion |
| `quiet` | Visual notifications only (macOS notification center) |

### Smart Mode Categories

Set `NOTIFICATION_SPEAK` to customize which events trigger voice (comma-separated):

- `completion` - Task completion summaries
- `error` - Errors requiring attention
- `blocked` - Blocked commands (aggregated in smart mode)
- `build` - Build success/failure
- `test` - Test results
- `warning` - Warnings

### Example: Reduced Noise Setup

```bash
export NOTIFICATION_MODE=smart
export NOTIFICATION_SPEAK=completion,error
```

**Before (verbose mode):**
```
"Blocked writing secrets to file"
"Blocked writing secrets to file"
"Access to sensitive file blocked"
"Build completed successfully"
"Task complete"
```

**After (smart mode):**
```
"MyProject: completed after 5 minutes. 3 commands blocked. Build success."
```

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

## Plugin API (Programmatic)

The package exports a plugin for direct use:

```typescript
import plugin from "opencode-baseline-hooks"

// OpenCode plugin system calls this automatically
const hooks = await plugin({ directory: "/path/to/project" })

// Returns event handlers:
// - hooks["tool.execute.before"] - Pre-tool security validation
// - hooks["tool.execute.after"] - Post-tool logging
// - hooks.event - Session events (created, idle, error)
```

## License

MIT

## Repository

[github.com/48Nauts-Operator/opencode-baseline](https://github.com/48Nauts-Operator/opencode-baseline)
