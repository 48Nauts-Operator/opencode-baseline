# Agent Integration Guide

How agents integrate with OpenCode and when they're triggered.

## Activation Modes

### 1. Context-Triggered (Automatic)
Agents activate when user input matches specific patterns:

| Pattern | Agent | Action |
|---------|-------|--------|
| "optimize", "performance", "slow" | performance-engineer | Profile and optimize |
| "debug", "error", "not working" | devops-troubleshooter | Diagnose issues |
| "security", "vulnerability", "CVE" | security-specialist | Security audit |
| "terraform", "infrastructure", "IaC" | terraform-specialist | Infrastructure code |

### 2. Language Detection (Automatic)
When working with specific file types:

| File Extension | Agent |
|----------------|-------|
| `.py` | python-pro |
| `.js`, `.mjs` | javascript-pro |
| `.ts`, `.tsx` | typescript-pro |
| `.rs` | rust-pro |
| `.go` | golang-pro |
| `.sql` | sql-pro |

### 3. Explicit Invocation
User can request specific agents:
- "Use the security specialist to review this"
- "Get the performance engineer to analyze this"

## Agent Structure

All agents follow this pattern:

```markdown
---
name: agent-name
description: When to use this agent. Use PROACTIVELY for [triggers].
---

You are a [role] specializing in [specialty].

## Focus Areas
- Area 1
- Area 2

## Approach
1. Step 1
2. Step 2

## Output
- Output type 1
- Output type 2
```

## Integration with Orchestrator

The main orchestrator (`openagent.md`) routes requests to specialists:

```
User Request
    ↓
Orchestrator (openagent.md)
    ↓ (analyzes request)
    ├── Simple → Handle directly
    ├── Frontend → frontend-specialist
    ├── Backend → backend-specialist
    ├── Language-specific → [language]-pro
    ├── Infrastructure → terraform-specialist / devops-troubleshooter
    ├── Performance → performance-engineer
    └── Security → security-specialist
```

## Adding New Agents

1. Create file in appropriate directory:
   - `languages/` - Language specialists
   - `infrastructure/` - DevOps/infra specialists
   - `development/` - Development domain specialists
   - `content/` - Content creation specialists

2. Follow the standard structure (see above)

3. Include "Use PROACTIVELY for [triggers]" in description

4. Document in this file's activation tables

## Best Practices

### For Agent Authors
- Be specific about focus areas
- Include concrete output formats
- Mention tools/frameworks in approach
- Keep descriptions action-oriented

### For Agent Users
- Let orchestrator route when possible
- Request specific agents for specialized tasks
- Combine agents for complex workflows (e.g., python-pro + performance-engineer)

## Agent Categories

### Core (Always Available)
- `openagent.md` - Main orchestrator
- `opencoder.md` - General coding

### Development
- `backend-specialist.md` - APIs, databases, server logic
- `frontend-specialist.md` - UI, UX, components
- `devops-specialist.md` - CI/CD, deployment

### Languages
- `python-pro.md` - Python expertise
- `javascript-pro.md` - JavaScript/Node.js
- `typescript-pro.md` - TypeScript type system
- `rust-pro.md` - Rust systems programming
- `golang-pro.md` - Go concurrency
- `sql-pro.md` - Database queries

### Infrastructure
- `terraform-specialist.md` - Infrastructure as Code
- `performance-engineer.md` - Optimization
- `devops-troubleshooter.md` - Incident response
- `security-specialist.md` - Security audits

### Content
- `copywriter.md` - Marketing copy
- `technical-writer.md` - Documentation

### Subagents (Delegated Tasks)
- `build-agent.md` - Build verification
- `coder-agent.md` - Code execution
- `reviewer.md` - Code review
- `tester.md` - Test authoring
