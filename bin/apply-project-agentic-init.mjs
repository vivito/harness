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

function findSection(sections, titles) {
  const available = [...sections.entries()];
  for (const title of titles) {
    if (sections.has(title)) return sections.get(title);
    const match = available.find(([candidate]) => candidate.toLowerCase() === String(title).toLowerCase());
    if (match) return match[1];
  }
  return '';
}

function getField(fields, keys) {
  const entries = Object.entries(fields || {});
  for (const key of keys) {
    if (fields[key]) return fields[key];
    const match = entries.find(([candidate]) => candidate.toLowerCase() === String(key).toLowerCase());
    if (match && match[1]) return match[1];
  }
  return '';
}

function parseNestedList(section, label) {
  const lines = section.split('\n');
  const target = `- ${label}:`.toLowerCase();
  const items = [];
  let collecting = false;
  for (const line of lines) {
    if (line.trimStart().toLowerCase() === target) {
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

function parseNestedListAny(section, labels) {
  for (const label of labels) {
    const items = parseNestedList(section, label);
    if (items.length > 0) return items;
  }
  return [];
}

function extractFencedBlock(section, headingLabel = null) {
  const source = headingLabel
    ? (() => {
        const regex = new RegExp(`^###\\s+${headingLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'im');
        const match = regex.exec(section);
        return match ? section.slice(match.index + match[0].length) : '';
      })()
    : section;
  const fenceMatch = source.match(/```[a-zA-Z0-9_-]*\n([\s\S]*?)```/);
  return fenceMatch ? fenceMatch[1].trim() : '';
}

function extractFencedBlockAny(section, headingLabels) {
  for (const headingLabel of headingLabels) {
    const block = extractFencedBlock(section, headingLabel);
    if (block) return block;
  }
  return '';
}

function commandLinesFromBlock(block) {
  return block
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));
}

function uniqueItems(items) {
  return Array.from(new Set((items || []).map((item) => String(item || '').trim()).filter(Boolean)));
}

function stripWrappingBackticks(value) {
  return String(value || '').trim().replace(/^`+|`+$/g, '');
}

function isReviewPlaceholder(value) {
  return /^(please review|bitte prüfen)\b/i.test(String(value || '').trim());
}

function isRepoPathPattern(value) {
  const normalized = stripWrappingBackticks(value);
  if (!normalized || normalized.startsWith('~') || /\s/.test(normalized)) return false;
  return normalized.startsWith('.') || normalized.startsWith('/') || normalized.includes('*') || normalized.endsWith('/');
}

function toMachinePathSpec(value) {
  const normalized = stripWrappingBackticks(value).replace(/^\.\//, '').replace(/^\//, '').trim();
  if (!isRepoPathPattern(normalized)) return null;
  if (normalized.includes('*')) {
    return { type: 'regex', value: globLikeToRegex(normalized) };
  }
  if (normalized.endsWith('/')) {
    return { type: 'prefix', value: normalized };
  }
  return { type: 'exact', value: normalized };
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

function looksLikeCommand(value) {
  const normalized = String(value || '').trim();
  if (!normalized) return false;
  return /^(?:git|npm|npx|pnpm|yarn|bun|bash|sh|node|python|python3|go|cargo|make|docker|docker-compose|vercel|gh)\b/.test(normalized)
    || /^(?:\.\/|\/|~\/)/.test(normalized);
}

function extractGuardedCommand(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';

  const fenced = raw.match(/^`([^`]+)`/);
  if (fenced && looksLikeCommand(fenced[1])) {
    return fenced[1].trim();
  }

  const normalized = stripWrappingBackticks(raw);
  return looksLikeCommand(normalized) ? normalized : '';
}

function writeFile(relativePath, content) {
  const fullPath = path.join(projectDir, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content);
}

function writeJson(relativePath, value) {
  writeFile(relativePath, `${JSON.stringify(value, null, 2)}\n`);
}

function removeFile(relativePath) {
  const fullPath = path.join(projectDir, relativePath);
  fs.rmSync(fullPath, { force: true });
}

const sections = parseSections(initText);
const overviewSection = findSection(sections, ['Project Overview', 'Projektüberblick']);
const stackSection = findSection(sections, ['Tech Stack']);
const commandsSection = findSection(sections, ['Important Commands', 'Wichtige Commands']);
const guardrailsSection = findSection(sections, ['Hard Boundaries / Guardrails', 'Harte Grenzen / Guardrails']);
const highRiskSection = findSection(sections, ['High-Risk Surfaces', 'High-Risk-Surfaces']);
const architectureSection = findSection(sections, ['Architecture Rules', 'Architekturregeln']);
const languageSection = findSection(sections, ['Language and Copy Rules', 'Sprach- und Copy-Regeln']);
const skillsSection = findSection(sections, ['Desired Skills', 'Gewünschte Skills']);
const hookSection = findSection(sections, ['Hook Preferences', 'Hook-Wunsch']);

const overview = parseKeyValueFields(overviewSection);
const stack = parseKeyValueFields(stackSection);
const highRisk = parseKeyValueFields(highRiskSection);
const languageRules = parseKeyValueFields(languageSection);
const skillsFields = parseKeyValueFields(skillsSection);
const extraSkills = parseNestedListAny(skillsSection, ['additional desired skills', 'zusätzliche Wunsch-Skills'])
  .filter((item) => !isReviewPlaceholder(item));
const hookWish = parseKeyValueFields(hookSection);

const projectName = getField(overview, ['Project Name', 'Projektname']) || path.basename(projectDir);
const projectSlug = slugify(projectName);
const shortDescription = getField(overview, ['Short Description', 'Kurzbeschreibung']) || 'Project description needs updating';
const customerContext = getField(overview, ['Customer Type / Context', 'Kundentyp / Kontext']) || 'Customer context needs updating';
const frameworkRuntime = getField(stack, ['Framework / Runtime']) || 'needs to be filled in';
const frontendBackend = getField(stack, ['Frontend / Backend']) || 'needs to be filled in';
const databaseOrm = getField(stack, ['Database / ORM', 'Datenbank / ORM']) || 'needs to be filled in';
const testing = getField(stack, ['Testing']) || 'needs to be filled in';
const deploymentTarget = getField(stack, ['Deployment Target', 'Deployment-Ziel']) || 'needs to be filled in';
const defaultLanguage = getField(languageRules, ['Default language', 'Standardsprache']) || 'needs to be filled in';
const toneCopyDirection = getField(languageRules, ['Tone / Copy direction', 'Ton / Copy-Richtung']) || 'needs to be filled in';
const i18nSpecifics = getField(languageRules, ['i18n specifics', 'i18n-Besonderheiten']) || 'needs to be filled in';
const preToolUseProtection = getField(hookWish, ['PreToolUse protection', 'PreToolUse-Schutz']) || 'needs to be filled in';
const postToolUseChecks = getField(hookWish, ['PostToolUse checks', 'PostToolUse-Checks']) || 'needs to be filled in';
const stopGateWithBuildTestLint = getField(hookWish, ['Stop gate with build/test/lint', 'Stop-Gate mit Build/Test/Lint']) || 'needs to be filled in';
const goals = parseNestedListAny(overviewSection, ['**Important goals of the agent setup**', '**Wichtige Ziele des Agent-Setups**'])
  .concat(
    (getField(overview, ['Important goals of the agent setup', 'Wichtige Ziele des Agent-Setups'])
      ? [getField(overview, ['Important goals of the agent setup', 'Wichtige Ziele des Agent-Setups'])]
      : [])
      .filter((value) => value && value !== '-')
  );

const commandBlock = extractFencedBlock(commandsSection);
const postEditBlock = extractFencedBlockAny(commandsSection, ['Cheap Post-Edit Checks', 'Günstige Post-Edit-Checks']);
const stopGateBlock = extractFencedBlockAny(commandsSection, ['Hard Stop Gates', 'Harte Stop-Gates']);

const baseCommands = commandLinesFromBlock(commandBlock);
const postEditCommands = commandLinesFromBlock(postEditBlock);
const stopCommands = commandLinesFromBlock(stopGateBlock);

const protectedPaths = parseNestedListAny(guardrailsSection, ['Files or paths that must never be edited automatically', 'Dateien oder Pfade, die nie automatisch bearbeitet werden sollen']);
const secretRules = parseNestedListAny(guardrailsSection, ['Secrets / environment files', 'Secrets / Env-Dateien']);
const deployRules = parseNestedListAny(guardrailsSection, ['Deployment / production commands that always require human approval', 'Deploy-/Produktiv-Kommandos, die immer menschlich freigegeben bleiben']);
const dbRules = parseNestedListAny(guardrailsSection, ['Database / migration rules', 'Datenbank-/Migrationsregeln']);
const protectedDisplayItems = uniqueItems([...protectedPaths, ...secretRules]);

const architectureExisting = parseNestedListAny(architectureSection, ['existing patterns the agent should respect', 'bestehende Muster, die der Agent respektieren soll']);
const architecturePreferred = parseNestedListAny(architectureSection, ['preferred structure', 'bevorzugte Struktur']);
const architectureAvoid = parseNestedListAny(architectureSection, ['things the agent should not introduce', 'Dinge, die der Agent nicht neu einführen soll']);

const desiredSkills = [
  parseYesNo(getField(skillsFields, ['Verify Skill', 'Verify-Skill'])) === true ? 'verify' : null,
  parseYesNo(getField(skillsFields, ['Deploy Skill', 'Deploy-Skill'])) === true ? 'deploy' : null,
  parseYesNo(getField(skillsFields, ['Surface Skill', 'Surface-Skill'])) === true ? 'surface' : null,
  parseYesNo(getField(skillsFields, ['Contract Skill', 'Contract-Skill'])) === true ? 'contracts' : null,
  ...extraSkills,
].filter((item) => item && !isReviewPlaceholder(item));

const protectedPrefixes = [];
const protectedExistingPrefixes = [];
const protectedRegexes = ['^\\.env\\..+'];
const protectedExactPaths = ['.env', '.env.local'];

for (const spec of [...protectedPaths, ...secretRules].map(toMachinePathSpec).filter(Boolean)) {
  if (spec.type === 'regex') {
    protectedRegexes.push(spec.value);
    continue;
  }
  if (spec.type === 'prefix') {
    protectedPrefixes.push(spec.value);
    continue;
  }
  protectedExactPaths.push(spec.value);
}

if (dbRules.some((line) => /\bmigration/i.test(line) && !/\b(no migrations?|no database|keine migration|keine datenbank)\b/i.test(line))) {
  protectedExistingPrefixes.push('prisma/migrations/');
  protectedRegexes.push('^prisma/.*\\.db(-journal|-wal|-shm)?$');
}

const deniedCommandRegexes = [
  '^git push( .*)?$',
  '^rm -rf( .*)?$',
];
for (const cmd of deployRules) {
  const guardedCommand = extractGuardedCommand(cmd);
  if (!guardedCommand) continue;
  deniedCommandRegexes.push(`^${escapeRegex(guardedCommand)}( .*)?$`);
}

const harness = {
  projectName,
  stackTags: [
    frameworkRuntime,
    frontendBackend,
    databaseOrm,
  ].filter(Boolean),
  protectedExactPaths: Array.from(new Set(protectedExactPaths)),
  protectedPrefixes: Array.from(new Set(protectedPrefixes)),
  protectedExistingPrefixes: Array.from(new Set(protectedExistingPrefixes)),
  protectedRegexes: Array.from(new Set(protectedRegexes)),
  deniedCommandRegexes: Array.from(new Set(deniedCommandRegexes)),
  postEditCommands: Array.from(new Set(postEditCommands)),
  stopCommands: Array.from(new Set(stopCommands)),
};

writeFile('.agentic/harness.json', `${JSON.stringify(harness, null, 2)}\n`);

const hasPostEditChecks = postEditCommands.length > 0;
const hasStopChecks = stopCommands.length > 0;

if (hasPostEditChecks) {
  writeJson('.github/hooks/post-edit-check.json', {
    version: 1,
    hooks: {
      postToolUse: [
        {
          type: 'command',
          command: 'node .agentic/hooks/post-edit-check-copilot.mjs',
          cwd: '.',
          timeoutSec: 120,
        },
      ],
    },
  });
} else {
  removeFile('.github/hooks/post-edit-check.json');
}

if (hasStopChecks) {
  writeJson('.github/hooks/stop-verify.json', {
    version: 1,
    hooks: {
      agentStop: [
        {
          type: 'command',
          command: 'node .agentic/hooks/stop-verify-copilot.mjs',
          cwd: '.',
          timeoutSec: 300,
        },
      ],
    },
  });
} else {
  removeFile('.github/hooks/stop-verify.json');
}

const claudeSettingsPath = path.join(projectDir, '.claude/settings.json');
if (fs.existsSync(claudeSettingsPath)) {
  const claudeSettings = JSON.parse(fs.readFileSync(claudeSettingsPath, 'utf8'));
  const hooks = claudeSettings.hooks || {};

  if (hasPostEditChecks) {
    hooks.PostToolUse = [
      {
        matcher: 'Edit|MultiEdit|Write',
        hooks: [
          {
            type: 'command',
            command: 'ROOT="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"; node "$ROOT/.agentic/hooks/post-edit-check-claude.mjs"',
          },
        ],
      },
    ];
  } else {
    delete hooks.PostToolUse;
  }

  if (hasStopChecks) {
    hooks.Stop = [
      {
        hooks: [
          {
            type: 'command',
            command: 'ROOT="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"; node "$ROOT/.agentic/hooks/stop-verify-claude.mjs"',
          },
        ],
      },
    ];
  } else {
    delete hooks.Stop;
  }

  claudeSettings.hooks = hooks;
  writeJson('.claude/settings.json', claudeSettings);
}

const highRiskList = Object.entries(highRisk)
  .filter(([, value]) => value && value !== '-')
  .map(([key, value]) => `- **${key}:** ${value}`);

const skillBullets = desiredSkills.map((skill) => `- ${skill}`);

writeFile(
  'AGENTS.md',
  `# ${projectName} - Agent Contract

This file is the **canonical** instruction file for this project.

## Primary sources

1. \`AGENTS.md\` is the actively maintained shared contract.
2. \`PROJECT-AGENTIC-INIT.md\` is the bootstrap contract and should stay aligned with it.
3. \`.github/copilot-instructions.md\` adds Copilot-specific project context.
4. \`CLAUDE.md\` and \`GEMINI.md\` remain thin mirrors of these rules.

## Project overview

- **Name:** ${projectName}
- **Short description:** ${shortDescription}
- **Customer type / context:** ${customerContext}
${goals.length ? goals.map((goal) => `- **Goal:** ${goal}`).join('\n') : ''}

## Stack

- **Framework / Runtime:** ${frameworkRuntime}
- **Frontend / Backend:** ${frontendBackend}
- **Database / ORM:** ${databaseOrm}
- **Testing:** ${testing}
- **Deployment target:** ${deploymentTarget}

## Commands

\`\`\`bash
${baseCommands.join('\n') || '# add in PROJECT-AGENTIC-INIT.md'}
\`\`\`

### Cheap post-edit checks

\`\`\`bash
${postEditCommands.join('\n') || '# none defined'}
\`\`\`

### Hard stop gates

\`\`\`bash
${stopCommands.join('\n') || '# none defined'}
\`\`\`

## Guardrails

### Do not edit automatically

${protectedDisplayItems.map((item) => `- ${item}`).join('\n') || '- add entries'}

### Human-gated commands

${deployRules.map((item) => `- ${item}`).join('\n') || '- add entries'}

### Database / migration rules

${dbRules.map((item) => `- ${item}`).join('\n') || '- no special rules documented'}

## High-risk surfaces

${highRiskList.join('\n') || '- add from PROJECT-AGENTIC-INIT.md'}

## Architecture rules

### Existing patterns
${architectureExisting.map((item) => `- ${item}`).join('\n') || '- add entries'}

### Preferred structure
${architecturePreferred.map((item) => `- ${item}`).join('\n') || '- add entries'}

### Do not introduce
${architectureAvoid.map((item) => `- ${item}`).join('\n') || '- add entries'}

## Language and copy rules

- **Default language:** ${defaultLanguage}
- **Tone / copy direction:** ${toneCopyDirection}
- **i18n specifics:** ${i18nSpecifics}

## Hook policy

- **PreToolUse protection:** ${preToolUseProtection}
- **PostToolUse checks:** ${postToolUseChecks}
- **Stop gate with build/test/lint:** ${stopGateWithBuildTestLint}

## Tool compatibility

- \`.github/hooks/*.json\` + \`.github/instructions/**/*.instructions.md\` are the Copilot-specific enforcement layer.
- \`.claude/settings.json\` and \`.claude/agents/\` are the Claude-specific enforcement layer.
- \`.agents/skills/\` is the canonical skill source; \`.claude/skills/\` may act as an adapter to it.
- \`.agentic/harness.json\` and \`.agentic/hooks/\` hold the shared technical policy for both tool ecosystems.

## Desired skills

${skillBullets.join('\n') || '- add from PROJECT-AGENTIC-INIT.md'}
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
- Stack: ${frameworkRuntime}
- Testing: ${testing}
- Deployment: ${deploymentTarget}

## High-risk reminders

${highRiskList.join('\n') || '- add from PROJECT-AGENTIC-INIT.md'}
`
);

const protectedApplyTo = uniqueItems([
  ...protectedExactPaths,
  ...protectedPrefixes.map((item) => `${item}**`),
  ...protectedExistingPrefixes.map((item) => `${item}**`),
  ...secretRules,
]
  .map((item) => stripWrappingBackticks(item).replace(/^\.\//, ''))
  .filter(isRepoPathPattern))
  .join(',');

writeFile(
  '.github/instructions/protected-paths.instructions.md',
  `---
applyTo: "${protectedApplyTo || '.env*,**/.env*'}"
---

These files and directories are protected.

${protectedDisplayItems.map((item) => `- ${item}`).join('\n') || '- Protect secret and generated files.'}

- If a task appears to require touching these paths, stop and explain the safer alternative.
`
);

writeFile(
  '.github/instructions/contract-surfaces.instructions.md',
  `---
applyTo: "**"
---

Treat the following as contract surfaces and update them carefully:

${highRiskList.join('\n') || '- supplement from PROJECT-AGENTIC-INIT.md'}

- Prefer the smallest credible validation after changes.
- Mention downstream surfaces that also need updates when relevant.
`
);

writeFile(
  'docs/agentic-eval-pack.md',
  `# Agentic Eval Pack

This eval pack is tailored to ${projectName}.

## Core questions

1. Was the task classified correctly?
2. Was the right lane chosen?
3. Was only the necessary context read?
4. Was validation appropriate?
5. Were high-risk surfaces protected?
6. Was the task finished cleanly?

## Project-specific eval tasks

1. Small UI or copy change
2. Logic or state change
3. Change to a high-risk surface
4. Routing, build, or deployment-adjacent change
5. Sensitive request or data-adjacent case

## Expected validation

\`\`\`bash
${stopCommands.join('\n') || '# no stop gates defined'}
\`\`\`

## High-risk surfaces

${highRiskList.join('\n') || '- add from PROJECT-AGENTIC-INIT.md'}

## Anti-Patterns

- no validation
- sensitive delegation
- deployment without human approval
- changes to protected files
- guardrails only in the prompt even though technical enforcement exists
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
- Stack: ${frameworkRuntime}

High-risk surfaces:

${highRiskList.join('\n') || '- add from PROJECT-AGENTIC-INIT.md'}

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

${highRiskList.join('\n') || '- add from PROJECT-AGENTIC-INIT.md'}

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

const hasDeploySkill = parseYesNo(getField(skillsFields, ['Deploy Skill', 'Deploy-Skill'])) !== false;
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

const hasContractSkill = parseYesNo(getField(skillsFields, ['Contract Skill', 'Contract-Skill'])) !== false;
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

${highRiskList.join('\n') || '- add from PROJECT-AGENTIC-INIT.md'}

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
