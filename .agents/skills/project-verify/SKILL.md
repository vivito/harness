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
2. Use the stop-gate commands from the harness config:

```text
bash -n install.sh bin/agentic-project-init templates/test-harness.sh
node --check bin/apply-project-agentic-init.mjs
tmpdir="$(mktemp -d)" && trap 'rm -rf "$tmpdir"' EXIT && ./bin/agentic-project-init "$tmpdir" --force >/dev/null && node bin/apply-project-agentic-init.mjs "$tmpdir" >/dev/null && bash "$tmpdir/test-harness.sh"
```

3. Run the smallest credible subset that proves the change.
4. Report commands, result, and any remaining manual checks.
