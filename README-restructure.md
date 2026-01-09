# OpenCode Baseline Restructure

This directory contains the new structure for the opencode-baseline repository.

## Overview

The restructured baseline supports **both OpenCode and Claude Code** from a single repository, with global installation as the default mode.

## New Structure

```
opencode-baseline/
├── global/
│   ├── opencode/                  → ~/.config/opencode/
│   │   └── skill/                 # All skills
│   │       ├── prd/               # PRD generation
│   │       ├── ralph/             # PRD to JSON converter
│   │       ├── dev-browser/       # Browser automation
│   │       ├── compound-engineering/
│   │       ├── docx/              # Document handling
│   │       ├── pdf/               # PDF manipulation
│   │       └── frontend-design/   # UI/UX design
│   │
│   └── claude-code/               → ~/.claude/
│       └── commands/              # 12 global commands
│           ├── five-whys.md
│           ├── design-review.md
│           ├── lyra.md
│           ├── utrathink.md
│           ├── analyze-issue.md
│           ├── refactor.md
│           ├── commit-fast.md
│           ├── tdd.md
│           ├── prompt_sec.md
│           ├── reload.md
│           ├── analyse_codebase.md
│           └── clean.md
│
├── ralph/                         # Autonomous loop system
│   ├── ralph.sh                   # Universal adapter (amp/opencode/claude)
│   ├── prompt.md                  # Agent instructions
│   └── prd.json.example           # Example PRD format
│
├── project-template/              # Used with --init flag
│   ├── OPENCODE.md                # Project description template
│   ├── AGENTS.md                  # Learnings template
│   └── .opencode/context/project/ # Project context
│
├── install.sh                     # Updated installer
└── README.md
```

## New Skills Added (7)

### From snarktank/amp-skills
| Skill | Description | Trigger Phrases |
|-------|-------------|-----------------|
| `prd` | Generate Product Requirements Documents | "create a prd", "plan this feature" |
| `ralph` | Convert PRDs to JSON for autonomous execution | "convert this prd", "ralph json" |
| `dev-browser` | Browser automation with persistent state | "go to", "click on", "screenshot" |
| `compound-engineering` | Plan → Work → Review → Compound loop | "plan this feature", "systematic development" |
| `docx` | Create/edit Word documents with tracked changes | Work with .docx files |
| `pdf` | PDF manipulation toolkit | Work with PDF files |
| `frontend-design` | Distinctive UI/UX interfaces | "build web component", "create page" |

## New Commands Added (12)

| Command | Description |
|---------|-------------|
| `/five-whys` | Root cause analysis methodology |
| `/design-review` | Comprehensive design review of git changes |
| `/lyra` | AI prompt optimization specialist |
| `/utrathink` | Multi-agent orchestration (4 sub-agents) |
| `/analyze-issue` | GitHub issue to implementation spec |
| `/refactor` | Code refactoring with best practices |
| `/commit-fast` | Conventional commits with smart staging |
| `/tdd` | Test-Driven Development enforcement |
| `/prompt_sec` | Security audit for APIs |
| `/reload` | Reload project memory from CLAUDE.md |
| `/analyse_codebase` | Full codebase analysis and documentation |
| `/clean` | Code cleanup, formatting, linting |

## Installation Modes

### Global Install (Default)
```bash
curl -fsSL https://raw.githubusercontent.com/48Nauts-Operator/opencode-baseline/main/install.sh | bash
```

Installs to:
- `~/.config/opencode/` (OpenCode skills)
- `~/.claude/` (Claude Code commands)

### Project Init
```bash
curl -fsSL .../install.sh | bash -s -- --init
```

Creates project-specific files in current directory:
- `OPENCODE.md` - Project description
- `AGENTS.md` - Learnings and patterns
- `.opencode/context/project/` - Project context

### Legacy Project Install
```bash
curl -fsSL .../install.sh | bash -s -- --project
```

Installs `.opencode/` directory to current project (old behavior).

## Ralph Autonomous Loop

The `ralph/` directory contains the autonomous execution system:

1. Create a PRD using `/prd` skill
2. Convert to JSON using `/ralph` skill
3. Run `ralph.sh` to execute user stories autonomously

```bash
# Start ralph loop
~/.config/opencode/ralph/ralph.sh
```

Ralph detects which CLI is available (amp, opencode, claude) and adapts automatically.

## Next Steps

To complete integration:

1. Copy this structure to your `opencode-baseline` repository
2. Push to GitHub
3. Run `./install.sh --global` to test installation
4. Use `/prd` and `/ralph` for autonomous development workflows
