# Harness - Agent Contract

This file is the canonical shared contract for this project.

Detailed project facts, commands, guardrails, risks, language rules, and skill expectations live in `PROJECT-AGENTIC-INIT.md`.
Detailed hook behavior lives in `docs/harness-token-optimization.md`.

## Primary sources

1. `AGENTS.md` is the actively maintained shared contract.
2. `PROJECT-AGENTIC-INIT.md` is the detailed bootstrap source for project facts and validation commands.
3. `.agentic/harness.json` and `.agentic/hooks/` define the shared technical hook policy.
4. `.github/copilot-instructions.md`, `.github/instructions/**/*.instructions.md`, `CLAUDE.md`, and `GEMINI.md` stay as thin overlays.

## Working defaults

- Keep auto-loaded instructions lean and non-duplicated.
- For bugs, regressions, or failing tests, establish the root cause before changing code.
- Automatic hooks must stay cheap, quiet, non-recursive, and easy to disable with `HARNESS_HOOKS_DISABLED=1`.
- Only use automatic fast checks when the repo has truly cheap targeted commands; repo-wide lint/build/test belongs in manual full checks by default.
- `HARNESS_FAST_CHECKS` controls automatic fast checks; `HARNESS_FULL_CHECKS=1` is for explicit full-check runs.
- Deployment, publish, and home-directory installation remain human-gated.
- Before any success claim or handoff, run the smallest fresh verification that proves the claim.

## Repository focus

- Versioned bootstrap/harness repo for seeding repo-level agentic structure across projects.
- Source of truth is this repository, not installed copies under `$HOME`.
- Important change surfaces: `bin/agentic-project-init`, `bin/apply-project-agentic-init.mjs`, `templates/`, `.agentic/`, `.github/hooks/`, `.github/instructions/`, `skills/project-bootstrap/`, and `copilot/agentic-bootstrap.instructions.md`.

## Guardrails

- Do not patch installed copies under `~/.config/agentic-bootstrap/**`, `~/.copilot/instructions/**`, `~/.agents/skills/**`, or `~/.claude/skills/**` as the primary source of truth.
- Protect `.env*`, generated output, and user-home bootstrap/install paths.
- Keep hook output short and never stream full build, test, lint, or dependency logs back into agent context.

## Keep aligned when the setup changes

- `PROJECT-AGENTIC-INIT.md`
- `.agentic/harness.json` and `.agentic/hooks/*`
- `.github/hooks/*.json` and `.github/instructions/**/*.instructions.md`
- `templates/*`
- `bin/agentic-project-init` and `bin/apply-project-agentic-init.mjs`
- `.github/copilot-instructions.md`, `CLAUDE.md`, `GEMINI.md`, `docs/agentic-eval-pack.md`, and `docs/harness-token-optimization.md`

## Verification model

- Automatic fast checks are opt-in, path-scoped, and reserved for cheap deterministic commands.
- Full validation stays manual by default and should be exposed through `fullCheckCommands`, not wired into every edit or agent stop.
- Use `docs/harness-token-optimization.md` for the exact hook behavior and environment toggles.

## Language and copy rules

- Repository-facing text stays in English.
- Keep instructions concise, checklist-oriented, and implementation-focused.
