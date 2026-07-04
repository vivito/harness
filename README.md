# Harness

Versionierbares, tool-neutrales Agentic-Harness für neue Projekte.

Dieses Repository hält die **kanonischen Quellen** für:

- das Bootstrap-Kommando `agentic-project-init`
- die Projekt-Init-Vorlage `PROJECT-AGENTIC-INIT.md`
- Shared-Instruction-Templates (`AGENTS.md`, Copilot-Instructions, Eval-Pack)
- das globale Bootstrap-Skill

Ziel:

1. ein neues Projekt schnell mit einer sauberen Agentic-Struktur versehen
2. Copilot und Claude parallel unterstützen
3. Portabilität und technische Durchsetzung kombinieren

## Struktur

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

## Installation auf einem Mac

Nach dem Klonen:

```bash
bash install.sh
```

Optional:

```bash
bash install.sh --skip-claude
bash install.sh --skip-copilot
```

Das installiert:

- `~/.local/bin/agentic-project-init`
- `~/.config/agentic-bootstrap/`
- `~/.copilot/instructions/agentic-bootstrap.instructions.md`
- `~/.agents/skills/project-bootstrap/`
- `~/.claude/skills/project-bootstrap` als Adapter

## Verwendung

In einem neuen Projekt:

```bash
agentic-project-init .
```

Dann `PROJECT-AGENTIC-INIT.md` ausfüllen und anwenden:

```bash
agentic-project-init . --apply-init --force
./test-harness.sh
```

## Architekturprinzip

### Kanonische Shared-Dateien

- `AGENTS.md`
- `PROJECT-AGENTIC-INIT.md`
- `docs/agentic-eval-pack.md`

### Copilot-Layer

- `.github/copilot-instructions.md`
- `.github/instructions/**/*.instructions.md`
- `.github/hooks/*.json`

### Claude-Layer

- `.claude/settings.json`
- `.claude/agents/*`
- `.claude/skills` (Adapter)

### Gemeinsame technische Policy

- `.agentic/harness.json`
- `.agentic/hooks/*`

### Kanonische Skill-Quelle

- global: `~/.agents/skills/`
- repo-lokal: `.agents/skills/`

Claude nutzt nur noch einen Adapter auf diese Skill-Quelle.
