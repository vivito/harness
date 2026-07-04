---
applyTo: ".env,.env.local,.env.*"
---

These files and directories are protected.

- installed home-directory copies under `~/.config/agentic-bootstrap/**` should not be maintained as the source of truth; change the repository first and then reinstall deliberately
- installed copies under `~/.copilot/instructions/agentic-bootstrap.instructions.md`, `~/.agents/skills/project-bootstrap/**`, and `~/.claude/skills/project-bootstrap/**` should not be patched silently in place
- `.env`
- `.env.local`
- `.env.*`
- additional local secret or CI files: please review

- If a task appears to require touching these paths, stop and explain the safer alternative.
