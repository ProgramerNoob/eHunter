# Start Session

Initialize a Trellis-managed development session manually; this platform has no session-start hook.

## Load context

```bash
python3 ./.trellis/scripts/get_context.py
```

Read identity, git status, current/active tasks, and journal location. If output contains `Trellis update available:`, preserve that full line when reporting.

```bash
python3 ./.trellis/scripts/get_context.py --mode phase
```

This gives the compact phase index, triage, planning artifact contract, and the command for step details. Read `.trellis/workflow.md` when full guidance is needed.

Discover and load applicable specs:

```bash
python3 ./.trellis/scripts/get_context.py --mode packages
cat .trellis/spec/guides/index.md
cat .trellis/spec/<package>/<layer>/index.md
```

Indexes point to guidelines for coding; read those files when implementation starts.

## Choose the next action

Use current task status and artifacts:

- `planning` without `prd.md`: Phase 1.1, load `trellis-brainstorm`.
- `planning` with `prd.md`: stay in Phase 1. Lightweight tasks can be PRD-only; complex tasks need `design.md` and `implement.md`. Load the relevant Phase 1 step detail before `task.py start`.
- `in_progress`: load Phase 2 step 2.1:
  ```bash
  python3 ./.trellis/scripts/get_context.py --mode phase --step 2.1 --platform pi
  ```
- no active task: classify the turn. For simple conversation or a small task, ask only whether to create a Trellis task; for complex work, ask whether to create one and enter planning. If the user declines, skip Trellis for this session.

User approval to create a task does not approve implementation.

## Skill routing

| Intent | Skill |
| --- | --- |
| New feature or unclear requirements | `trellis-brainstorm` |
| About to write code | `trellis-before-dev` |
| Coding complete or quality check | `trellis-check` |
| Repeated or stuck bug | `trellis-break-loop` |
| Learned something worth capturing | `trellis-update-spec` |

Full routing and anti-rationalization rules are in `.trellis/workflow.md`.
