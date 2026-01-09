---
allowed-tools: WebFetch, Read, Write, Grep, TodoWrite
description: Fetches GitHub issue details and creates a comprehensive implementation specification
---

You are tasked with analyzing a GitHub issue and creating a detailed implementation plan.

## Process:

1. Fetch the issue details from the provided URL
2. Analyze the requirements and acceptance criteria
3. Create a comprehensive implementation specification including:
   - Problem statement
   - Solution approach
   - Technical implementation details
   - File changes required
   - Testing strategy
   - Edge cases to consider

## Output Format:

```markdown
# Issue Analysis: [Issue Title]

## Problem Statement
[Clear description of the problem]

## Proposed Solution
[High-level solution approach]

## Implementation Details
- [ ] Step 1: [Specific task]
- [ ] Step 2: [Specific task]
...

## Files to Modify
- `path/to/file1.js` - [Changes needed]
- `path/to/file2.js` - [Changes needed]

## Testing Strategy
[How to test the implementation]

## Edge Cases
[Potential issues and how to handle them]
```

Use the TodoWrite tool to create actionable tasks from the implementation plan.
