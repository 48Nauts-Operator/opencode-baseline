#!/usr/bin/env bash
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

FORCE=false
KEEP_CONTEXT=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --force|-f)
      FORCE=true
      shift
      ;;
    --keep-context|-k)
      KEEP_CONTEXT=true
      shift
      ;;
    --help|-h)
      echo "OpenCode Baseline Uninstaller"
      echo ""
      echo "Usage: ./uninstall.sh [options]"
      echo ""
      echo "Options:"
      echo "  --force, -f        Skip confirmation prompt"
      echo "  --keep-context, -k Keep .opencode/context/project/ (your customizations)"
      echo "  --help, -h         Show this help"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

echo ""
echo -e "${YELLOW}╔══════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║   OpenCode Baseline Uninstaller      ║${NC}"
echo -e "${YELLOW}╚══════════════════════════════════════╝${NC}"
echo ""

if [[ ! -d ".opencode" ]]; then
  echo -e "${RED}No .opencode directory found. Nothing to uninstall.${NC}"
  exit 1
fi

if [[ "$FORCE" != true ]]; then
  echo "This will remove:"
  echo "  - .opencode/ directory"
  echo "  - OPENCODE.md (if exists)"
  echo ""
  if [[ "$KEEP_CONTEXT" = true ]]; then
    echo -e "${BLUE}Note: .opencode/context/project/ will be preserved${NC}"
    echo ""
  fi
  read -p "Are you sure? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
  fi
fi

if [[ "$KEEP_CONTEXT" = true ]] && [[ -d ".opencode/context/project" ]]; then
  echo -e "${BLUE}[INFO]${NC} Backing up project context..."
  BACKUP_DIR=$(mktemp -d)
  cp -r .opencode/context/project "$BACKUP_DIR/"
fi

echo -e "${BLUE}[INFO]${NC} Removing .opencode..."
rm -rf .opencode
echo -e "${GREEN}[OK]${NC} .opencode removed"

if [[ "$KEEP_CONTEXT" = true ]] && [[ -d "$BACKUP_DIR/project" ]]; then
  echo -e "${BLUE}[INFO]${NC} Restoring project context..."
  mkdir -p .opencode/context
  cp -r "$BACKUP_DIR/project" .opencode/context/
  rm -rf "$BACKUP_DIR"
  echo -e "${GREEN}[OK]${NC} Project context restored to .opencode/context/project/"
fi

if [[ -f "OPENCODE.md" ]]; then
  rm OPENCODE.md
  echo -e "${GREEN}[OK]${NC} OPENCODE.md removed"
fi

echo ""
echo -e "${GREEN}Uninstall complete.${NC}"
echo ""
