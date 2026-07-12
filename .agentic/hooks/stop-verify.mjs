import {
  areHooksDisabled,
  computePathStateHash,
  formatRuntimeError,
  getChangedRepoPaths,
  getCommandFingerprint,
  getFullCheckCommands,
  isFastChecksEnabled,
  isFullChecksEnabled,
  isRecursiveHookInvocation,
  loadHarnessConfig,
  readHookState,
  runCommands,
  selectStopPlan,
  serializeCommandSpecs,
  summarizeFailures,
  withLock,
  writeHookState,
} from './harness-lib.mjs';

const wantsDryRun = process.argv.includes('--dry-run');
const wantsFullRun = process.argv.includes('--full');

let config;
try {
  config = loadHarnessConfig();
} catch (error) {
  if (wantsDryRun) {
    process.stdout.write(JSON.stringify({ error: formatRuntimeError(error) }, null, 2));
    process.exit(1);
  }

  process.stdout.write(JSON.stringify({
    decision: 'block',
    reason: `Harness stop hook error: ${formatRuntimeError(error)}`,
  }));
  process.exit(0);
}

const fastChecksEnabled = isFastChecksEnabled(config);
const fullChecksEnabled = wantsFullRun || isFullChecksEnabled(config);
const changedPaths = getChangedRepoPaths();
const fastPlan = fastChecksEnabled
  ? selectStopPlan(changedPaths, config)
  : { commands: [], matchedPaths: [], matchedRules: [] };
const fullCommands = fullChecksEnabled ? getFullCheckCommands(config) : [];

if (wantsDryRun) {
  process.stdout.write(JSON.stringify({
    hooksDisabled: areHooksDisabled(config),
    fastChecksEnabled,
    fullChecksEnabled,
    changedPaths,
    matchedPaths: fastPlan.matchedPaths,
    commands: serializeCommandSpecs(fastPlan.commands, config, 'fast'),
    fullCommands: serializeCommandSpecs(getFullCheckCommands(config), config, 'full'),
  }, null, 2));
  process.exit(0);
}

if (areHooksDisabled(config) || isRecursiveHookInvocation(config)) {
  process.exit(0);
}

const autoCommands = fastPlan.commands;
const selectedCommands = [...autoCommands, ...fullCommands];
if (selectedCommands.length === 0) {
  process.exit(0);
}

const statePaths = fullChecksEnabled
  ? (changedPaths.length > 0 ? changedPaths : fastPlan.matchedPaths)
  : fastPlan.matchedPaths;

if (statePaths.length === 0 && !fullChecksEnabled) {
  process.exit(0);
}

const commandKey = getCommandFingerprint(selectedCommands, fullChecksEnabled ? 'full' : 'fast');
const stateHash = computePathStateHash(statePaths);
const previousState = readHookState(config, 'stop-verify');

if (previousState.commandKey === commandKey && previousState.stateHash === stateHash) {
  if (previousState.status === 'pass') {
    process.exit(0);
  }

  if (previousState.status === 'fail') {
    const cachedReason = previousState.failureSummary
      ? `Harness stop checks already failed for this unchanged repo state; not rerunning.\n${previousState.failureSummary}`
      : previousState.blockReason;

    if (!cachedReason) {
      process.exit(0);
    }

    process.stdout.write(JSON.stringify({
      decision: 'block',
      reason: cachedReason,
    }));
    process.exit(0);
  }
}

const lock = withLock(config, 'stop-verify', () => {
  const fastResults = autoCommands.length > 0
    ? runCommands(autoCommands, { config, tier: 'fast' })
    : [];
  const fastFailure = summarizeFailures(fastResults, config);

  if (fastFailure) {
    const blockReason = `Harness fast stop checks failed:\n${fastFailure}`;
    writeHookState(config, 'stop-verify', {
      commandKey,
      stateHash,
      completedAt: Date.now(),
      status: 'fail',
      failureSummary: fastFailure,
      blockReason,
    });
    return blockReason;
  }

  if (fullCommands.length > 0) {
    const fullResults = runCommands(fullCommands, { config, tier: 'full' });
    const fullFailure = summarizeFailures(fullResults, config);
    if (fullFailure) {
      const blockReason = `Harness full checks failed:\n${fullFailure}`;
      writeHookState(config, 'stop-verify', {
        commandKey,
        stateHash,
        completedAt: Date.now(),
        status: 'fail',
        failureSummary: fullFailure,
        blockReason,
      });
      return blockReason;
    }
  }

  writeHookState(config, 'stop-verify', {
    commandKey,
    stateHash,
    completedAt: Date.now(),
    status: 'pass',
  });
  return '';
});

if (!lock.acquired) {
  process.exit(0);
}

if (lock.value) {
  process.stdout.write(JSON.stringify({
    decision: 'block',
    reason: lock.value,
  }));
}
