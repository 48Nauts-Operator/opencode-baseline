# OpenCode Baseline

> A production-ready template for OpenCode AI assistant with pre-configured agents, skills, commands, hooks, and context.

![Version](https://img.shields.io/badge/version-0.1.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![OpenCode](https://img.shields.io/badge/OpenCode-Compatible-purple)

---

## Table of Contents

- [Installation](#installation)
- [What's Included](#whats-included)
- [Skills](#skills)
- [Agents](#agents)
- [Commands](#commands)
- [Hooks](#hooks)
- [Plugins](#plugins)
- [Tools](#tools)
- [Prompts System](#prompts-system)
- [Context System](#context-system)
- [Configuration](#configuration)
- [Directory Structure](#directory-structure)

---

## Installation

### Prerequisites

- **Git** - Required for cloning and updates
- **Python 3** - Required for hooks
- **OpenCode** - The AI assistant ([opencode.ai](https://opencode.ai))

### Quick Install (One-Line)

```bash
curl -fsSL https://raw.githubusercontent.com/48Nauts-Operator/opencode-baseline/main/install.sh | bash
```

#### Install Options

| Option | Description |
|--------|-------------|
| `--no-env` | Skip copying `.env.example` |
| `--no-opencode-md` | Skip copying `OPENCODE.md` template |
| `--force`, `-f` | Overwrite existing `.opencode` directory |
| `--branch`, `-b` | Use specific branch (default: main) |

```bash
# Examples
curl -fsSL <url>/install.sh | bash -s -- --force
curl -fsSL <url>/install.sh | bash -s -- --branch develop --no-env
```

### Manual Install

```bash
# Clone the repository
git clone https://github.com/48Nauts-Operator/opencode-baseline.git

# Copy to your project
cp -r opencode-baseline/.opencode /path/to/your/project/
cp opencode-baseline/OPENCODE.md /path/to/your/project/
cp opencode-baseline/.env.example /path/to/your/project/.env
```

### Post-Install Setup

1. **Configure Project Context**
   ```bash
   # Edit the project context file with your project details
   nano .opencode/context/project/project-context.md
   ```

2. **Set Up Environment Variables**
   ```bash
   cp .env.example .env
   nano .env
   ```

3. **Customize OPENCODE.md**
   ```bash
   # Edit project description for AI context
   nano OPENCODE.md
   ```

### Environment Variables

Create a `.env` file with your API keys:

```bash
# AI Provider Keys (at least one required)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=AIza...

# Optional: GitHub integration
GITHUB_TOKEN=ghp_...
```

### Updating

Update to the latest version while preserving your customizations:

```bash
./update.sh
```

| Option | Description |
|--------|-------------|
| `--branch`, `-b` | Use specific branch |
| `--preserve`, `-p` | Additional path to preserve (repeatable) |
| `--full` | Full update, don't preserve anything |

**Default preserved paths:**
- `context/project/` - Your project-specific context
- `opencode.json` - Your configuration
- `OPENCODE.md` - Your project description

### Uninstalling

```bash
./uninstall.sh
```

| Option | Description |
|--------|-------------|
| `--force`, `-f` | Skip confirmation prompt |
| `--keep-context`, `-k` | Keep `.opencode/context/project/` |

### Verifying Installation

```bash
# Check directory structure
ls -la .opencode/

# Verify version
cat .opencode/VERSION

# Check configuration
cat .opencode/opencode.json | head -20
```

---

## What's Included

| Component | Count | Description |
|-----------|-------|-------------|
| **Skills** | 9 | Reusable workflows (TDD, code review, debugging, etc.) |
| **Agents** | 28 | Specialized AI personas (language experts, DevOps, etc.) |
| **Commands** | 12 | Slash commands for common operations |
| **Hooks** | 3 | Lifecycle hooks (pre/post tool use, session start) |
| **Plugins** | 3 | Extensions (agent validator, notifications) |
| **Tools** | 4 | Custom tools (Gemini image editing, env management) |
| **Context Files** | 20+ | Domain knowledge and standards |

---

## Skills

Reusable workflows that teach AI how to perform specific tasks. Located in `.opencode/skill/`.

| Skill | Description | Workflow |
|-------|-------------|----------|
| **tdd** | Test-Driven Development with RED-GREEN-REFACTOR cycle | Development |
| **code-review** | Systematic code review checklist for quality and security | Review |
| **git-release** | Create consistent releases with changelogs and version bumping | GitHub |
| **systematic-debugging** | 4-phase debugging methodology for finding root causes | Debugging |
| **skill-creator** | Meta-skill for creating new OpenCode skills | Meta |
| **changelog-generator** | Generate user-friendly changelogs from git commits | Release |
| **mcp-builder** | Build MCP servers for AI agent integrations | Development |
| **file-organizer** | Intelligently organize files with duplicate detection | Productivity |
| **pr-create** | Create well-structured pull requests with proper descriptions | Git |

### Using Skills

Skills are invoked automatically based on context or explicitly:

```bash
# Invoke TDD workflow
"Let's implement this feature using TDD"

# Create a skill
"Use skill-creator to build a deployment skill"
```

---

## Agents

Specialized AI personas for different domains. Located in `.opencode/agent/`.

### Core Agents

| Agent | File | Description |
|-------|------|-------------|
| **OpenAgent** | `core/openagent.md` | Main orchestrator - routes requests to specialists |
| **OpenCoder** | `core/opencoder.md` | General-purpose coding agent |

### Development Agents

| Agent | File | Description |
|-------|------|-------------|
| **Backend Specialist** | `development/backend-specialist.md` | APIs, databases, server logic |
| **Frontend Specialist** | `development/frontend-specialist.md` | UI, UX, components, styling |
| **DevOps Specialist** | `development/devops-specialist.md` | CI/CD, deployment, containerization |
| **Codebase Agent** | `development/codebase-agent.md` | Codebase understanding and navigation |

### Language Specialists

| Agent | File | Triggers |
|-------|------|----------|
| **Python Pro** | `languages/python-pro.md` | `.py` files |
| **JavaScript Pro** | `languages/javascript-pro.md` | `.js`, `.mjs` files |
| **TypeScript Pro** | `languages/typescript-pro.md` | `.ts`, `.tsx` files |
| **Rust Pro** | `languages/rust-pro.md` | `.rs` files |
| **Go Pro** | `languages/golang-pro.md` | `.go` files |
| **SQL Pro** | `languages/sql-pro.md` | `.sql` files |

### Infrastructure Agents

| Agent | File | Triggers |
|-------|------|----------|
| **Terraform Specialist** | `infrastructure/terraform-specialist.md` | "terraform", "infrastructure", "IaC" |
| **Performance Engineer** | `infrastructure/performance-engineer.md` | "optimize", "performance", "slow" |
| **DevOps Troubleshooter** | `infrastructure/devops-troubleshooter.md` | "debug", "error", "not working" |
| **Security Specialist** | `infrastructure/security-specialist.md` | "security", "vulnerability", "CVE" |

### Content Agents

| Agent | File | Description |
|-------|------|-------------|
| **Copywriter** | `content/copywriter.md` | Marketing copy, messaging |
| **Technical Writer** | `content/technical-writer.md` | Documentation, guides |

### Data Agents

| Agent | File | Description |
|-------|------|-------------|
| **Data Analyst** | `data/data-analyst.md` | Data analysis and visualization |

### Subagents (Delegated Tasks)

| Agent | File | Description |
|-------|------|-------------|
| **Build Agent** | `subagents/code/build-agent.md` | Build verification and validation |
| **Coder Agent** | `subagents/code/coder-agent.md` | Code execution tasks |
| **Reviewer** | `subagents/code/reviewer.md` | Code review and quality checks |
| **Tester** | `subagents/code/tester.md` | Test authoring and TDD |
| **Codebase Pattern Analyst** | `subagents/code/codebase-pattern-analyst.md` | Pattern discovery in codebases |
| **Task Manager** | `subagents/core/task-manager.md` | Task breakdown and tracking |
| **Documentation** | `subagents/core/documentation.md` | Documentation generation |
| **Context Retriever** | `subagents/core/context-retriever.md` | Context file search and retrieval |

### System Builder Subagents

| Agent | File | Description |
|-------|------|-------------|
| **Agent Generator** | `subagents/system-builder/agent-generator.md` | Generate new agent definitions |
| **Command Creator** | `subagents/system-builder/command-creator.md` | Create custom slash commands |
| **Context Organizer** | `subagents/system-builder/context-organizer.md` | Organize context files |
| **Domain Analyzer** | `subagents/system-builder/domain-analyzer.md` | Analyze project domains |
| **Workflow Designer** | `subagents/system-builder/workflow-designer.md` | Design workflow definitions |

### Utility Subagents

| Agent | File | Description |
|-------|------|-------------|
| **Image Specialist** | `subagents/utils/image-specialist.md` | Image editing and analysis |

### Meta Agents

| Agent | File | Description |
|-------|------|-------------|
| **System Builder** | `meta/system-builder.md` | Build complete context systems |

---

## Commands

Slash commands for common operations. Located in `.opencode/command/`.

| Command | Description |
|---------|-------------|
| `/clean` | Format, lint, and clean up code (Prettier, ESLint, import sorting) |
| `/commit` | Create conventional commits with emoji |
| `/git-flow` | Start new development context (branch/worktree) |
| `/git-safety` | Run safety checks before merging (secrets, debug, conflicts) |
| `/git-commit` | Smart conventional commit generation with auto-detection |
| `/optimize` | Analyze and optimize code for performance and security |
| `/test` | Run the complete testing pipeline |
| `/worktrees` | Manage git worktrees for parallel development |
| `/context` | Analyze and understand project context and structure |
| `/build-context-system` | Create complete AI context architecture |

### Prompt Engineering Commands

| Command | Description |
|---------|-------------|
| `/prompt-enhancer` | Enhance prompts for better AI responses |
| `/prompt-optimizer` | Optimize prompts for specific models |

### Usage Examples

```bash
# Start a feature branch
/git-flow --medium "Add user authentication"

# Check before merging
/git-safety --strict

# Smart commit
/git-commit

# Clean and format
/clean
```

---

## Hooks

Lifecycle hooks that run at specific points during AI sessions. Located in `.opencode/hooks/`.

| Hook | When | Can Block | Purpose |
|------|------|-----------|---------|
| `pre_tool_use.py` | Before each tool call | Yes (exit 2) | Security validation, command blocking |
| `post_tool_use.py` | After each tool call | No | Logging, metrics, error tracking |
| `session_start.py` | Session begins | No | Load context, git status, GitHub issues |

### Hook Features

**pre_tool_use.py:**
- Blocks dangerous commands (`rm -rf /`, sensitive file access)
- Validates command safety before execution
- Can prevent tool execution by exiting with code 2

**post_tool_use.py:**
- Logs all tool usage to JSON files
- Tracks errors and file changes
- Monitors session activity

**session_start.py:**
- Loads project context files
- Fetches current git status
- Retrieves GitHub issues (if configured)
- Injects context into session

### Configuration

Hooks are configured in `.opencode/opencode.json`:

```json
{
  "hooks": {
    "PreToolUse": [{
      "matcher": "",
      "hooks": [{
        "type": "command",
        "command": "python3 $PROJECT_DIR/.opencode/hooks/pre_tool_use.py"
      }]
    }]
  }
}
```

---

## Plugins

Extensions that add functionality to OpenCode. Located in `.opencode/plugin/`.

### Agent Validator

Real-time validation of agent behavior against defined rules.

| Tool | Description |
|------|-------------|
| `validate_session` | Validate current session against rules |
| `check_approval_gates` | Check approval gate enforcement |
| `export_validation_report` | Export validation report to markdown |
| `analyze_delegation` | Analyze delegation decisions (4+ file rule) |
| `analyze_context_reads` | Show context files read during session |
| `check_context_compliance` | Verify context read before execution |
| `analyze_agent_usage` | Show agent activity and tool usage |
| `debug_validator` | Debug validator tracking state |

### Additional Plugin Features

- **Telegram Notify** (`telegram-notify.ts`) - Send notifications via Telegram
- **Notify** (`notify.ts`) - Generic notification system

---

## Tools

Custom tools that extend OpenCode capabilities. Located in `.opencode/tool/`.

### Gemini Image Tools

AI-powered image editing and analysis using Google Gemini.

| Tool | Description |
|------|-------------|
| `/gemini` | Edit images with natural language prompts |
| `/gemini_multiple_edit` | Advanced image editing |
| `/gemini_multiple_analyze` | Analyze images without editing |
| `/gemini_edit` | Auto-detection of pasted images |

### Setup

```bash
# Add to .env
GEMINI_API_KEY=your_api_key_here
```

### Usage

```bash
# Edit an image
/gemini "photo.png" "Add a vintage filter" "output.png"

# Analyze code screenshot
/gemini_multiple_analyze "code.png" "What bugs can you spot?"
```

### Environment Tools

Located in `.opencode/tool/env/` - Environment variable management utilities.

---

## Prompts System

Multi-model prompt variants with evaluation framework. Located in `.opencode/prompts/`.

### Available Variants

| Variant | Model Family | Status | Best For |
|---------|--------------|--------|----------|
| `default` | Claude | Stable | Production, Claude models |
| `gpt` | GPT | Stable | GPT-4, GPT-4o |
| `gemini` | Gemini | Stable | Gemini 2.0, Gemini Pro |
| `grok` | Grok | Stable | Grok models (free tier) |
| `llama` | Llama/OSS | Stable | Llama, Qwen, DeepSeek |

### Testing Variants

```bash
# Test with evaluation framework
cd evals/framework
npm run eval:sdk -- --agent=openagent --prompt-variant=llama --suite=smoke-test

# Switch variant permanently
./scripts/prompts/use-prompt.sh --agent=openagent --variant=llama
```

### Creating Custom Variants

1. Copy template: `cp .opencode/prompts/openagent/TEMPLATE.md .opencode/prompts/openagent/custom.md`
2. Edit metadata (YAML frontmatter)
3. Customize prompt content
4. Test with eval framework

---

## Context System

Domain knowledge and standards. Located in `.opencode/context/`.

### Core Context

| File | Description |
|------|-------------|
| `core/essential-patterns.md` | Essential coding patterns |
| `core/standards/code.md` | Code standards |
| `core/standards/docs.md` | Documentation standards |
| `core/standards/tests.md` | Testing standards |
| `core/standards/patterns.md` | Design patterns |
| `core/standards/analysis.md` | Analysis standards |
| `core/workflows/delegation.md` | Delegation workflow |
| `core/workflows/review.md` | Review workflow |
| `core/workflows/sessions.md` | Session management |
| `core/workflows/task-breakdown.md` | Task breakdown methodology |
| `core/workflows/design-iteration.md` | Design iteration process |
| `core/system/context-guide.md` | Context system guide |

### Development Context

| File | Description |
|------|-------------|
| `development/react-patterns.md` | React best practices |
| `development/api-design.md` | API design patterns |
| `development/clean-code.md` | Clean code principles |
| `development/animation-patterns.md` | Animation patterns |
| `development/design-systems.md` | Design system guidelines |
| `development/design-assets.md` | Design asset management |
| `development/ui-styling-standards.md` | UI styling standards |

### Content Context

| File | Description |
|------|-------------|
| `content/copywriting-frameworks.md` | Copywriting frameworks |
| `content/tone-voice.md` | Tone and voice guidelines |

### Project Context

| File | Description |
|------|-------------|
| `project/project-context.md` | Project-specific context (customize this!) |

### System Builder Templates

| File | Description |
|------|-------------|
| `system-builder-templates/SYSTEM-BUILDER-GUIDE.md` | Guide for building systems |
| `system-builder-templates/orchestrator-template.md` | Orchestrator agent template |
| `system-builder-templates/subagent-template.md` | Subagent template |

---

## Configuration

Main configuration in `.opencode/opencode.json`.

### Instructions

Files automatically loaded as context:

```json
{
  "instructions": [
    "OPENCODE.md",
    "CONTRIBUTING.md",
    "CLAUDE.md",
    ".cursorrules",
    "README.md"
  ]
}
```

### Permissions

Three permission levels:

| Level | Behavior | Examples |
|-------|----------|----------|
| `allow` | Execute without confirmation | `git`, `npm`, `python`, `ls` |
| `deny` | Block completely | `rm -rf /`, `sudo`, `kill -9` |
| `ask` | Require user confirmation | `rm`, `git push --force` |

### Pre-configured Safety

**Allowed (safe operations):**
- Git operations, package managers (npm, yarn, pip, cargo)
- Build tools, linters, formatters
- Docker, file read/write, search tools

**Denied (dangerous operations):**
- `rm -rf /`, `sudo`, `kill -9`
- Force pushes to main/master
- Disk formatting commands
- Docker system prune

**Ask (require confirmation):**
- File deletion (`rm`)
- Force push to branches
- Package uninstallation

---

## Directory Structure

```
.
├── .opencode/
│   ├── opencode.json          # Main configuration
│   ├── VERSION                # Version number
│   ├── README.md              # Internal documentation
│   │
│   ├── agent/                 # AI agent definitions
│   │   ├── core/              # Main agents (openagent, opencoder)
│   │   ├── development/       # Dev specialists
│   │   ├── languages/         # Language specialists
│   │   ├── infrastructure/    # DevOps/infra specialists
│   │   ├── content/           # Content creators
│   │   ├── data/              # Data specialists
│   │   ├── meta/              # System builder
│   │   └── subagents/         # Delegated task agents
│   │       ├── code/          # Code-related subagents
│   │       ├── core/          # Core subagents
│   │       ├── system-builder/ # System building subagents
│   │       └── utils/         # Utility subagents
│   │
│   ├── command/               # Slash commands
│   │   ├── git-flow.md
│   │   ├── git-safety.md
│   │   ├── git-commit.md
│   │   ├── clean.md
│   │   ├── commit.md
│   │   ├── optimize.md
│   │   ├── test.md
│   │   ├── worktrees.md
│   │   ├── context.md
│   │   ├── build-context-system.md
│   │   └── prompt-engineering/
│   │
│   ├── context/               # Domain knowledge
│   │   ├── core/              # Essential patterns & standards
│   │   ├── development/       # Dev standards
│   │   ├── content/           # Content standards
│   │   ├── project/           # Project-specific (customize!)
│   │   └── system-builder-templates/
│   │
│   ├── hooks/                 # Lifecycle hooks
│   │   ├── pre_tool_use.py
│   │   ├── post_tool_use.py
│   │   └── session_start.py
│   │
│   ├── skill/                 # Reusable workflows
│   │   ├── tdd/
│   │   ├── code-review/
│   │   ├── git-release/
│   │   ├── systematic-debugging/
│   │   ├── skill-creator/
│   │   ├── changelog-generator/
│   │   ├── mcp-builder/
│   │   ├── file-organizer/
│   │   └── pr-create/
│   │
│   ├── plugin/                # Extensions
│   │   ├── agent-validator.ts
│   │   ├── telegram-notify.ts
│   │   └── notify.ts
│   │
│   ├── tool/                  # Custom tools
│   │   ├── gemini/
│   │   ├── env/
│   │   └── template/
│   │
│   ├── prompts/               # Model-specific variants
│   │   ├── core/
│   │   ├── content/
│   │   ├── data/
│   │   └── development/
│   │
│   ├── ai-docs/               # AI documentation
│   │   ├── anthropic_*.md
│   │   ├── openai_*.md
│   │   └── cc_hooks_docs.md
│   │
│   └── node_modules/          # Dependencies
│
├── OPENCODE.md                # Project context template
├── .env.example               # Environment template
├── .gitignore
├── install.sh                 # One-line installer
├── update.sh                  # Update script
└── uninstall.sh               # Uninstall script
```

---

## Recommended Plugins

Install these globally for enhanced functionality:

| Plugin | Description | Install |
|--------|-------------|---------|
| [oh-my-opencode](https://github.com/code-yeongyu/oh-my-opencode) | Background agents, LSP/AST tools | `npm i -g oh-my-opencode` |
| [opencode-roadmap](https://github.com/IgorWarzocha/Opencode-Roadmap) | Strategic planning | `npm i -g opencode-roadmap` |
| [opencode-tokenscope](https://github.com/ramtinJ95/opencode-tokenscope) | Token usage analysis | `npm i -g opencode-tokenscope` |
| [opencode-dynamic-context-pruning](https://github.com/Tarquinen/opencode-dynamic-context-pruning) | Token optimization | `npm i -g opencode-dynamic-context-pruning` |

See [awesome-opencode](https://github.com/awesome-opencode/awesome-opencode) for more plugins.

---

## Resources

- [awesome-opencode](https://github.com/awesome-opencode/awesome-opencode) - Curated plugins, themes, agents
- [awesome-llm-skills](https://github.com/Prat011/awesome-llm-skills) - Skill patterns and examples
- [OpenAgents](https://github.com/darrenhinde/OpenAgents) - Original framework
- [OpenCode Docs](https://opencode.ai) - Official documentation

---

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests if applicable
5. Submit a pull request

---

## License

MIT
