# Harness

This repository contains the **canonical sources** for:

- the bootstrap command `agentic-project-init`
- the project-init template `PROJECT-AGENTIC-INIT.md`
- shared instruction templates (`AGENTS.md`, Copilot instructions, eval pack)
- the global bootstrap skill

Goals:

1. scaffold a clean agentic structure into a new project quickly
2. support Copilot and Claude in parallel
3. combine portability with technical enforcement

## Structure

```text
harness/
├── .agents/
│   └── skills/
│       ├── project-contracts/
│       ├── project-deploy/
│       └── project-verify/
├── bin/
│   ├── agentic-project-init
│   └── apply-project-agentic-init.mjs
├── templates/
│   ├── PROJECT-AGENTIC-INIT.md
│   ├── AGENTS.md
│   ├── copilot-instructions.md
│   ├── agentic-eval-pack.md
│   └── test-harness.sh
├── skills/
│   └── project-bootstrap/
│       ├── SKILL.md
│       └── support/
├── copilot/
│   └── agentic-bootstrap.instructions.md
└── install.sh
```

## Installation on macOS

After cloning:

```bash
bash install.sh
```

Optional:

```bash
bash install.sh --skip-claude
bash install.sh --skip-copilot
```

This installs:

- `~/.local/bin/agentic-project-init`
- `~/.config/agentic-bootstrap/`
- `~/.copilot/instructions/agentic-bootstrap.instructions.md`
- `~/.agents/skills/project-bootstrap/`
- `~/.claude/skills/project-bootstrap` as an adapter

## Usage

In a new project:

```bash
agentic-project-init .
```

Then ask your agent to prefill `PROJECT-AGENTIC-INIT.md` with a usable first draft:

```text
Read this repository and prefill PROJECT-AGENTIC-INIT.md as completely as possible.

Derive everything from the existing code, README, package.json, deployment scripts, and existing project files.
Do not invent anything speculative: if something cannot be derived confidently from the repository, mark it clearly as "please review" instead of making it up.
Pay special attention to:
- tech stack
- important commands
- cheap post-edit checks
- hard stop gates
- guardrails
- high-risk surfaces
- architecture rules
- language and copy rules
- sensible skills
- hook preferences

In this step, edit only PROJECT-AGENTIC-INIT.md and nothing else. The goal is a usable draft, not perfection. It is better to leave gaps marked "please review" than to create false confidence.
```

Then apply `PROJECT-AGENTIC-INIT.md`:

```bash
agentic-project-init . --apply-init --force
./test-harness.sh
```

## Baseline repo-local skills

- `project-verify`, `project-deploy`, and `project-contracts` remain the generic control-plane skills.
- Add workflow checklist skills such as `systematic-debugging`, `verification-before-completion`, and `requesting-code-review` only when a repo benefits from the extra ceremony more than the added latency.
- Add stack-specific skills on top; do not replace the shared baseline with repo-specific reviewer names in Harness itself.

## Architecture principles

### Canonical shared files

- `AGENTS.md`
- `PROJECT-AGENTIC-INIT.md`
- `docs/agentic-eval-pack.md`

### Copilot layer

- `.github/copilot-instructions.md`
- `.github/instructions/**/*.instructions.md`
- `.github/hooks/*.json`

### Claude layer

- `.claude/settings.json`
- `.claude/agents/*`
- `.claude/skills` (adapter)

### Shared technical policy

- `.agentic/harness.json`
- `.agentic/hooks/*`

### Canonical skill source

- global: `~/.agents/skills/`
- repo-local: `.agents/skills/`

Claude now uses only an adapter pointing at this skill source.
