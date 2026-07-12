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

file_contains() {
  local file="$1"
  local needle="$2"
  local label="$3"
  if [[ ! -f "$file" ]]; then
    fail "Missing file $file for content check"
    return
  fi
  if grep -Fq "$needle" "$file"; then
    pass "$label"
  else
    fail "$label"
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
const hasFast = (Array.isArray(data.postEditCommands) && data.postEditCommands.length > 0)
  || (Array.isArray(data.postEditRules) && data.postEditRules.length > 0);
process.exit(hasFast ? 0 : 1);
NODE
}

harness_requires_workflow_skill() {
  local skill_name="$1"
  node - "$skill_name" <<'NODE' >/dev/null 2>&1
const fs = require('node:fs');
const skill = process.argv[2];
const data = JSON.parse(fs.readFileSync('.agentic/harness.json', 'utf8'));
const tooling = data.toolingPreferences || {};
const enabled = Object.values(tooling).some((entry) => entry && entry.skill === skill);
process.exit(enabled ? 0 : 1);
NODE
}

echo "== Agentic Harness Check =="
echo "Root: $ROOT_DIR"
echo

require_path "PROJECT-AGENTIC-INIT.md"
require_path "AGENTS.md"
require_path ".github/copilot-instructions.md"
require_path "docs/agentic-eval-pack.md"
require_path "docs/harness-token-optimization.md"
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

require_path ".claude/agents/project-reviewer.md"
file_contains ".claude/agents/project-reviewer.md" "tools: Read, Glob, Grep, Bash" "project-reviewer can inspect git diff via Bash"
file_contains ".claude/agents/project-reviewer.md" "git diff --name-only HEAD" "project-reviewer starts from changed files"
file_contains ".claude/agents/project-reviewer.md" "Do not scan the whole repository just in case." "project-reviewer stays bounded"

require_path ".agents/skills/project-verify/SKILL.md"
require_path ".agents/skills/project-deploy/SKILL.md"
require_path ".agents/skills/project-contracts/SKILL.md"

for skill in systematic-debugging verification-before-completion requesting-code-review; do
  if harness_requires_workflow_skill "$skill"; then
    require_path ".agents/skills/$skill/SKILL.md"
  else
    pass "Workflow skill $skill is not enabled in .agentic/harness.json"
  fi
done

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

if [[ -f ".agentic/hooks/post-edit-check-copilot.mjs" ]]; then
  result="$(printf '{"toolName":"read","toolArgs":{"path":"AGENTS.md"}}' | node .agentic/hooks/post-edit-check-copilot.mjs 2>/dev/null || true)"
  if [[ -z "$result" ]]; then
    pass "Copilot post-edit hook ignores read access"
  else
    fail "Copilot post-edit hook should ignore read access"
  fi

  result="$(printf '{"toolName":"edit","toolArgs":{"file_path":"AGENTS.md"}}' | node .agentic/hooks/post-edit-check-copilot.mjs 2>/dev/null || true)"
  if [[ -z "$result" ]]; then
    pass "Copilot post-edit hook ignores docs-only edits"
  else
    fail "Copilot post-edit hook should ignore docs-only edits"
  fi
fi

if [[ -f ".agentic/hooks/protect-files-copilot.mjs" ]]; then
  result="$(HARNESS_HOOKS_DISABLED=1 printf '{"toolName":"edit","toolArgs":{"file_path":".env"}}' | HARNESS_HOOKS_DISABLED=1 node .agentic/hooks/protect-files-copilot.mjs 2>/dev/null || true)"
  if [[ -z "$result" ]]; then
    pass "HARNESS_HOOKS_DISABLED bypasses automatic Copilot hooks"
  else
    fail "HARNESS_HOOKS_DISABLED should bypass automatic Copilot hooks"
  fi
fi

if [[ -f ".agentic/hooks/stop-verify.mjs" ]]; then
  if output="$(node .agentic/hooks/stop-verify.mjs --dry-run 2>/dev/null)"; then
    if echo "$output" | grep -q '"commands"'; then
      pass "Stop verify dry-run returns commands"
    else
      warn "Stop verify dry-run returned no commands"
    fi
    if echo "$output" | grep -q '"fullCommands"'; then
      pass "Stop verify dry-run exposes manual full checks"
    else
      fail "Stop verify dry-run should expose manual full checks"
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
const hasStopChecks = hasPostChecks;
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

if [[ -f "bin/agentic-project-init" && -f "bin/apply-project-agentic-init.mjs" && -f "templates/harness-token-optimization.md" ]]; then
  fixture_dir="$(mktemp -d)"
  if ./bin/agentic-project-init "$fixture_dir" --force >/dev/null 2>&1; then
    cat > "$fixture_dir/PROJECT-AGENTIC-INIT.md" <<'EOF'
