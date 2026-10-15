# Finish Work

Wrap up the current session by archiving completed tasks and recording a journal. Code commits happen in Phase 3.4 before this prompt; this prompt does not commit code.

## 1. Survey

```bash
python3 ./.trellis/scripts/get_context.py --mode record
```

Review active tasks, git status, and recent commits. For other completed-but-unarchived tasks (code merged, acceptance criteria met), ask once whether to archive them too; default is no.

## 2. Classify dirty paths

```bash
git status --porcelain
```

Ignore `.trellis/workspace/` and `.trellis/tasks/`, managed by journal/archive auto-commits. Classify every other path using the task PRD/manifests, scope, and this session's edits. Current-task work → list it and return to Phase 3.4, where the AI drives the batched commit; do not commit or ask the user to commit here. Unrelated parallel work → report once and continue. Uncertain ownership → ask once “this task (commit) or another window (ignore)?” and route accordingly.

## 3. Archive

For the current task, if any, and each confirmed extra task, independently read the [acceptance protocol](../../.trellis/spec/frontend/quality-guidelines.md#execute-summarize-and-close) and run:

```bash
python3 scripts/acceptance.py archive <task-dir>
```

- Exit `0`: native archive succeeded; preserve JSON and report `acceptanceStatus` (`passed` or `waived`). Disclose waiver reasons, authority, and original observations. Each archive creates `chore(task): archive ...`.
- Exit `1` or `2`: acceptance is unmet or invalid; report checks/errors and stop completion/archive for that task. The wrapper has not delegated or changed task/pointer state. Backfill old records from original criteria and real observations before retrying.
- Exit `4`: delegation failed; preserve `archiveExitCode` and original output, inspect directory/pointer/Git state, and report. The native archive may already have moved the task; do not automatically retry.

The wrapper recomputes acceptance and delegates only passed/waived tasks. Waived archive exits `0`; waived summarize exits `3`. Do not substitute native archive calls. Keep incomplete tasks active and record their actual state in the journal. Skip archival if there is no current task or confirmed extra task.

## 4. Journal

```bash
python3 ./.trellis/scripts/add_session.py \
  --title "Session Title" \
  --commit "hash1,hash2" \
  --summary "Brief summary"
```

Use work commit hashes from Phase 3.4 (survey output or `git log --oneline`), not archive commits. This creates `chore: record journal`. Final log order is work commits → archive commits → journal commit.
