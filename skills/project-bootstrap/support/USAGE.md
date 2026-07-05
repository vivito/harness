# /project-bootstrap Usage

## Quick path

1. Copy `PROJECT-AGENTIC-INIT.template.md` into a new repo as `PROJECT-AGENTIC-INIT.md`
2. Fill only the parts that matter
3. Open Claude Code in that repo
4. Run:

```text
/project-bootstrap
```

## If there is no init file

You can still say:

```text
/project-bootstrap
```

The skill will infer the stack from the repo and scaffold a best-effort setup.

## Good prompts

```text
/project-bootstrap
```

```text
Use PROJECT-AGENTIC-INIT.md and scaffold a repo-wide Claude Code setup.
```

```text
Please set up CLAUDE.md, .claude/, skills, subagents, and a small eval pack for this new client project.
```

## What the skill should produce

- repo-local agent files and shared contract files
- protection hooks
- post-edit and stop hooks when they make sense
- project-verify / project-deploy / project-contracts plus systematic-debugging / verification-before-completion / requesting-code-review as the default baseline
- surface or other stack-specific skills depending on the stack
- eval pack
- no blind overwriting of existing repo instructions
