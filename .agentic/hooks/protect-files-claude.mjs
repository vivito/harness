import { readStdin, loadHarnessConfig, parseHookInput, getToolPaths, getSearchPaths, isProtectedPath, isProtectedExistingPath, isDeniedCommand, areHooksDisabled, formatRuntimeError } from './harness-lib.mjs';

const raw = await readStdin();
const payload = raw.trim() ? JSON.parse(raw) : {};
const { toolName, toolArgs, isCopilot } = parseHookInput(payload);

if (isCopilot) {
  process.exit(0);
}

let config;
try {
  config = loadHarnessConfig();
} catch (error) {
  console.error(`Blocked by project policy: Harness hook configuration error: ${formatRuntimeError(error)}`);
  process.exit(2);
}

if (areHooksDisabled(config)) {
  process.exit(0);
}

let reason = null;
if (/^(Edit|MultiEdit|Write|Read)$/i.test(toolName)) {
  reason = getToolPaths(toolName, toolArgs)
    .map((relativePath) => isProtectedPath(relativePath, config) || isProtectedExistingPath(relativePath, config))
    .find(Boolean) || null;
} else if (/^(Glob|Grep)$/i.test(toolName)) {
  reason = getSearchPaths(toolArgs)
    .map((relativePath) => isProtectedPath(relativePath, config) || isProtectedExistingPath(relativePath, config))
    .find(Boolean) || null;
} else if (/^Bash$/i.test(toolName)) {
  reason = isDeniedCommand(toolArgs?.command || '', config);
}

if (reason) {
  console.error(`Blocked by project policy: ${reason}`);
  process.exit(2);
}
