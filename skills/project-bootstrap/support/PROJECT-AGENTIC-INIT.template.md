# PROJECT-AGENTIC-INIT

This file is the optional project-init template for `/project-bootstrap`.

Place it at the repo root of a new project as `PROJECT-AGENTIC-INIT.md`, adjust the relevant points briefly, and then ask the agent:

```text
/project-bootstrap
```

Or:

```text
Use PROJECT-AGENTIC-INIT.md and bootstrap the agentic setup for this project.
```

---

## 1. Project Overview

- **Project Name:**  
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

Which inexpensive checks can the agent run directly after file edits?

```bash
# formatter / lint / syntax-check
```

### Hard Stop Gates

Which commands must be green before an agent may treat the state as "done"?

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

Which project skills would be useful?

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

The bootstrap should create, where possible:

- `AGENTS.md`
- `CLAUDE.md`
- `GEMINI.md`
- `.github/copilot-instructions.md`
- `.github/instructions/**/*.instructions.md`
- `.github/hooks/*.json`
- `.claudeignore`
- `.agentic/harness.json`
- `.agentic/hooks/`
- `.claude/settings.json`
- `.claude/agents/`
- `.agents/skills/`
- `.claude/skills/` (optional adapter)
- `docs/agentic-eval-pack.md`
- `test-harness.sh`

If something here does not make sense, the agent should explain it instead of creating it blindly.

## 10. Hook Preferences

Which hook layers should ideally be created?

- PreToolUse protection: yes / no
- PostToolUse checks: yes / no
- Stop gate with build/test/lint: yes / no

If a layer does not make sense, the agent should explain why.
