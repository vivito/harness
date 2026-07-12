# __PROJECT_NAME__ - Agent Contract

This file is the canonical shared contract for this project.

Use `PROJECT-AGENTIC-INIT.md` for the detailed project facts, commands, guardrails, risks, and hook preferences.
Use `docs/harness-token-optimization.md` for detailed hook behavior.

## Working defaults

- Keep auto-loaded instructions lean and non-duplicated.
- For bugs, regressions, and failing tests, establish the root cause before changing code.
- Prefer the smallest credible validation that proves the claim.
- Keep hooks fast, quiet, non-recursive, and easy to disable when the repo explicitly allows it.
- Keep repo-wide lint, build, and test commands out of automatic fast hooks unless the repo explicitly declares a cheap targeted variant.
- Deployment remains human-gated.
- Route non-trivial or high-risk results through a review gate before concluding.

## Required sources

1. `AGENTS.md` is the shared contract.
2. `PROJECT-AGENTIC-INIT.md` is the detailed bootstrap source when it exists.
3. `.agentic/harness.json` and `.agentic/hooks/` define the shared hook policy.
4. `.github/copilot-instructions.md`, `.github/instructions/**/*.instructions.md`, `CLAUDE.md`, and `GEMINI.md` stay as thin overlays.

## Guardrails

- Protect `.env*`, secrets, generated output, deploy steps, and local databases or existing migrations when relevant.
- Keep builds, tests, lint, and schema checks as narrow as possible.
- Do not overwrite mature repo conventions blindly when refining this setup from `PROJECT-AGENTIC-INIT.md`.
