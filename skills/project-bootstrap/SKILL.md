---
description: Scaffolds a repo-level Claude Code harness for a new or inherited software project. Use when the user wants a practical agentic setup with CLAUDE.md, .claude/, hooks, skills, subagents, and an eval pack. If PROJECT-AGENTIC-INIT.md exists in the repo root, use it as the project-specific contract.
model: sonnet
---

## Purpose

Bootstrap a practical Claude Code operating surface for a repository so future work starts from a strong default instead of an empty shell.

The target pattern is a **portable baseline plus dual enforcement layer** whenever the repo supports it:

1. `AGENTS.md` / `CLAUDE.md` / `GEMINI.md` / `.github/copilot-instructions.md`
2. Copilot-side enforcement via `.github/hooks/*.json` and `.github/instructions/**/*.instructions.md`
3. Claude-side enforcement via `.claude/settings.json`

Inside the enforcement layer, the preferred hook pattern is:

1. **PreToolUse** -> protect secrets, generated output, local DBs, existing migrations, and dangerous paths
2. **PostToolUse** -> run the smallest cheap post-edit check (formatter, linter, or syntax check)
3. **Stop / agentStop** -> run the required verification gate before the session can end cleanly

## Inputs to inspect first

1. `PROJECT-AGENTIC-INIT.md` in the repo root, if present
2. `package.json`, `pyproject.toml`, `go.mod`, `Cargo.toml`, `composer.json`, or equivalent manifests
3. `README.md`
4. existing `CLAUDE.md`, `AGENTS.md`, `CONTEXT.md`, `.github/copilot-instructions.md`
5. `.gitignore`
6. framework config such as `vite.config.*`, `next.config.*`, `playwright.config.*`, Prisma schema, deployment scripts, or CI files

## Optional project init file

If the repo contains `PROJECT-AGENTIC-INIT.md`, read it and treat it as the project-specific contract for:

- project summary
- stack
- validation commands
- preferred post-edit check commands
- required stop-gate verification commands
- protected paths
- deployment rules
- high-risk surfaces
- language/copy preferences
- desired project-specific skills

If it does not exist, infer these from the repository.

The user can generate a new project init file by copying:

- `~/.claude/skills/project-bootstrap/support/PROJECT-AGENTIC-INIT.template.md`

## Output to create or update

Bootstrap the smallest coherent set that fits the repo:

1. `CLAUDE.md`
2. `.claudeignore`
3. `AGENTS.md`
4. `GEMINI.md`
5. `.github/copilot-instructions.md`
6. `.github/instructions/**/*.instructions.md`
7. `.github/hooks/*.json`
8. `.claude/settings.json`
9. `.agentic/harness.json`
10. `.agentic/hooks/*`
11. `.claude/agents/<repo>-fast-worker.md`
12. `.claude/agents/<repo>-reviewer.md`
13. `.agents/skills/project-verify/SKILL.md`
14. `.agents/skills/project-deploy/SKILL.md`
15. `.agents/skills/project-contracts/SKILL.md`
16. `.agents/skills/systematic-debugging/SKILL.md`
17. `.agents/skills/verification-before-completion/SKILL.md`
18. `.agents/skills/requesting-code-review/SKILL.md`
19. `.claude/skills/` adapter when the repo supports it
20. extra stack-specific skills only when they add real leverage
21. `docs/agentic-eval-pack.md` or `agentic-eval-pack.md` if the repo has no `docs/` folder

## Bootstrap rules

### 1. Detect first, scaffold second

Infer:

- framework: Vite, Next.js, static site, React app, backend-heavy app, etc.
- validation commands that already exist
- generated or dangerous directories
- deployment commands that should stay human-gated
- cheap post-edit checks such as formatter, lint-on-file, or syntax checks
- required stop-gate checks such as build, test, lint, prisma/schema validation
- high-risk contracts such as auth, routing, migrations, payments, sync, or customer data

### 2. Merge, don’t bulldoze

If the repo already has meaningful `CLAUDE.md`, repo instructions, or agent files:

- merge carefully
- preserve repo-specific facts
- avoid replacing established instructions with generic boilerplate

If a file contains substantial custom content and the merge is ambiguous, stop and explain the conflict instead of overwriting.

### 3. Protect the obvious hazards

Default deny candidates:

- `.env` and secret files
- deploy commands
- destructive shell commands
- generated build output
- local databases
- existing migrations

Only allow commands that are both common and low-risk, such as:

- `git status`
- `git diff`
- build commands
- lint commands
- test commands
- syntax checks

### 3a. Hooks must be layered, not just blocked

Do not stop at `protect-files.cjs` alone if the repository can support more:

- **Always** scaffold a `PreToolUse` protection hook
- Scaffold a **PostToolUse** hook when there is a cheap and deterministic post-edit action
- Scaffold a **Stop / agentStop** hook when the repo has a meaningful verification gate

Examples:

- formatter present -> `PostToolUse` can format edited files
- linter or syntax checks present -> `PostToolUse` can run the smallest cheap check
- build/test/lint command present -> `Stop` hook should enforce it before completion

If no credible post-edit hook or stop-gate exists, explicitly say so in the result instead of pretending the setup is complete.

### 4. Fit the repo, don’t force symmetry

Different repos need different overlays:

- most repos: debugging, fresh verification, and review-gate skills as a baseline
- static or Vite sites: surface/entry-point skills
- Next.js apps: route/auth/data-contract skills
- Prisma repos: migration and schema guardrails
- Playwright repos: e2e-aware verify skill

Use the smallest set of skills that gives leverage.

### 5. Keep deployment human-gated

A deploy skill may document and checklist deployment, but should not silently turn deployment into a default agent action.

### 6. Validate the scaffold itself

After scaffolding:

- syntax-check hook scripts
- parse JSON settings
- smoke-test `protect-files.cjs` with a blocked path like `.env` and confirm it fails closed
- if the stop hook supports a dry-run mode, run it once to verify command selection
- verify that `.claude/settings.json` and `.github/hooks/*.json` actually reference the generated hooks
- report which files were created
- if the repo is a real git repo, the user asked for implementation, and a credible verification gate exists, commit and push after validation
- if the directory is not a git repo, state that commit/push is not possible

Never commit or push a scaffold that has no verification gate unless you explicitly tell the user that the repo still lacks a hard stop-check.

## Recommended skill names

Prefer stable, generic names inside the project:

- `project-verify`
- `project-deploy`
- `project-contracts`
- `systematic-debugging`
- `verification-before-completion`
- `requesting-code-review`
- `<project>-surface` or other stack-specific skill names only when the repo truly needs them

Use short names only if they are clearly project-specific and unlikely to collide.

## Stack presets

See:

- `~/.claude/skills/project-bootstrap/support/STACK-PRESETS.md`
- `~/.claude/skills/project-bootstrap/support/HOOKS-PATTERN.md`

If available, prefer seeding the repo first with the global command:

- `agentic-project-init /path/to/repo`

## Response contract

When you finish a bootstrap run, report:

1. detected stack and risks
2. files created or updated
3. validation performed
4. any manual follow-up still needed
