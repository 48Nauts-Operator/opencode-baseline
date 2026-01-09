#!/usr/bin/env bash
#
# OpenCode Baseline Installer v2.0
# 
# Supports:
#   --global  (default) Install to ~/.config/opencode/ + ~/.claude/
#   --init              Create project-specific files in current directory
#   --project           Legacy: install to .opencode/ in current directory
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/48Nauts-Operator/opencode-baseline/main/install.sh | bash
#

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

REPO_URL="${OPENCODE_BASELINE_REPO:-https://github.com/48Nauts-Operator/opencode-baseline}"
BRANCH="${OPENCODE_BASELINE_BRANCH:-main}"
TEMP_DIR=$(mktemp -d)

INSTALL_MODE="global"
INSTALL_VOICE=true
FORCE=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --global)
      INSTALL_MODE="global"
      shift
      ;;
    --init)
      INSTALL_MODE="init"
      shift
      ;;
    --project)
      INSTALL_MODE="project"
      shift
      ;;
    --no-voice)
      INSTALL_VOICE=false
      shift
      ;;
    --force|-f)
      FORCE=true
      shift
      ;;
    --branch|-b)
      BRANCH="$2"
      shift 2
      ;;
    --help|-h)
      echo "OpenCode Baseline Installer v2.0"
      echo ""
      echo "Usage: curl -fsSL <url> | bash -s -- [options]"
      echo ""
      echo "Install Modes:"
      echo "  --global          Install globally (default) - ~/.config/opencode/ + ~/.claude/"
      echo "  --init            Create project-specific files only (OPENCODE.md, AGENTS.md, context)"
      echo "  --project         Legacy: install to .opencode/ in current directory"
      echo ""
      echo "Options:"
      echo "  --no-voice        Don't install Kokoro voice mode (Docker)"
      echo "  --force, -f       Overwrite existing directories"
      echo "  --branch, -b      Use specific branch (default: main)"
      echo "  --help, -h        Show this help"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

info() { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

cleanup() { rm -rf "$TEMP_DIR"; }
trap cleanup EXIT

echo ""
echo -e "${BLUE}╔══════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   OpenCode Baseline Installer v2.0   ║${NC}"
echo -e "${BLUE}║   Mode: ${INSTALL_MODE}                          ${NC}"
echo -e "${BLUE}╚══════════════════════════════════════╝${NC}"
echo ""

if ! command -v git &> /dev/null; then
  error "git is required but not installed."
fi

info "Downloading from $REPO_URL (branch: $BRANCH)..."
git clone --depth 1 --branch "$BRANCH" "$REPO_URL" "$TEMP_DIR/repo" 2>/dev/null || {
  error "Failed to clone repository. Check the URL and branch."
}

install_global() {
  local opencode_dir="$HOME/.config/opencode"
  local claude_dir="$HOME/.claude"
  
  info "Installing OpenCode baseline globally..."
  
  if [[ -d "$opencode_dir/skill" ]] && [[ "$FORCE" != true ]]; then
    warn "~/.config/opencode/skill already exists. Use --force to overwrite."
  fi
  
  mkdir -p "$opencode_dir"
  mkdir -p "$claude_dir/skills"
  mkdir -p "$claude_dir/commands"
  
  info "Installing to ~/.config/opencode/..."
  
  for dir in skill agent command tool plugin context prompts; do
    if [[ -d "$TEMP_DIR/repo/global/opencode/$dir" ]]; then
      cp -r "$TEMP_DIR/repo/global/opencode/$dir" "$opencode_dir/"
      success "Installed $dir/"
    elif [[ -d "$TEMP_DIR/repo/.opencode/$dir" ]]; then
      cp -r "$TEMP_DIR/repo/.opencode/$dir" "$opencode_dir/"
      success "Installed $dir/"
    fi
  done
  
  info "Installing to ~/.claude/..."
  
  if [[ -d "$TEMP_DIR/repo/global/claude-code/skills" ]]; then
    cp -r "$TEMP_DIR/repo/global/claude-code/skills/"* "$claude_dir/skills/" 2>/dev/null || true
    success "Installed Claude Code skills/"
  elif [[ -d "$TEMP_DIR/repo/.opencode/skill" ]]; then
    cp -r "$TEMP_DIR/repo/.opencode/skill/"* "$claude_dir/skills/" 2>/dev/null || true
    success "Installed Claude Code skills/ (from OpenCode format)"
  fi
  
  if [[ -d "$TEMP_DIR/repo/global/claude-code/commands" ]]; then
    cp -r "$TEMP_DIR/repo/global/claude-code/commands/"* "$claude_dir/commands/" 2>/dev/null || true
    success "Installed Claude Code commands/"
  fi
  
  if [[ -d "$TEMP_DIR/repo/ralph" ]]; then
    local ralph_dir="$opencode_dir/ralph"
    mkdir -p "$ralph_dir"
    cp -r "$TEMP_DIR/repo/ralph/"* "$ralph_dir/"
    chmod +x "$ralph_dir/ralph.sh" 2>/dev/null || true
    success "Installed Ralph autonomous loop to ~/.config/opencode/ralph/"
  fi
  
  success "Global installation complete!"
  echo ""
  echo "Installed to:"
  echo "  OpenCode: ~/.config/opencode/"
  echo "  Claude:   ~/.claude/"
  echo ""
  echo "Skills and commands are now available in all projects!"
}

install_init() {
  info "Initializing project-specific files..."
  
  if [[ -f "OPENCODE.md" ]] && [[ "$FORCE" != true ]]; then
    warn "OPENCODE.md already exists, skipping."
  else
    if [[ -f "$TEMP_DIR/repo/project-template/OPENCODE.md" ]]; then
      cp "$TEMP_DIR/repo/project-template/OPENCODE.md" .
    elif [[ -f "$TEMP_DIR/repo/OPENCODE.md" ]]; then
      cp "$TEMP_DIR/repo/OPENCODE.md" .
    fi
    success "Created OPENCODE.md"
  fi
  
  if [[ -f "AGENTS.md" ]] && [[ "$FORCE" != true ]]; then
    warn "AGENTS.md already exists, skipping."
  else
    cat > AGENTS.md << 'AGENTS_EOF'
# AGENTS.md - Project Learnings

## Codebase Patterns
<!-- Add patterns discovered during development -->

## Gotchas
<!-- Add things to watch out for -->

## Testing Notes
<!-- Add testing-specific guidance -->
AGENTS_EOF
    success "Created AGENTS.md"
  fi
  
  mkdir -p .opencode/context/project
  if [[ ! -f ".opencode/context/project/project-context.md" ]]; then
    cat > .opencode/context/project/project-context.md << 'CTX_EOF'
# Project Context

## Overview
<!-- Describe what this project does -->

## Tech Stack
<!-- List technologies used -->

## Key Directories
<!-- Explain the directory structure -->

## Development Notes
<!-- Add project-specific development guidance -->
CTX_EOF
    success "Created .opencode/context/project/project-context.md"
  fi
  
  success "Project initialization complete!"
  echo ""
  echo "Created:"
  echo "  OPENCODE.md                              - Project description for AI"
  echo "  AGENTS.md                                - Learnings and patterns"
  echo "  .opencode/context/project/               - Project-specific context"
  echo ""
  echo "Edit these files to customize AI behavior for your project."
}

install_project() {
  info "Installing to current directory (legacy mode)..."
  
  if [[ -d ".opencode" ]] && [[ "$FORCE" != true ]]; then
    error ".opencode directory already exists. Use --force to overwrite."
  fi
  
  if [[ "$FORCE" = true ]] && [[ -d ".opencode" ]]; then
    warn "Removing existing .opencode directory..."
    rm -rf .opencode
  fi
  
  cp -r "$TEMP_DIR/repo/.opencode" .
  success ".opencode installed"
  
  if [[ -f "$TEMP_DIR/repo/OPENCODE.md" ]] && [[ ! -f "OPENCODE.md" ]]; then
    cp "$TEMP_DIR/repo/OPENCODE.md" .
    success "OPENCODE.md installed"
  fi
  
  cp "$TEMP_DIR/repo/update.sh" . 2>/dev/null || true
  cp "$TEMP_DIR/repo/uninstall.sh" . 2>/dev/null || true
  chmod +x update.sh uninstall.sh 2>/dev/null || true
  
  success "Project installation complete!"
}

install_voice() {
  if [[ "$INSTALL_VOICE" != true ]]; then
    return
  fi
  
  info "Setting up Kokoro Voice Mode..."
  
  if ! command -v docker &> /dev/null; then
    warn "Docker not found. Skipping Kokoro voice mode."
    warn "Install Docker and run: docker run -d -p 8880:8880 ghcr.io/remsky/kokoro-fastapi-cpu:latest"
    return
  fi
  
  if docker ps -a --format '{{.Names}}' | grep -q '^kokoro-tts$'; then
    if docker ps --format '{{.Names}}' | grep -q '^kokoro-tts$'; then
      success "Kokoro voice mode already running"
    else
      docker start kokoro-tts
      success "Kokoro voice mode started"
    fi
  else
    info "Pulling and starting Kokoro TTS container..."
    docker run -d --name kokoro-tts -p 8880:8880 --restart unless-stopped ghcr.io/remsky/kokoro-fastapi-cpu:latest
    success "Kokoro voice mode installed (localhost:8880)"
  fi
}

case "$INSTALL_MODE" in
  global)
    install_global
    install_voice
    ;;
  init)
    install_init
    ;;
  project)
    install_project
    install_voice
    ;;
esac

echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}  Installation complete!${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo ""
echo -e "Docs: ${BLUE}https://github.com/48Nauts-Operator/opencode-baseline${NC}"
echo ""
