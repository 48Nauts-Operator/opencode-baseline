---
allowed-tools: Bash, Read, Write, Grep, Glob
description: Generate comprehensive analysis and documentation of entire codebase
---

# Comprehensive Codebase Analysis

## Project Discovery Phase

### Directory Structure
!`find . -type d -not -path "./node_modules/*" -not -path "./.git/*" -not -path "./dist/*" -not -path "./build/*" -not -path "./.next/*" -not -path "./coverage/*" | sort`

### Complete File Tree
!`if command -v tree >/dev/null 2>&1; then tree -a -I 'node_modules|.git|dist|build|.next|coverage|*.log' -L 4; else find . -maxdepth 3 -not -path "./node_modules/*" -not -path "./.git/*" -not -path "./dist/*" -not -path "./build/*" -not -path "./.next/*" -not -path "./coverage/*" -not -name "*.log" | sed 's|[^/]*/|- |g' | sort; fi`

### File Count and Size Analysis
- Total files: !`find . -type f -not -path "./node_modules/*" -not -path "./.git/*" | wc -l`
- Code files: !`find . -name "*.js" -o -name "*.ts" -o -name "*.jsx" -o -name "*.tsx" -o -name "*.py" | grep -v node_modules | wc -l`

## Configuration Files Analysis

### Package Management
- Package.json: @package.json
- Requirements.txt: @requirements.txt

### Build & Dev Tools
- TypeScript config: @tsconfig.json
- ESLint config: @.eslintrc.js

## Your Task

Based on all the discovered information above, create a comprehensive analysis that includes:

## 1. Project Overview
- Project type (web app, API, library, etc.)
- Tech stack and frameworks
- Architecture pattern (MVC, microservices, etc.)
- Language(s) and versions

## 2. Detailed Directory Structure Analysis
For each major directory, explain:
- Purpose and role in the application
- Key files and their functions
- How it connects to other parts

## 3. File-by-File Breakdown
Organize by category:
- **Core Application Files**: Main entry points, routing, business logic
- **Configuration Files**: Build tools, environment, deployment
- **Data Layer**: Models, database connections, migrations
- **Frontend/UI**: Components, pages, styles, assets  
- **Testing**: Test files, mocks, fixtures
- **Documentation**: README, API docs, guides

## 4. Architecture Deep Dive
Explain:
- Overall application architecture
- Data flow and request lifecycle
- Key design patterns used
- Dependencies between modules

## 5. Key Insights & Recommendations
Provide:
- Code quality assessment
- Potential improvements
- Security considerations
- Performance optimization opportunities

At the end, write all of the output into a file called "codebase_analysis.md"