# PROJECT-AGENTIC-INIT

## 1. Project Overview

- **Project Name:** Fixture
- **Short Description:** Fixture repo for harness compiler checks.
- **Customer Type / Context:** Test fixture

## 2. Tech Stack

- **Framework / Runtime:** Node.js
- **Frontend / Backend:** none
- **Database / ORM:** none
- **Testing:** npm
- **Deployment Target:** local

## 3. Important Commands

```bash
npm run lint
npm run test
```

### Cheap Post-Edit Checks

```bash
npm run lint
```

### Hard Stop Gates

```bash
npm run test
```

## 4. Hard Boundaries / Guardrails

- Files or paths that must never be edited automatically:
  - .env
- Secrets / environment files:
  - .env
- Deployment / production commands that always require human approval:
  - git push
- Database / migration rules:
  - none

## 5. High-Risk Surfaces

- Auth: none
- Routing: none
- Payments / orders: none
- Customer or personal data: none
- External APIs / SSO / sync: none
- Other critical flows: none

## 6. Architecture Rules

- existing patterns the agent should respect:
  - keep hooks lightweight
- preferred structure:
  - keep pathless checks manual
- things the agent should not introduce:
  - broad automatic hook checks

## 7. Language and Copy Rules

- Default language: English
- Tone / Copy direction: concise
- i18n specifics: none

## 8. Desired Skills

- Verify Skill: yes
- Deploy Skill: yes
- Surface Skill: no
- Contract Skill: yes

## 9. Desired Output

- `AGENTS.md`
- `.github/copilot-instructions.md`
- `.agentic/harness.json`
- `docs/harness-token-optimization.md`

## 10. Hook Preferences

- PreToolUse protection: yes
- PostToolUse checks: yes
- Stop gate with build/test/lint: yes
EOF

    mkdir -p "$fixture_dir/app/[slug]"
    : > "$fixture_dir/app/[slug]/page.tsx"

    if node bin/apply-project-agentic-init.mjs "$fixture_dir" >/dev/null 2>&1; then
      if node - "$fixture_dir" <<'NODE' >/dev/null 2>&1
const fs = require('node:fs');
const path = require('node:path');
const dir = process.argv[2];
const harness = JSON.parse(fs.readFileSync(path.join(dir, '.agentic/harness.json'), 'utf8'));
if ((harness.postEditCommands || []).length !== 0) process.exit(1);
if (!(harness.fullCheckCommands || []).includes('npm run lint')) process.exit(2);
if (!(harness.demotedPostEditCommands || []).includes('npm run lint')) process.exit(3);
process.exit(0);
NODE
      then
        pass "Pathless post-edit commands are demoted to manual full checks"
      else
        status=$?
        if [[ "$status" -eq 1 ]]; then
          fail "Pathless post-edit commands should not stay in automatic post-edit checks"
        elif [[ "$status" -eq 2 ]]; then
          fail "Demoted post-edit commands should move into full checks"
        elif [[ "$status" -eq 3 ]]; then
          fail "Harness should record demoted post-edit commands"
        else
          fail "Unexpected failure while checking demoted post-edit commands"
        fi
      fi

      if [[ ! -f "$fixture_dir/.github/hooks/post-edit-check.json" ]]; then
        pass "Pathless post-edit commands do not wire an automatic post-edit hook"
      else
        fail "Pathless post-edit commands should not wire an automatic post-edit hook"
      fi

      if [[ ! -f "$fixture_dir/.github/hooks/stop-verify.json" ]]; then
        pass "Pathless post-edit commands do not wire an automatic stop hook"
      else
        fail "Pathless post-edit commands should not wire an automatic stop hook"
      fi

      if grep -Fq "Commands moved out of the automatic fast lane" "$fixture_dir/docs/harness-token-optimization.md"; then
        pass "Demotion is documented in harness token optimization doc"
      else
        fail "Demotion should be documented in harness token optimization doc"
      fi

      cat > "$fixture_dir/PROJECT-AGENTIC-INIT.md" <<'EOF'
# PROJECT-AGENTIC-INIT

## 1. Project Overview

- **Project Name:** Fixture
- **Short Description:** Fixture repo for harness compiler checks.
- **Customer Type / Context:** Test fixture

## 2. Tech Stack

- **Framework / Runtime:** Node.js
- **Frontend / Backend:** none
- **Database / ORM:** none
- **Testing:** npm
- **Deployment Target:** local

## 3. Important Commands

```bash
eslint src/**/*.{ts,tsx} *.css
node --check app/[slug]/page.tsx
npm run test
```

### Cheap Post-Edit Checks

```bash
eslint src/**/*.{ts,tsx} *.css
node --check app/[slug]/page.tsx
```

