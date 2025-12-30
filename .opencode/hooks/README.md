# OpenCode Hooks

Hooks are Python scripts that run at specific lifecycle events. They can modify behavior, add context, or block dangerous operations.

## Available Hooks

| Hook | When | Can Block | Use For |
|------|------|-----------|---------|
| `pre_tool_use.py` | Before each tool call | Yes (exit 2) | Security, validation |
| `post_tool_use.py` | After each tool call | No | Logging, metrics |
| `session_start.py` | Session begins | No | Load context, init state |

## Configuration

Add hooks to `.opencode/opencode.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "python3 $OPENCODE_PROJECT_DIR/.opencode/hooks/pre_tool_use.py"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "python3 $OPENCODE_PROJECT_DIR/.opencode/hooks/post_tool_use.py"
          }
        ]
      }
    ],
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "python3 $OPENCODE_PROJECT_DIR/.opencode/hooks/session_start.py"
          }
        ]
      }
    ]
  }
}
```

## Hook Input/Output

### Input (stdin)
Hooks receive JSON on stdin with context about the event.

**PreToolUse / PostToolUse:**
```json
{
  "tool_name": "Bash",
  "tool_input": {
    "command": "npm test"
  },
  "session_id": "abc123"
}
```

**SessionStart:**
```json
{
  "session_id": "abc123",
  "source": "startup"  // or "resume", "clear"
}
```

### Output

**PreToolUse:**
- Exit 0: Allow tool execution
- Exit 2: Block tool execution (print error to stderr)

**SessionStart:**
```json
{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": "Context to add to session..."
  }
}
```

## Writing Custom Hooks

```python
#!/usr/bin/env python3
import json
import sys

def main():
    # Read input
    input_data = json.load(sys.stdin)
    
    # Your logic here
    tool_name = input_data.get('tool_name', '')
    
    # Block if needed (PreToolUse only)
    if should_block(tool_name):
        print("BLOCKED: reason", file=sys.stderr)
        sys.exit(2)
    
    # Allow
    sys.exit(0)

if __name__ == '__main__':
    main()
```

## Examples

### Block Dangerous Commands
See `pre_tool_use.py` for blocking `rm -rf` and sensitive file access.

### Load Project Context
See `session_start.py` for loading git status, context files, and GitHub issues.

### Audit Logging
See `post_tool_use.py` for logging all tool usage to JSON files.
