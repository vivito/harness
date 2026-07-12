# Hook Pattern for /project-bootstrap

This file defines the default hook layering expected from a strong repo bootstrap.

## 1. PreToolUse

Purpose:

- block edits to `.env*`, secrets, generated output, local DB artifacts, and existing migrations
- fail closed on protected paths

Recommended file:

- `.agentic/hooks/protect-files-copilot.mjs`
- `.agentic/hooks/protect-files-claude.mjs`

Required smoke test:

```bash
printf '{"toolName":"edit","toolArgs":{"file_path":".env"}}' | node .agentic/hooks/protect-files-copilot.mjs
printf '{"tool_name":"Edit","tool_input":{"file_path":".env"}}' | node .agentic/hooks/protect-files-claude.mjs
```

Expected behavior:

- non-zero exit
- explicit block message

## 2. PostToolUse

Purpose:

- run the cheapest deterministic post-edit action
- only run after relevant file changes, not after reads, searches, or docs-only edits
- keep files from drifting after each write without flooding the agent context

Possible actions:

- format edited file
- lint edited file
- syntax-check edited file
- lightweight schema validation

Recommended file:

- `.agentic/hooks/post-edit-check-copilot.mjs`
- `.agentic/hooks/post-edit-check-claude.mjs`

Use this layer only if the repo has a cheap post-edit command. Do not put a full test suite here.
Do not put repo-wide lint, build, or test commands here unless the repo provides an intentionally cheap targeted variant.

## 3. Stop

Purpose:

- enforce one fast final check per changed repo state before the agent can finish cleanly
- cache failures so the same unchanged state does not re-run forever

Possible actions:

- syntax
- targeted lint
- small schema or config validation

Recommended file:

- `.agentic/hooks/stop-verify.mjs`

Best practice:

- support `--dry-run` to print selected commands without running them
- only wire the automatic stop hook when at least one cheap fast check exists
- keep full-project lint, build, test, smoke, or integration commands in manual full checks
- run manual full checks only on explicit request or at the end of larger tasks
- return a short cached failure message for unchanged failing repo states instead of re-running
- fail non-zero when any required command fails

## 4. Settings wiring

The generated `.claude/settings.json` should usually wire hooks like this:

- `.github/hooks/protect-files.json` -> `protect-files-copilot.mjs`
- `.github/hooks/post-edit-check.json` -> `post-edit-check-copilot.mjs` when present
- `.github/hooks/stop-verify.json` -> `stop-verify.mjs` only when automatic fast stop checks exist
- `.claude/settings.json` -> Claude-side wrappers in `.agentic/hooks/`

If `PostToolUse` or `Stop` are omitted, the bootstrap result must explain why.
