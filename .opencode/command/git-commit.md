---
name: git-commit
description: Create conventional commit with smart message generation
allowed-tools: [Bash, Read, Glob, Grep]
---

# Git Commit - Smart Conventional Commits

Create well-formatted commits following conventional commit standards with intelligent message generation.

## Usage

```
/git-commit                    # Auto-generate commit message from changes
/git-commit "message"          # Use provided message (will format conventionally)
/git-commit --amend            # Amend last commit (use carefully!)
/git-commit --dry-run          # Preview what would be committed
```

## Your Task

### 1. Analyze Changes

```bash
# Get staged changes
git diff --cached --stat
git diff --cached --name-only

# If nothing staged, check unstaged
git diff --stat
git diff --name-only

# Get recent commits for style reference
git log --oneline -5
```

### 2. Determine Commit Type

Based on file changes and diff content:

| Type | Trigger |
|------|---------|
| `feat` | New files in src/, components/, features/ |
| `fix` | Changes mentioning "fix", "bug", "issue", error handling |
| `docs` | Changes to .md, docs/, README |
| `style` | CSS, formatting-only changes |
| `refactor` | Restructuring without feature/fix |
| `test` | Test file changes |
| `chore` | Config, deps, build changes |
| `perf` | Performance improvements |

### 3. Generate Commit Message

**Format:** `type(scope): description`

**Rules:**
- Type: lowercase, from table above
- Scope: optional, infer from changed directories
- Description: imperative mood, lowercase start, no period
- Max 72 characters for first line

**Examples:**
```
feat(auth): add password reset functionality
fix(api): handle null response from user endpoint
docs: update installation instructions
refactor(utils): extract date formatting logic
test(auth): add unit tests for login flow
chore(deps): update typescript to 5.3
```

### 4. Execution Flow

**Standard commit:**
```bash
# Stage all changes (if nothing staged)
git add -A

# Verify what's being committed
git diff --cached --stat

# Create commit
git commit -m "type(scope): message"

# Show result
git log --oneline -1
```

**Dry run:**
```bash
# Show what would be committed without committing
git diff --cached --stat
echo "Would commit: type(scope): generated message"
```

**Amend (with safety checks):**
```bash
# SAFETY: Verify last commit is yours and not pushed
git log -1 --format='%an %ae'
git status  # Check if ahead of remote

# Only then amend
git commit --amend -m "type(scope): updated message"
```

### 5. Output

**Success:**
```
Commit Created

[feature/auth abc1234] feat(auth): add password reset flow

Files changed:
  src/auth/reset.ts (new)
  src/auth/index.ts (modified)
  
5 insertions(+), 2 deletions(-)
```

**Dry Run:**
```
Dry Run - No Commit Created

Would commit:
  Type: feat
  Scope: auth
  Message: add password reset flow
  
Files:
  src/auth/reset.ts (new)
  src/auth/index.ts (modified)
```

## Safety Rules

1. **Never amend** if:
   - Commit has been pushed to remote
   - Commit was not created by you
   - You're on main/master branch

2. **Always verify** staged changes match intent before committing

3. **Check for secrets** before committing:
   - .env files
   - API keys, tokens
   - Passwords in code

## Breaking Changes

If changes include breaking changes, format as:
```
feat(api)!: change authentication flow

BREAKING CHANGE: JWT tokens now expire after 1 hour instead of 24 hours
```

## Multi-line Messages

For complex changes, use body:
```
feat(auth): add OAuth2 support

- Add Google OAuth provider
- Add GitHub OAuth provider  
- Refactor auth middleware for multiple providers
- Add provider selection to login page
```
