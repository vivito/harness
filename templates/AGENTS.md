# __PROJECT_NAME__ - Agent Contract

Diese Datei ist die **kanonische** Instruktionsdatei für dieses Projekt.

Wenn `PROJECT-AGENTIC-INIT.md` existiert, ist sie die wichtigste Quelle für:

- Projektüberblick
- Stack
- Validierungs-Commands
- Guardrails
- High-Risk-Surfaces
- gewünschte Skills und Hook-Ebenen

## Arbeitsprinzipien

- Architektur, Privacy und finale Entscheidungen bleiben in der vertrauenswürdigen Haupt-Lane.
- Begrenzte, klar geschnittene Aufgaben können an günstigere Worker-Lanes delegiert werden.
- Deployment bleibt menschlich freigegeben.
- Vor Abschluss immer die kleinste passende Validierung ausführen.
- Nach stabilem Ergebnis committen und pushen, wenn das Projekt Git nutzt.

## Bootstrap-Regel

Wenn diese Datei noch Platzhalter oder Lücken enthält:

1. lies `PROJECT-AGENTIC-INIT.md`
2. leite daraus die projektspezifischen Regeln ab
3. vervollständige das Setup vorsichtig
4. überschreibe bestehende Projektkonventionen nicht blind

## Projektüberblick

- **Name:** __PROJECT_NAME__
- **Kurzbeschreibung:** aus `PROJECT-AGENTIC-INIT.md` übernehmen
- **Wichtige Ziele:** aus `PROJECT-AGENTIC-INIT.md` übernehmen

## Validierung

Die kanonischen Commands stehen in `PROJECT-AGENTIC-INIT.md`.

Regel:

- zuerst den kleinsten glaubwürdigen Check
- Builds, Tests, Lint und Schema-Checks nur so breit wie nötig

## Guardrails

Mindestens schützen:

- `.env*`
- Secrets
- generierten Build-Output
- Deploy-Schritte
- lokale Datenbanken oder bestehende Migrationen, wenn relevant

## Tool-Kompatibilität

- `AGENTS.md` ist die Hauptquelle
- `CLAUDE.md` und `GEMINI.md` können auf diese Datei verweisen oder sie spiegeln
- `.github/copilot-instructions.md` ergänzt Copilot-spezifische Hinweise, ersetzt diese Datei aber nicht
- `.github/hooks/*.json` und `.claude/settings.json` sind die technischen Guardrail-Ebenen, wenn das Projekt einen Enforcement-Layer nutzt
- `.agentic/harness.json` und `.agentic/hooks/` halten die gemeinsame Hook- und Verify-Policy für mehrere Tools

## Noch zu konkretisieren

- Stack-spezifische Architekturregeln
- repo-spezifische High-Risk-Surfaces
- Hook-Policy
- Eval-Pack
