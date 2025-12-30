---
name: git-safety
description: Run comprehensive safety checks before merging
allowed-tools: [Bash, Read, Glob, Grep]
---

# Git Safety Check

Run comprehensive safety checks on the current branch before merging.

## Usage

```
/git-safety              # Standard check
/git-safety --strict     # Block on warnings (medium severity)
/git-safety --json       # Output as JSON
```

## Your Task

Execute a comprehensive safety check covering:

### 1. Git State Checks

```bash
# Check for uncommitted changes
git status --porcelain

# Check for untracked files
git ls-files --others --exclude-standard

# Check if branch is ahead/behind remote
git status -sb

# Check for merge conflicts
git diff --check
```

### 2. Code Quality Checks

```bash
# Check for debug statements (common patterns)
grep -rn "console\.log\|debugger\|print(\|pdb\|breakpoint()" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --include="*.py" . 2>/dev/null | head -20

# Check for TODO/FIXME comments
grep -rn "TODO\|FIXME\|XXX\|HACK" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --include="*.py" . 2>/dev/null | head -20

# Check for hardcoded secrets patterns
grep -rn "password\s*=\|api_key\s*=\|secret\s*=\|token\s*=" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --include="*.py" --include="*.env" . 2>/dev/null | head -10
```

### 3. Build/Test Checks (if available)

```bash
# Check if package.json exists and has test script
if [ -f package.json ]; then
  npm test 2>/dev/null || yarn test 2>/dev/null || echo "Tests not configured"
fi

# Check if pyproject.toml exists
if [ -f pyproject.toml ]; then
  pytest 2>/dev/null || echo "Python tests not configured"
fi

# TypeScript check
if [ -f tsconfig.json ]; then
  npx tsc --noEmit 2>/dev/null || echo "TypeScript check skipped"
fi
```

### 4. Safety Score Calculation

| Check | Pass | Fail | Severity |
|-------|------|------|----------|
| No uncommitted changes | +10 | -20 | Blocking |
| No merge conflicts | +10 | -50 | Blocking |
| No debug statements | +5 | -10 | Warning |
| No hardcoded secrets | +10 | -30 | Blocking |
| Tests pass | +15 | -15 | Warning |
| TypeScript compiles | +10 | -10 | Warning |
| No TODOs in diff | +5 | -5 | Info |

**Scoring:**
- 80-100: Safe to merge
- 60-79: Review warnings before merge
- Below 60: Not safe, blocking issues

### 5. Output Format

**Standard Output:**
```
Git Safety Check Results

Branch: feature/add-auth
Comparing to: main

Checks:
 Uncommitted changes    [ ] None found
 Merge conflicts        [ ] None found
 Debug statements       [ ] 3 found (warning)
 Hardcoded secrets      [ ] None found
 Tests                  [ ] Passed
 TypeScript             [ ] Compiled

Safety Score: 85/100

Warnings:
 - 3 console.log statements found in src/utils.ts

Verdict: SAFE TO MERGE (review warnings)
```

**Blocking Issues (NOT SAFE):**
```
Safety Score: 45/100

Blocking Issues:
  Uncommitted changes in 5 files
  Potential secrets in src/config.ts:15

Verdict: NOT SAFE - Resolve blocking issues first
```

### 6. Strict Mode (`--strict`)

In strict mode, warnings also block:
- Debug statements
- TODO/FIXME comments in diff
- Test failures

## Important Notes

- Always run from repository root
- Compare against the target merge branch (usually main/master)
- Secrets detection uses pattern matching (may have false positives)
- Review all warnings even if score is passing
