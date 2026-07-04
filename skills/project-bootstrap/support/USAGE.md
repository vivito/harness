# /project-bootstrap Usage

## Quick path

1. Copy `PROJECT-AGENTIC-INIT.template.md` into a new repo as `PROJECT-AGENTIC-INIT.md`
2. Fill only the parts that matter
3. Open Claude Code in that repo
4. Run:

```text
/project-bootstrap
```

## If there is no init file

You can still say:

```text
/project-bootstrap
```

The skill will infer the stack from the repo and scaffold a best-effort setup.

## Good prompts

```text
/project-bootstrap
```

```text
Nutze PROJECT-AGENTIC-INIT.md und scaffold ein projektweites Claude-Code-Setup.
```

```text
Bitte richte für dieses neue Kundenprojekt CLAUDE.md, .claude/, Skills, Subagents und ein kleines Eval-Pack ein.
```

## What the skill should produce

- repo-lokale Agent-Dateien
- Schutz-Hooks
- wenn sinnvoll auch Post-Edit- und Stop-Hooks
- Verify-/Deploy-/Surface-/Contract-Skills je nach Stack
- Eval-Pack
- keine blinde Überschreibung bestehender Repo-Instruktionen
