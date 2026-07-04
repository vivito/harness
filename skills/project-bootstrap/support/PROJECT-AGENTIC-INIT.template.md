# PROJECT-AGENTIC-INIT

Diese Datei ist die optionale Projekt-Init-Vorlage für `/project-bootstrap`.

Lege sie in einem neuen Projekt im Repo-Root als `PROJECT-AGENTIC-INIT.md` ab, passe die Punkte kurz an und bitte den Agenten dann:

```text
/project-bootstrap
```

Oder:

```text
Nutze PROJECT-AGENTIC-INIT.md und bootstrappe das Agentic-Setup für dieses Projekt.
```

---

## 1. Projektüberblick

- **Projektname:**  
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

Welche günstigen Checks kann der Agent direkt nach Dateibearbeitungen laufen lassen?

```bash
# formatter / lint / syntax-check
```

### Harte Stop-Gates

Welche Commands müssen grün sein, bevor ein Agent den Zustand als "fertig" behandeln darf?

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
- Sonstige kritische Flows:

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

Welche Projekt-Skills wären sinnvoll?

- Verify-Skill: ja / nein
- Deploy-Skill: ja / nein
- Surface-Skill: ja / nein
- Contract-Skill: ja / nein
- zusätzliche Wunsch-Skills:
  - 

## 9. Output-Wunsch

Der Bootstrap soll möglichst anlegen:

- `CLAUDE.md`
- `.claudeignore`
- `.claude/settings.json`
- `.claude/hooks/`
- `.claude/agents/`
- `.claude/skills/`
- `docs/agentic-eval-pack.md`

Falls etwas davon nicht sinnvoll ist, soll der Agent es begründen statt blind anlegen.

## 10. Hook-Wunsch

Welche Hook-Ebenen sollen möglichst entstehen?

- PreToolUse-Schutz: ja / nein
- PostToolUse-Checks: ja / nein
- Stop-Gate mit Build/Test/Lint: ja / nein

Wenn eine Ebene nicht sinnvoll ist, soll der Agent erklären warum.
