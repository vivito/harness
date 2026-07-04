#!/usr/bin/env bash
set -euo pipefail

SKIP_CLAUDE="0"
SKIP_COPILOT="0"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-claude)
      SKIP_CLAUDE="1"
      shift
      ;;
    --skip-copilot)
      SKIP_COPILOT="1"
      shift
      ;;
    --help|-h)
      cat <<'EOF'
Usage:
  bash install.sh [--skip-claude] [--skip-copilot]

Installs the harness kit from this repository into your user home:
  ~/.local/bin/agentic-project-init
  ~/.config/agentic-bootstrap/
  ~/.copilot/instructions/agentic-bootstrap.instructions.md
  ~/.agents/skills/project-bootstrap/
  ~/.claude/skills/project-bootstrap -> ~/.agents/skills/project-bootstrap (adapter)
EOF
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      exit 1
      ;;
  esac
done

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

mkdir -p "$HOME/.local/bin"
mkdir -p "$HOME/.config/agentic-bootstrap/bin"
mkdir -p "$HOME/.config/agentic-bootstrap/templates"

cp "$REPO_ROOT/bin/agentic-project-init" "$HOME/.local/bin/"
chmod +x "$HOME/.local/bin/agentic-project-init"
cp "$REPO_ROOT/bin/apply-project-agentic-init.mjs" "$HOME/.config/agentic-bootstrap/bin/"

cp "$REPO_ROOT/README.md" "$HOME/.config/agentic-bootstrap/README.md"
rm -rf "$HOME/.config/agentic-bootstrap/templates"
mkdir -p "$HOME/.config/agentic-bootstrap/templates"
cp -R "$REPO_ROOT/templates/." "$HOME/.config/agentic-bootstrap/templates/"

if [[ "$SKIP_COPILOT" != "1" ]]; then
  mkdir -p "$HOME/.copilot/instructions"
  cp "$REPO_ROOT/copilot/agentic-bootstrap.instructions.md" "$HOME/.copilot/instructions/"
fi

mkdir -p "$HOME/.agents/skills"
rm -rf "$HOME/.agents/skills/project-bootstrap"
cp -R "$REPO_ROOT/skills/project-bootstrap" "$HOME/.agents/skills/"

if [[ "$SKIP_CLAUDE" != "1" ]]; then
  mkdir -p "$HOME/.claude/skills"
  rm -rf "$HOME/.claude/skills/project-bootstrap"
  if ln -s "$HOME/.agents/skills/project-bootstrap" "$HOME/.claude/skills/project-bootstrap" 2>/dev/null; then
    :
  else
    cp -R "$HOME/.agents/skills/project-bootstrap" "$HOME/.claude/skills/"
  fi
fi

echo
echo "Installed harness kit from: $REPO_ROOT"
echo
echo "Installed:"
echo "  - ~/.local/bin/agentic-project-init"
echo "  - ~/.config/agentic-bootstrap/"
if [[ "$SKIP_COPILOT" != "1" ]]; then
  echo "  - ~/.copilot/instructions/agentic-bootstrap.instructions.md"
fi
echo "  - ~/.agents/skills/project-bootstrap/"
if [[ "$SKIP_CLAUDE" != "1" ]]; then
  echo "  - ~/.claude/skills/project-bootstrap"
fi
echo
echo "Next:"
echo "  1. Open a new terminal so ~/.local/bin is active"
echo "  2. Run: agentic-project-init --help"
