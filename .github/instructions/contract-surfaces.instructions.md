---
applyTo: "AGENTS.md,PROJECT-AGENTIC-INIT.md,.github/copilot-instructions.md,.github/hooks/*.json,.github/instructions/**/*.instructions.md,.agentic/harness.json,.agentic/hooks/*.mjs,.claude/settings.json,.claude/agents/*.md,.agents/skills/**/*.md,skills/project-bootstrap/**/*.md,bin/agentic-project-init,bin/apply-project-agentic-init.mjs,templates/**/*.md,templates/**/*.sh,copilot/agentic-bootstrap.instructions.md,docs/agentic-eval-pack.md,docs/harness-token-optimization.md"
---

These files define the repo-level agent contract.

- Keep them aligned with `AGENTS.md`, `PROJECT-AGENTIC-INIT.md`, and `.agentic/harness.json`.
- Keep automatic hooks fast, quiet, non-recursive, and easy to disable.
- Only auto-wire stop hooks when cheap fast checks actually exist.
- Only treat file-scoped post-edit commands as cheap fast checks.
- Avoid broad global instructions when a narrower `applyTo` pattern is enough.
- Prefer the smallest credible validation after changes.
