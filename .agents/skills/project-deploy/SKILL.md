---
description: Human-gated deployment checklist for Harness. Use when preparing or reviewing a deployment.
---

## Deployment contract

Deployment is human-gated.

### Deploy-relevant commands

```text
`git push`
`bash install.sh` against actively used global agent setups should only be run deliberately
release and publish steps: please review; the repo does not document a dedicated deployment script
```

### Required checks before deployment

```text
bash install.sh --help >/dev/null && ./bin/agentic-project-init --help >/dev/null
tmpdir="$(mktemp -d)" && trap 'rm -rf "$tmpdir"' EXIT && ./bin/agentic-project-init "$tmpdir" --force >/dev/null && node bin/apply-project-agentic-init.mjs "$tmpdir" >/dev/null && bash "$tmpdir/test-harness.sh"
```

### Report

Return:

- verification status
- deployment preconditions
- whether explicit human approval is still required
