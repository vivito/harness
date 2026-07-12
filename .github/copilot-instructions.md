# Copilot Instructions for Harness

Canonical contract: `AGENTS.md`.

Read `PROJECT-AGENTIC-INIT.md` for detailed repo facts and `docs/harness-token-optimization.md` for hook behavior.

When changing the harness or repo-level agent setup:

- keep `PROJECT-AGENTIC-INIT.md`, `.agentic/harness.json`, `.agentic/hooks/`, `.github/hooks/*.json`, `.github/instructions/**/*.instructions.md`, `templates/`, and `bin/` aligned
- keep this file short and avoid duplicating detailed contract text here
- automatic hooks must stay cheap, quiet, non-recursive, and easy to disable with `HARNESS_HOOKS_DISABLED=1`
- do not wire repo-wide lint/build/test commands into automatic post-edit or stop hooks; keep them as manual full checks unless the repo declares a cheap targeted variant
- use `HARNESS_FAST_CHECKS` for automatic fast checks and `HARNESS_FULL_CHECKS` only for explicit full-check runs
- use root-cause-first investigation for bugs, the smallest credible validation before success claims, and a review gate for non-trivial or high-risk changes
- never run human-gated install, deploy, or publish commands without explicit approval
