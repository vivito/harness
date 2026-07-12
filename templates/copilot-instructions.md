# Copilot Instructions for __PROJECT_NAME__

Canonical project instructions live in `AGENTS.md`.

Keep this file short. Use `PROJECT-AGENTIC-INIT.md` for the detailed project contract and `docs/harness-token-optimization.md` for detailed hook behavior.

Default expectations:

- use root-cause analysis before fixing bugs, regressions, or failing tests
- deployment is human-gated
- smallest credible validation first
- use fresh verification output before success claims
- use a review gate for non-trivial or high-risk changes
- protect `.env`, secrets, generated output, local databases, and existing migrations where relevant
- keep `.github/hooks/*.json`, `.github/instructions/**/*.instructions.md`, `.agentic/harness.json`, and `.agentic/hooks/` aligned
- keep automatic hooks fast, quiet, non-recursive, and easy to disable
- do not wire pathless or repo-wide lint, build, or test commands into automatic post-edit or stop hooks unless the repo declares a cheap file-scoped variant
