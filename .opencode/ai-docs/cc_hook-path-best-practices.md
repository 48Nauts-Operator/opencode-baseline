# Claude Code Hook Path Best Practices

## The Problem: Relative Paths Break Hooks

When hooks use **relative paths**, they break when the working directory changes:

```json
{
  "hooks": {
    "PreToolUse": [{
      "hooks": [{
        "command": "python3 .claude/hooks/pre_tool_use.py"  ❌ BREAKS
      }]
    }]
  }
}
```

**Why it breaks:**
- Bash commands like `cd subdirectory && command` change the working directory
- Once changed, `.claude/hooks/pre_tool_use.py` resolves relative to the NEW directory
- Hook fails with "No such file or directory" error
- ALL subsequent tool calls fail because hooks can't execute

**Example failure:**
```bash
# You're in: /Volumes/DevHub_ext/factory/02-development/BETTY
cd "Betty Companion" && xcodebuild build

# Now working directory is: /Volumes/DevHub_ext/factory/02-development/BETTY/Betty Companion
# Hook tries to find: Betty Companion/.claude/hooks/pre_tool_use.py
# But it should be:     BETTY/.claude/hooks/pre_tool_use.py
# Result: ❌ ERROR - File not found
```

---

## The Solution: Use $CLAUDE_PROJECT_DIR

Claude Code automatically sets `$CLAUDE_PROJECT_DIR` to point to your project root (where `.claude/` exists).

### ✅ Correct Hook Configuration

```json
{
  "hooks": {
    "PreToolUse": [{
      "hooks": [{
        "command": "python3 $CLAUDE_PROJECT_DIR/.claude/hooks/pre_tool_use.py"  ✅ WORKS
      }]
    }],
    "PostToolUse": [{
      "hooks": [{
        "command": "python3 $CLAUDE_PROJECT_DIR/.claude/hooks/post_tool_use.py"  ✅ WORKS
      }]
    }],
    "Stop": [{
      "hooks": [{
        "command": "python3 $CLAUDE_PROJECT_DIR/.claude/hooks/stop.py --notify"  ✅ WORKS
      }]
    }]
  }
}
```

### Why This Works

`$CLAUDE_PROJECT_DIR` is an **absolute path** that Claude Code sets automatically:

```bash
# Example for Betty project:
$CLAUDE_PROJECT_DIR = /Volumes/DevHub_ext/factory/02-development/BETTY

# When hook executes:
python3 $CLAUDE_PROJECT_DIR/.claude/hooks/pre_tool_use.py

# Expands to:
python3 /Volumes/DevHub_ext/factory/02-development/BETTY/.claude/hooks/pre_tool_use.py
```

**Benefits:**
- ✅ Works from ANY directory in your project
- ✅ Works after `cd` commands change working directory
- ✅ No configuration needed - Claude Code sets it automatically
- ✅ Each project gets its own `$CLAUDE_PROJECT_DIR` (no conflicts)

---

## How to Fix Existing Hooks

### Option 1: Manual Fix

Open `.claude/settings.json` and replace all relative paths:

**Find:**
```
"python3 .claude/hooks/
```

**Replace with:**
```
"python3 $CLAUDE_PROJECT_DIR/.claude/hooks/
```

**Also fix app paths:**
```
"python3 apps/
```

**Replace with:**
```
"python3 $CLAUDE_PROJECT_DIR/apps/
```

### Option 2: Automated Fix Script

Create a fix script (e.g., `scripts/00-core-utilities/fix-hook-paths.sh`):

```bash
#!/bin/bash
# Fix all hook paths to use absolute $CLAUDE_PROJECT_DIR

set -e

SETTINGS_FILE="/path/to/your/project/.claude/settings.json"
BACKUP_FILE="${SETTINGS_FILE}.backup.$(date +%Y%m%d_%H%M%S)"

echo "🔧 Fixing Claude Code hook paths..."

# Create backup
cp "$SETTINGS_FILE" "$BACKUP_FILE"
echo "✅ Created backup: $BACKUP_FILE"

# Fix all relative paths to use $CLAUDE_PROJECT_DIR
sed -i '' 's|"python3 \.claude/|"python3 $CLAUDE_PROJECT_DIR/.claude/|g' "$SETTINGS_FILE"
sed -i '' 's|"python3 apps/|"python3 $CLAUDE_PROJECT_DIR/apps/|g' "$SETTINGS_FILE"

echo "✅ Updated all hook paths to use \$CLAUDE_PROJECT_DIR"
echo ""
echo "To verify: cat $SETTINGS_FILE | jq '.hooks'"
```

