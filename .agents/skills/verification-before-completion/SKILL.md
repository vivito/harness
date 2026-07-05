---
description: Use before claiming work is done, fixed, or passing in this repository.
---

# Verification Before Completion

Use this skill immediately before any success claim, completion statement, handoff, or commit-ready conclusion.

## Core rule

**No success claims without fresh verification evidence.**

If you have not just run the command that proves the claim, you cannot honestly claim the work is done.

## Required flow

1. **State the claim**
   - Example: "the bug is fixed", "the build passes", "the change is ready"

2. **Choose the smallest credible proof**
   - For harness, skill, or docs changes: use the smallest existing command that proves the edited surface still works
   - For route, contract, or behavior changes: use the most targeted command that truly covers the claim
   - Prefer `project-verify` guidance when the repo already has it

3. **Run the command fresh**
   - Do not rely on an earlier run
   - Read the actual output and exit status

4. **Compare output to the claim**
   - If it proves the claim, report success plainly
   - If it does not, report the actual state instead of optimistic wording

## Repo-local reminders

- For high-risk surfaces, verification is not optional just because the change looks small.
- If the change is non-trivial, pair this skill with `requesting-code-review`.

## Anti-patterns

- "Should work now"
- "Looks good"
- Reusing stale command output
- Claiming a bug is fixed without checking the original failing path
- Treating agent output as proof without independent verification
