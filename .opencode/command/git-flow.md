---
name: git-flow
description: Start new development context with appropriate branching strategy
allowed-tools: [Bash, Read, Write, Glob]
---

# Git Flow - Start New Development Context

Create a new development context with the appropriate branching strategy based on task size.

## Usage

```
/git-flow --small "Fix typo in README"
/git-flow --medium "Add user profile feature"  
/git-flow --large "Refactor authentication system"
/git-flow fix "Login validation bug"
/git-flow feature "User dashboard"
/git-flow refactor "Database layer"
```

## Task Classification

| Size | Keywords | Strategy |
|------|----------|----------|
| **Small** | fix, typo, comment, style, docs | Stay on current branch |
| **Medium** | add, update, enhance, improve, feature | Create feature branch |
| **Large** | implement, build, refactor, architecture | Create worktree (if supported) or feature branch |

## Your Task

When user invokes `/git-flow [size/keyword] "description"`:

### 1. Parse Input
- Extract size flag (`--small`, `--medium`, `--large`) or keyword
- Extract task description from quotes

### 2. Determine Strategy

**Small tasks** (stay on branch):
```bash
# Just confirm current state
git status
git branch --show-current
```

**Medium tasks** (feature branch):
```bash
# Create descriptive branch name from description
BRANCH_NAME=$(echo "$DESCRIPTION" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | tr -cd '[:alnum:]-')
git checkout -b "feature/${BRANCH_NAME}"
```

**Large tasks** (worktree or branch):
```bash
# Check if worktrees are available
git worktree list 2>/dev/null

# If worktrees work, create one:
WORKTREE_NAME=$(echo "$DESCRIPTION" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | tr -cd '[:alnum:]-')
git worktree add "../${WORKTREE_NAME}" -b "feature/${WORKTREE_NAME}"

# Otherwise, fall back to branch:
git checkout -b "feature/${WORKTREE_NAME}"
```

### 3. Report Results

Output should include:
- Current branch name
- Strategy used (main/branch/worktree)
- Task description recorded
- Next steps for the user

### Example Execution

**Input:** `/git-flow feature "Add user authentication"`

**Actions:**
1. Classify as "medium" (keyword: feature)
2. Generate branch name: `feature/add-user-authentication`
3. Execute: `git checkout -b feature/add-user-authentication`
4. Report success

**Output:**
```
Git Flow Context Created

Strategy: Feature Branch
Branch: feature/add-user-authentication
Task: Add user authentication

Ready to start development. When done, use /git-safety to verify before merging.
```

## Important Notes

- Always check for uncommitted changes first
- Use descriptive branch names derived from task description
- For large tasks, prefer worktrees if the repository supports them
- Record the context for later reference (optional: write to .git/CURRENT_TASK)