Run it:
```bash
chmod +x scripts/00-core-utilities/fix-hook-paths.sh
./scripts/00-core-utilities/fix-hook-paths.sh
```

---

## Prevention: Avoid `cd` Commands

Even with fixed hooks, it's best practice to avoid changing working directory:

### ❌ Bad Practice
```bash
cd "/path/to/subdirectory" && xcodebuild build
```

### ✅ Good Practice
```bash
# Use absolute paths in commands
xcodebuild -project "/path/to/subdirectory/project.xcodeproj" build

# OR use subshell to isolate directory change
(cd "/path/to/subdirectory" && xcodebuild build)
```

---

## Testing Your Hooks

After fixing, test from a subdirectory:

```bash
# Change to subdirectory
cd some/subdirectory

# Start Claude Code session
claude-code

# Try any command - hooks should work without errors
# Ask Claude to read a file, write, etc.
```

If hooks work correctly, you'll see NO error messages like:
```
can't open file '.../subdirectory/.claude/hooks/pre_tool_use.py'
```

---

## Multi-Project Support

`$CLAUDE_PROJECT_DIR` is **project-specific** - it automatically points to the correct project:

```bash
# Project A
cd /path/to/ProjectA
claude-code
# → $CLAUDE_PROJECT_DIR = /path/to/ProjectA

# Project B
cd /path/to/ProjectB
claude-code
# → $CLAUDE_PROJECT_DIR = /path/to/ProjectB
```

Each project has its own `.claude/settings.json` with its own hooks. Using `$CLAUDE_PROJECT_DIR` ensures they're completely isolated.

---

## Complete Example

Here's a complete `.claude/settings.json` with all hooks using best practices:

```json
{
  "statusLine": {
    "type": "command",
    "command": "python3 $CLAUDE_PROJECT_DIR/.claude/status_lines/status_line.py",
    "padding": 0
  },
  "hooks": {
    "PreToolUse": [{
      "matcher": "",
      "hooks": [{
        "type": "command",
        "command": "python3 $CLAUDE_PROJECT_DIR/.claude/hooks/pre_tool_use.py"
      }]
    }],
    "PostToolUse": [{
      "matcher": "Edit|MultiEdit|Write",
      "hooks": [
        {
          "type": "command",
          "command": "python3 $CLAUDE_PROJECT_DIR/.claude/hooks/post_tool_use.py"
        },
        {
          "type": "command",
          "command": "python3 $CLAUDE_PROJECT_DIR/.claude/hooks/betty_task_manager_hook.py"
        }
      ]
    }],
    "Stop": [{
      "matcher": "",
      "hooks": [{
        "type": "command",
        "command": "python3 $CLAUDE_PROJECT_DIR/.claude/hooks/stop.py --chat --notify"
      }]
    }],
    "Notification": [{
      "matcher": "",
      "hooks": [{
        "type": "command",
        "command": "python3 $CLAUDE_PROJECT_DIR/.claude/hooks/notification.py --notify"
      }]
    }],
    "UserPromptSubmit": [{
      "matcher": "",
      "hooks": [{
        "type": "command",
        "command": "python3 $CLAUDE_PROJECT_DIR/.claude/hooks/user_prompt_submit.py --log-only"
      }]
    }],
    "SessionStart": [{
      "matcher": "",
      "hooks": [{
        "type": "command",
        "command": "python3 $CLAUDE_PROJECT_DIR/.claude/hooks/session_start.py"
      }]
    }]
  }
}
```

---

## Key Takeaways

1. **Always use `$CLAUDE_PROJECT_DIR`** for hook paths - never use relative paths
2. **Claude Code sets it automatically** - no configuration needed
3. **Works across all projects** - each gets its own isolated environment
4. **Prevents hook breakage** - hooks work regardless of working directory
5. **Best practice from Anthropic** - this is the official recommended approach

---

## References

- Official Claude Code Hooks Documentation: `/ai_docs/cc_hooks_docs.md`
- Betty Hook Issue Analysis: `/docs/active-workload/2025-12-03_Hook-Path-Issue-SOLUTION.md`
- Anthropic Best Practice Example: Shows `$CLAUDE_PROJECT_DIR` usage in all hooks
