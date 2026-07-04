import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

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
  const configPath = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', 'harness.json');
  return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

export function normalizePath(candidatePath) {
  if (!candidatePath) return '';
  const absolute = path.resolve(process.cwd(), candidatePath);
  const relative = path.relative(process.cwd(), absolute);
  return relative.split(path.sep).join('/');
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

export function isDeniedCommand(command, config) {
  const normalized = String(command || '').trim();
  if (!normalized) return null;
  for (const source of config.deniedCommandRegexes || []) {
    const regex = new RegExp(source);
    if (regex.test(normalized)) {
      return `Command is blocked by policy (${source}).`;
    }
  }
  return null;
}

export function runCommands(commands) {
  const results = [];
  for (const command of commands || []) {
    const result = spawnSync(command, {
      shell: true,
      cwd: process.cwd(),
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
