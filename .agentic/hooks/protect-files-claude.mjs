import { readStdin, loadHarnessConfig, parseHookInput, normalizePath, isProtectedPath, isDeniedCommand } from './harness-lib.mjs';

const raw = await readStdin();
const payload = raw.trim() ? JSON.parse(raw) : {};
const config = loadHarnessConfig();
const { toolName, toolArgs, isCopilot } = parseHookInput(payload);

if (isCopilot) {
  process.exit(0);
}

let reason = null;
if (/^(Edit|Write|Read)$/i.test(toolName)) {
  const relativePath = normalizePath(toolArgs?.file_path || toolArgs?.path || '');
  reason = isProtectedPath(relativePath, config);
} else if (/^Bash$/i.test(toolName)) {
  reason = isDeniedCommand(toolArgs?.command || '', config);
}

if (reason) {
  console.error(`Blocked by project policy: ${reason}`);
  process.exit(2);
}
