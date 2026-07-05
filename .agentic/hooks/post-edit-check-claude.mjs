import { readStdin, loadHarnessConfig, parseHookInput, getToolPaths, getCommandPaths, selectPostEditCommands, runCommands, summarizeFailures } from './harness-lib.mjs';

const raw = await readStdin();
const payload = raw.trim() ? JSON.parse(raw) : {};
const { toolName, toolArgs, isCopilot } = parseHookInput(payload);
if (isCopilot) {
  process.exit(0);
}

const config = loadHarnessConfig();
const relativePaths = /^(bash|powershell)$/i.test(toolName)
  ? getCommandPaths(toolArgs?.command || '')
  : getToolPaths(toolName, toolArgs);
const commands = selectPostEditCommands(relativePaths, config);

if (commands.length === 0) process.exit(0);

const results = runCommands(commands);
const failureSummary = summarizeFailures(results);
if (failureSummary) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PostToolUse',
      additionalContext: `Post-edit checks failed${relativePaths.length ? ` for ${relativePaths.join(', ')}` : ''}:\n${failureSummary}`,
    },
  }));
}
