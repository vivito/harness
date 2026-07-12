# Harness Token Optimization

This document describes the reduced-noise hook model used in this repository.

## Active automatic hooks

| Hook | Default behavior | When it runs |
| --- | --- | --- |
| `protect-files` | Blocks protected paths and denied commands. | Before read, write, search, or bash tool usage, unless `HARNESS_HOOKS_DISABLED=1`. |
| `post-edit-check` | Runs fast checks only for matching write operations using file-scoped command patterns. | After `Edit`, `MultiEdit`, `Write`, or `Create` on paths covered by `.agentic/harness.json > postEditRules`. Reads, searches, git queries, bash inspection, and docs-only edits are ignored. |
| `stop-verify` | Runs one cached fast final check per changed relevant repo state. | On agent stop, but only because this repo defines cheap fast checks. Repeated stops on the same failed state return a short cached block instead of re-running commands. |

In generated repos, `post-edit-check` and `stop-verify` should be omitted entirely when the repo has no cheap file-scoped fast checks. Commands listed under Cheap Post-Edit Checks without explicit repo paths or with unsupported glob syntax are demoted into the manual full-check lane. Full-check-only repos keep the script for manual use but do not wire an automatic stop hook.

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

Current full-check commands:

```bash
bash install.sh --help >/dev/null && ./bin/agentic-project-init --help >/dev/null
tmpdir="$(mktemp -d)" && trap 'rm -rf "$tmpdir"' EXIT && ./bin/agentic-project-init "$tmpdir" --force >/dev/null && node bin/apply-project-agentic-init.mjs "$tmpdir" >/dev/null && bash "$tmpdir/test-harness.sh"
```

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

- `post-edit-check` only reacts to write-style tools, uses a short cooldown, and skips identical command and state combinations.
- `stop-verify` hashes the relevant changed repo state, stores the last result, and does not re-run after an unchanged failure.
- Hook locks live in the temp state directory, prevent parallel duplicate runs, and stale locks expire automatically.
