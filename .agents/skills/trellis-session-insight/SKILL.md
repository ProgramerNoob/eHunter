---
name: trellis-session-insight
description: "Use trellis mem to recall past discussions, solutions, decisions, or task history; also for overlapping brainstorms, familiar bugs, session continuation, and finish-work reviews."
---

# Trellis Session Insight

Use this capability when the answer may live in an older AI conversation rather than the current task, code, or spec. It returns raw local dialogue; decide whether to quote it, write it back, or only use it as context.

## What `mem` reads

`trellis mem` indexes local Claude Code, Codex, Devin CLI, Grok, OpenCode, Pi Agent, and ZCode logs. Sources: Claude `~/.claude/projects/`; Codex `~/.codex/sessions/`; Devin CLI `~/.local/share/devin/cli/sessions.db` (Cognition's terminal agent, distinct from `trellis init --devin` Desktop); Grok `~/.grok/sessions/`; OpenCode `~/.local/share/opencode/opencode.db` (zero-dependency SQLite reader); Pi's default or environment-configured session root plus global `~/.pi/agent/settings.json` and project `.pi/settings.json`; ZCode `~/.zcode/cli/db/db.sqlite`. Relative Pi `sessionDir` values resolve from their settings file directory; project-local settings require current cwd or `--cwd`. Nothing is uploaded.

## Triggers

Reach for history when:

- a new brainstorm touches an area with a prior decision;
- a current bug resembles one previously reported or fixed;
- the user resumes after a gap or asks where work stopped;
- the user refers to a decision in an older brainstorm;
- the user explicitly requests a finish-work retrospective;
- the user asks for patterns across past work.

See `references/triggering-patterns.md` for English and Chinese user phrasings that trigger recall.

Use code/specs, `git log -p`, or current task context for facts already available there. In a dispatched `trellis-implement` or `trellis-check` agent with curated context, `mem` usually adds noise. Skip it when the user asks not to search history.

## Commands

The full reference is in `references/cli-quick-reference.md`; common calls are:

```bash
# Search the current project; add --global for every project.
trellis mem search "<keyword>"

# Extract or inspect a session.
trellis mem extract <session-id> --phase brainstorm
trellis mem extract <session-id> --grep "<keyword>"
trellis mem context <session-id> --turns 3 --around 2

# Find sessions and projects.
trellis mem list --cwd <project-path>
trellis mem projects
```

`--phase brainstorm|implement|all` slices at `task.py create` and `task.py start`; the default is `all`. For current-task finish review, use `brainstorm` for planning and `implement` for execution.

## Decide where findings go

Treat output as evidence, not a deliverable:

- Quote a specific answer in the reply with session ID/phase when the user needs to verify it.
- Propose a `prd.md` or `design.md` update for a load-bearing current-task decision before writing it.
- Put task-local findings in `<task>/notes.md` when they do not fit the PRD.
- Use `trellis-update-spec` for project-wide conventions or gotchas.
- Absorb one-off context without writing when no durable record is needed.

`mem` is read-only for platform logs, does not edit code or sync remotely, and does not replace task/spec workflows.
