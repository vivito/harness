---
description: Use for non-trivial changes before concluding, so the right review agent checks the result.
---

# Requesting Code Review

Use this skill when a change is large enough, risky enough, or cross-cutting enough that it should not rely on self-review alone.

## When this is required

Run a review gate when the change is:

- non-trivial in logic or scope
- cross-file or cross-surface
- contract-sensitive
- security-relevant or data-sensitive

Tiny copy tweaks or narrowly scoped docs-only edits can skip this if there is no meaningful review surface.

## Review routing

1. **Default reviewer:** `project-reviewer`
   - Use for most non-trivial repo changes

2. **Security reviewer:** `security-review`
   - Add when the change is plausibly security-sensitive

## What to give the reviewer

Provide concise, complete context:

- what changed
- what requirement or bug it addresses
- which files or surfaces matter most
- which validation was already run
- any known trade-offs or open questions

## After review

- Fix high-signal findings before concluding
- If a finding is wrong, answer it with concrete reasoning and evidence
- Do not treat "tests pass" as a substitute for review on non-trivial work

## Repo-local reminders

- Pair this skill with `verification-before-completion`; review does not replace verification.
- For bugs or regressions, use `systematic-debugging` first, then review the resulting fix if it is non-trivial.
