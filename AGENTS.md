# Harness - Agent Contract

This file is the **canonical** instruction file for this project.

## Primary sources

1. `AGENTS.md` is the actively maintained shared contract.
2. `PROJECT-AGENTIC-INIT.md` is the bootstrap contract and should stay aligned with it.
3. `.github/copilot-instructions.md` adds Copilot-specific project context.
4. `CLAUDE.md` and `GEMINI.md` remain thin mirrors of these rules.

## Project overview

- **Name:** Harness
- **Short description:** Versioned, tool-neutral agentic harness for new or inherited software projects. This repository contains the canonical sources for the bootstrap command `agentic-project-init`, the `PROJECT-AGENTIC-INIT.md` template, shared instruction templates, and the global bootstrap skill.
- **Customer type / context:** Meta/tooling repository for repo bootstrap and agentic guardrails; not a classic end-user product.

## Workflow defaults

- For bugs, regressions, or failing tests, establish the root cause before changing code.
- Before any success claim or handoff, run the smallest fresh verification that proves the claim.
- For non-trivial or high-risk changes, route the result through a review gate before concluding.


## Stack

- **Framework / Runtime:** Bash scripts plus Node.js (ES Modules) for CLI and scaffold generation; uses standard Unix tools such as `sed`, `cp`, `ln`, and `python3`.
- **Frontend / Backend:** Not a classic frontend/backend product; repository for CLI bootstrap, template rendering, hook/policy generation, and skill/instruction scaffolding.
- **Database / ORM:** No application database and no ORM.
- **Testing:** Shell-based smoke and structure tests via `test-harness.sh`; syntax and parse checks via `bash -n` and `node --check`.
- **Deployment target:** Local installation into user-home paths (`~/.local/bin`, `~/.config/agentic-bootstrap`, `~/.copilot/instructions`, `~/.agents/skills`, optionally `~/.claude/skills`); classic production deployment: please review.

## Commands

```bash
bash install.sh
bash install.sh --skip-claude
bash install.sh --skip-copilot
./bin/agentic-project-init --help
bash install.sh --help
./bin/agentic-project-init /path/to/target-repo --force
node bin/apply-project-agentic-init.mjs /path/to/target-repo
agentic-project-init .
agentic-project-init . --apply-init --force
tmpdir="$(mktemp -d)" && trap 'rm -rf "$tmpdir"' EXIT && ./bin/agentic-project-init "$tmpdir" --force >/dev/null && node bin/apply-project-agentic-init.mjs "$tmpdir" >/dev/null && bash "$tmpdir/test-harness.sh"
tmpdir="$(mktemp -d)" && trap 'rm -rf "$tmpdir"' EXIT && ./bin/agentic-project-init "$tmpdir" --force >/dev/null && node bin/apply-project-agentic-init.mjs "$tmpdir" >/dev/null && printf '{"toolName":"edit","toolArgs":{"file_path":".env"}}' | node "$tmpdir/.agentic/hooks/protect-files-copilot.mjs"
```

### Cheap post-edit checks

```bash
bash -n install.sh bin/agentic-project-init templates/test-harness.sh
node --check bin/apply-project-agentic-init.mjs
bash install.sh --help >/dev/null
./bin/agentic-project-init --help >/dev/null
```

### Hard stop gates

```bash
bash -n install.sh bin/agentic-project-init templates/test-harness.sh
node --check bin/apply-project-agentic-init.mjs
tmpdir="$(mktemp -d)" && trap 'rm -rf "$tmpdir"' EXIT && ./bin/agentic-project-init "$tmpdir" --force >/dev/null && node bin/apply-project-agentic-init.mjs "$tmpdir" >/dev/null && bash "$tmpdir/test-harness.sh"
```

## Guardrails

### Do not edit automatically

