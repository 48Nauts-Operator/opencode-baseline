# OpenCode Baseline

> A production-ready template for OpenCode AI assistant with pre-configured agents, skills, commands, hooks, and context.

![Version](https://img.shields.io/badge/version-0.4.0-blue)
![npm](https://img.shields.io/npm/v/opencode-baseline-hooks)
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
| **Skills** | 55 | Reusable workflows + domain knowledge (K8s, Security, LLM, MLOps, Research, etc.) |
| **Agents** | 35 | Specialized AI personas (language experts, DevOps, architecture, etc.) |
| **Commands** | 18 | Slash commands for operations + incident response + orchestration |
| **Hooks** | 3 | Lifecycle hooks (pre/post tool use, session start) |
| **Plugins** | 3 | Extensions (agent validator, notifications) |
| **Tools** | 4 | Custom tools (Gemini image editing, env management) |
| **Context Files** | 20+ | Domain knowledge and standards |

> **v0.4.0 Update**: Added 10 research skills from [GhostScientist/skills](https://github.com/GhostScientist/skills) - paper implementation, research workflows, and academic tools
>
> **v0.3.0 Update**: Added 27 new skills and 7 new agents from [wshobson/agents](https://github.com/wshobson/agents) (23k ⭐)

---

## Skills

Reusable workflows that teach AI how to perform specific tasks. Located in `.opencode/skill/`.

### Core Skills

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

### Kubernetes Skills (`skill/kubernetes/`)

| Skill | Description |
|-------|-------------|
| **k8s-manifest-generator** | Production-ready K8s manifests (Deployments, Services, ConfigMaps) |
| **helm-chart-scaffolding** | Helm chart creation, templating, multi-environment deployment |
| **gitops-workflow** | ArgoCD/Flux GitOps automation, declarative deployments |
| **k8s-security-policies** | Network policies, RBAC patterns, security hardening |

### Security Skills (`skill/security/`)

| Skill | Description |
|-------|-------------|
| **sast-configuration** | SAST tool setup (Semgrep, SonarQube, CodeQL), custom rules |
| **attack-tree-construction** | Threat modeling, attack path visualization |
| **stride-analysis-patterns** | STRIDE threat modeling methodology |
| **security-requirement-extraction** | Security requirements from specifications |
| **threat-mitigation-mapping** | Mapping threats to mitigations |

### LLM Development Skills (`skill/llm-dev/`)

| Skill | Description |
|-------|-------------|
| **langchain-architecture** | LangChain agents, chains, memory, tool integration |
| **rag-implementation** | Retrieval-Augmented Generation patterns |
| **prompt-engineering-patterns** | Prompt optimization, few-shot learning, chain-of-thought |
| **embedding-strategies** | Vector embeddings for semantic search |
| **vector-index-tuning** | Vector database optimization |
| **similarity-search-patterns** | Semantic similarity algorithms |
| **hybrid-search-implementation** | Combining keyword + semantic search |
| **llm-evaluation** | LLM output quality assessment |

### Developer Essentials (`skill/developer-essentials/`)

| Skill | Description |
|-------|-------------|
| **git-advanced-workflows** | Rebase, cherry-pick, bisect, worktrees, reflog |
| **auth-implementation-patterns** | JWT, OAuth2, session management, security |
| **error-handling-patterns** | Error handling across languages |
| **e2e-testing-patterns** | End-to-end testing strategies |
| **sql-optimization-patterns** | Query optimization, indexing |
| **monorepo-management** | Monorepo tooling and workflows |
| **bazel-build-optimization** | Bazel build system patterns |
| **turborepo-caching** | Turborepo caching strategies |
| **nx-workspace-patterns** | Nx monorepo patterns |

### MLOps Skills (`skill/mlops/`)

| Skill | Description |
|-------|-------------|
| **ml-pipeline-workflow** | End-to-end MLOps: data prep → training → deployment → monitoring |

### Research Skills (NEW - from [GhostScientist/skills](https://github.com/GhostScientist/skills))

| Skill | Description |
|-------|-------------|
| **implement-paper-from-scratch** | Step-by-step guide to implementing research papers from scratch |
| **paper-to-intuition** | Transform academic papers into deep, multi-layered understanding |
| **research-question-refiner** | Refine vague research interests into concrete, tractable questions |
| **research-taste-developer** | Develop intuition for what makes research "good" vs "incremental" |
| **reviewer-2-simulator** | Critique paper drafts as a skeptical reviewer would |
| **experiment-design-checklist** | Generate rigorous experiment designs with controls and metrics |
| **turn-this-feature-into-a-blog-post** | Generate technical blog posts from code implementations |
| **ios-app-icon-generator** | Generate complete iOS app icon sets with all required sizes |
| **create-watchos-version** | Plan watchOS companion apps from existing iOS/macOS projects |
| **hugging-face-space-deployer** | Deploy Hugging Face Spaces for ML models (Gradio, Streamlit) |

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
| **Event Sourcing Architect** | `development/event-sourcing-architect.md` | Event sourcing, CQRS, saga orchestration |
| **GraphQL Architect** | `development/graphql-architect.md` | GraphQL schema design, resolvers |
| **TDD Orchestrator** | `development/tdd-orchestrator.md` | Test-driven development coordination |

### Architecture Agents (NEW)

| Agent | File | Description |
|-------|------|-------------|
| **C4 Context** | `architecture/c4-context.md` | System context diagrams |
| **C4 Container** | `architecture/c4-container.md` | Container-level architecture |
| **C4 Component** | `architecture/c4-component.md` | Component diagrams |
| **C4 Code** | `architecture/c4-code.md` | Code-level documentation |

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

### Core Commands

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

### Incident Response Commands (NEW)

| Command | Description |
|---------|-------------|
| `/smart-fix` | 4-phase AI-powered debugging: analysis → root cause → fix → verification |
| `/incident-response` | Production incident triage and resolution workflow |

### Agent Orchestration Commands (NEW)

| Command | Description |
|---------|-------------|
| `/multi-agent-optimize` | Multi-agent performance optimization across system layers |
| `/improve-agent` | Agent improvement and optimization workflow |

### Architecture Commands (NEW)

| Command | Description |
|---------|-------------|
| `/c4-architecture` | Generate C4 model documentation from code |
| `/full-stack-feature` | End-to-end feature: backend → frontend → tests → security → deploy |

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

### npm Package (Alternative)

Install hooks as a standalone npm package with Kokoro TTS voice notifications:

```bash
npm install -g opencode-baseline-hooks
```

**Features:**
- 🔊 Kokoro TTS voice announcements (session start, task complete, errors)
- 🛡️ Security validation (blocks dangerous commands)
- 📝 Tool usage logging to JSON files
- 🔔 macOS notification fallback

**Environment Variables:**
```bash
KOKORO_URL=http://localhost:8880    # Kokoro TTS endpoint
KOKORO_VOICE=bf_emma                # Voice selection
OPENCODE_VOICE=off                  # Disable voice entirely
```

**Package:** [npmjs.com/package/opencode-baseline-hooks](https://www.npmjs.com/package/opencode-baseline-hooks)

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

## Ecosystem: Plugins, Tools & Extensions

A curated collection of OpenCode ecosystem tools discovered via parallel librarian agents.

### Core Plugins (Must-Have)

| Plugin | Stars | Description | Install |
|--------|-------|-------------|---------|
| [oh-my-opencode](https://github.com/code-yeongyu/oh-my-opencode) | 4,135 | Async subagents, LSP/AST tools, curated agents (Sisyphus, Oracle, Librarian) | `npm i -g oh-my-opencode` |
| [opencode-roadmap](https://github.com/IgorWarzocha/Opencode-Roadmap) | 16 | Persistent todo lists across sessions, multi-agent coordination | `npm i -g opencode-roadmap` |
| [opencode-tokenscope](https://github.com/ramtinJ95/opencode-tokenscope) | 31 | Token usage analysis & cost tracking per model | `npm i -g opencode-tokenscope` |
| [opencode-dynamic-context-pruning](https://github.com/Opencode-DCP/opencode-dynamic-context-pruning) | 233 | Intelligently prunes context to save tokens | `npm i -g opencode-dynamic-context-pruning` |
| [opencode-sessions](https://github.com/malhashemi/opencode-sessions) | 71 | Multi-agent session management & collaboration | `npm i -g opencode-sessions` |

### Multi-Agent Orchestration

| Plugin | Stars | Description |
|--------|-------|-------------|
| [claude-squad](https://github.com/smtg-ai/claude-squad) | 5,454 | Manage multiple AI terminal agents in parallel |
| [superset](https://github.com/superset-sh/superset) | 334 | Run dozens of agents in parallel using git worktrees |
| [swarm-tools](https://github.com/joelhooks/swarm-tools) | 250 | Multi-agent swarm coordination with learning |
| [opencode-background](https://github.com/zenobi-us/opencode-background) | 19 | Manage and communicate with background tasks |
| [kimaki](https://github.com/remorses/kimaki) | 118 | Control OpenCode agents via Discord (voice channels too!) |

### Context & Memory

| Plugin | Stars | Description |
|--------|-------|-------------|
| [Opencode-Context-Analysis-Plugin](https://github.com/IgorWarzocha/Opencode-Context-Analysis-Plugin) | 29 | Detailed token usage analysis for AI sessions |
| [opencode-context.nvim](https://github.com/cousine/opencode-context.nvim) | 25 | Neovim plugin for opencode in tmux pane |
| [Opencode-Context-Jar](https://github.com/IgorWarzocha/Opencode-Context-Jar) | 1 | Preserves edited files and consolidates context |
| [occtx](https://github.com/hungthai1401/occtx) | 19 | Switch between multiple opencode.json configs |
| [opencode-plugin-simple-memory](https://github.com/cnicolov/opencode-plugin-simple-memory) | 9 | Persistent memory across sessions |

### Development Tools

| Plugin | Stars | Description |
|--------|-------|-------------|
| [opencode-pty](https://github.com/shekohex/opencode-pty) | 43 | Interactive PTY - run background processes, send input, regex filtering |
| [opencode-type-inject](https://github.com/nick-vi/opencode-type-inject) | 25 | Auto-injects TypeScript types into file reads |
| [opencode-morph-fast-apply](https://github.com/JRedeker/opencode-morph-fast-apply) | 8 | 10x faster code editing with lazy edit markers |
| [opencode-beads](https://github.com/joshuadavidthomas/opencode-beads) | 35 | Plugin for beads issue tracker |
| [opencode-lmstudio](https://github.com/agustif/opencode-lmstudio) | 9 | Enhanced LM Studio with auto-detection |

### Authentication Providers

| Plugin | Stars | Description |
|--------|-------|-------------|
| [opencode-openai-codex-auth](https://github.com/numman-ali/opencode-openai-codex-auth) | 946 | OAuth for ChatGPT Plus/Pro subscriptions |
| [opencode-antigravity-auth](https://github.com/NoeFabris/opencode-antigravity-auth) | 590 | Auth for Antigravity models |
| [opencode-gemini-auth](https://github.com/jenslys/opencode-gemini-auth) | 331 | Gemini auth plugin |

### Skills & Workflows

| Plugin | Stars | Description |
|--------|-------|-------------|
| [opencode-skills](https://github.com/malhashemi/opencode-skills) | 434 | Curated skills collection |
| [opencode-skillful](https://github.com/zenobi-us/opencode-skillful) | 7 | Lazy load prompts on demand |
| [opencode-agent-skills](https://github.com/joshuadavidthomas/opencode-agent-skills) | 10 | Tools for using agent skills |
| [Opencode-Workflows](https://github.com/IgorWarzocha/Opencode-Workflows) | 13 | Evolving workflow examples |
| [opencode-workflows](https://github.com/mark-hingston/opencode-workflows) | 11 | Workflow automation via Mastra engine |

### Monitoring & Analytics

| Plugin | Stars | Description |
|--------|-------|-------------|
| [ocmonitor-share](https://github.com/Shlomob/ocmonitor-share) | 53 | CLI for monitoring OpenCode usage |
| [opencode-wrapped](https://github.com/moddi3/opencode-wrapped) | 64 | Year-in-review stats & visualizations |
| [opencode-subagent-logging](https://github.com/thatguyinabeanie/opencode-subagent-logging) | 3 | Subagent logging and monitoring |
| [opencode-otel](https://github.com/dan-jeff/opencode-otel) | 0 | OpenTelemetry integration |

### Code Quality & Review

| Plugin | Stars | Description |
|--------|-------|-------------|
| [opencode-review-helper](https://github.com/shamashel/opencode-review-helper) | 1 | Review AI-generated changes, suggest order, analyze impact |
| [opencode-debug-helper](https://github.com/shamashel/opencode-debug-helper) | 0 | Cursor-style debug mode with auto instrumentation |
| [opencode-reflection-plugin](https://github.com/dzianisv/opencode-reflection-plugin) | 3 | Reflection/judge layer to verify task completion |
| [Pickle-Thinker](https://github.com/IgorWarzocha/Pickle-Thinker) | 29 | Makes GLM & Big Pickle ultrathink |

### UI & Notifications

| Plugin | Stars | Description |
|--------|-------|-------------|
| [portal](https://github.com/hosenur/portal) | 126 | Mobile-first web UI with git + in-browser terminal |
| [opencode-vibe](https://github.com/joelhooks/opencode-vibe) | 97 | Next.js 16 web UI with streaming SSE |
| [openchamber](https://github.com/btriapitsyn/openchamber) | 77 | Desktop + web interface |
| [opencode-manager](https://github.com/chriswritescode-dev/opencode-manager) | 66 | Mobile-first multi-agent manager |
| [opencode.nvim](https://github.com/NickvanDyke/opencode.nvim) | 1,289 | Neovim integration |
| [opencode-notificator](https://github.com/panta82/opencode-notificator) | 1 | Desktop notifications |
| [opencode-voice-plugin](https://github.com/Olbrasoft/opencode-voice-plugin) | 1 | Text-to-speech with EdgeTTS |
| [voicemode](https://github.com/mbailey/voicemode) | 529 | Natural voice conversations + sound feedback |
| [cc-notifier](https://github.com/Rendann/cc-notifier) | 65 | macOS push notifications |

### Environment & Config

| Plugin | Stars | Description |
|--------|-------|-------------|
| [opencode-direnv](https://github.com/simonwjackson/opencode-direnv) | 7 | Auto-load direnv environment at session start |
| [opencode-ignore](https://github.com/lgladysz/opencode-ignore) | 9 | Restrict AI access via .ignore patterns |
| [opencode-rules](https://github.com/frap129/opencode-rules) | 3 | Handle rules files like Cursor |
| [opencode-eslint-formatter](https://github.com/samholmes/opencode-eslint-formatter) | 1 | ESLint as formatter when config detected |

### Agent Collections

| Repo | Stars | Description |
|------|-------|-------------|
| [OpenAgents](https://github.com/darrenhinde/OpenAgents) | 513 | Plan-first development with approval-based execution |
| [opencode-agents](https://github.com/veschin/opencode-agents) | 31 | Well-tested agent collection |
| [personal-agent-systems](https://github.com/darrenhinde/personal-agent-systems) | 30 | Agents to manage your life |
| [Opencode-Agent-Creator-Plugin](https://github.com/IgorWarzocha/Opencode-Agent-Creator-Plugin) | 2 | Create agents within TUI |

### Hooks & Automation

| Repo | Stars | Description |
|------|-------|-------------|
| [claude-code-hooks-mastery](https://github.com/disler/claude-code-hooks-mastery) | 2,002 | Comprehensive hook patterns guide |
| [claude-code-skill-factory](https://github.com/alirezarezvani/claude-code-skill-factory) | 267 | Hook generator, validator, template engine |

### Templates & Starters

| Repo | Stars | Description |
|------|-------|-------------|
| [opencode-plugin-template](https://github.com/zenobi-us/opencode-plugin-template) | 20 | Template for OpenCode plugins |
| [opencode-template](https://github.com/julianromli/opencode-template) | 22 | OpenCode template |
| [opencode-ultimate-starter](https://github.com/bruhismyname/opencode-ultimate-starter) | 5 | Ultimate starter with Oh My OpenCode + fixes |

### Utilities

| Repo | Stars | Description |
|------|-------|-------------|
| [Opencode-Extensions-TUI](https://github.com/IgorWarzocha/Opencode-Extensions-TUI) | 5 | TUI-based extensions manager |
| [OmO-Agent-Config](https://github.com/Zerostate-IO/OmO-Agent-Config) | 3 | CLI for Oh My OpenCode agent model assignments |
| [opencode-flake](https://github.com/AodhanHayter/opencode-flake) | 26 | Nix flake for OpenCode |
| [slipstream](https://github.com/rothnic/slipstream) | 1 | Oh-my-zsh plugin for warp-like AI via OpenCode |

---

## MCP Servers (Swiss Army Knives)

### All-in-One Powerhouses

| Server | Stars | Description |
|--------|-------|-------------|
| [PAL MCP Server](https://github.com/BeehiveInnovations/pal-mcp-server) | 10,685 | Multi-model: Claude/Gemini/OpenAI/Grok/Ollama |
| [Activepieces](https://github.com/activepieces/activepieces) | 20,134 | ~400 MCP servers for AI agents |
| [MindsDB](https://github.com/mindsdb/mindsdb) | 38,138 | "The only MCP Server you'll ever need" |
| [FastMCP](https://github.com/jlowin/fastmcp) | 21,568 | Fast, Pythonic MCP server builder |
| [Context7](https://github.com/upstash/context7) | 40,504 | Up-to-date code documentation for LLMs |

### Database Access

| Server | Stars | Description |
|--------|-------|-------------|
| [DBHub](https://github.com/bytebase/dbhub) | 1,809 | Zero-dep, multi-DB (Postgres, MySQL, SQLite, etc.) |
| [MongoDB MCP](https://github.com/mongodb-js/mongodb-mcp) | 868 | MongoDB Atlas integration |
| [Qdrant MCP](https://github.com/qdrant/mcp-server-qdrant) | 1,150 | Vector database |
| [Neo4j MCP](https://github.com/neo4j-contrib/neo4j-mcp) | 859 | Graph database |

### Browser Automation

| Server | Stars | Description |
|--------|-------|-------------|
| [Playwright MCP](https://github.com/microsoft/playwright-mcp) | 24,934 | Official Microsoft browser automation |
| [Browserbase MCP](https://github.com/browserbase/mcp-server) | 2,996 | Browser control with Stagehand |
| [Stealth Browser MCP](https://github.com/nicholasoxford/stealth-browser-mcp) | - | Bypasses Cloudflare and antibots |

### API Integrations

| Server | Stars | Description |
|--------|-------|-------------|
| [GitHub MCP](https://github.com/modelcontextprotocol/servers) | 25,530 | Official GitHub API integration |
| [Slack MCP](https://github.com/modelcontextprotocol/servers) | 1,042 | Slack integration |
| [Notion MCP](https://github.com/modelcontextprotocol/servers) | 3,636 | Notion API |
| [WhatsApp MCP](https://github.com/lharries/whatsapp-mcp) | 5,177 | WhatsApp integration |
| [AWS MCP](https://github.com/awslabs/mcp) | 7,749 | AWS services |
| [Cloudflare MCP](https://github.com/cloudflare/mcp-server-cloudflare) | 3,232 | Cloudflare services |
| [Kubernetes MCP](https://github.com/strowk/mcp-k8s-go) | 1,237 | K8s management |

### Search & Data

| Server | Stars | Description |
|--------|-------|-------------|
| [Exa MCP](https://github.com/exa-labs/exa-mcp-server) | 3,474 | Web search and crawling |
| [Firecrawl MCP](https://github.com/mendableai/firecrawl-mcp) | 5,152 | Web scraping and search |
| [Arxiv MCP](https://github.com/blazickjp/arxiv-mcp-server) | 1,985 | Search and analyze research papers |

### Productivity

| Server | Stars | Description |
|--------|-------|-------------|
| [Excel MCP](https://github.com/negokaz/excel-mcp-server) | 3,037 | Excel file manipulation |
| [Word MCP](https://github.com/GongRzhe/Office-Word-MCP-Server) | 1,284 | Word document editing |
| [PowerPoint MCP](https://github.com/GongRzhe/Office-PowerPoint-MCP-Server) | 1,357 | PowerPoint manipulation |
| [ElevenLabs MCP](https://github.com/elevenlabs/elevenlabs-mcp) | 1,121 | Text-to-speech |

### Curated Lists

| List | Stars | Description |
|------|-------|-------------|
| [awesome-mcp-servers](https://github.com/punkpeye/awesome-mcp-servers) | 77,862 | The definitive MCP collection |
| [MCP Registry](https://github.com/modelcontextprotocol/registry) | 6,188 | Official community registry |

---

## Resources

- [awesome-opencode](https://github.com/awesome-opencode/awesome-opencode) - Curated plugins, themes, agents (501 ⭐)
- [awesome-llm-skills](https://github.com/Prat011/awesome-llm-skills) - Skill patterns and examples
- [OpenAgents](https://github.com/darrenhinde/OpenAgents) - Plan-first development framework
- [OpenCode Docs](https://opencode.ai) - Official documentation
- [claude-code-hooks-mastery](https://github.com/disler/claude-code-hooks-mastery) - Hook patterns guide (2,002 ⭐)
- [opencode-plugins-manual](https://github.com/joshuadavidthomas/opencode-plugins-manual) - Unofficial plugin manual

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
