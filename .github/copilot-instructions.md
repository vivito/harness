# Copilot Instructions for Harness

Read `AGENTS.md` first. It is the canonical shared contract for this repository.

## Agentic Workflow

- Keep `PROJECT-AGENTIC-INIT.md`, `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, and `docs/agentic-eval-pack.md` aligned when the setup changes.
- Respect the technical enforcement layer in `.github/hooks/*.json`, `.github/instructions/**/*.instructions.md`, and `.agentic/harness.json`.
- For bugs, failing tests, or surprising behavior, use a root-cause-first flow before changing code.
- Before claiming success, use fresh verification evidence from the smallest credible command.
- For non-trivial or high-risk changes, run an appropriate review gate before concluding.
- Keep the default workflow lean; only add repo-local checklist skills when a repository explicitly benefits from the extra ceremony.
- Never run human-gated deployment commands without explicit approval.
- Default to the smallest credible validation, using the stop-gate commands from the project contract.

## Quick project summary

- Versioned, tool-neutral agentic harness for new or inherited software projects. This repository contains the canonical sources for the bootstrap command `agentic-project-init`, the `PROJECT-AGENTIC-INIT.md` template, shared instruction templates, and the global bootstrap skill.
- Stack: Bash scripts plus Node.js (ES Modules) for CLI and scaffold generation; uses standard Unix tools such as `sed`, `cp`, `ln`, and `python3`.
- Testing: Shell-based smoke and structure tests via `test-harness.sh`; syntax and parse checks via `bash -n` and `node --check`.
- Deployment: Local installation into user-home paths (`~/.local/bin`, `~/.config/agentic-bootstrap`, `~/.copilot/instructions`, `~/.agents/skills`, optionally `~/.claude/skills`); classic production deployment: please review.

## High-risk reminders

- **Auth:** there is no classic product auth layer; the critical area is permissions and hook policy in `.claude/settings.json`, `.github/hooks/*.json`, and the generated protect/stop hooks
- **Routing:** CLI flags, template resolution, and the two-stage flow `install.sh` -> `bin/agentic-project-init` -> `bin/apply-project-agentic-init.mjs`
- **Payments / orders:** none in this repository
- **Customer or personal data:** there is no product database, but user-home paths under `$HOME` (`~/.copilot`, `~/.agents`, `~/.claude`, `~/.config/agentic-bootstrap`) are sensitive
- **External APIs / SSO / sync:** no external web APIs in the code; the critical part is keeping repo sources, installed home-directory copies, and adapter/symlink structures in sync
- **Other critical flows:** generation of templates, guardrails, hooks, skills, and the eval pack; small changes can affect many generated files in target repositories