### Hard Stop Gates

```bash
npm run test
```

## 4. Hard Boundaries / Guardrails

- Files or paths that must never be edited automatically:
  - .env
- Secrets / environment files:
  - .env
- Deployment / production commands that always require human approval:
  - git push
- Database / migration rules:
  - none

## 5. High-Risk Surfaces

- Auth: none
- Routing: none
- Payments / orders: none
- Customer or personal data: none
- External APIs / SSO / sync: none
- Other critical flows: none

## 6. Architecture Rules

- existing patterns the agent should respect:
  - keep hooks lightweight
- preferred structure:
  - keep explicit globs automatic
- things the agent should not introduce:
  - broad automatic hook checks

## 7. Language and Copy Rules

- Default language: English
- Tone / Copy direction: concise
- i18n specifics: none

## 8. Desired Skills

- Verify Skill: yes
- Deploy Skill: yes
- Surface Skill: no
- Contract Skill: yes

## 9. Desired Output

- `AGENTS.md`
- `.github/copilot-instructions.md`
- `.agentic/harness.json`
- `docs/harness-token-optimization.md`

## 10. Hook Preferences

- PreToolUse protection: yes
- PostToolUse checks: yes
- Stop gate with build/test/lint: yes
EOF

      if node bin/apply-project-agentic-init.mjs "$fixture_dir" >/dev/null 2>&1; then
        if node - "$fixture_dir" <<'NODE' >/dev/null 2>&1
const fs = require('node:fs');
const path = require('node:path');
const dir = process.argv[2];
const harness = JSON.parse(fs.readFileSync(path.join(dir, '.agentic/harness.json'), 'utf8'));
const commands = harness.postEditCommands || [];
const patterns = harness.postEditRules?.[0]?.patterns || [];
if (!commands.includes('eslint src/**/*.{ts,tsx} *.css')) process.exit(1);
if (!commands.includes('node --check app/[slug]/page.tsx')) process.exit(2);
if (!patterns.includes('src/**/*.ts')) process.exit(3);
if (!patterns.includes('src/**/*.tsx')) process.exit(4);
if (!patterns.includes('*.css')) process.exit(5);
if (!patterns.includes('app/[slug]/page.tsx')) process.exit(6);
if ((harness.demotedPostEditCommands || []).includes('eslint src/**/*.{ts,tsx} *.css')) process.exit(7);
if ((harness.demotedPostEditCommands || []).includes('node --check app/[slug]/page.tsx')) process.exit(8);
process.exit(0);
NODE
      then
        pass "Explicit globs and literal bracketed paths stay in the automatic fast lane"
      else
        status=$?
        if [[ "$status" -eq 1 ]]; then
          fail "Explicit glob-based post-edit command should stay automatic"
        elif [[ "$status" -eq 2 ]]; then
          fail "Literal bracketed file path should stay automatic"
        elif [[ "$status" -eq 3 ]]; then
          fail "Brace glob should expand to src/**/*.ts"
        elif [[ "$status" -eq 4 ]]; then
          fail "Brace glob should expand to src/**/*.tsx"
        elif [[ "$status" -eq 5 ]]; then
          fail "Root glob should remain trackable as *.css"
        elif [[ "$status" -eq 6 ]]; then
          fail "Literal bracketed file path should stay trackable"
        elif [[ "$status" -eq 7 ]]; then
          fail "Explicit tracked globs should not be demoted"
        elif [[ "$status" -eq 8 ]]; then
          fail "Literal bracketed file path should not be demoted"
        else
          fail "Unexpected failure while checking explicit path/glob expansion"
        fi
      fi

      if node - "$fixture_dir" <<'NODE' >/dev/null 2>&1
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const dir = process.argv[2];
(async () => {
  const mod = await import(pathToFileURL(path.join(dir, '.agentic/hooks/harness-lib.mjs')).href);
  if (!mod.matchesPathPattern('src/foo.ts', 'src/**/*.ts')) process.exit(1);
  if (!mod.matchesPathPattern('src/nested/foo.ts', 'src/**/*.ts')) process.exit(2);
})().catch(() => process.exit(3));
NODE
      then
        pass "Matcher treats **/ as zero or more directories"
      else
        status=$?
        if [[ "$status" -eq 1 ]]; then
          fail "Matcher should allow src/**/*.ts to match src/foo.ts"
        elif [[ "$status" -eq 2 ]]; then
          fail "Matcher should allow src/**/*.ts to match nested files"
        else
          fail "Unexpected failure while checking **/ matcher semantics"
        fi
      fi

      if [[ -f "$fixture_dir/.github/hooks/post-edit-check.json" ]]; then
        pass "Explicit tracked globs wire an automatic post-edit hook"
      else
        fail "Explicit tracked globs should wire an automatic post-edit hook"
      fi

      if [[ -f "$fixture_dir/.github/hooks/stop-verify.json" ]]; then
        pass "Explicit tracked globs wire an automatic stop hook"
      else
        fail "Explicit tracked globs should wire an automatic stop hook"
      fi

      cat > "$fixture_dir/PROJECT-AGENTIC-INIT.md" <<'EOF'
