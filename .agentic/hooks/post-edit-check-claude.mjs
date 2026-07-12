import {
  areHooksDisabled,
  computePathStateHash,
  formatRuntimeError,
  getCommandFingerprint,
  getToolPaths,
  isFastChecksEnabled,
  isRecursiveHookInvocation,
  isToolWriteOperation,
  loadHarnessConfig,
  parseHookInput,
  readHookState,
  readStdin,
  runCommands,
  selectPostEditPlan,
  summarizeFailures,
  withLock,
  writeHookState,
} from './harness-lib.mjs';

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
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PostToolUse',
      additionalContext: `Harness post-edit hook error: ${formatRuntimeError(error)}`,
    },
  }));
  process.exit(0);
}

if (areHooksDisabled(config) || isRecursiveHookInvocation(config) || !isFastChecksEnabled(config)) {
  process.exit(0);
}

if (!isToolWriteOperation(toolName)) {
  process.exit(0);
}

const plan = selectPostEditPlan(getToolPaths(toolName, toolArgs), config);
if (plan.commands.length === 0 || plan.matchedPaths.length === 0) {
  process.exit(0);
}

const commandKey = getCommandFingerprint(plan.commands, 'fast');
const stateHash = computePathStateHash(plan.matchedPaths);
const now = Date.now();
const previousState = readHookState(config, 'post-edit');
const cooldownMs = config?.hookSettings?.postEditCooldownMs ?? 5000;

if (previousState.commandKey === commandKey) {
  if (previousState.stateHash === stateHash) {
    process.exit(0);
  }
  if (typeof previousState.completedAt === 'number' && (now - previousState.completedAt) < cooldownMs) {
    process.exit(0);
  }
}

const lock = withLock(config, 'post-edit', () => {
  const results = runCommands(plan.commands, { config, tier: 'fast' });
  const failureSummary = summarizeFailures(results, config);

  writeHookState(config, 'post-edit', {
    commandKey,
    stateHash,
    completedAt: Date.now(),
    status: failureSummary ? 'fail' : 'pass',
    failureSummary,
  });

  return failureSummary;
});

if (!lock.acquired) {
  process.exit(0);
}

const failureSummary = lock.value;
if (failureSummary) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PostToolUse',
      additionalContext: `Harness fast checks failed:\n${failureSummary}`,
    },
  }));
}
