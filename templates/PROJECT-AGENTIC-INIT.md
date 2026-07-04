# PROJECT-AGENTIC-INIT

Diese Datei ist der tool-neutrale Bootstrap-Vertrag für __PROJECT_NAME__.

Lege sie in ein neues Projekt und bitte deinen Agenten dann sinngemäß:

```text
Nutze PROJECT-AGENTIC-INIT.md und richte das Agentic-Setup für dieses Projekt ein.
```

## 1. Projektüberblick

- **Projektname:** __PROJECT_NAME__
- **Kurzbeschreibung:**  
- **Kundentyp / Kontext:**  
- **Wichtige Ziele des Agent-Setups:**  

## 2. Tech Stack

- **Framework / Runtime:**  
- **Frontend / Backend:**  
- **Datenbank / ORM:**  
- **Testing:**  
- **Deployment-Ziel:**  

## 3. Wichtige Commands

```bash
# installieren

# entwickeln

# bauen

# linten

# testen

# deployen
```

### Günstige Post-Edit-Checks

```bash
# formatter / lint / syntax-check
```

### Harte Stop-Gates

```bash
# build / test / lint / schema-validate
```

## 4. Harte Grenzen / Guardrails

- Dateien oder Pfade, die nie automatisch bearbeitet werden sollen:
  - 
- Secrets / Env-Dateien:
  - 
- Deploy-/Produktiv-Kommandos, die immer menschlich freigegeben bleiben:
  - 
- Datenbank-/Migrationsregeln:
  - 

## 5. High-Risk-Surfaces

- Auth:
- Routing:
- Zahlungen / Bestellungen:
- Kunden- oder Personendaten:
- externe APIs / SSO / Sync:
- sonstige kritische Flows:

## 6. Architekturregeln

- bestehende Muster, die der Agent respektieren soll:
  - 
- bevorzugte Struktur:
  - 
- Dinge, die der Agent nicht neu einführen soll:
  - 

## 7. Sprach- und Copy-Regeln

- Standardsprache:
- Ton / Copy-Richtung:
- i18n-Besonderheiten:

## 8. Gewünschte Skills

- Verify-Skill: ja / nein
- Deploy-Skill: ja / nein
- Surface-Skill: ja / nein
- Contract-Skill: ja / nein
- zusätzliche Wunsch-Skills:
  - 

## 9. Output-Wunsch

Der Bootstrap soll möglichst anlegen oder pflegen:

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
- `test-harness.sh`

## 10. Hook-Wunsch

- PreToolUse-Schutz: ja / nein
- PostToolUse-Checks: ja / nein
- Stop-Gate mit Build/Test/Lint: ja / nein

Wenn eine Ebene nicht sinnvoll ist, soll der Agent begründen warum.
