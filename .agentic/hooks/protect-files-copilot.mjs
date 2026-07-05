import { readStdin, loadHarnessConfig, parseHookInput, getToolPaths, getSearchPaths, isProtectedPath, isProtectedExistingPath, isDeniedCommand } from './harness-lib.mjs';

const raw = await readStdin();
const payload = raw.trim() ? JSON.parse(raw) : {};
const config = loadHarnessConfig();
const { toolName, toolArgs } = parseHookInput(payload);

let reason = null;
if (/^(edit|create|view|read|write|multiedit)$/i.test(toolName)) {
  reason = getToolPaths(toolName, toolArgs)
    .map((relativePath) => isProtectedPath(relativePath, config) || isProtectedExistingPath(relativePath, config))
    .find(Boolean) || null;
} else if (/^(rg|glob|grep)$/i.test(toolName)) {
  reason = getSearchPaths(toolArgs)
    .map((relativePath) => isProtectedPath(relativePath, config) || isProtectedExistingPath(relativePath, config))
    .find(Boolean) || null;
} else if (/^(bash|powershell)$/i.test(toolName)) {
  reason = isDeniedCommand(toolArgs?.command || '', config);
}

if (reason) {
  process.stdout.write(JSON.stringify({
    permissionDecision: 'deny',
    permissionDecisionReason: reason,
  }));
}
