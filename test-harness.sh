#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

PASS_COUNT=0
WARN_COUNT=0
FAIL_COUNT=0

pass() {
  printf 'PASS  %s\n' "$1"
  PASS_COUNT=$((PASS_COUNT + 1))
}

warn() {
  printf 'WARN  %s\n' "$1"
  WARN_COUNT=$((WARN_COUNT + 1))
}

fail() {
  printf 'FAIL  %s\n' "$1"
  FAIL_COUNT=$((FAIL_COUNT + 1))
}

require_path() {
  local path="$1"
  if [[ -e "$path" ]]; then
    pass "Found $path"
  else
    fail "Missing $path"
  fi
}

json_ok() {
  local file="$1"
  if [[ ! -f "$file" ]]; then
    fail "Missing JSON file $file"
    return
  fi
  if node -e "JSON.parse(require('node:fs').readFileSync(process.argv[1],'utf8'))" "$file" >/dev/null 2>&1; then
    pass "Valid JSON: $file"
  else
    fail "Invalid JSON: $file"
  fi
}

node_check() {
  local file="$1"
  if [[ ! -f "$file" ]]; then
    fail "Missing script $file"
    return
  fi
  if node --check "$file" >/dev/null 2>&1; then
    pass "Node syntax ok: $file"
  else
    fail "Node syntax error: $file"
  fi
}

harness_has_post_edit_checks() {
  node - <<'NODE' >/dev/null 2>&1
const fs = require('node:fs');
const data = JSON.parse(fs.readFileSync('.agentic/harness.json', 'utf8'));
const hasCommands = Array.isArray(data.postEditCommands) && data.postEditCommands.length > 0;
const hasRules = Array.isArray(data.postEditRules) && data.postEditRules.length > 0;
process.exit(hasCommands || hasRules ? 0 : 1);
NODE
}

harness_has_stop_checks() {
  node - <<'NODE' >/dev/null 2>&1
const fs = require('node:fs');
const data = JSON.parse(fs.readFileSync('.agentic/harness.json', 'utf8'));
process.exit(Array.isArray(data.stopCommands) && data.stopCommands.length > 0 ? 0 : 1);
NODE
}

echo "== Agentic Harness Check =="
echo "Root: $ROOT_DIR"
echo

require_path "PROJECT-AGENTIC-INIT.md"
require_path "AGENTS.md"
require_path ".github/copilot-instructions.md"
require_path "docs/agentic-eval-pack.md"
require_path "test-harness.sh"

if [[ -L "CLAUDE.md" ]]; then
  target="$(readlink CLAUDE.md)"
  if [[ "$target" == "AGENTS.md" ]]; then
    pass "CLAUDE.md symlinks to AGENTS.md"
  else
    warn "CLAUDE.md is a symlink to $target, not AGENTS.md"
  fi
elif [[ -f "CLAUDE.md" ]]; then
  warn "CLAUDE.md exists but is not a symlink"
else
  fail "Missing CLAUDE.md"
fi

if [[ -L "GEMINI.md" ]]; then
  target="$(readlink GEMINI.md)"
  if [[ "$target" == "AGENTS.md" ]]; then
    pass "GEMINI.md symlinks to AGENTS.md"
  else
    warn "GEMINI.md is a symlink to $target, not AGENTS.md"
  fi
elif [[ -f "GEMINI.md" ]]; then
  warn "GEMINI.md exists but is not a symlink"
else
  fail "Missing GEMINI.md"
fi

json_ok ".agentic/harness.json"
json_ok ".claude/settings.json"