# PROJECT-AGENTIC-INIT

## 1. Project Overview

- **Project Name:** Fixture
- **Short Description:** Fixture repo for harness compiler checks.
- **Customer Type / Context:** Test fixture

## 2. Tech Stack

- **Framework / Runtime:** Node.js
- **Frontend / Backend:** none
- **Database / ORM:** none
- **Testing:** npm
- **Deployment Target:** local

## 3. Important Commands

```bash
eslint app/[slug]/*.tsx *.css
npm run test
```

### Cheap Post-Edit Checks

```bash
eslint app/[slug]/*.tsx *.css
```

### Hard Stop Gates

```bash
npm run test
```

## 4. Hard Boundaries / Guardrails

- Files or paths that must never be edited automatically:
  - .env
- Secrets / environment files:
  - .env
- Deployment / production commands that always require human approval:
  - git push
- Database / migration rules:
  - none

## 5. High-Risk Surfaces

- Auth: none
- Routing: none
- Payments / orders: none
- Customer or personal data: none
- External APIs / SSO / sync: none
- Other critical flows: none

## 6. Architecture Rules

- existing patterns the agent should respect:
  - keep hooks lightweight
- preferred structure:
  - demote unsupported glob syntax
- things the agent should not introduce:
  - broad automatic hook checks

## 7. Language and Copy Rules

- Default language: English
- Tone / Copy direction: concise
- i18n specifics: none

## 8. Desired Skills

- Verify Skill: yes
- Deploy Skill: yes
- Surface Skill: no
- Contract Skill: yes

## 9. Desired Output

- `AGENTS.md`
- `.github/copilot-instructions.md`
- `.agentic/harness.json`
- `docs/harness-token-optimization.md`

## 10. Hook Preferences

- PreToolUse protection: yes
- PostToolUse checks: yes
- Stop gate with build/test/lint: yes
EOF

      if node bin/apply-project-agentic-init.mjs "$fixture_dir" >/dev/null 2>&1; then
        if node - "$fixture_dir" <<'NODE' >/dev/null 2>&1
const fs = require('node:fs');
const path = require('node:path');
const dir = process.argv[2];
const harness = JSON.parse(fs.readFileSync(path.join(dir, '.agentic/harness.json'), 'utf8'));
if ((harness.postEditCommands || []).includes('eslint app/[slug]/*.tsx *.css')) process.exit(1);
if (!(harness.fullCheckCommands || []).includes('eslint app/[slug]/*.tsx *.css')) process.exit(2);
if (!(harness.demotedPostEditCommands || []).includes('eslint app/[slug]/*.tsx *.css')) process.exit(3);
process.exit(0);
NODE
      then
        pass "Unsupported bracket-glob commands are demoted as a whole"
      else
        status=$?
        if [[ "$status" -eq 1 ]]; then
          fail "Unsupported bracket-glob command should not stay automatic"
        elif [[ "$status" -eq 2 ]]; then
          fail "Unsupported bracket-glob command should move into full checks"
        elif [[ "$status" -eq 3 ]]; then
          fail "Unsupported bracket-glob command should be recorded as demoted"
        else
          fail "Unexpected failure while checking unsupported bracket-glob demotion"
        fi
      fi

      if [[ ! -f "$fixture_dir/.github/hooks/post-edit-check.json" ]]; then
        pass "Unsupported bracket-glob commands remove the automatic post-edit hook"
      else
        fail "Unsupported bracket-glob commands should not wire an automatic post-edit hook"
      fi

      if [[ ! -f "$fixture_dir/.github/hooks/stop-verify.json" ]]; then
        pass "Unsupported bracket-glob commands remove the automatic stop hook"
      else
        fail "Unsupported bracket-glob commands should not wire an automatic stop hook"
      fi
    else
      fail "apply-project-agentic-init fixture run failed"
    fi
  else
    fail "agentic-project-init fixture bootstrap failed"
  fi

  if [[ -d "$fixture_dir" ]]; then
    rm -r "$fixture_dir" 2>/dev/null || true
  fi
fi

echo
echo "Summary: ${PASS_COUNT} pass, ${WARN_COUNT} warn, ${FAIL_COUNT} fail"

if [[ "$FAIL_COUNT" -gt 0 ]]; then
  exit 1
fi

exit 0
