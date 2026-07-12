# PROJECT-AGENTIC-INIT

This file is the tool-neutral bootstrap contract for Harness.

Put it into a new project and then ask your agent something like:

```text
Use PROJECT-AGENTIC-INIT.md and set up the agentic environment for this project.
```

## 1. Project Overview

- **Project Name:** Harness
- **Short Description:** Versioned, tool-neutral agentic harness for new or inherited software projects. This repository contains the canonical sources for the bootstrap command `agentic-project-init`, the `PROJECT-AGENTIC-INIT.md` template, shared instruction templates, and the global bootstrap skill.
- **Customer Type / Context:** Meta/tooling repository for repo bootstrap and agentic guardrails; not a classic end-user product.
- **Important goals of the agent setup:**
  - scaffold a clean agentic structure into new projects quickly
  - support Copilot and Claude in parallel
  - combine portability with technical enforcement

## 2. Tech Stack

- **Framework / Runtime:** Bash scripts plus Node.js (ES Modules) for CLI and scaffold generation; uses standard Unix tools such as `sed`, `cp`, `ln`, and `python3`.
- **Frontend / Backend:** Not a classic frontend/backend product; repository for CLI bootstrap, template rendering, hook/policy generation, and skill/instruction scaffolding.
- **Database / ORM:** No application database and no ORM.
- **Testing:** Shell-based smoke and structure tests via `test-harness.sh`; syntax and parse checks via `bash -n` and `node --check`.
- **Deployment Target:** Local installation into user-home paths (`~/.local/bin`, `~/.config/agentic-bootstrap`, `~/.copilot/instructions`, `~/.agents/skills`, optionally `~/.claude/skills`); classic production deployment: please review.

## 3. Important Commands

```bash
# install / make globally available
bash install.sh
bash install.sh --skip-claude
bash install.sh --skip-copilot

# local CLI smoke / help text
./bin/agentic-project-init --help
bash install.sh --help

# bootstrap into a target repo
./bin/agentic-project-init /path/to/target-repo --force
node bin/apply-project-agentic-init.mjs /path/to/target-repo

# README flow after installation (inside the target repo)
agentic-project-init .
agentic-project-init . --apply-init --force

# repo-wide smoke validation against a temporary target repo
tmpdir="$(mktemp -d)" && trap 'rm -rf "$tmpdir"' EXIT && ./bin/agentic-project-init "$tmpdir" --force >/dev/null && node bin/apply-project-agentic-init.mjs "$tmpdir" >/dev/null && bash "$tmpdir/test-harness.sh"

# targeted hook smoke test
tmpdir="$(mktemp -d)" && trap 'rm -rf "$tmpdir"' EXIT && ./bin/agentic-project-init "$tmpdir" --force >/dev/null && node bin/apply-project-agentic-init.mjs "$tmpdir" >/dev/null && printf '{"toolName":"edit","toolArgs":{"file_path":".env"}}' | node "$tmpdir/.agentic/hooks/protect-files-copilot.mjs"

# deploy / release
# please review: no dedicated deploy or publish script was found in the repo
```

### Cheap Post-Edit Checks

Only list truly cheap, file-scoped commands here. Commands without explicit repo paths or harness-trackable globs are treated as manual full checks even if they are listed in this block. If the repo only has full-project lint, build, or test commands, leave this block empty and keep those commands under Hard Stop Gates.

```bash
bash -n install.sh bin/agentic-project-init templates/test-harness.sh test-harness.sh
node --check bin/apply-project-agentic-init.mjs
node .agentic/hooks/run-node-checks.mjs .agentic/hooks/harness-lib.mjs .agentic/hooks/protect-files-copilot.mjs .agentic/hooks/protect-files-claude.mjs .agentic/hooks/post-edit-check-copilot.mjs .agentic/hooks/post-edit-check-claude.mjs .agentic/hooks/stop-verify.mjs .agentic/hooks/stop-verify-copilot.mjs .agentic/hooks/stop-verify-claude.mjs .agentic/hooks/run-json-checks.mjs .agentic/hooks/run-node-checks.mjs
node .agentic/hooks/run-json-checks.mjs .agentic/harness.json .claude/settings.json .github/hooks/protect-files.json .github/hooks/post-edit-check.json .github/hooks/stop-verify.json
```

### Hard Stop Gates

These are manual full checks for an explicit final pass, not default post-edit or every-stop checks.

```bash
bash install.sh --help >/dev/null && ./bin/agentic-project-init --help >/dev/null
tmpdir="$(mktemp -d)" && trap 'rm -rf "$tmpdir"' EXIT && ./bin/agentic-project-init "$tmpdir" --force >/dev/null && node bin/apply-project-agentic-init.mjs "$tmpdir" >/dev/null && bash "$tmpdir/test-harness.sh"
```

