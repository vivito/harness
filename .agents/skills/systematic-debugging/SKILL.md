---
description: Use for bugs, failing tests, and unexpected behavior in this repository before proposing or implementing fixes.
---

# Systematic Debugging

Use this skill whenever behavior is broken, unclear, or surprising. The goal is to find the root cause before changing code.

## Core rule

**No fixes before root-cause analysis.**

Symptom fixes are not enough, especially around auth, routing, deployment, migrations, external integrations, and other contract-sensitive flows.

## Required flow

1. **Reproduce clearly**
   - What failed?
   - How can it be triggered again?
   - Which command, route, interaction, or payload shows the issue?

2. **Read the evidence first**
   - Error message, stack trace, failing assertion, HTTP response, or visible broken behavior
   - Recent changes in the touched area
   - Existing validation or contract checks already available in the repo

3. **Trace the failing path**
   - Follow the value or control flow backward to the first bad input or wrong decision
   - For multi-layer issues, inspect each boundary explicitly
   - For library or framework uncertainty, prefer version-specific docs before guessing

4. **Compare with a known-good path**
   - Find nearby working code, tests, or similar flows in the repo
   - Identify the concrete difference instead of assuming

5. **Form one hypothesis**
   - State the most likely root cause
   - Make the smallest possible change to test that hypothesis

6. **Verify the fix**
   - Run the smallest credible command that proves the issue is fixed
   - If the first fix fails, go back to the evidence; do not stack random changes

## Repo-local reminders

- If the issue touches high-risk or contract-sensitive surfaces, also apply `project-contracts`.
- If the fix becomes non-trivial, route the result through `requesting-code-review` before concluding.

## Anti-patterns

- "Quick fix for now"
- Multiple speculative changes in one pass
- Treating a green build as proof without reproducing the original symptom
- Declaring success before fresh verification output
