---
description: Choose and run the smallest useful verification flow for Harness. Use when validating whether a change is ready to commit.
---

## Current working tree

!`git status --short 2>/dev/null || true`

## Changed files

!`git diff --name-only HEAD 2>/dev/null; git ls-files --others --exclude-standard 2>/dev/null`

## Harness config

!`cat .agentic/harness.json`

## Instructions

1. Read `AGENTS.md` and `PROJECT-AGENTIC-INIT.md`.
2. Use automatic fast checks first when they cover the change:

```text
bash -n install.sh bin/agentic-project-init templates/test-harness.sh test-harness.sh
node --check bin/apply-project-agentic-init.mjs
node .agentic/hooks/run-node-checks.mjs .agentic/hooks/harness-lib.mjs .agentic/hooks/protect-files-copilot.mjs .agentic/hooks/protect-files-claude.mjs .agentic/hooks/post-edit-check-copilot.mjs .agentic/hooks/post-edit-check-claude.mjs .agentic/hooks/stop-verify.mjs .agentic/hooks/stop-verify-copilot.mjs .agentic/hooks/stop-verify-claude.mjs .agentic/hooks/run-json-checks.mjs .agentic/hooks/run-node-checks.mjs
node .agentic/hooks/run-json-checks.mjs .agentic/harness.json .claude/settings.json .github/hooks/protect-files.json .github/hooks/post-edit-check.json .github/hooks/stop-verify.json
```

3. Run manual full checks only when explicitly requested, before a commit when asked, or once at the end of a larger task:

```text
bash install.sh --help >/dev/null && ./bin/agentic-project-init --help >/dev/null
tmpdir="$(mktemp -d)" && trap 'rm -rf "$tmpdir"' EXIT && ./bin/agentic-project-init "$tmpdir" --force >/dev/null && node bin/apply-project-agentic-init.mjs "$tmpdir" >/dev/null && bash "$tmpdir/test-harness.sh"
```

4. Run the smallest credible subset that proves the change.
5. Report commands, result, and any remaining manual checks.
