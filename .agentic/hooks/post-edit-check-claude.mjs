import { readStdin, loadHarnessConfig, runCommands, summarizeFailures } from './harness-lib.mjs';

const raw = await readStdin();
const payload = raw.trim() ? JSON.parse(raw) : {};
if (payload?.toolName || payload?.toolArgs || payload?.sessionId) {
  process.exit(0);
}
const config = loadHarnessConfig();
const commands = config.postEditCommands || [];

if (commands.length === 0) process.exit(0);

const results = runCommands(commands);
const failureSummary = summarizeFailures(results);
if (failureSummary) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PostToolUse',
      additionalContext: `Post-edit checks failed:\n${failureSummary}`,
    },
  }));
}