- installed home-directory copies under `~/.config/agentic-bootstrap/**` should not be maintained as the source of truth; change the repository first and then reinstall deliberately
- installed copies under `~/.copilot/instructions/agentic-bootstrap.instructions.md`, `~/.agents/skills/project-bootstrap/**`, and `~/.claude/skills/project-bootstrap/**` should not be patched silently in place
- `.env`
- `.env.local`
- `.env.*`
- additional local secret or CI files: please review

### Human-gated commands

- `git push`
- `bash install.sh` against actively used global agent setups should only be run deliberately
- release and publish steps: please review; the repo does not document a dedicated deployment script

### Database / migration rules

- no database and no migrations exist in this repository

## High-risk surfaces

- **Auth:** there is no classic product auth layer; the critical area is permissions and hook policy in `.claude/settings.json`, `.github/hooks/*.json`, and the generated protect/stop hooks
- **Routing:** CLI flags, template resolution, and the two-stage flow `install.sh` -> `bin/agentic-project-init` -> `bin/apply-project-agentic-init.mjs`
- **Payments / orders:** none in this repository
- **Customer or personal data:** there is no product database, but user-home paths under `$HOME` (`~/.copilot`, `~/.agents`, `~/.claude`, `~/.config/agentic-bootstrap`) are sensitive
- **External APIs / SSO / sync:** no external web APIs in the code; the critical part is keeping repo sources, installed home-directory copies, and adapter/symlink structures in sync
- **Other critical flows:** generation of templates, guardrails, hooks, skills, and the eval pack; small changes can affect many generated files in target repositories

## Architecture rules

### Existing patterns
- `templates/` contains the canonical starter files; `bin/agentic-project-init` seeds the portable baseline from them
- `bin/apply-project-agentic-init.mjs` is the project-specific compiler for `PROJECT-AGENTIC-INIT.md`
- `README.md`, `copilot/agentic-bootstrap.instructions.md`, and `skills/project-bootstrap/` must remain consistent with actual bootstrap behavior
- shared contract files (`AGENTS.md`, `PROJECT-AGENTIC-INIT.md`, `docs/agentic-eval-pack.md`) are separated from tool-specific layers (`.github/**`, `.claude/**`) and the shared technical policy (`.agentic/**`)
- `.agents/skills/` is the canonical skill source; `.claude/skills/` is normally only the adapter to it

### Preferred structure
- keep install and CLI logic in shell, and structured contract compilation in Node/ESM
- think about generator logic, templates, README, and skill documentation together and update them together when needed
- validate via a temporary target repo using `agentic-project-init`, `apply-project-agentic-init.mjs`, and `test-harness.sh`
- do not assume a package-manager manifest; validate directly through the existing shell and Node commands

### Do not introduce
- repo truth that exists only in installed home-directory copies or only in generated target files
- diverging rules between `README.md`, templates, skill docs, generator logic, and the installed bootstrap instructions
- a classic app frontend/backend or database mental model where this repo is actually a tooling and scaffolding repository

## Language and copy rules

- **Default language:** English for repository-facing text, templates, docs, generated instructions, and user-facing CLI/help copy inside the repository
- **Tone / copy direction:** concise, instructional, and contract/checklist-oriented rather than marketing-heavy
- **i18n specifics:** there is no formal i18n layer; keep terminology consistent across templates, generated outputs, and bootstrap docs

## Hook policy

- **PreToolUse protection:** yes
- **PostToolUse checks:** yes
- **Stop gate with build/test/lint:** yes

## Tool compatibility

- `.github/hooks/*.json` + `.github/instructions/**/*.instructions.md` are the Copilot-specific enforcement layer.
- `.claude/settings.json` and `.claude/agents/` are the Claude-specific enforcement layer.
- `.agents/skills/` is the canonical skill source; `.claude/skills/` may act as an adapter to it.
- `.agentic/harness.json` and `.agentic/hooks/` hold the shared technical policy for both tool ecosystems.

## Desired skills

- verify
- deploy
- contracts
- systematic-debugging
- verification-before-completion
- requesting-code-review