for file in .github/hooks/*.json; do
  [[ -e "$file" ]] || continue
  json_ok "$file"
done

for file in .agentic/hooks/*.mjs; do
  [[ -e "$file" ]] || continue
  node_check "$file"
done

if [[ -d ".agents/skills" ]]; then
  pass "Found canonical .agents/skills directory"
else
  fail "Missing canonical .agents/skills directory"
fi

if [[ -L ".claude/skills" ]]; then
  pass ".claude/skills adapter is a symlink"
elif [[ -d ".claude/skills" ]]; then
  warn ".claude/skills exists as a directory copy instead of a symlink"
else
  warn "Missing .claude/skills adapter"
fi

if [[ -f ".agentic/hooks/protect-files-copilot.mjs" ]]; then
  result="$(printf '{"toolName":"edit","toolArgs":{"file_path":".env"}}' | node .agentic/hooks/protect-files-copilot.mjs 2>/dev/null || true)"
  if echo "$result" | grep -q '"permissionDecision":"deny"'; then
    pass "Copilot protect-files hook denies .env edits"
  else
    fail "Copilot protect-files hook did not deny .env edits"
  fi
fi

if [[ -f ".agentic/hooks/protect-files-claude.mjs" ]]; then
  if printf '{"tool_name":"Edit","tool_input":{"file_path":".env"}}' | node .agentic/hooks/protect-files-claude.mjs >/dev/null 2>&1; then
    fail "Claude protect-files hook did not deny .env edits"
  else
    status=$?
    if [[ "$status" -eq 2 ]]; then
      pass "Claude protect-files hook denies .env edits"
    else
      fail "Claude protect-files hook failed with unexpected exit code $status"
    fi
  fi
fi

if [[ -f ".agentic/hooks/protect-files-copilot.mjs" ]]; then
  result="$(printf '{"toolName":"bash","toolArgs":{"command":"git -C /tmp push origin main"}}' | node .agentic/hooks/protect-files-copilot.mjs 2>/dev/null || true)"
  if echo "$result" | grep -q '"permissionDecision":"deny"'; then
    pass "Copilot protect-files hook denies git -C push commands"
  else
    fail "Copilot protect-files hook did not deny git -C push commands"
  fi
fi

if [[ -f ".agentic/hooks/protect-files-claude.mjs" ]]; then
  if printf '{"tool_name":"Bash","tool_input":{"command":"git -C /tmp push origin main"}}' | node .agentic/hooks/protect-files-claude.mjs >/dev/null 2>&1; then
    fail "Claude protect-files hook did not deny git -C push commands"
  else
    status=$?
    if [[ "$status" -eq 2 ]]; then
      pass "Claude protect-files hook denies git -C push commands"
    else
      fail "Claude protect-files hook failed with unexpected exit code $status for git -C push"
    fi
  fi
fi

if [[ -f ".agentic/hooks/stop-verify.mjs" ]]; then
  if output="$(node .agentic/hooks/stop-verify.mjs --dry-run 2>/dev/null)"; then
    if echo "$output" | grep -q '"commands"'; then
      pass "Stop verify dry-run returns commands"
    else
      warn "Stop verify dry-run returned no commands"
    fi
  else
    fail "Stop verify dry-run failed"
  fi
fi

if [[ -f ".agentic/harness.json" ]]; then
  if harness_has_post_edit_checks; then
    if [[ -f ".github/hooks/post-edit-check.json" ]]; then
      pass "Copilot post-edit hook wiring exists"
    else
      fail "Harness config expects Copilot post-edit hook wiring"
    fi
  fi

  if harness_has_stop_checks; then
    if [[ -f ".github/hooks/stop-verify.json" ]]; then
      pass "Copilot stop hook wiring exists"
    else
      fail "Harness config expects Copilot stop hook wiring"
    fi
  fi
fi

if [[ -f ".github/hooks/post-edit-check.json" && ! -f ".agentic/hooks/post-edit-check-copilot.mjs" ]]; then
  fail "Copilot post-edit hook configured but implementation missing"
fi

if [[ -f ".github/hooks/stop-verify.json" && ! -f ".agentic/hooks/stop-verify-copilot.mjs" ]]; then
  fail "Copilot stop hook configured but implementation missing"
fi

if [[ -f ".claude/settings.json" ]]; then
  if node - <<'NODE' >/dev/null 2>&1
const fs = require('node:fs');
const settings = JSON.parse(fs.readFileSync('.claude/settings.json', 'utf8'));
const harness = JSON.parse(fs.readFileSync('.agentic/harness.json', 'utf8'));
const hooks = settings.hooks || {};
const hasPostChecks = (Array.isArray(harness.postEditCommands) && harness.postEditCommands.length > 0)
  || (Array.isArray(harness.postEditRules) && harness.postEditRules.length > 0);
const hasStopChecks = Array.isArray(harness.stopCommands) && harness.stopCommands.length > 0;
if (!hooks.PreToolUse) process.exit(1);
if (hasPostChecks && !hooks.PostToolUse) process.exit(2);
if (hasStopChecks && !hooks.Stop) process.exit(3);
process.exit(0);
NODE
  then
    pass "Claude settings include expected hook wiring"
  else
    status=$?
    if [[ "$status" -eq 1 ]]; then
      fail "Claude settings are missing PreToolUse wiring"
    elif [[ "$status" -eq 2 ]]; then
      fail "Claude settings are missing PostToolUse wiring"
    elif [[ "$status" -eq 3 ]]; then
      fail "Claude settings are missing Stop wiring"
    else
      fail "Claude settings are missing expected hook wiring"
    fi
  fi
fi

echo
echo "Summary: ${PASS_COUNT} pass, ${WARN_COUNT} warn, ${FAIL_COUNT} fail"

if [[ "$FAIL_COUNT" -gt 0 ]]; then
  exit 1
fi

exit 0
