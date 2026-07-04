# Copilot Instructions for __PROJECT_NAME__

Canonical project instructions live in `AGENTS.md`.

If `PROJECT-AGENTIC-INIT.md` exists:

1. treat it as the bootstrap contract for this repository
2. use it to refine `AGENTS.md`, validation flow, guardrails, and eval coverage
3. do not overwrite mature project rules blindly

Default expectations:

- deployment is human-gated
- smallest credible validation first
- protect `.env`, secrets, generated output, local databases, and existing migrations where relevant
- use `.github/hooks/*.json` and `.github/instructions/**/*.instructions.md` as the repo-local Copilot enforcement layer when present
- keep changes bounded and architecture-aware
