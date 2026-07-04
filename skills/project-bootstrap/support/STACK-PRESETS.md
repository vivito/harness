# Stack Presets for /project-bootstrap

This file helps `/project-bootstrap` scaffold common project types consistently.

## 1. Vite / Static Marketing Site

Typical signals:

- `vite.config.*`
- `index.html`
- possibly multiple HTML entry points
- `build`, `dev`, `preview`

Recommended outputs:

- `CLAUDE.md`
- `.claudeignore`
- `.claude/settings.json`
- `.github/hooks/*.json`
- `.agentic/harness.json`
- `.agentic/hooks/protect-files-*.mjs`
- `.agentic/hooks/post-edit-check-*.mjs`
- `.agentic/hooks/stop-verify.mjs`
- `fast-worker`
- `reviewer`
- `verify` skill
- `deploy` skill
- `surface` skill
- `agentic-eval-pack.md`

Default risks:

- `dist/`
- `.vite/`
- deployment scripts
- `.env*`
- manual entry-point wiring

## 2. Next.js / App Router / Fullstack

Typical signals:

- `next.config.*`
- `src/app/`
- `build`, `dev`, `start`
- possibly Prisma or API routes

Recommended outputs:

- `CLAUDE.md`
- `.claudeignore`
- `.claude/settings.json`
- `.github/hooks/*.json`
- `.agentic/harness.json`
- `.agentic/hooks/protect-files-*.mjs`
- `.agentic/hooks/post-edit-check-*.mjs`
- `.agentic/hooks/stop-verify.mjs`
- `fast-worker`
- `reviewer`
- `verify` skill
- `deploy` skill
- `contracts` skill
- `agentic-eval-pack.md`

Default risks:

- `.next/`
- `.env*`
- auth
- API routes
- existing migrations
- local DB files

## 3. React SPA / Dashboard

Typical signals:

- `src/main.*`
- router
- component-heavy UI
- optional backend API in the same repo

Recommended outputs:

- `CLAUDE.md`
- `.claudeignore`
- `.claude/settings.json`
- `.github/hooks/*.json`
- `.agentic/harness.json`
- `.agentic/hooks/protect-files-*.mjs`
- `.agentic/hooks/post-edit-check-*.mjs`
- `.agentic/hooks/stop-verify.mjs`
- `fast-worker`
- `reviewer`
- `verify` skill
- `surface` skill
- optional `contracts` skill
- `agentic-eval-pack.md`

Default risks:

- route surface drift
- shared state regressions
- generated output

## 4. Prisma / DB-Backed App

Additional guardrails:

- block edits to existing migrations
- block local DB artifacts
- never auto-apply deploy migrations
- add `prisma validate` or equivalent to the verify skill
- prefer a `stop-verify.mjs` hook that includes schema/runtime validation

## 5. Deployment Rule

Deployment should be:

- documented
- checklist-driven
- human-gated

Not:

- auto-approved
- silently triggered by a bootstrap
