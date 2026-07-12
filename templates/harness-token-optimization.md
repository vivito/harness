# Harness Token Optimization

This document describes the reduced-noise hook model for __PROJECT_NAME__.

## Active automatic hooks

| Hook | Default behavior | When it runs |
| --- | --- | --- |
| `protect-files` | Blocks protected paths and denied commands. | Before read, write, search, or bash tool usage, unless `HARNESS_HOOKS_DISABLED=1`. |
| `post-edit-check` | Runs fast checks only when the repo defines cheap file-scoped fast checks. | After write-style tools on matching paths. Reads, searches, git queries, bash inspection, and docs-only edits are ignored. |
| `stop-verify` | Runs one cached fast final check only when automatic fast checks exist. | On agent stop, at most once per changed relevant repo state. Repeated unchanged failures return a short cached block instead of re-running commands. |

If the repo defines only manual full checks, omit `post-edit-check` and `stop-verify` from automatic hook wiring and keep `stop-verify.mjs` as a manual entry point only. Commands listed under Cheap Post-Edit Checks without explicit repo paths or with unsupported glob syntax should be demoted into the manual full-check lane.

## Output limits

- Successful hooks stay silent.
- Failures return only summarized messages, capped by `.agentic/harness.json > hookSettings.maxOutputLines` and `maxOutputBytes`.
- Full stdout and stderr logs from build, test, lint, or dependency commands are not written back into agent context.

## Manual full checks

Inspect the currently selected fast and full commands:

```bash
node .agentic/hooks/stop-verify.mjs --dry-run
```

Run the manual full-check pass once on demand:

```bash
HARNESS_FULL_CHECKS=1 node .agentic/hooks/stop-verify.mjs --full
```

The exact full-check commands live in `.agentic/harness.json > fullCheckCommands`.

## Temporary deactivation

- Disable every automatic hook, including path protection:

```bash
HARNESS_HOOKS_DISABLED=1
```

- Disable only automatic fast checks:

```bash
HARNESS_FAST_CHECKS=0
```

- Opt into full checks for an explicit final pass:

```bash
HARNESS_FULL_CHECKS=1
```

## Loop and duplicate-run prevention

- `post-edit-check` only reacts to write-style tools and skips identical command and state combinations.
- `stop-verify` hashes the relevant changed repo state, stores the last result, and does not re-run after an unchanged failure.
- Hook locks live in the temp state directory, prevent parallel duplicate runs, and stale locks expire automatically.
