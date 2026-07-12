# PROJECT-AGENTIC-INIT

This file is the tool-neutral bootstrap contract for __PROJECT_NAME__.

Put it into a new project and then ask your agent something like:

```text
Use PROJECT-AGENTIC-INIT.md and set up the agentic environment for this project.
```

## 1. Project Overview

- **Project Name:** __PROJECT_NAME__
- **Short Description:**  
- **Customer Type / Context:**  
- **Important goals of the agent setup:**  

## 2. Tech Stack

- **Framework / Runtime:**  
- **Frontend / Backend:**  
- **Database / ORM:**  
- **Testing:**  
- **Deployment Target:**  

## 3. Important Commands

```bash
# install

# develop

# build

# lint

# test

# deploy
```

### Cheap Post-Edit Checks

Only list truly cheap, file-scoped commands here. Commands without explicit repo paths or harness-trackable globs are treated as manual full checks even if they are listed in this block. If the repo only has full-project lint, build, or test commands, leave this block empty and keep those commands under Hard Stop Gates.

```bash
# formatter / lint / syntax-check
```

### Hard Stop Gates

Which manual full-check commands should be green before an agent may treat the state as "done" at the end of a larger task?

```bash
# build / test / lint / schema-validate
```

## 4. Hard Boundaries / Guardrails

- Files or paths that must never be edited automatically:
  - 
- Secrets / environment files:
  - 
- Deployment / production commands that always require human approval:
  - 
- Database / migration rules:
  - 

## 5. High-Risk Surfaces

- Auth:
- Routing:
- Payments / orders:
- Customer or personal data:
- External APIs / SSO / sync:
- Other critical flows:

## 6. Architecture Rules

- existing patterns the agent should respect:
  - 
- preferred structure:
  - 
- things the agent should not introduce:
  - 

## 7. Language and Copy Rules

- Default language:
- Tone / Copy direction:
- i18n specifics:

## 8. Desired Skills

- Verify Skill: yes / no
- Deploy Skill: yes / no
- Surface Skill: yes / no
- Contract Skill: yes / no
- additional desired skills:
  -
- optional workflow checklist skills (only add them if the repo wants explicit extra lanes despite the added latency):
  - systematic-debugging
  - verification-before-completion
  - requesting-code-review

## 9. Desired Output

The bootstrap should create or maintain, where possible:

- `AGENTS.md`
- `CLAUDE.md`
- `GEMINI.md`
- `.github/copilot-instructions.md`
- `.github/instructions/**/*.instructions.md`
- `.github/hooks/*.json`
- `.claude/settings.json`
- `.claudeignore`
- `.agentic/harness.json`
- `.agentic/hooks/`
- `.claude/agents/`
- `.agents/skills/`
- `.claude/skills/` (optional adapter)
- `docs/agentic-eval-pack.md`
- `docs/harness-token-optimization.md`
- `test-harness.sh`

## 10. Hook Preferences

- PreToolUse protection: yes / no
- PostToolUse checks: yes / no
- Stop gate with build/test/lint: yes / no

If a layer does not make sense, the agent should explain why.
