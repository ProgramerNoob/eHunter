# Continue Current Task

Resume the current task at the phase and step indicated by `.trellis/workflow.md`.

## Load context

```bash
python3 ./.trellis/scripts/get_context.py
python3 ./.trellis/scripts/get_context.py --mode phase
```

The first command confirms the task, status, and recent commits. The second shows phase routing and skill mapping. This does not approve implementation.

Route by status and artifacts:

- `planning` without `prd.md` → 1.1, load `trellis-brainstorm`.
- `planning` with only `prd.md` → 1.4 review for a lightweight task; complex tasks return to 1.1 to add `design.md` and `implement.md`.
- `planning` with complete complex artifacts but an empty or legacy `_example` context manifest → 1.3.
- `planning` with required artifacts and curated manifests (or inline mode) → 1.4; request the start review and run `task.py start` only after user confirmation.
- `in_progress` before implementation → 2.1.
- `in_progress` after implementation but before checks → 2.2.
- `in_progress` after checks pass → 3.3 spec update, then 3.4 commit.
- `completed` → archive flow.

Within a phase, run required steps in order. A `[once]` step is complete when its required output exists. You may return to an earlier phase when discoveries require it.

Once the step is known, load its detail:

```bash
python3 ./.trellis/scripts/get_context.py --mode phase --step <X.X> --platform pi
```

Follow the loaded instructions, advancing after each required step completes. The canonical workflow is `.trellis/workflow.md`; this prompt is only an entry point.
