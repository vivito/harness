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

function tokenizeShellWords(segment) {
  return String(segment || '').match(/(?:[^\s"'`]+|"[^"]*"|'[^']*')+/g) || [];
}

function stripLeadingShellPrefixes(segment) {
  let remaining = String(segment || '').trim();
  while (/^(?:\/?[^/\s]+\/)*env\b/.test(remaining)) {
    remaining = remaining.replace(/^(?:\/?[^/\s]+\/)*env\b\s*/, '').trimStart();
    while (/^-[^\s]+\s+/.test(remaining)) {
      remaining = remaining.replace(/^-[^\s]+\s+/, '').trimStart();
    }
    if (remaining.startsWith('-- ')) {
      remaining = remaining.slice(3).trimStart();
    } else if (remaining === '--') {
      remaining = '';
    }
    while (/^[A-Za-z_][A-Za-z0-9_]*=(?:"[^"]*"|'[^']*'|[^\s]+)\s*/.test(remaining)) {
      remaining = remaining.replace(/^[A-Za-z_][A-Za-z0-9_]*=(?:"[^"]*"|'[^']*'|[^\s]+)\s*/, '').trimStart();
    }
  }
  while (true) {
    const match = remaining.match(/^[A-Za-z_][A-Za-z0-9_]*=(?:"[^"]*"|'[^']*'|[^\s]+)\s+/);
    if (!match) break;
    remaining = remaining.slice(match[0].length).trimStart();
  }
  return remaining;
}

function extractNestedShellCommand(segment) {
  const match = String(segment || '').match(/^(?:\/?[^/\s]+\/)*(?:bash|sh)\b(?:\s+-[A-Za-z-]+\b)*\s+\$?(['"])([\s\S]*?)\1(?:\s+.*)?$/);
  return match ? match[2] : '';
}

function normalizeRepoPath(candidatePath) {
  if (!candidatePath) return '';
  const absolute = path.resolve(projectDir, candidatePath);
  const relative = path.relative(projectDir, absolute);
  if (!relative || relative.startsWith('..')) return '';
  return relative.split(path.sep).join('/');
}

function extractCommandPaths(command) {
  const strippedCommand = stripLeadingShellPrefixes(command);
  const nestedShellCommand = extractNestedShellCommand(strippedCommand);
  const nestedPaths = nestedShellCommand ? extractCommandPaths(nestedShellCommand) : [];
  const candidates = tokenizeShellWords(strippedCommand)
    .map((token) => token.replace(/^['"`]+|['"`]+$/g, '').replace(/^[()]+|[()]+$/g, ''))
    .filter((token) => (
      token.includes('/')
      || /\.(?:json|m?js|cjs|ts|tsx|jsx|sh|ya?ml|toml)$/i.test(token)
      || fs.existsSync(path.resolve(projectDir, token))
    ));

  return uniqueItems([
    ...nestedPaths,
    ...candidates.map(normalizeRepoPath).filter(Boolean),
  ]);
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

function removePath(relativePath) {
  const fullPath = path.join(projectDir, relativePath);
  fs.rmSync(fullPath, { recursive: true, force: true });
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
const desiredSkillSet = new Set(desiredSkills.map((item) => String(item).trim().toLowerCase()));
const defaultFastPatterns = [
  'package.json',
  'tsconfig.json',
  'jsconfig.json',
  'pyproject.toml',
  'go.mod',
  'Cargo.toml',
  'composer.json',
  'Gemfile',
  'Gemfile.lock',
  '*.sh',
  '**/*.sh',
  '*.js',
  '**/*.js',
  '*.mjs',
  '**/*.mjs',
  '*.cjs',
  '**/*.cjs',
  '*.ts',
  '**/*.ts',
  '*.tsx',
  '**/*.tsx',
  '*.jsx',
  '**/*.jsx',
  '*.json',
  '**/*.json',
  '*.yml',
  '**/*.yml',
  '*.yaml',
  '**/*.yaml',
  '*.toml',
  '**/*.toml',
];

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

const toolingPreferences = {};
if (desiredSkillSet.has('systematic-debugging')) {
  toolingPreferences.debugging = {
    skill: 'systematic-debugging',
    repoLocalSkillPath: '.agents/skills/systematic-debugging',
    requiredForBugs: true,
    requiredForUnexpectedBehavior: true,
    requiredForFailingTests: true,
  };
}
if (desiredSkillSet.has('verification-before-completion')) {
  toolingPreferences.completion = {
    skill: 'verification-before-completion',
    repoLocalSkillPath: '.agents/skills/verification-before-completion',
    requiredBeforeSuccessClaims: true,
    verificationPolicy: 'fresh-smallest-credible-command',
  };
}
if (desiredSkillSet.has('requesting-code-review')) {
  toolingPreferences.review = {
    skill: 'requesting-code-review',
    repoLocalSkillPath: '.agents/skills/requesting-code-review',
    primaryAgent: 'project-reviewer',
    securityAgent: 'security-review',
    requiredForNonTrivialChanges: true,
    requiredForHighRiskChanges: true,
  };
}

const derivedPostEditPatterns = uniqueItems(postEditCommands.flatMap(extractCommandPaths));
const postEditRules = postEditCommands.length > 0
  ? [
      {
        name: 'relevant-fast-checks',
        patterns: derivedPostEditPatterns.length > 0 ? derivedPostEditPatterns : defaultFastPatterns,
        ignorePatterns: derivedPostEditPatterns.length > 0 ? [] : ['*.md', '**/*.md', 'docs/**'],
        commands: Array.from(new Set(postEditCommands)),
      },
    ]
  : [];
const fullCheckCommands = Array.from(new Set(stopCommands));
const hookSettings = {
  disabledEnvVar: 'HARNESS_HOOKS_DISABLED',
  fastChecksEnvVar: 'HARNESS_FAST_CHECKS',
  fullChecksEnvVar: 'HARNESS_FULL_CHECKS',
  recursiveGuardEnvVar: 'HARNESS_HOOK_ACTIVE',
  stateDirEnvVar: 'HARNESS_HOOK_STATE_DIR',
  postEditCooldownMs: 5000,
  lockStaleMs: 120000,
  maxOutputLines: 12,
  maxOutputBytes: 4000,
  maxBufferBytes: 131072,
  fastTimeoutSec: 20,
  fullTimeoutSec: 180,
};

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
  hookSettings,
  postEditRules,
  postEditCommands: Array.from(new Set(postEditCommands)),
  stopCommands: fullCheckCommands,
  fullCheckCommands,
};
if (Object.keys(toolingPreferences).length > 0) {
  harness.toolingPreferences = toolingPreferences;
}

writeFile('.agentic/harness.json', `${JSON.stringify(harness, null, 2)}\n`);

const hasPostEditChecks = postEditRules.length > 0 || postEditCommands.length > 0;
const hasStopChecks = hasPostEditChecks;

if (hasPostEditChecks) {
  writeJson('.github/hooks/post-edit-check.json', {
    version: 1,
    hooks: {
      postToolUse: [
        {
          type: 'command',
          command: 'node .agentic/hooks/post-edit-check-copilot.mjs',
          cwd: '.',
          timeoutSec: 45,
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
          timeoutSec: 90,
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
const fastChecksBlock = postEditCommands.join('\n') || '# none defined';
const fullChecksBlock = fullCheckCommands.join('\n') || '# none defined';
const debuggingGuidance = desiredSkillSet.has('systematic-debugging')
  ? '- For bugs, failing tests, or surprising behavior, use a root-cause-first flow before changing code; the repo-local `systematic-debugging` skill is available when you want an explicit checklist.'
  : '- For bugs, failing tests, or surprising behavior, use a root-cause-first flow before changing code.';
const completionGuidance = desiredSkillSet.has('verification-before-completion')
  ? '- Before claiming success, use fresh verification evidence from the smallest credible command; the repo-local `verification-before-completion` skill is available when you want an explicit pre-handoff checklist.'
  : '- Before claiming success, use fresh verification evidence from the smallest credible command.';
const reviewGuidance = desiredSkillSet.has('requesting-code-review')
  ? '- For non-trivial or high-risk changes, run an appropriate review gate before concluding; the repo-local `requesting-code-review` skill is available when you want explicit review routing.'
  : '- For non-trivial or high-risk changes, run an appropriate review gate before concluding.';

writeFile(
  'AGENTS.md',
  `# ${projectName} - Agent Contract

This file is the canonical shared contract for this project.

Use \`PROJECT-AGENTIC-INIT.md\` for detailed project facts, commands, guardrails, risks, language rules, and desired skills.
Use \`docs/harness-token-optimization.md\` for detailed hook behavior.

## Primary sources

1. \`AGENTS.md\` is the actively maintained shared contract.
2. \`PROJECT-AGENTIC-INIT.md\` is the detailed bootstrap source for project facts and validation commands.
3. \`.agentic/harness.json\` and \`.agentic/hooks/\` define the shared technical hook policy.
4. \`.github/copilot-instructions.md\`, \`.github/instructions/**/*.instructions.md\`, \`CLAUDE.md\`, and \`GEMINI.md\` stay as thin overlays.

## Working defaults

- Keep auto-loaded instructions lean and non-duplicated.
- For bugs, regressions, or failing tests, establish the root cause before changing code.
- Automatic hooks must stay cheap, quiet, non-recursive, and easy to disable with \`HARNESS_HOOKS_DISABLED=1\`.
- Only use automatic fast checks when the repo has truly cheap targeted commands; repo-wide lint, build, or test belongs in manual full checks by default.
- \`HARNESS_FAST_CHECKS\` controls automatic fast checks; \`HARNESS_FULL_CHECKS=1\` is for explicit full-check runs.
- Deployment remains human-gated.
- Before any success claim or handoff, run the smallest fresh verification that proves the claim.

## Project snapshot

- ${shortDescription}
- **Stack:** ${frameworkRuntime}
- **Testing:** ${testing}
- **Deployment target:** ${deploymentTarget}

## Keep aligned when the setup changes

- \`PROJECT-AGENTIC-INIT.md\`
- \`.agentic/harness.json\` and \`.agentic/hooks/*\`
- \`.github/hooks/*.json\` and \`.github/instructions/**/*.instructions.md\`
- \`.github/copilot-instructions.md\`, \`CLAUDE.md\`, \`GEMINI.md\`, \`docs/agentic-eval-pack.md\`, and \`docs/harness-token-optimization.md\`

## Guardrails

- Protect \`.env\`, secrets, generated output, deploy commands, and local databases or existing migrations when relevant.
- Keep hook output short and never stream full build, test, lint, or dependency logs back into agent context.

## Verification model

- Automatic fast checks are opt-in, path-scoped, and reserved for cheap deterministic commands.
- Full validation stays manual by default and should be exposed through \`fullCheckCommands\`, not wired into every edit or agent stop.
- Use \`docs/harness-token-optimization.md\` for the exact hook behavior and environment toggles.
`
);

writeFile(
  '.github/copilot-instructions.md',
  `# Copilot Instructions for ${projectName}

Canonical contract: \`AGENTS.md\`.

Read \`PROJECT-AGENTIC-INIT.md\` for detailed repo facts and \`docs/harness-token-optimization.md\` for hook behavior.

When changing the harness or repo-level agent setup:

- keep \`PROJECT-AGENTIC-INIT.md\`, \`.agentic/harness.json\`, \`.agentic/hooks/\`, \`.github/hooks/*.json\`, and \`.github/instructions/**/*.instructions.md\` aligned
- keep this file short and avoid duplicating detailed contract text here
- automatic hooks must stay cheap, quiet, non-recursive, and easy to disable with \`HARNESS_HOOKS_DISABLED=1\`
- do not wire repo-wide lint, build, or test commands into automatic post-edit or stop hooks; keep them as manual full checks unless the repo declares a cheap targeted variant
- use \`HARNESS_FAST_CHECKS\` for automatic fast checks and \`HARNESS_FULL_CHECKS\` only for explicit full-check runs
- ${debuggingGuidance.slice(2)}
- ${completionGuidance.slice(2)}
- ${reviewGuidance.slice(2)}
- never run human-gated deployment commands without explicit approval
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
applyTo: "AGENTS.md,PROJECT-AGENTIC-INIT.md,.github/copilot-instructions.md,.github/hooks/*.json,.github/instructions/**/*.instructions.md,.agentic/harness.json,.agentic/hooks/*.mjs,.claude/settings.json,.claude/agents/*.md,.agents/skills/**/*.md,docs/agentic-eval-pack.md,docs/harness-token-optimization.md"
---

These files define the repo-level agent contract.

- Keep them aligned with \`AGENTS.md\`, \`PROJECT-AGENTIC-INIT.md\`, and \`.agentic/harness.json\`.
- Keep automatic hooks fast, quiet, non-recursive, and easy to disable.
- Only auto-wire stop hooks when cheap fast checks actually exist.
- Avoid broad global instructions when a narrower \`applyTo\` pattern is enough.
- Prefer the smallest credible validation after changes.
`
);

writeFile(
  'docs/harness-token-optimization.md',
  `# Harness Token Optimization

This document describes the reduced-noise hook model for ${projectName}.

## Active automatic hooks

| Hook | Default behavior | When it runs |
| --- | --- | --- |
| \`protect-files\` | Blocks protected paths and denied commands. | Before read, write, search, or bash tool usage, unless \`HARNESS_HOOKS_DISABLED=1\`. |
| \`post-edit-check\` | ${hasPostEditChecks ? 'Runs fast checks only for matching write operations.' : 'Not wired automatically because no cheap fast checks are defined.'} | ${hasPostEditChecks ? 'After write-style tools on paths covered by `.agentic/harness.json > postEditRules`. Reads, searches, git queries, bash inspection, and docs-only edits are ignored.' : 'Manual full checks remain available through `.agentic/hooks/stop-verify.mjs` and the verify skill.'} |
| \`stop-verify\` | ${hasStopChecks ? 'Runs one cached fast final check per changed relevant repo state.' : 'Not wired automatically because the repo currently exposes only manual full checks.'} | ${hasStopChecks ? 'On agent stop. Repeated stops on the same failed state return a short cached block instead of re-running commands.' : 'Manual only. Use `node .agentic/hooks/stop-verify.mjs --dry-run` to inspect commands and `HARNESS_FULL_CHECKS=1 node .agentic/hooks/stop-verify.mjs --full` when you explicitly want the full pass.'} |

## Output limits

- Successful hooks stay silent.
- Failures return only summarized messages, capped by \`.agentic/harness.json > hookSettings.maxOutputLines\` and \`maxOutputBytes\`.
- Full stdout and stderr logs from build, test, lint, or dependency commands are not written back into agent context.

## Manual full checks

Inspect the currently selected fast and full commands:

\`\`\`bash
node .agentic/hooks/stop-verify.mjs --dry-run
\`\`\`

Run the manual full-check pass once on demand:

\`\`\`bash
HARNESS_FULL_CHECKS=1 node .agentic/hooks/stop-verify.mjs --full
\`\`\`

Current full-check commands:

\`\`\`bash
${fullChecksBlock}
\`\`\`

## Temporary deactivation

- Disable every automatic hook, including path protection:

\`\`\`bash
HARNESS_HOOKS_DISABLED=1
\`\`\`

- Disable only automatic fast checks:

\`\`\`bash
HARNESS_FAST_CHECKS=0
\`\`\`

- Opt into full checks for an explicit final pass:

\`\`\`bash
HARNESS_FULL_CHECKS=1
\`\`\`

## Loop and duplicate-run prevention

- \`post-edit-check\` only reacts to write-style tools, uses a short cooldown, and skips identical command and state combinations.
- \`stop-verify\` hashes the relevant changed repo state, stores the last result, and does not re-run after an unchanged failure.
- Hook locks live in the temp state directory, prevent parallel duplicate runs, and stale locks expire automatically.
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

### Fast automatic checks

\`\`\`bash
${fastChecksBlock}
\`\`\`

### Manual full checks

\`\`\`bash
${fullChecksBlock}
\`\`\`

## High-risk surfaces

${highRiskList.join('\n') || '- add from PROJECT-AGENTIC-INIT.md'}

## Anti-Patterns

- no validation
- symptom fix without root-cause analysis
- sensitive delegation
- deployment without human approval
- changes to protected files
- success claim without fresh verification evidence
- non-trivial change concluded without a review gate
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
description: Bounded high-signal review agent for ${projectName}. Use after non-trivial changes to review the actual diff for contract drift, missing validation, and unsafe file touches.
tools: Read, Glob, Grep, Bash
model: sonnet
---

You are a bounded, high-signal reviewer for ${projectName}.

Review workflow:

1. Start with \`git status --short\`, \`git diff --name-only HEAD\`, and \`git ls-files --others --exclude-standard\` to identify the review surface.
2. Read only:
   - changed files
   - \`AGENTS.md\`
   - \`PROJECT-AGENTIC-INIT.md\` if present
   - immediate downstream contract files only when a changed file points to them
3. Stop once you can either:
   - name a concrete high-risk issue tied to a changed file, or
   - state "no high-risk issues found"

Focus only on important issues:

1. missed contract surfaces
2. missing validation
3. protected-path violations
4. deployment or migration risk
5. inconsistencies against AGENTS.md or PROJECT-AGENTIC-INIT.md

Rules:

- Use Bash only for git/diff inspection. Do not run build, test, install, network, or deploy commands.
- Do not scan the whole repository just in case.
- Do not suggest stylistic cleanups or low-confidence concerns.
- If a file is unchanged, inspect it only when a changed file clearly depends on it for a contract check.
- Keep the final answer short: at most 5 findings, otherwise the explicit no-issues conclusion.

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
2. Use automatic fast checks first when they cover the change:

\`\`\`text
${fastChecksBlock}
\`\`\`

3. Run manual full checks only when explicitly requested, before a commit when asked, or once at the end of a larger task:

\`\`\`text
${fullChecksBlock}
\`\`\`

4. Run the smallest credible subset that proves the change.
5. Report commands, result, and any remaining manual checks.
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
${fullChecksBlock}
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

if (desiredSkillSet.has('systematic-debugging')) {
  writeFile(
    '.agents/skills/systematic-debugging/SKILL.md',
    `---
description: Structured root-cause checklist for explicit debugging passes in ${projectName}. Use when a bug, failing test, or surprising behavior needs a formal diagnosis before changing code.
---

# Systematic Debugging

Use this skill when behavior is broken, unclear, or surprising and you want an explicit root-cause checklist before changing code.

## Core rule

**No fixes before root-cause analysis.**

Symptom fixes are not enough, especially around auth, routing, deployment, migrations, external integrations, and other contract-sensitive flows.

## Required flow

1. **Reproduce clearly**
   - What failed?
   - How can it be triggered again?
   - Which command, route, interaction, or payload shows the issue?

2. **Read the evidence first**
   - Error message, stack trace, failing assertion, HTTP response, or visible broken behavior
   - Recent changes in the touched area
   - Existing validation or contract checks already available in the repo

3. **Trace the failing path**
   - Follow the value or control flow backward to the first bad input or wrong decision
   - For multi-layer issues, inspect each boundary explicitly
   - For library or framework uncertainty, prefer version-specific docs before guessing

4. **Compare with a known-good path**
   - Find nearby working code, tests, or similar flows in the repo
   - Identify the concrete difference instead of assuming

5. **Form one hypothesis**
   - State the most likely root cause
   - Make the smallest possible change to test that hypothesis

6. **Verify the fix**
   - Run the smallest credible command that proves the issue is fixed
   - If the first fix fails, go back to the evidence; do not stack random changes

## Repo-local reminders

- If the issue touches high-risk or contract-sensitive surfaces, also apply \`project-contracts\`.
- If the fix becomes non-trivial, route the result through \`requesting-code-review\` before concluding when that skill exists in the repo.

## Anti-patterns

- "Quick fix for now"
- Multiple speculative changes in one pass
- Treating a green build as proof without reproducing the original symptom
- Declaring success before fresh verification output
`
  );
} else {
  removePath('.agents/skills/systematic-debugging');
}

if (desiredSkillSet.has('verification-before-completion')) {
  writeFile(
    '.agents/skills/verification-before-completion/SKILL.md',
    `---
description: Structured pre-handoff verification checklist for ${projectName}. Use immediately before a commit-ready or success claim when you want an explicit proof pass.
---

# Verification Before Completion

Use this skill immediately before any success claim, completion statement, handoff, or commit-ready conclusion when you want an explicit final proof pass.

## Core rule

**No success claims without fresh verification evidence.**

If you have not just run the command that proves the claim, you cannot honestly claim the work is done.

## Required flow

1. **State the claim**
   - Example: "the bug is fixed", "the build passes", "the change is ready"

2. **Choose the smallest credible proof**
   - For harness, skill, or docs changes: use the smallest existing command that proves the edited surface still works
   - For route, contract, or behavior changes: use the most targeted command that truly covers the claim
   - Prefer \`project-verify\` guidance when the repo already has it

3. **Run the command fresh**
   - Do not rely on an earlier run
   - Read the actual output and exit status

4. **Compare output to the claim**
   - If it proves the claim, report success plainly
   - If it does not, report the actual state instead of optimistic wording

## Repo-local reminders

- For high-risk surfaces, verification is not optional just because the change looks small.
- If the change is non-trivial, pair this skill with \`requesting-code-review\` when that skill exists in the repo.

## Anti-patterns

- "Should work now"
- "Looks good"
- Reusing stale command output
- Claiming a bug is fixed without checking the original failing path
- Treating agent output as proof without independent verification
`
  );
} else {
  removePath('.agents/skills/verification-before-completion');
}

if (desiredSkillSet.has('requesting-code-review')) {
  writeFile(
    '.agents/skills/requesting-code-review/SKILL.md',
    `---
description: Structured review-routing checklist for large or high-risk changes in ${projectName}. Use when the diff needs an explicit review gate before concluding.
---

# Requesting Code Review

Use this skill when a change is large enough, risky enough, or cross-cutting enough that it should not rely on self-review alone.

## When this is required

Run a review gate when the change is:

- non-trivial in logic or scope
- cross-file or cross-surface
- contract-sensitive
- security-relevant or data-sensitive

Tiny copy tweaks or narrowly scoped docs-only edits can skip this if there is no meaningful review surface.

## Review routing

1. **Default reviewer:** \`project-reviewer\`
   - Use for most non-trivial repo changes

2. **Security reviewer:** \`security-review\`
   - Add when the change is plausibly security-sensitive

## What to give the reviewer

Provide concise, complete context:

- what changed
- the changed files or a short diff summary
- what requirement or bug it addresses
- which files or surfaces matter most
- which validation was already run
- any known trade-offs or open questions

## After review

- Fix high-signal findings before concluding
- If a finding is wrong, answer it with concrete reasoning and evidence
- Do not treat "tests pass" as a substitute for review on non-trivial work

## Repo-local reminders

- Pair this skill with \`verification-before-completion\`; review does not replace verification.
- For bugs or regressions, use \`systematic-debugging\` first when that skill exists in the repo, then review the resulting fix if it is non-trivial.
`
  );
} else {
  removePath('.agents/skills/requesting-code-review');
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
