#!/usr/bin/env bash
#
# OpenCode Baseline Installer
# 
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/YOUR_ORG/open-code-baseline/main/install.sh | bash
#
# Or with options:
#   curl -fsSL ... | bash -s -- --no-env --no-opencode-md
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Config
REPO_URL="https://github.com/48Nauts-Operator/opencode-baseline"
BRANCH="main"
TEMP_DIR=$(mktemp -d)

# Options
INSTALL_ENV=true
INSTALL_OPENCODE_MD=true
FORCE=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --no-env)
      INSTALL_ENV=false
      shift
      ;;
    --no-opencode-md)
      INSTALL_OPENCODE_MD=false
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
      echo "OpenCode Baseline Installer"
      echo ""
      echo "Usage: curl -fsSL <url> | bash -s -- [options]"
      echo ""
      echo "Options:"
      echo "  --no-env          Don't copy .env.example"
      echo "  --no-opencode-md  Don't copy OPENCODE.md template"
      echo "  --force, -f       Overwrite existing .opencode directory"
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

# Functions
info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

success() {
  echo -e "${GREEN}[OK]${NC} $1"
}

warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
  echo -e "${RED}[ERROR]${NC} $1"
  exit 1
}

cleanup() {
  rm -rf "$TEMP_DIR"
}

trap cleanup EXIT

# Main
echo ""
echo -e "${BLUE}╔══════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   OpenCode Baseline Installer        ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════╝${NC}"
echo ""

# Check if .opencode already exists
if [[ -d ".opencode" ]]; then
  if [[ "$FORCE" = true ]]; then
    warn "Removing existing .opencode directory..."
    rm -rf .opencode
  else
    error ".opencode directory already exists. Use --force to overwrite."
  fi
fi

# Check for git
if ! command -v git &> /dev/null; then
  error "git is required but not installed."
fi

# Clone repository
info "Downloading from $REPO_URL (branch: $BRANCH)..."
git clone --depth 1 --branch "$BRANCH" "$REPO_URL" "$TEMP_DIR/repo" 2>/dev/null || {
  error "Failed to clone repository. Check the URL and branch."
}

# Copy .opencode directory
info "Installing .opencode directory..."
cp -r "$TEMP_DIR/repo/.opencode" .
success ".opencode installed"

# Copy OPENCODE.md
if [[ "$INSTALL_OPENCODE_MD" = true ]]; then
  if [[ -f "OPENCODE.md" ]]; then
    warn "OPENCODE.md already exists, skipping (use as reference: $TEMP_DIR/repo/OPENCODE.md)"
  else
    cp "$TEMP_DIR/repo/OPENCODE.md" .
    success "OPENCODE.md template installed"
  fi
fi

# Copy .env.example
if [[ "$INSTALL_ENV" = true ]]; then
  if [[ -f ".env" ]]; then
    warn ".env already exists, copying as .env.opencode-example"
    cp "$TEMP_DIR/repo/.env.example" .env.opencode-example
  elif [[ -f ".env.example" ]]; then
    warn ".env.example already exists, merging may be needed"
    cp "$TEMP_DIR/repo/.env.example" .env.opencode-example
  else
    cp "$TEMP_DIR/repo/.env.example" .env.example
    success ".env.example installed"
  fi
fi

# Summary
echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}  Installation complete!${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo ""
echo "Installed:"
echo "  .opencode/           - Agents, commands, skills, hooks"
[[ "$INSTALL_OPENCODE_MD" = true ]] && echo "  OPENCODE.md          - Project context template"
[[ "$INSTALL_ENV" = true ]] && echo "  .env.example         - Environment template"
echo ""
echo "Next steps:"
echo "  1. Edit OPENCODE.md with your project details"
echo "  2. Copy .env.example to .env and add API keys"
echo "  3. Customize .opencode/context/project/ for your needs"
echo ""
echo -e "Docs: ${BLUE}https://github.com/YOUR_ORG/open-code-baseline${NC}"
echo ""
