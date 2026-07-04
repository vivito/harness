---
description: Checklist for contract-sensitive work in Harness. Use when touching auth, routing, deployment, migrations, external integrations, or other high-risk surfaces.
---

## Contract workflow

1. Read `AGENTS.md`.
2. Read `PROJECT-AGENTIC-INIT.md`.
3. Confirm affected high-risk surfaces:

- **Auth:** there is no classic product auth layer; the critical area is permissions and hook policy in `.claude/settings.json`, `.github/hooks/*.json`, and the generated protect/stop hooks
- **Routing:** CLI flags, template resolution, and the two-stage flow `install.sh` -> `bin/agentic-project-init` -> `bin/apply-project-agentic-init.mjs`
- **Payments / orders:** none in this repository
- **Customer or personal data:** there is no product database, but user-home paths under `$HOME` (`~/.copilot`, `~/.agents`, `~/.claude`, `~/.config/agentic-bootstrap`) are sensitive
- **External APIs / SSO / sync:** no external web APIs in the code; the critical part is keeping repo sources, installed home-directory copies, and adapter/symlink structures in sync
- **Other critical flows:** generation of templates, guardrails, hooks, skills, and the eval pack; small changes can affect many generated files in target repositories

4. Use `.agentic/harness.json` to confirm stop-gate and protection assumptions.
5. Report:
   - affected contracts
   - likely downstream surfaces
   - recommended validation
