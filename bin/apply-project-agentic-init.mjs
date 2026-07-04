#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const projectDir = path.resolve(process.argv[2] || process.cwd());
const initPath = path.join(projectDir, 'PROJECT-AGENTIC-INIT.md');

if (!fs.existsSync(initPath)) {
  console.error(`Missing PROJECT-AGENTIC-INIT.md in ${projectDir}`);
  process.exit(1);
}

const initText = fs.readFileSync(initPath, 'utf8');

function parseSections(markdown) {
  const regex = /^##\s+\d+\.\s+(.+)$/gm;
  const matches = [...markdown.matchAll(regex)];
  const sections = new Map();
  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const title = match[1].trim();
    const start = match.index + match[0].length;
    const end = index + 1 < matches.length ? matches[index + 1].index : markdown.length;
    sections.set(title, markdown.slice(start, end).trim());
  }
  return sections;
}

function parseKeyValueFields(section) {
  const result = {};
  for (const rawLine of section.split('\n')) {
    const line = rawLine.trim();
    if (!line.startsWith('- ')) continue;

    const rest = line.slice(2).trim();
    if (!rest) continue;

    if (rest.startsWith('**')) {
      const closing = rest.indexOf('**', 2);
      if (closing === -1) continue;
      const rawKey = rest.slice(2, closing).trim().replace(/:\s*$/, '');
      const rawValue = rest.slice(closing + 2).trim().replace(/^:\s*/, '');
      result[rawKey] = rawValue;
      continue;
    }

    const colonIndex = rest.indexOf(':');
    if (colonIndex === -1) continue;
    const key = rest.slice(0, colonIndex).trim();
    const value = rest.slice(colonIndex + 1).trim();
    result[key] = value;
  }
  return result;
}

