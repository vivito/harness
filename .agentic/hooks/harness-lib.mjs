import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HOOKS_DIR = path.dirname(fileURLToPath(import.meta.url));

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

export function normalizePath(candidatePath) {
  if (!candidatePath) return '';
  const projectRoot = getProjectRoot();
  const absolute = path.resolve(projectRoot, candidatePath);
  const relative = path.relative(projectRoot, absolute);
  if (!relative) return '.';
  return relative.split(path.sep).join('/');
}

function escapeRegex(source) {
  return source.replace(/[|\\{}()[\]^$+?.]/g, '\\$&');
}

export function matchesPathPattern(relativePath, pattern) {
  if (!relativePath || !pattern) return false;

  let source = '^';
  for (let index = 0; index < pattern.length; index += 1) {
    const char = pattern[index];
    if (char === '*') {
      const next = pattern[index + 1];
      if (next === '*') {
        source += '.*';
        index += 1;
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

  return [...new Set(candidates.map(normalizePath).filter(Boolean))];
}

export function getSearchPaths(toolArgs) {
  const rawPaths = Array.isArray(toolArgs?.paths)
    ? toolArgs.paths
    : toolArgs?.paths
      ? [toolArgs.paths]
      : [toolArgs?.path];

  return [...new Set(rawPaths.map(normalizePath).filter(Boolean))];
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
      || /\.(?:md|json|js|mjs|sh|jsx|tsx|ts|css|sql)$/i.test(token)
      || fs.existsSync(path.resolve(getProjectRoot(), token))
    ));

  return [...new Set([
    ...nestedPaths,
    ...candidates.map(normalizePath).filter(Boolean),
  ])];
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

  const mutatingSegment = segments.find((segment) => /(>|>>|\b(?:cp|mv|rm|touch|tee|truncate|install)\b|\bsed\b.*\s-i\b|\bperl\b.*\s-i\b)/.test(stripLeadingShellPrefixes(segment)));
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

export function selectPostEditCommands(relativePaths, config) {
  const rules = Array.isArray(config?.postEditRules) ? config.postEditRules : [];
  const normalizedPaths = [...new Set((relativePaths || []).map(normalizePath).filter(Boolean))];
  const matchedCommands = [];

  for (const relativePath of normalizedPaths) {
    for (const rule of rules) {
      const patterns = Array.isArray(rule?.patterns) ? rule.patterns : [];
      const commands = Array.isArray(rule?.commands) ? rule.commands : [];
      if (patterns.some((pattern) => matchesPathPattern(relativePath, pattern))) {
        matchedCommands.push(...commands);
      }
    }
  }

  if (matchedCommands.length > 0) {
    return [...new Set(matchedCommands)];
  }

  if (rules.length > 0) {
    return [];
  }

  return Array.isArray(config?.postEditCommands) ? config.postEditCommands : [];
}

export function runCommands(commands) {
  const results = [];
  for (const command of commands || []) {
    const result = spawnSync(command, {
      shell: true,
      cwd: getProjectRoot(),
      encoding: 'utf8',
      env: process.env,
    });
    results.push({
      command,
      status: typeof result.status === 'number' ? result.status : 1,
      stdout: result.stdout || '',
      stderr: result.stderr || '',
      error: result.error ? String(result.error.message || result.error) : '',
    });
    if (result.error || result.status !== 0) break;
  }
  return results;
}

export function summarizeFailures(results) {
  return (results || [])
    .filter((entry) => entry.status !== 0 || entry.error)
    .map((entry) => {
      const details = [entry.stderr.trim(), entry.stdout.trim(), entry.error].filter(Boolean)[0] || 'unknown failure';
      return `${entry.command}: ${details}`;
    })
    .join('\n');
}