## 4. Hard Boundaries / Guardrails

- Files or paths that must never be edited automatically:
  - installed home-directory copies under `~/.config/agentic-bootstrap/**` should not be maintained as the source of truth; change the repository first and then reinstall deliberately
  - installed copies under `~/.copilot/instructions/agentic-bootstrap.instructions.md`, `~/.agents/skills/project-bootstrap/**`, and `~/.claude/skills/project-bootstrap/**` should not be patched silently in place
- Secrets / environment files:
  - `.env`
  - `.env.local`
  - `.env.*`
  - additional local secret or CI files: please review
- Deployment / production commands that always require human approval:
  - `git push`
  - `bash install.sh` against actively used global agent setups should only be run deliberately
  - release and publish steps: please review; the repo does not document a dedicated deployment script
- Database / migration rules:
  - no database and no migrations exist in this repository

## 5. High-Risk Surfaces

- Auth: there is no classic product auth layer; the critical area is permissions and hook policy in `.claude/settings.json`, `.github/hooks/*.json`, and the generated protect/stop hooks
- Routing: CLI flags, template resolution, and the two-stage flow `install.sh` -> `bin/agentic-project-init` -> `bin/apply-project-agentic-init.mjs`
- Payments / orders: none in this repository
- Customer or personal data: there is no product database, but user-home paths under `$HOME` (`~/.copilot`, `~/.agents`, `~/.claude`, `~/.config/agentic-bootstrap`) are sensitive
- External APIs / SSO / sync: no external web APIs in the code; the critical part is keeping repo sources, installed home-directory copies, and adapter/symlink structures in sync
- Other critical flows: generation of templates, guardrails, hooks, skills, and the eval pack; small changes can affect many generated files in target repositories

## 6. Architecture Rules

- existing patterns the agent should respect:
  - `templates/` contains the canonical starter files; `bin/agentic-project-init` seeds the portable baseline from them
  - `bin/apply-project-agentic-init.mjs` is the project-specific compiler for `PROJECT-AGENTIC-INIT.md`
  - `README.md`, `copilot/agentic-bootstrap.instructions.md`, and `skills/project-bootstrap/` must remain consistent with actual bootstrap behavior
  - shared contract files (`AGENTS.md`, `PROJECT-AGENTIC-INIT.md`, `docs/agentic-eval-pack.md`) are separated from tool-specific layers (`.github/**`, `.claude/**`) and the shared technical policy (`.agentic/**`)
  - `.agents/skills/` is the canonical skill source; `.claude/skills/` is normally only the adapter to it
- preferred structure:
  - keep install and CLI logic in shell, and structured contract compilation in Node/ESM
  - think about generator logic, templates, README, and skill documentation together and update them together when needed
  - validate via a temporary target repo using `agentic-project-init`, `apply-project-agentic-init.mjs`, and `test-harness.sh`
  - do not assume a package-manager manifest; validate directly through the existing shell and Node commands
- things the agent should not introduce:
  - repo truth that exists only in installed home-directory copies or only in generated target files
  - diverging rules between `README.md`, templates, skill docs, generator logic, and the installed bootstrap instructions
  - a classic app frontend/backend or database mental model where this repo is actually a tooling and scaffolding repository

## 7. Language and Copy Rules

- Default language: English for repository-facing text, templates, docs, generated instructions, and user-facing CLI/help copy inside the repository
- Tone / Copy direction: concise, instructional, and contract/checklist-oriented rather than marketing-heavy
- i18n specifics: there is no formal i18n layer; keep terminology consistent across templates, generated outputs, and bootstrap docs

## 8. Desired Skills

- Verify Skill: yes
- Deploy Skill: yes
- Surface Skill: please review
- Contract Skill: yes
- additional desired skills:
  -
- optional workflow checklist skills (only add them if the repo wants explicit extra lanes despite the added latency):
  - systematic-debugging
  - verification-before-completion
  - requesting-code-review

## 9. Desired Output

The bootstrap should create or maintain, where possible:

- `AGENTS.md`
- `CLAUDE.md`
- `GEMINI.md`
- `.github/copilot-instructions.md`
- `.github/instructions/**/*.instructions.md`
- `.github/hooks/*.json`
- `.claude/settings.json`
- `.claudeignore`
- `.agentic/harness.json`
- `.agentic/hooks/`
- `.claude/agents/`
- `.agents/skills/`
- `.claude/skills/` (optional adapter)
- `docs/agentic-eval-pack.md`
- `docs/harness-token-optimization.md`
- `test-harness.sh`

## 10. Hook Preferences

- PreToolUse protection: yes
- PostToolUse checks: yes
- Stop gate with build/test/lint: yes

If a layer does not make sense, the agent should explain why.