function parseNestedList(section, label) {
  const lines = section.split('\n');
  const target = `- ${label}:`;
  const items = [];
  let collecting = false;
  for (const line of lines) {
    if (line.startsWith(target)) {
      collecting = true;
      continue;
    }
    if (collecting) {
      if (/^##\s/.test(line) || /^###\s/.test(line)) break;
      if (/^- /.test(line)) break;
      const nested = line.match(/^\s+-\s+(.*)$/);
      if (nested) {
        const value = nested[1].trim();
        if (value) items.push(value);
      }
    }
  }
  return items;
}

function extractFencedBlock(section, headingLabel = null) {
  const source = headingLabel
    ? (() => {
        const regex = new RegExp(`^###\\s+${headingLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'm');
        const match = regex.exec(section);
        return match ? section.slice(match.index + match[0].length) : '';
      })()
    : section;
  const fenceMatch = source.match(/```[a-zA-Z0-9_-]*\n([\s\S]*?)```/);
  return fenceMatch ? fenceMatch[1].trim() : '';
}

function commandLinesFromBlock(block) {
  return block
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));
}

function parseYesNo(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (['ja', 'yes', 'true', '1'].includes(normalized)) return true;
  if (['nein', 'no', 'false', '0'].includes(normalized)) return false;
  return null;
}

function slugify(name) {
  return String(name || 'project')
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase();
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function globLikeToRegex(glob) {
  let pattern = String(glob || '').trim();
  pattern = pattern.replace(/^\.\//, '').replace(/^\//, '');
  let regex = escapeRegex(pattern)
    .replace(/\\\*\\\*/g, '.*')
    .replace(/\\\*/g, '[^/]*');
  return `^${regex}$`;
}

function writeFile(relativePath, content) {
  const fullPath = path.join(projectDir, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content);
}

const sections = parseSections(initText);
const overview = parseKeyValueFields(sections.get('Projektüberblick') || '');
const stack = parseKeyValueFields(sections.get('Tech Stack') || '');
const guardrailsSection = sections.get('Harte Grenzen / Guardrails') || '';
const highRisk = parseKeyValueFields(sections.get('High-Risk-Surfaces') || '');
const architecture = sections.get('Architekturregeln') || '';
const languageRules = parseKeyValueFields(sections.get('Sprach- und Copy-Regeln') || '');
const skillsFields = parseKeyValueFields(sections.get('Gewünschte Skills') || '');
const extraSkills = parseNestedList(sections.get('Gewünschte Skills') || '', 'zusätzliche Wunsch-Skills');
const outputWish = sections.get('Output-Wunsch') || '';
const hookWish = parseKeyValueFields(sections.get('Hook-Wunsch') || '');

const projectName = overview['Projektname'] || path.basename(projectDir);
const projectSlug = slugify(projectName);
const shortDescription = overview['Kurzbeschreibung'] || 'Projektbeschreibung ergänzen';
const customerContext = overview['Kundentyp / Kontext'] || 'Kundenkontext ergänzen';
const goals = parseNestedList(sections.get('Projektüberblick') || '', '**Wichtige Ziele des Agent-Setups**')
  .concat(
    (overview['Wichtige Ziele des Agent-Setups'] ? [overview['Wichtige Ziele des Agent-Setups']] : [])
      .filter((value) => value && value !== '-')
  );

const commandBlock = extractFencedBlock(sections.get('Wichtige Commands') || '');
const postEditBlock = extractFencedBlock(sections.get('Wichtige Commands') || '', 'Günstige Post-Edit-Checks');
const stopGateBlock = extractFencedBlock(sections.get('Wichtige Commands') || '', 'Harte Stop-Gates');

const baseCommands = commandLinesFromBlock(commandBlock);
const postEditCommands = commandLinesFromBlock(postEditBlock);
const stopCommands = commandLinesFromBlock(stopGateBlock);

const protectedPaths = parseNestedList(guardrailsSection, 'Dateien oder Pfade, die nie automatisch bearbeitet werden sollen');
const secretRules = parseNestedList(guardrailsSection, 'Secrets / Env-Dateien');
const deployRules = parseNestedList(guardrailsSection, 'Deploy-/Produktiv-Kommandos, die immer menschlich freigegeben bleiben');
const dbRules = parseNestedList(guardrailsSection, 'Datenbank-/Migrationsregeln');

const architectureExisting = parseNestedList(architecture, 'bestehende Muster, die der Agent respektieren soll');
const architecturePreferred = parseNestedList(architecture, 'bevorzugte Struktur');
const architectureAvoid = parseNestedList(architecture, 'Dinge, die der Agent nicht neu einführen soll');

const desiredSkills = [
  parseYesNo(skillsFields['Verify-Skill']) === true ? 'verify' : null,
  parseYesNo(skillsFields['Deploy-Skill']) === true ? 'deploy' : null,
  parseYesNo(skillsFields['Surface-Skill']) === true ? 'surface' : null,
  parseYesNo(skillsFields['Contract-Skill']) === true ? 'contracts' : null,
  ...extraSkills,
].filter(Boolean);

const protectedPrefixes = [];
const protectedRegexes = ['^\\.env\\..+'];
const protectedExactPaths = ['.env', '.env.local'];

for (const item of [...protectedPaths, ...secretRules]) {
  const normalized = item.replace(/^\.\//, '').replace(/^\//, '').trim();
  if (!normalized) continue;
  if (normalized.includes('*')) {
    protectedRegexes.push(globLikeToRegex(normalized));
    continue;
  }
  if (normalized.endsWith('/')) {
    protectedPrefixes.push(normalized);
    continue;
  }
  protectedExactPaths.push(normalized);
}

if (dbRules.some((line) => /migration/i.test(line))) {
  protectedPrefixes.push('prisma/migrations/');
  protectedRegexes.push('^prisma/.*\\.db(-journal|-wal|-shm)?$');
}

const deniedCommandRegexes = [
  '^git push( .*)?$',
  '^rm -rf( .*)?$',
];
for (const cmd of deployRules) {
  deniedCommandRegexes.push(`^${escapeRegex(cmd)}( .*)?$`);
}

const harness = {
  projectName,
  stackTags: [
    stack['Framework / Runtime'],
    stack['Frontend / Backend'],
    stack['Datenbank / ORM'],
  ].filter(Boolean),
  protectedExactPaths: Array.from(new Set(protectedExactPaths)),
  protectedPrefixes: Array.from(new Set(protectedPrefixes)),
  protectedRegexes: Array.from(new Set(protectedRegexes)),
  deniedCommandRegexes: Array.from(new Set(deniedCommandRegexes)),
  postEditCommands: Array.from(new Set(postEditCommands)),
  stopCommands: Array.from(new Set(stopCommands)),
};

writeFile('.agentic/harness.json', `${JSON.stringify(harness, null, 2)}\n`);

const highRiskList = Object.entries(highRisk)
  .filter(([, value]) => value && value !== '-')
  .map(([key, value]) => `- **${key}:** ${value}`);

const skillBullets = desiredSkills.map((skill) => `- ${skill}`);

writeFile(
  'AGENTS.md',
  `# ${projectName} - Agent Contract

Diese Datei ist die **kanonische** Instruktionsdatei für dieses Projekt.

## Primäre Quellen

1. \`AGENTS.md\` ist der laufend gepflegte Shared Contract.
2. \`PROJECT-AGENTIC-INIT.md\` ist der Bootstrap-Vertrag und muss inhaltlich dazu passen.
3. \`.github/copilot-instructions.md\` ergänzt Copilot-spezifischen Projektkontext.
4. \`CLAUDE.md\` und \`GEMINI.md\` bleiben dünne Spiegel dieser Regeln.

## Projektüberblick

- **Name:** ${projectName}
- **Kurzbeschreibung:** ${shortDescription}
- **Kundentyp / Kontext:** ${customerContext}
${goals.length ? goals.map((goal) => `- **Ziel:** ${goal}`).join('\n') : ''}

## Stack

- **Framework / Runtime:** ${stack['Framework / Runtime'] || 'ergänzen'}
- **Frontend / Backend:** ${stack['Frontend / Backend'] || 'ergänzen'}
- **Datenbank / ORM:** ${stack['Datenbank / ORM'] || 'ergänzen'}
- **Testing:** ${stack['Testing'] || 'ergänzen'}
- **Deployment-Ziel:** ${stack['Deployment-Ziel'] || 'ergänzen'}

## Commands

\`\`\`bash
${baseCommands.join('\n') || '# in PROJECT-AGENTIC-INIT.md ergänzen'}
\`\`\`

### Günstige Post-Edit-Checks

\`\`\`bash
${postEditCommands.join('\n') || '# keine definiert'}
\`\`\`

### Harte Stop-Gates

\`\`\`bash
${stopCommands.join('\n') || '# keine definiert'}
\`\`\`

## Guardrails

### Nicht automatisch bearbeiten

${[...protectedPaths, ...secretRules].map((item) => `- ${item}`).join('\n') || '- ergänzen'}

### Menschlich freigegebene Kommandos

${deployRules.map((item) => `- ${item}`).join('\n') || '- ergänzen'}

### Datenbank-/Migrationsregeln

${dbRules.map((item) => `- ${item}`).join('\n') || '- keine besonderen Regeln dokumentiert'}

## High-Risk-Surfaces

${highRiskList.join('\n') || '- ergänzen'}

## Architekturregeln

### Bestehende Muster
${architectureExisting.map((item) => `- ${item}`).join('\n') || '- ergänzen'}

### Bevorzugte Struktur
${architecturePreferred.map((item) => `- ${item}`).join('\n') || '- ergänzen'}

### Nicht neu einführen
${architectureAvoid.map((item) => `- ${item}`).join('\n') || '- ergänzen'}

## Sprach- und Copy-Regeln

- **Standardsprache:** ${languageRules['Standardsprache'] || 'ergänzen'}
- **Ton / Copy-Richtung:** ${languageRules['Ton / Copy-Richtung'] || 'ergänzen'}
- **i18n-Besonderheiten:** ${languageRules['i18n-Besonderheiten'] || 'ergänzen'}

## Hook-Policy

- **PreToolUse-Schutz:** ${hookWish['PreToolUse-Schutz'] || 'ergänzen'}
- **PostToolUse-Checks:** ${hookWish['PostToolUse-Checks'] || 'ergänzen'}
- **Stop-Gate mit Build/Test/Lint:** ${hookWish['Stop-Gate mit Build/Test/Lint'] || 'ergänzen'}

## Tool-Kompatibilität

- \`.github/hooks/*.json\` + \`.github/instructions/**/*.instructions.md\` sind die Copilot-spezifische Enforcement-Ebene.
- \`.claude/settings.json\` und \`.claude/agents/\` sind die Claude-spezifische Enforcement-Ebene.
- \`.agents/skills/\` ist die kanonische Skill-Quelle; \`.claude/skills/\` kann als Adapter darauf zeigen.
- \`.agentic/harness.json\` und \`.agentic/hooks/\` halten die gemeinsame technische Policy für beide Tool-Welten.

## Gewünschte Skills

${skillBullets.join('\n') || '- aus PROJECT-AGENTIC-INIT.md ergänzen'}
`
);

writeFile(
  '.github/copilot-instructions.md',
  `# Copilot Instructions for ${projectName}

Read \`AGENTS.md\` first. It is the canonical shared contract for this repository.

## Agentic Workflow

- Keep \`PROJECT-AGENTIC-INIT.md\`, \`AGENTS.md\`, \`CLAUDE.md\`, \`GEMINI.md\`, and \`docs/agentic-eval-pack.md\` aligned when the setup changes.
- Respect the technical enforcement layer in \`.github/hooks/*.json\`, \`.github/instructions/**/*.instructions.md\`, and \`.agentic/harness.json\`.
- Never run human-gated deployment commands without explicit approval.
- Default to the smallest credible validation, using the stop-gate commands from the project contract.

## Quick project summary

- ${shortDescription}
- Stack: ${stack['Framework / Runtime'] || 'ergänzen'}
- Testing: ${stack['Testing'] || 'ergänzen'}
- Deployment: ${stack['Deployment-Ziel'] || 'ergänzen'}

## High-risk reminders

${highRiskList.join('\n') || '- ergänzen'}
`
);

const protectedApplyTo = [
  ...protectedExactPaths,
  ...protectedPrefixes.map((item) => `${item}**`),
  ...secretRules,
].map((item) => item.replace(/^\.\//, '')).join(',');

writeFile(
  '.github/instructions/protected-paths.instructions.md',
  `---
applyTo: "${protectedApplyTo || '.env*,**/.env*'}"
---

These files and directories are protected.

${[...protectedPaths, ...secretRules].map((item) => `- ${item}`).join('\n') || '- Protect secret and generated files.'}

- If a task appears to require touching these paths, stop and explain the safer alternative.
`
);

writeFile(
  '.github/instructions/contract-surfaces.instructions.md',
  `---
applyTo: "**"
---

Treat the following as contract surfaces and update them carefully:

${highRiskList.join('\n') || '- ergänzt aus PROJECT-AGENTIC-INIT.md'}

- Prefer the smallest credible validation after changes.
- Mention downstream surfaces that also need updates when relevant.
`
);

writeFile(
  'docs/agentic-eval-pack.md',
  `# Agentic Eval Pack

Dieses Eval-Pack ist auf ${projectName} zugeschnitten.

## Kernfragen

1. Wurde die Aufgabe korrekt klassifiziert?
2. Wurde die passende Lane gewählt?
3. Wurde nur der nötige Kontext gelesen?
4. Wurde passend validiert?
5. Wurden High-Risk-Surfaces geschützt?
6. Wurde sauber abgeschlossen?

## Projektspezifische Eval-Aufgaben

1. Kleine UI- oder Textänderung
2. Änderung an Logik oder Zustand
3. Änderung an einer High-Risk-Surface
4. Routing-, Build- oder Deploy-nahe Änderung
5. Sensitive Anfrage oder datennaher Fall

## Erwartete Validierung

\`\`\`bash
${stopCommands.join('\n') || '# keine Stop-Gates definiert'}
\`\`\`

## High-Risk-Surfaces

${highRiskList.join('\n') || '- ergänzen'}

## Anti-Patterns

- keine Validierung
- sensitive Delegation
- Deploy ohne menschliche Freigabe
- Änderungen an geschützten Dateien
- Guardrails nur im Prompt, obwohl technische Durchsetzung vorhanden ist
`
);

writeFile(
  '.claude/agents/project-fast-worker.md',
  `---
name: project-fast-worker
description: Bounded implementation worker for ${projectName}. Use for small, well-scoped changes after the plan is clear.
tools: Read, Write, Edit, MultiEdit, Glob, Grep, Bash
model: haiku
---

You are a bounded implementation worker for ${projectName}.

Rules:

1. Read only the files directly relevant to the task.
2. Preserve the current project structure instead of introducing parallel architecture.
3. Prefer the smallest existing validation command that proves the change.
4. Never deploy, commit, or push.
5. Stop and hand back if the task grows into architecture, privacy, migration, or high-risk contract work.

Project summary:

- ${shortDescription}
- Stack: ${stack['Framework / Runtime'] || 'ergänzen'}

High-risk surfaces:

${highRiskList.join('\n') || '- ergänzen'}

Always read:

- AGENTS.md
- PROJECT-AGENTIC-INIT.md
- .agentic/harness.json
`
);

writeFile(
  '.claude/agents/project-reviewer.md',
  `---
name: project-reviewer
description: High-signal review agent for ${projectName}. Use after non-trivial changes to check contract drift, missing validation, and unsafe file touches.
tools: Read, Glob, Grep
model: sonnet
---

You are a high-signal reviewer for ${projectName}.

Focus only on important issues:

1. missed contract surfaces
2. missing validation
3. protected-path violations
4. deployment or migration risk
5. inconsistencies against AGENTS.md or PROJECT-AGENTIC-INIT.md

Project-specific risk areas:

${highRiskList.join('\n') || '- ergänzen'}

Return only concrete risks or an explicit "no high-risk issues found".
`
);

writeFile(
  '.agents/skills/project-verify/SKILL.md',
  `---
description: Choose and run the smallest useful verification flow for ${projectName}. Use when validating whether a change is ready to commit.
---

## Current working tree

!\`git status --short 2>/dev/null || true\`

## Changed files

!\`git diff --name-only HEAD 2>/dev/null; git ls-files --others --exclude-standard 2>/dev/null\`

## Harness config

!\`cat .agentic/harness.json\`

## Instructions

1. Read \`AGENTS.md\` and \`PROJECT-AGENTIC-INIT.md\`.
2. Use the stop-gate commands from the harness config:

\`\`\`text
${stopCommands.join('\n') || '(none documented)'}
\`\`\`

3. Run the smallest credible subset that proves the change.
4. Report commands, result, and any remaining manual checks.
`
);

const hasDeploySkill = parseYesNo(skillsFields['Deploy-Skill']) !== false;
if (hasDeploySkill) {
  writeFile(
    '.agents/skills/project-deploy/SKILL.md',
    `---
description: Human-gated deployment checklist for ${projectName}. Use when preparing or reviewing a deployment.
---

## Deployment contract

Deployment is human-gated.

### Deploy-relevant commands

\`\`\`text
${deployRules.join('\n') || '(none documented)'}
\`\`\`

### Required checks before deployment

\`\`\`text
${stopCommands.join('\n') || '(none documented)'}
\`\`\`

### Report

Return:

- verification status
- deployment preconditions
- whether explicit human approval is still required
`
  );
}

const hasContractSkill = parseYesNo(skillsFields['Contract-Skill']) !== false;
if (hasContractSkill) {
  writeFile(
    '.agents/skills/project-contracts/SKILL.md',
    `---
description: Checklist for contract-sensitive work in ${projectName}. Use when touching auth, routing, deployment, migrations, external integrations, or other high-risk surfaces.
---

## Contract workflow

1. Read \`AGENTS.md\`.
2. Read \`PROJECT-AGENTIC-INIT.md\`.
3. Confirm affected high-risk surfaces:

${highRiskList.join('\n') || '- ergänzen'}

4. Use \`.agentic/harness.json\` to confirm stop-gate and protection assumptions.
5. Report:
   - affected contracts
   - likely downstream surfaces
   - recommended validation
`
  );
}

try {
  fs.rmSync(path.join(projectDir, '.claude/skills'), { recursive: true, force: true });
} catch {}

try {
  fs.symlinkSync(path.relative(path.join(projectDir, '.claude'), path.join(projectDir, '.agents/skills')), path.join(projectDir, '.claude/skills'));
} catch {
  if (!fs.existsSync(path.join(projectDir, '.claude/skills'))) {
    fs.mkdirSync(path.join(projectDir, '.claude/skills'), { recursive: true });
    fs.cpSync(path.join(projectDir, '.agents/skills'), path.join(projectDir, '.claude/skills'), { recursive: true });
  }
}

console.log(`Applied project-specific agentic setup for ${projectName}`);
