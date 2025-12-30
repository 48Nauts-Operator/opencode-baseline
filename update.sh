#!/usr/bin/env bash
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

REPO_URL="https://github.com/48Nauts-Operator/opencode-baseline"
BRANCH="main"
TEMP_DIR=$(mktemp -d)
BACKUP_DIR=$(mktemp -d)

PRESERVE_ITEMS=(
  "context/project"
  "opencode.json"
)

while [[ $# -gt 0 ]]; do
  case $1 in
    --branch|-b)
      BRANCH="$2"
      shift 2
      ;;
    --preserve|-p)
      PRESERVE_ITEMS+=("$2")
      shift 2
      ;;
    --full)
      PRESERVE_ITEMS=()
      shift
      ;;
    --help|-h)
      echo "OpenCode Baseline Updater"
      echo ""
      echo "Usage: ./update.sh [options]"
      echo ""
      echo "Options:"
      echo "  --branch, -b <branch>  Use specific branch (default: main)"
      echo "  --preserve, -p <path>  Additional path to preserve (can use multiple times)"
      echo "  --full                 Full update, don't preserve anything"
      echo "  --help, -h             Show this help"
      echo ""
      echo "Default preserved paths:"
      echo "  - context/project      (your project-specific context)"
      echo "  - opencode.json        (your configuration)"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

cleanup() {
  rm -rf "$TEMP_DIR" "$BACKUP_DIR"
}
trap cleanup EXIT

echo ""
echo -e "${BLUE}╔══════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   OpenCode Baseline Updater          ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════╝${NC}"
echo ""

if [[ ! -d ".opencode" ]]; then
  echo -e "${RED}No .opencode directory found. Run install.sh first.${NC}"
  exit 1
fi

if ! command -v git &> /dev/null; then
  echo -e "${RED}git is required but not installed.${NC}"
  exit 1
fi

echo -e "${BLUE}[INFO]${NC} Preserving custom files..."
for item in "${PRESERVE_ITEMS[@]}"; do
  if [[ -e ".opencode/$item" ]]; then
    mkdir -p "$BACKUP_DIR/$(dirname "$item")"
    cp -r ".opencode/$item" "$BACKUP_DIR/$item"
    echo -e "${GREEN}[OK]${NC} Backed up: $item"
  fi
done

if [[ -f "OPENCODE.md" ]]; then
  cp OPENCODE.md "$BACKUP_DIR/OPENCODE.md"
  echo -e "${GREEN}[OK]${NC} Backed up: OPENCODE.md"
fi

echo -e "${BLUE}[INFO]${NC} Downloading latest from $BRANCH..."
git clone --depth 1 --branch "$BRANCH" "$REPO_URL" "$TEMP_DIR/repo" 2>/dev/null || {
  echo -e "${RED}Failed to clone repository.${NC}"
  exit 1
}

echo -e "${BLUE}[INFO]${NC} Updating .opencode..."
rm -rf .opencode
cp -r "$TEMP_DIR/repo/.opencode" .
echo -e "${GREEN}[OK]${NC} .opencode updated"

echo -e "${BLUE}[INFO]${NC} Restoring preserved files..."
for item in "${PRESERVE_ITEMS[@]}"; do
  if [[ -e "$BACKUP_DIR/$item" ]]; then
    mkdir -p ".opencode/$(dirname "$item")"
    rm -rf ".opencode/$item"
    cp -r "$BACKUP_DIR/$item" ".opencode/$item"
    echo -e "${GREEN}[OK]${NC} Restored: $item"
  fi
done

if [[ -f "$BACKUP_DIR/OPENCODE.md" ]]; then
  cp "$BACKUP_DIR/OPENCODE.md" OPENCODE.md
  echo -e "${GREEN}[OK]${NC} Restored: OPENCODE.md"
fi

NEW_VERSION=$(cat "$TEMP_DIR/repo/.opencode/VERSION" 2>/dev/null || echo "unknown")

echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}  Update complete!${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo ""
echo "Updated to: $NEW_VERSION"
echo ""
echo "Preserved:"
for item in "${PRESERVE_ITEMS[@]}"; do
  [[ -e ".opencode/$item" ]] && echo "  - $item"
done
[[ -f "OPENCODE.md" ]] && echo "  - OPENCODE.md"
echo ""
echo "Review changes in:"
echo "  - .opencode/agent/       (new agents)"
echo "  - .opencode/command/     (new commands)"
echo "  - .opencode/skill/       (new skills)"
echo ""
