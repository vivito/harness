# Stack Presets for /project-bootstrap

Diese Datei hilft `/project-bootstrap`, typische Projekttypen konsistent zu scaffolden.

## 1. Vite / Static Marketing Site

Typische Merkmale:

- `vite.config.*`
- `index.html`
- evtl. mehrere HTML-Entry-Points
- `build`, `dev`, `preview`

Empfohlene Outputs:

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
- `verify`-Skill
- `deploy`-Skill
- `surface`-Skill
- `agentic-eval-pack.md`

Default-Risiken:

- `dist/`
- `.vite/`
- Deployment-Skripte
- `.env*`
- manuelle Entry-Point-Verdrahtung

## 2. Next.js / App Router / Fullstack

Typische Merkmale:

- `next.config.*`
- `src/app/`
- `build`, `dev`, `start`
- ggf. Prisma oder API-Routes

Empfohlene Outputs:

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
- `verify`-Skill
- `deploy`-Skill
- `contracts`-Skill
- `agentic-eval-pack.md`

Default-Risiken:

- `.next/`
- `.env*`
- Auth
- API routes
- existing migrations
- local DB files

## 3. React SPA / Dashboard

Typische Merkmale:

- `src/main.*`
- Router
- component-heavy UI
- optional backend API in same repo

Empfohlene Outputs:

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
- `verify`-Skill
- `surface`-Skill
- optional `contracts`-Skill
- `agentic-eval-pack.md`

Default-Risiken:

- route surface drift
- shared state regressions
- generated output

## 4. Prisma / DB-Backed App

Zusätzliche Guardrails:

- block existing migrations from edits
- block local DB artifacts
- never auto-apply deploy migrations
- add `prisma validate` or equivalent to verify skill
- prefer a `stop-verify.mjs` hook that includes schema/runtime validation

## 5. Deployment Rule

Deployment should be:

- documented
- checklist-driven
- human-gated

Not:

- auto-approved
- silently triggered by a bootstrap
