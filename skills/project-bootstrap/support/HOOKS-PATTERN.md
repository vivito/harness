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
- keep files from drifting after each write

Possible actions:

- format edited file
- lint edited file
- syntax-check edited file
- lightweight schema validation

Recommended file:

- `.agentic/hooks/post-edit-check-copilot.mjs`
- `.agentic/hooks/post-edit-check-claude.mjs`

Use this layer only if the repo has a cheap post-edit command. Do not put a full test suite here.

## 3. Stop

Purpose:

- enforce the real verification gate before the agent can finish cleanly

Possible actions:

- build
- lint
- tests
- Prisma/schema validation

Recommended file:

- `.agentic/hooks/stop-verify.mjs`

Best practice:

- support `--dry-run` to print selected commands without running them
- fail non-zero when any required command fails

## 4. Settings wiring

The generated `.claude/settings.json` should usually wire hooks like this:

- `.github/hooks/protect-files.json` -> `protect-files-copilot.mjs`
- `.github/hooks/post-edit-check.json` -> `post-edit-check-copilot.mjs` when present
- `.github/hooks/stop-verify.json` -> `stop-verify.mjs` when present
- `.claude/settings.json` -> Claude-side wrappers in `.agentic/hooks/`

If `PostToolUse` or `Stop` are omitted, the bootstrap result must explain why.
