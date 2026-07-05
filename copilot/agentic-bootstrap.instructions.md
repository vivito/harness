# Agentic Bootstrap Instructions

If a repository contains `PROJECT-AGENTIC-INIT.md`, treat it as the bootstrap contract for the project.

## Expected behavior

1. Read `PROJECT-AGENTIC-INIT.md` before designing a repo-level agentic setup.
2. If the repo was seeded by `agentic-project-init`, prefer the deterministic refresh path `agentic-project-init . --apply-init --force` over re-authoring the setup manually.
3. Treat `AGENTS.md` as the canonical shared instruction file for the project.
4. If `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `.github/copilot-instructions.md`, or `docs/agentic-eval-pack.md` are still generic starter files, refine them from the project contract and the repo itself.
5. If `.github/hooks/*.json`, `.github/instructions/**/*.instructions.md`, `.claude/settings.json`, `.agentic/harness.json`, `.agentic/hooks/`, or `.agents/skills/` exist, treat them as the technical guardrail layer and keep them aligned with the project contract.
6. Treat `.agents/skills/` as the canonical repo-local skill source. If `.claude/skills/` exists, it should usually be an adapter to that directory.
   - When repo-local skills are scaffolded, prefer a small baseline for debugging, fresh verification, and review gating before adding stack-specific extras.
7. Do not overwrite mature project-specific instructions blindly; merge carefully and stop on ambiguity.
8. Keep deployment human-gated.
9. Prefer the smallest credible validation.
10. Protect `.env`, secrets, generated output, local databases, and existing migrations where relevant.

## If the repo was seeded by `agentic-project-init`

Assume the file layout is intentional and complete the next layer of setup rather than reinventing a different structure.
