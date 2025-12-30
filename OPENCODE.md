# Project Name

> Project context file for OpenCode AI assistant. Customize this for your project.

## Overview

[Brief description of what this project does]

## Tech Stack

- **Language**: [e.g., TypeScript, Python]
- **Framework**: [e.g., Next.js, FastAPI]
- **Database**: [e.g., PostgreSQL, MongoDB]
- **Deployment**: [e.g., Vercel, AWS]

## Critical Rules

<!-- Add project-specific rules that AI must follow -->

### DO NOT

- [ ] Never modify production database directly
- [ ] Never commit secrets or API keys
- [ ] Never delete data without backup

### ALWAYS

- [ ] Run tests before committing
- [ ] Follow the existing code patterns
- [ ] Update documentation when changing APIs

## Git Workflow

<!-- Define your git workflow -->

- **Main branch**: `main` - production-ready code
- **Development**: Create feature branches from `main`
- **Naming**: `feature/`, `fix/`, `refactor/` prefixes
- **Commits**: Use conventional commit format

## Project Structure

```
project/
├── src/           # Source code
├── tests/         # Test files
├── docs/          # Documentation
└── scripts/       # Utility scripts
```

## Key Files

<!-- Point AI to important files -->

| File | Purpose |
|------|---------|
| `src/config.ts` | Application configuration |
| `src/types.ts` | TypeScript type definitions |
| `.env.example` | Environment variable template |

## Common Commands

```bash
# Development
npm run dev          # Start dev server
npm run build        # Build for production
npm test             # Run tests
npm run lint         # Check code style

# Database
npm run db:migrate   # Run migrations
npm run db:seed      # Seed database
```

## API Endpoints

<!-- Document key API endpoints if applicable -->

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/auth/login` | User login |

## Environment Variables

<!-- List required environment variables -->

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | Database connection string | Yes |
| `API_KEY` | External API key | Yes |
| `DEBUG` | Enable debug mode | No |

## Current Focus

<!-- Update this section with current work -->

### Active Tasks
- [ ] Task 1
- [ ] Task 2

### Known Issues
- Issue 1: [description]
- Issue 2: [description]

## Notes for AI

<!-- Special instructions for AI assistants -->

1. Check git status before making changes
2. Run linter after code modifications
3. Prefer editing existing files over creating new ones
4. Ask for clarification on ambiguous requirements
