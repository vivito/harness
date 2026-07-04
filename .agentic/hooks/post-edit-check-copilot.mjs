import { readStdin, loadHarnessConfig, runCommands, summarizeFailures } from './harness-lib.mjs';

const raw = await readStdin();
if (raw.trim()) JSON.parse(raw);
const config = loadHarnessConfig();
const commands = config.postEditCommands || [];

if (commands.length === 0) process.exit(0);

const results = runCommands(commands);
const failureSummary = summarizeFailures(results);
if (failureSummary) {
  process.stdout.write(JSON.stringify({
    additionalContext: `Post-edit checks failed:\n${failureSummary}`,
  }));
}
