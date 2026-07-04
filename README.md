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

Then fill out and apply `PROJECT-AGENTIC-INIT.md`:

```bash
agentic-project-init . --apply-init --force
./test-harness.sh
```

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
