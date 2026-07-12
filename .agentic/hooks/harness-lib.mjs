import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HOOKS_DIR = path.dirname(fileURLToPath(import.meta.url));

const DEFAULT_HOOK_SETTINGS = {
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

export function getProjectRoot() {
  const rootFromEnv = process.env.CLAUDE_PROJECT_DIR || process.env.GITHUB_WORKSPACE;
  if (rootFromEnv) return path.resolve(rootFromEnv);
  return path.resolve(HOOKS_DIR, '..', '..');
}

export function readStdin() {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', reject);
  });
}

export function loadHarnessConfig() {
  const configPath = path.join(getProjectRoot(), '.agentic', 'harness.json');
  return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

export function getHookSettings(config = {}) {
  return {
    ...DEFAULT_HOOK_SETTINGS,
    ...(config?.hookSettings || {}),
  };
}

export function formatRuntimeError(error) {
  return String(error?.message || error || 'unknown hook error').trim();
}

export function normalizePath(candidatePath) {
  if (!candidatePath) return '';
  const projectRoot = getProjectRoot();
  const absolute = path.resolve(projectRoot, candidatePath);
  const relative = path.relative(projectRoot, absolute);
  if (!relative) return '.';
  return relative.split(path.sep).join('/');
}

function uniqueItems(items) {
  return [...new Set((items || []).filter(Boolean))];
}

function escapeRegex(source) {
  return source.replace(/[|\\{}()[\]^$+?.]/g, '\\$&');
}

function hashString(value) {
  return crypto.createHash('sha1').update(String(value || ''), 'utf8').digest('hex');
}

export function matchesPathPattern(relativePath, pattern) {
  if (!relativePath || !pattern) return false;

  let source = '^';
  for (let index = 0; index < pattern.length; index += 1) {
    const char = pattern[index];
    if (char === '*') {
      const next = pattern[index + 1];
      if (next === '*') {
        const after = pattern[index + 2];
        if (after === '/') {
          source += '(?:[^/]+/)*';
          index += 2;
        } else {
          source += '.*';
          index += 1;
        }
      } else {
        source += '[^/]*';
      }
      continue;
    }

    if (char === '?') {
      source += '[^/]';
      continue;
    }

    source += escapeRegex(char);
  }

  source += '$';
  return new RegExp(source).test(relativePath);
}

export function getToolPaths(toolName, toolArgs) {
  if (!/^(edit|write|create|multiedit|read|view)$/i.test(toolName || '')) {
    return [];
  }

  const candidates = [
    toolArgs?.file_path,
    toolArgs?.path,
  ];

  return uniqueItems(candidates.map(normalizePath).filter(Boolean));
}

export function getSearchPaths(toolArgs) {
  const rawPaths = Array.isArray(toolArgs?.paths)
    ? toolArgs.paths
    : toolArgs?.paths
      ? [toolArgs.paths]
      : [toolArgs?.path];

  return uniqueItems(rawPaths.map(normalizePath).filter(Boolean));
}

export function getCommandPaths(command) {
  const strippedCommand = stripLeadingShellPrefixes(command);
  const nestedShellCommand = extractNestedShellCommand(strippedCommand);
  const nestedPaths = nestedShellCommand ? getCommandPaths(nestedShellCommand) : [];
  const rawTokens = String(strippedCommand || '').match(/(?:[^\s"'`]+|"[^"]*"|'[^']*')+/g) || [];
  const candidates = rawTokens
    .map((token) => token.replace(/^['"`]+|['"`]+$/g, '').replace(/^[()]+|[()]+$/g, ''))
    .filter((token) => (
      token.includes('/')
      || /\.(?:md|json|js|mjs|cjs|sh|jsx|tsx|ts|css|sql|yml|yaml|toml)$/i.test(token)
      || fs.existsSync(path.resolve(getProjectRoot(), token))
    ));

  return uniqueItems([
    ...nestedPaths,
    ...candidates.map(normalizePath).filter(Boolean),
  ]);
}

function tokenizeShellWords(segment) {
  return String(segment || '').match(/(?:[^\s"'`]+|"[^"]*"|'[^']*')+/g) || [];
}

function unquoteShellToken(token) {
  return token.replace(/^['"`]+|['"`]+$/g, '');
}

function splitCommandSegments(command) {
  return String(command || '').split(/\s*(?:&&|\|\||\||;|\n)\s*/).filter(Boolean);
}

function isScriptExecutionSegment(segment) {
  return (
    /^(?:\/?[^/\s]+\/)*(?:bash|sh|node|python|python3|perl)\b/.test(segment)
    || /^\.\//.test(segment)
    || /^(?:[^/\s]+\/)+[^\s]+\.(?:sh|js|mjs|cjs|py)\b/.test(segment)
  );
}

function getNpmRunScriptName(segment) {
  const match = segment.match(/^npm\s+run(?:\s+--silent)?\s+([^\s]+)\b/);
  return match ? match[1] : '';
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
  const match = segment.match(/^(?:\/?[^/\s]+\/)*(?:bash|sh)\b(?:\s+-[A-Za-z-]+\b)*\s+\$?(['"])([\s\S]*?)\1(?:\s+.*)?$/);
  return match ? match[2] : '';
}

function isGitPushSegment(segment) {
  const tokens = tokenizeShellWords(stripLeadingShellPrefixes(segment)).map(unquoteShellToken);
  if (tokens.length === 0) return false;

  let index = 0;
  if (!/(?:^|\/)git$/.test(tokens[index])) return false;
  index += 1;

  while (index < tokens.length) {
    const token = tokens[index];
    if (token === '--') {
      index += 1;
      break;
    }
    if (['-c', '-C', '--exec-path', '--git-dir', '--work-tree', '--namespace', '--super-prefix', '--config-env'].includes(token)) {
      index += 2;
      continue;
    }
    if (/^--(?:exec-path|git-dir|work-tree|namespace|super-prefix|config-env)=/.test(token)) {
      index += 1;
      continue;
    }
    if (token.startsWith('-') && token !== '-') {
      index += 1;
      continue;
    }
    return token === 'push';
  }

  return index < tokens.length && tokens[index] === 'push';
}

function isDirectInlineInterpreterSegment(segment) {
  return (
    /^\s*(?:\/?[^/\s]+\/)*node\b(?:\s+(?:--[^\s]+|-[A-Za-z][^\s]*)(?:\s+(?:"[^"]*"|'[^']*'|[^\s]+))?)*\s+(?:-(?:e|p)\b|--(?:eval|print)\b|-\s*(?:<<|$))/s.test(segment)
    || /^\s*(?:\/?[^/\s]+\/)*python3?\b(?:\s+(?:--[^\s]+|-[A-Za-z][^\s]*)(?:\s+(?:"[^"]*"|'[^']*'|[^\s]+))?)*\s+(?:-c\b|-\s*(?:<<|$))/s.test(segment)
    || /^\s*(?:\/?[^/\s]+\/)*perl\b(?:\s+(?:--[^\s]+|-[A-Za-z0-9][^\s]*)(?:\s+(?:"[^"]*"|'[^']*'|[^\s]+))?)*\s+(?:-[A-Za-z0-9]*e[A-Za-z0-9]*\b|-\s*(?:<<|$))/s.test(segment)
  );
}

function isInlineInterpreterSegment(segment) {
  const trimmed = stripLeadingShellPrefixes(segment);
  if (isDirectInlineInterpreterSegment(trimmed)) {
    return true;
  }
  const nestedShellCommand = extractNestedShellCommand(trimmed);
  return nestedShellCommand ? isInlineInterpreterSegment(nestedShellCommand) : false;
}

export function parseHookInput(payload) {
  const toolName =
    payload?.toolName
    || payload?.tool_name
    || '';

  const rawArgs =
    payload?.toolArgs
    || payload?.tool_input
    || {};

  let toolArgs = rawArgs;
  if (typeof rawArgs === 'string') {
    try {
      toolArgs = JSON.parse(rawArgs);
    } catch {
      toolArgs = { command: rawArgs };
    }
  }

  const hookEventName = payload?.hook_event_name || null;
  const isCopilot = Boolean(payload?.toolName || payload?.toolArgs || payload?.sessionId);
  const isClaude = Boolean(payload?.tool_input || payload?.session_id || hookEventName);

  return { toolName, toolArgs, hookEventName, isCopilot, isClaude };
}

function readBooleanEnv(name, fallback = false) {
  if (!name) return fallback;
  const raw = process.env[name];
  if (raw == null || raw === '') return fallback;
  const normalized = raw.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

export function areHooksDisabled(config = {}) {
  const settings = getHookSettings(config);
  return readBooleanEnv(settings.disabledEnvVar, false);
}

export function isFastChecksEnabled(config = {}) {
  const settings = getHookSettings(config);
  return readBooleanEnv(settings.fastChecksEnvVar, true);
}

export function isFullChecksEnabled(config = {}) {
  const settings = getHookSettings(config);
  return readBooleanEnv(settings.fullChecksEnvVar, false);
}

export function isRecursiveHookInvocation(config = {}) {
  const settings = getHookSettings(config);
  return readBooleanEnv(settings.recursiveGuardEnvVar, false);
}

export function isToolWriteOperation(toolName) {
  return /^(edit|write|create|multiedit)$/i.test(toolName || '');
}

function filterRelevantPaths(relativePaths, includePatterns = [], ignorePatterns = []) {
  const normalizedPaths = uniqueItems((relativePaths || []).map(normalizePath).filter(Boolean));
  return normalizedPaths.filter((relativePath) => {
    if (relativePath === '.' || relativePath === '..' || relativePath.startsWith('../')) {
      return false;
    }
    if (ignorePatterns.some((pattern) => matchesPathPattern(relativePath, pattern))) {
      return false;
    }
    if (includePatterns.length === 0) {
      return true;
    }
    return includePatterns.some((pattern) => matchesPathPattern(relativePath, pattern));
  });
}

function selectCommandsFromRules(relativePaths, rules) {
  const normalizedPaths = uniqueItems((relativePaths || []).map(normalizePath).filter(Boolean));
  const matchedCommands = [];
  const matchedPaths = new Set();
  const matchedRules = new Set();

  for (const relativePath of normalizedPaths) {
    for (const rule of rules || []) {
      const patterns = Array.isArray(rule?.patterns) ? rule.patterns : [];
      const ignorePatterns = Array.isArray(rule?.ignorePatterns) ? rule.ignorePatterns : [];
      const commands = Array.isArray(rule?.commands) ? rule.commands : [];
      if (ignorePatterns.some((pattern) => matchesPathPattern(relativePath, pattern))) {
        continue;
      }
      if (patterns.length > 0 && !patterns.some((pattern) => matchesPathPattern(relativePath, pattern))) {
        continue;
      }
      matchedPaths.add(relativePath);
      matchedRules.add(String(rule?.name || relativePath));
      matchedCommands.push(...commands);
    }
  }

  return {
    commands: uniqueItems(matchedCommands),
    matchedPaths: [...matchedPaths],
    matchedRules: [...matchedRules],
  };
}

export function selectPostEditPlan(relativePaths, config) {
  const rules = Array.isArray(config?.postEditRules) ? config.postEditRules : [];
  if (rules.length > 0) {
    return selectCommandsFromRules(relativePaths, rules);
  }

  const matchedPaths = filterRelevantPaths(
    relativePaths,
    Array.isArray(config?.postEditPatterns) ? config.postEditPatterns : [],
    Array.isArray(config?.postEditIgnorePatterns) ? config.postEditIgnorePatterns : [],
  );

  return {
    commands: matchedPaths.length > 0 && Array.isArray(config?.postEditCommands)
      ? config.postEditCommands
      : [],
    matchedPaths,
    matchedRules: matchedPaths.length > 0 ? ['legacy-post-edit'] : [],
  };
}

export function selectPostEditCommands(relativePaths, config) {
  return selectPostEditPlan(relativePaths, config).commands;
}

export function selectStopPlan(relativePaths, config) {
  const rules = Array.isArray(config?.stopRules) && config.stopRules.length > 0
    ? config.stopRules
    : Array.isArray(config?.postEditRules)
      ? config.postEditRules
      : [];

  if (rules.length > 0) {
    return selectCommandsFromRules(relativePaths, rules);
  }

  const matchedPaths = filterRelevantPaths(
    relativePaths,
    Array.isArray(config?.stopPatterns) && config.stopPatterns.length > 0
      ? config.stopPatterns
      : Array.isArray(config?.postEditPatterns)
        ? config.postEditPatterns
        : [],
    Array.isArray(config?.stopIgnorePatterns) && config.stopIgnorePatterns.length > 0
      ? config.stopIgnorePatterns
      : Array.isArray(config?.postEditIgnorePatterns)
        ? config.postEditIgnorePatterns
        : [],
  );

  const commands = Array.isArray(config?.stopFastCommands) && config.stopFastCommands.length > 0
    ? config.stopFastCommands
    : Array.isArray(config?.postEditCommands)
      ? config.postEditCommands
      : [];

  return {
    commands: matchedPaths.length > 0 ? commands : [],
    matchedPaths,
    matchedRules: matchedPaths.length > 0 ? ['fast-stop-fallback'] : [],
  };
}

export function getFullCheckCommands(config) {
  if (Array.isArray(config?.fullCheckCommands) && config.fullCheckCommands.length > 0) {
    return config.fullCheckCommands;
  }
  return Array.isArray(config?.stopCommands) ? config.stopCommands : [];
}

export function normalizeCommandSpec(spec, timeoutSec) {
  if (typeof spec === 'string') {
    return {
      label: spec.length > 60 ? `${spec.slice(0, 57)}...` : spec,
      command: spec,
      timeoutSec,
    };
  }

  return {
    label: String(spec?.label || spec?.command || 'check'),
    command: String(spec?.command || ''),
    timeoutSec: Number.isFinite(spec?.timeoutSec) ? Number(spec.timeoutSec) : timeoutSec,
  };
}

export function serializeCommandSpecs(commands, config, tier = 'fast') {
  const settings = getHookSettings(config);
  const defaultTimeout = tier === 'full' ? settings.fullTimeoutSec : settings.fastTimeoutSec;
  return (commands || [])
    .map((command) => normalizeCommandSpec(command, defaultTimeout))
    .filter((entry) => entry.command);
}

export function getCommandFingerprint(commands, tier = 'fast') {
  return hashString(JSON.stringify({
    tier,
    commands: serializeCommandSpecs(commands, {}, tier).map(({ command, timeoutSec }) => ({ command, timeoutSec })),
  }));
}

function getStateDir(config = {}) {
  const settings = getHookSettings(config);
  const configured = process.env[settings.stateDirEnvVar];
  const baseDir = configured
    ? path.resolve(configured)
    : path.join(os.tmpdir(), 'harness-hooks', hashString(getProjectRoot()).slice(0, 12));
  fs.mkdirSync(baseDir, { recursive: true });
  return baseDir;
}

function getStatePath(config, name) {
  return path.join(getStateDir(config), `${name}.json`);
}

function getLockPath(config, name) {
  return path.join(getStateDir(config), `${name}.lock`);
}

export function readHookState(config, name) {
  try {
    return JSON.parse(fs.readFileSync(getStatePath(config, name), 'utf8'));
  } catch {
    return {};
  }
}

export function writeHookState(config, name, value) {
  const targetPath = getStatePath(config, name);
  const tempPath = `${targetPath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tempPath, `${JSON.stringify(value, null, 2)}\n`);
  fs.renameSync(tempPath, targetPath);
}

export function withLock(config, name, callback) {
  const settings = getHookSettings(config);
  const lockPath = getLockPath(config, name);

  try {
    const stats = fs.statSync(lockPath);
    if ((Date.now() - stats.mtimeMs) > settings.lockStaleMs) {
      fs.rmSync(lockPath, { recursive: true, force: true });
    }
  } catch {
    // No existing lock.
  }

  try {
    fs.mkdirSync(lockPath);
  } catch (error) {
    if (error?.code === 'EEXIST') {
      return { acquired: false, value: null };
    }
    throw error;
  }

  try {
    fs.writeFileSync(
      path.join(lockPath, 'meta.json'),
      `${JSON.stringify({ pid: process.pid, createdAt: Date.now() }, null, 2)}\n`,
    );
    return { acquired: true, value: callback() };
  } finally {
    fs.rmSync(lockPath, { recursive: true, force: true });
  }
}

export function computePathStateHash(relativePaths) {
  const descriptors = uniqueItems((relativePaths || []).map(normalizePath).filter(Boolean))
    .map((relativePath) => {
      const absolutePath = path.resolve(getProjectRoot(), relativePath);
      try {
        const stats = fs.statSync(absolutePath);
        return {
          path: relativePath,
          size: stats.size,
          mtimeMs: stats.mtimeMs,
          isDirectory: stats.isDirectory(),
        };
      } catch {
        return {
          path: relativePath,
          missing: true,
        };
      }
    });
  return hashString(JSON.stringify(descriptors));
}

export function getChangedRepoPaths() {
  const result = spawnSync('git', ['status', '--porcelain=v1', '-z', '--untracked-files=all'], {
    cwd: getProjectRoot(),
    encoding: 'buffer',
    maxBuffer: 1024 * 1024,
  });

  if (result.error || result.status !== 0) {
    return [];
  }

  const output = Buffer.isBuffer(result.stdout) ? result.stdout.toString('utf8') : String(result.stdout || '');
  if (!output) return [];

  const records = output.split('\0');
  const changedPaths = [];

  for (let index = 0; index < records.length; index += 1) {
    const record = records[index];
    if (!record) continue;
    const status = record.slice(0, 2);
    const pathValue = record.slice(3);

    if ((status.startsWith('R') || status.startsWith('C')) && records[index + 1]) {
      changedPaths.push(normalizePath(records[index + 1]));
      index += 1;
      continue;
    }

    changedPaths.push(normalizePath(pathValue));
  }

  return uniqueItems(changedPaths.filter(Boolean));
}

export function isProtectedPath(relativePath, config) {
  if (!relativePath) return null;
  if (relativePath === '.') {
    return 'Repository-root access must be scoped to child paths.';
  }
  if (relativePath === '..' || relativePath.startsWith('../')) {
    return `${relativePath} is outside the repository root.`;
  }

  for (const exactPath of config.protectedExactPaths || []) {
    if (relativePath === exactPath) {
      return `${relativePath} is protected.`;
    }
  }

  for (const prefix of config.protectedPrefixes || []) {
    if (relativePath === prefix.replace(/\/$/, '') || relativePath.startsWith(prefix)) {
      return `${relativePath} is inside a protected or generated path (${prefix}).`;
    }
  }

  for (const source of config.protectedRegexes || []) {
    const regex = new RegExp(source);
    if (regex.test(relativePath)) {
      return `${relativePath} matches a protected pattern (${source}).`;
    }
  }

  return null;
}

export function isProtectedExistingPath(relativePath, config) {
  if (!relativePath) return null;

  for (const prefix of config.protectedExistingPrefixes || []) {
    if (relativePath === prefix.replace(/\/$/, '') || relativePath.startsWith(prefix)) {
      const absolutePath = path.resolve(getProjectRoot(), relativePath);
      if (fs.existsSync(absolutePath)) {
        return `${relativePath} already exists inside a history-sensitive protected path (${prefix}). Create a new file instead of rewriting it.`;
      }
    }
  }

  return null;
}

export function isDeniedCommand(command, config) {
  const normalized = String(command || '').trim();
  if (!normalized) return null;
  const strippedNormalized = stripLeadingShellPrefixes(normalized);
  const nestedWholeCommand = extractNestedShellCommand(strippedNormalized);
  if (nestedWholeCommand) {
    const nestedWholeReason = isDeniedCommand(nestedWholeCommand, config);
    if (nestedWholeReason) {
      return nestedWholeReason;
    }
  }
  const segments = splitCommandSegments(normalized);

  for (const segment of segments) {
    const strippedSegment = stripLeadingShellPrefixes(segment);
    if (isGitPushSegment(strippedSegment)) {
      return 'Command is blocked by policy (git push).';
    }

    for (const source of config.deniedCommandRegexes || []) {
      const regex = new RegExp(source);
      if (regex.test(segment) || regex.test(strippedSegment)) {
        return `Command is blocked by policy (${source}).`;
      }
    }

    const nestedShellCommand = extractNestedShellCommand(strippedSegment);
    if (nestedShellCommand) {
      const nestedReason = isDeniedCommand(nestedShellCommand, config);
      if (nestedReason) {
        return nestedReason;
      }
    }

    const pathReason = getCommandPaths(strippedSegment)
      .map((relativePath) => isProtectedPath(relativePath, config))
      .find(Boolean);
    if (pathReason) {
      return pathReason;
    }
  }

  if (/(^|[\s"'=])(?:\.\/)?\.env(?:\.[A-Za-z0-9._-]+)?(?=$|[\s"'/:])/.test(normalized)) {
    return 'Command references a protected env file.';
  }

  const mutatingSegment = segments.find((segment) => /(>|>>|\b(?:cp|mv|rm|touch|tee|truncate|install)\b|\bpatch\b|\bsed\b.*\s-i\b|\bperl\b.*\s-i\b)/.test(stripLeadingShellPrefixes(segment)));
  if (mutatingSegment) {
    const strippedSegment = stripLeadingShellPrefixes(mutatingSegment);
    const protectedExistingReason = getCommandPaths(strippedSegment)
      .map((relativePath) => isProtectedExistingPath(relativePath, config))
      .find(Boolean);
    if (protectedExistingReason) {
      return protectedExistingReason;
    }
  }

  const allowedExecutablePaths = new Set(config.allowedExecutablePaths || []);
  const allowedNpmScripts = new Set(config.allowedNpmScripts || []);

  if (allowedNpmScripts.size > 0) {
    for (const segment of segments) {
      const scriptName = getNpmRunScriptName(stripLeadingShellPrefixes(segment));
      if (scriptName && !allowedNpmScripts.has(scriptName)) {
        return `Command executes an unapproved npm script (${scriptName}).`;
      }
    }
  }

  const inlineInterpreterSegment = segments.find((segment) => isInlineInterpreterSegment(segment));
  if (inlineInterpreterSegment) {
    return 'Inline node/python evaluators are blocked. Put the logic in a checked-in script first.';
  }

  if (allowedExecutablePaths.size > 0) {
    for (const segment of segments) {
      const strippedSegment = stripLeadingShellPrefixes(segment);
      if (!isScriptExecutionSegment(strippedSegment)) continue;
      for (const scriptPath of getCommandPaths(strippedSegment).filter((candidate) => candidate !== '.')) {
        if (!allowedExecutablePaths.has(scriptPath)) {
          return `Command executes an unapproved local script (${scriptPath}).`;
        }
      }
    }
  }

  return null;
}

export function runCommands(commands, { config = {}, tier = 'fast' } = {}) {
  const settings = getHookSettings(config);
  const defaultTimeout = tier === 'full' ? settings.fullTimeoutSec : settings.fastTimeoutSec;
  const recursiveGuardEnvVar = settings.recursiveGuardEnvVar;
  const results = [];

  for (const entry of serializeCommandSpecs(commands, config, tier)) {
    const result = spawnSync(entry.command, {
      shell: true,
      cwd: getProjectRoot(),
      encoding: 'utf8',
      env: {
        ...process.env,
        ...(recursiveGuardEnvVar ? { [recursiveGuardEnvVar]: '1' } : {}),
      },
      timeout: entry.timeoutSec * 1000,
      maxBuffer: settings.maxBufferBytes,
    });

    results.push({
      label: entry.label,
      command: entry.command,
      timeoutSec: entry.timeoutSec,
      status: typeof result.status === 'number' ? result.status : 1,
      stdout: result.stdout || '',
      stderr: result.stderr || '',
      error: result.error ? formatRuntimeError(result.error) : '',
      timedOut: Boolean(result.error?.code === 'ETIMEDOUT'),
    });

    if (result.error || result.status !== 0) break;
  }

  return results;
}

function trimOutput(text, config = {}) {
  const settings = getHookSettings(config);
  const normalized = String(text || '').replace(/\r/g, '').trim();
  if (!normalized) return '';

  let lines = normalized.split('\n');
  if (lines.length > settings.maxOutputLines) {
    lines = lines.slice(-settings.maxOutputLines);
  }

  let output = lines.join('\n');
  while (Buffer.byteLength(output, 'utf8') > settings.maxOutputBytes && lines.length > 1) {
    lines = lines.slice(1);
    output = lines.join('\n');
  }

  if (Buffer.byteLength(output, 'utf8') > settings.maxOutputBytes) {
    const bytes = Buffer.from(output, 'utf8');
    output = bytes.subarray(bytes.length - settings.maxOutputBytes).toString('utf8');
    const newlineIndex = output.indexOf('\n');
    if (newlineIndex >= 0) {
      output = output.slice(newlineIndex + 1);
    }
  }

  return output.trim();
}

export function summarizeFailures(results, config = {}) {
  return (results || [])
    .filter((entry) => entry.status !== 0 || entry.error)
    .map((entry) => {
      if (entry.timedOut) {
        return `${entry.label}: timed out after ${entry.timeoutSec}s`;
      }

      const details = trimOutput(
        entry.stderr || entry.stdout || entry.error || `exit ${entry.status}`,
        config,
      ) || `exit ${entry.status}`;

      return `${entry.label}: ${details}`;
    })
    .join('\n');
}
