# OpenCode Baseline

A curated project template for OpenCode AI assistant. Copy this `.opencode` directory into any project to get pre-configured agents, commands, skills, hooks, and context.

## Quick Start

```bash
# Copy to your project
cp -r .opencode /path/to/your/project/
cp OPENCODE.md /path/to/your/project/
cp .env.example /path/to/your/project/.env

# Or use as a template
git clone <this-repo> my-new-project
cd my-new-project
cp .env.example .env
# Edit .env with your API keys
```

## What's Included

### Skills (`skill/`)

Reusable workflows that teach AI how to perform specific tasks:

| Skill | Description |
|-------|-------------|
| `tdd` | Test-Driven Development with RED-GREEN-REFACTOR |
| `code-review` | Structured code review checklist |
| `git-release` | Release management workflow |
| `systematic-debugging` | 4-phase debugging methodology |
| `skill-creator` | Meta-skill for creating new skills |
| `changelog-generator` | Generate user-friendly changelogs from git |
| `mcp-builder` | Build MCP servers for AI integrations |
| `file-organizer` | Intelligently organize files and folders |
| `pr-create` | Create well-structured pull requests |

### Commands (`command/`)

Slash commands for common operations:

| Command | Description |
|---------|-------------|
| `/clean` | Format, lint, and clean up code |
| `/commit` | Create conventional commits with emoji |
| `/git-flow` | Start new development context (branch/worktree) |
| `/git-safety` | Run safety checks before merging |
| `/git-commit` | Smart conventional commit generation |
| `/optimize` | Analyze and optimize code |
| `/test` | Run testing pipeline |
| `/worktrees` | Manage git worktrees |
| `/context` | Analyze project context |
| `/build-context-system` | Create AI context architecture |

### Hooks (`hooks/`)

Lifecycle hooks that run at specific points during AI sessions:

| Hook | Description |
|------|-------------|
| `pre_tool_use.py` | Validates commands before execution, blocks dangerous operations |
| `post_tool_use.py` | Logs actions, tracks errors, monitors file changes |
| `session_start.py` | Loads context, git status, GitHub issues at session start |

### Agents (`agent/`)

Specialized AI personas for different domains:

**Core**
- `openagent.md` - Main orchestration agent
- `opencoder.md` - Code-focused agent

**Development**
- `backend-specialist.md` - Backend development
- `frontend-specialist.md` - Frontend/UI development
- `devops-specialist.md` - DevOps and infrastructure
- `codebase-agent.md` - Codebase understanding

**Content**
- `copywriter.md` - Marketing copy
- `technical-writer.md` - Technical documentation

**Data**
- `data-analyst.md` - Data analysis

**Subagents** (delegated tasks)
- `build-agent.md` - Build verification
- `coder-agent.md` - Code execution
- `reviewer.md` - Code review
- `tester.md` - Test authoring
- `task-manager.md` - Task breakdown

### Context (`context/`)

Domain knowledge and standards:

- `core/` - Essential patterns, workflows, standards
- `development/` - React patterns, API design, clean code
- `content/` - Copywriting frameworks, tone/voice
- `project/` - Project-specific context (customize this)

### Plugins (`plugin/`)

Extend OpenCode functionality:

- `opencode-sessions` - Multi-agent session management

## Configuration

### opencode.json

The main configuration file includes:

```json
{
  "$schema": "https://opencode.ai/config.json",
  
  "instructions": [
    "OPENCODE.md",
    "CONTRIBUTING.md",
    "README.md"
  ],

  "permissions": {
    "allow": ["Bash(git:*)", "Bash(npm:*)", "Write", "Edit", "Read"],
    "deny": ["Bash(rm -rf /*)", "Bash(sudo:*)"],
    "ask": ["Bash(rm:*)", "Bash(git push --force:*)"]
  },

  "hooks": {
    "PreToolUse": [...],
    "PostToolUse": [...],
    "SessionStart": [...]
  }
}
```

#### Permission Levels

| Level | Behavior |
|-------|----------|
| `allow` | Execute without confirmation |
| `deny` | Block completely with error |
| `ask` | Require user confirmation |

#### Pre-configured Safety

**Allowed** (safe operations):
- Git operations, package managers (npm, yarn, pip)
- Build tools, linters, formatters
- File read/write, search tools

**Denied** (dangerous operations):
- `rm -rf /`, `sudo`, `kill -9`
- Force pushes to main/master
- Disk formatting commands
- Docker system prune

**Ask** (require confirmation):
- File deletion (`rm`)
- Force push to branches
- Uninstalling packages

### OPENCODE.md Template

The project root includes `OPENCODE.md` - a project context file that AI reads automatically:

```markdown
# Project Context

## Tech Stack
- List your technologies

## Key Patterns  
- Document your conventions

## Important Files
- Highlight critical paths
```

## Customization

### Add Project-Specific Context

Edit `.opencode/context/project/project-context.md`:

