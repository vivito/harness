# __PROJECT_NAME__ - Agent Contract

This file is the **canonical** instruction file for this project.

If `PROJECT-AGENTIC-INIT.md` exists, it is the primary source for:

- project overview
- stack
- validation commands
- guardrails
- high-risk surfaces
- desired skills and hook layers

## Working principles

- Architecture, privacy, and final decisions stay in the trusted main lane.
- Bounded, clearly scoped tasks may be delegated to cheaper worker lanes.
- Deployment remains human-gated.
- Always run the smallest appropriate validation before finishing.
- After a stable result, commit and push if the project uses Git.

## Bootstrap rule

If this file still contains placeholders or gaps:

1. read `PROJECT-AGENTIC-INIT.md`
2. derive the project-specific rules from it
3. complete the setup carefully
4. do not overwrite existing project conventions blindly

## Project overview

- **Name:** __PROJECT_NAME__
- **Short description:** copy from `PROJECT-AGENTIC-INIT.md`
- **Important goals:** copy from `PROJECT-AGENTIC-INIT.md`

## Validation

The canonical commands live in `PROJECT-AGENTIC-INIT.md`.

Rule:

- start with the smallest credible check
- keep builds, tests, lint, and schema checks as narrow as possible

## Guardrails

At minimum, protect:

- `.env*`
- secrets
- generated build output
- deployment steps
- local databases or existing migrations when relevant

## Tool compatibility

- `AGENTS.md` is the main source
- `CLAUDE.md` and `GEMINI.md` may point to or mirror this file
- `.github/copilot-instructions.md` adds Copilot-specific guidance but does not replace this file
- `.github/hooks/*.json` and `.claude/settings.json` are the technical guardrail layers when the project uses an enforcement layer
- `.agentic/harness.json` and `.agentic/hooks/` hold the shared hook and verify policy across tools

## Still to be specified

- stack-specific architecture rules
- repo-specific high-risk surfaces
- hook policy
- eval pack
