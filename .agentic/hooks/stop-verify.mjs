import { loadHarnessConfig, runCommands, summarizeFailures } from './harness-lib.mjs';

const config = loadHarnessConfig();
const commands = config.stopCommands || [];

if (process.argv.includes('--dry-run')) {
  process.stdout.write(JSON.stringify({ commands }, null, 2));
  process.exit(0);
}

if (commands.length === 0) process.exit(0);

const results = runCommands(commands);
const failureSummary = summarizeFailures(results);
if (failureSummary) {
  process.stdout.write(JSON.stringify({
    decision: 'block',
    reason: `Verification failed:\n${failureSummary}`,
  }));
}