```markdown
# Project Context

## Overview
[Your project description]

## Tech Stack
- Framework: [e.g., Next.js 14]
- Database: [e.g., PostgreSQL]
- Deployment: [e.g., Vercel]

## Key Patterns
[Document your conventions]
```

### Create Custom Skills

1. Create directory: `.opencode/skill/my-skill/`
2. Add `SKILL.md` with:

```markdown
---
name: my-skill
description: When to use this skill
---

# My Skill

## When to Use
- Trigger 1
- Trigger 2

## How to Use
Step-by-step instructions...
```

### Create Custom Commands

Add `.opencode/command/my-command.md`:

```markdown
---
name: my-command
description: What this command does
allowed-tools: [Bash, Read, Write]
---

# My Command

Instructions for the AI...
```

### Create Custom Hooks

Add Python scripts to `.opencode/hooks/`:

```python
#!/usr/bin/env python3
"""Custom hook example."""

import json
import sys

def main():
    # Read hook input from stdin
    input_data = json.loads(sys.stdin.read())
    
    # Process...
    
    # Output result
    result = {"continue": True, "message": "OK"}
    print(json.dumps(result))

if __name__ == "__main__":
    main()
```

Register in `opencode.json`:

```json
{
  "hooks": {
    "PostToolUse": [{
      "matcher": "",
      "hooks": [{
        "type": "command",
        "command": "python3 $PROJECT_DIR/.opencode/hooks/my_hook.py"
      }]
    }]
  }
}
```

## Directory Structure

```
.opencode/
├── opencode.json          # Project configuration
├── agent/                 # AI agent definitions
│   ├── core/              # Main agents
│   ├── development/       # Dev specialists
│   ├── content/           # Content creators
│   ├── data/              # Data specialists
│   └── subagents/         # Delegated task agents
├── command/               # Slash commands
│   ├── git-flow.md        # Development context setup
│   ├── git-safety.md      # Pre-merge safety checks
│   ├── git-commit.md      # Smart commit generation
│   └── ...
├── context/               # Domain knowledge
│   ├── core/              # Essential patterns
│   ├── development/       # Dev standards
│   ├── content/           # Content standards
│   └── project/           # Project-specific
├── hooks/                 # Lifecycle hooks
│   ├── pre_tool_use.py    # Pre-execution validation
│   ├── post_tool_use.py   # Post-execution logging
│   └── session_start.py   # Session initialization
├── skill/                 # Reusable workflows
├── plugin/                # Extensions
└── tool/                  # Custom tools

OPENCODE.md                # Project context (at root)
.env.example               # Environment template
```

## Git Flow Commands

The baseline includes a complete git workflow:

### `/git-flow` - Start Development

```bash
/git-flow --small "Fix typo"      # Stay on branch
/git-flow --medium "Add feature"   # Create feature branch
/git-flow --large "Refactor auth"  # Create worktree
/git-flow fix "Bug description"    # Infer size from keyword
```

### `/git-safety` - Pre-Merge Check

```bash
/git-safety              # Standard check
/git-safety --strict     # Block on warnings
```

Checks for:
- Uncommitted changes
- Merge conflicts
- Debug statements
- Hardcoded secrets
- Test failures
- TypeScript errors

### `/git-commit` - Smart Commits

```bash
/git-commit               # Auto-generate message
/git-commit "message"     # Use provided message
/git-commit --dry-run     # Preview only
```

## Recommended Plugins

Install these plugins globally for enhanced functionality:

| Plugin | Description | Install |
|--------|-------------|---------|
| [oh-my-opencode](https://github.com/code-yeongyu/oh-my-opencode) | Background agents, LSP/AST tools, Claude Code compatibility | `npm i -g oh-my-opencode` |
| [opencode-sessions](https://github.com/malhashemi/opencode-sessions) | Multi-agent session management | Included in baseline |
| [opencode-roadmap](https://github.com/IgorWarzocha/Opencode-Roadmap) | Strategic planning, multi-agent coordination | `npm i -g opencode-roadmap` |
| [opencode-tokenscope](https://github.com/ramtinJ95/opencode-tokenscope) | Token usage analysis and cost tracking | `npm i -g opencode-tokenscope` |
| [opencode-dynamic-context-pruning](https://github.com/Tarquinen/opencode-dynamic-context-pruning) | Token optimization | `npm i -g opencode-dynamic-context-pruning` |

See [awesome-opencode](https://github.com/awesome-opencode/awesome-opencode) for more plugins.

## Resources

- [awesome-opencode](https://github.com/awesome-opencode/awesome-opencode) - Curated plugins, themes, agents
- [awesome-llm-skills](https://github.com/Prat011/awesome-llm-skills) - Skill patterns and examples
- [OpenAgents](https://github.com/darrenhinde/OpenAgents) - Original framework (baseline source)
- [OpenCode Docs](https://opencode.ai) - Official documentation

## License

MIT
