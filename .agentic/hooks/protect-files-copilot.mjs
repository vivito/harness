import { readStdin, loadHarnessConfig, parseHookInput, normalizePath, isProtectedPath, isDeniedCommand } from './harness-lib.mjs';

const raw = await readStdin();
const payload = raw.trim() ? JSON.parse(raw) : {};
const config = loadHarnessConfig();
const { toolName, toolArgs } = parseHookInput(payload);

let reason = null;
if (/^(edit|create|view)$/i.test(toolName)) {
  const relativePath = normalizePath(toolArgs?.file_path || toolArgs?.path || '');
  reason = isProtectedPath(relativePath, config);
} else if (/^(bash|powershell)$/i.test(toolName)) {
  reason = isDeniedCommand(toolArgs?.command || '', config);
}

if (reason) {
  process.stdout.write(JSON.stringify({
    permissionDecision: 'deny',
    permissionDecisionReason: reason,
  }));
}
