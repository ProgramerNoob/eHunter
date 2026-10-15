---
name: trellis-channel
description: Use trellis channel for live multi-agent collaboration, workers, review, progress, forums, and channel-log debugging.
---

# Trellis Channel

Use `trellis channel` when agents need a durable event log, a peer worker must be spawned, an in-flight worker needs interruption or diagnosis, or feedback belongs on a `--type forum` channel.

Typical triggers include discussing with Codex/Claude, brainstorming with another agent, spawning an implement/check worker, requesting review, opening an issue/topic/changelog board, inspecting a thread, or diagnosing a stuck worker or truncated progress.

This skill is an index. Read only the reference for the current job; do not preload every reference.

## First commands

```bash
trellis --version
trellis channel --help
trellis channel list --all
trellis channel list --scope global --all
```

For a named channel or thread, inspect it first:

```bash
trellis channel forum <board> --scope global
trellis channel thread <board> <thread> --scope global
trellis channel context list <board> --scope global --thread <thread>
```

## Route by intent

| Intent | Read |
| --- | --- |
| Discuss or brainstorm with Codex/Claude | `references/workflows.md` |
| Spawn implement/check or request review | `references/workflows.md`, then `references/workers.md` |
| Create or inspect a forum, issue board, topic, or changelog | `references/forum.md` |
| Diagnose a stalled worker or truncated progress | `references/progress-debugging.md` |
| Check exact flags or command syntax | `references/command-reference.md` |

## Core rules

- Create forum channels with `--type forum`; a thread is an item inside a forum.
- Use `--context-file` / `--context-raw` and `trellis channel context add/delete/list`; `--linked-context-*` is deprecated.
- Use `--stdin` or `--text-file` for long messages instead of positional mixed-language shell arguments.
- `--as` identifies the speaker or worker handle depending on the command; use stable explicit names when multiple agents or sessions participate.
- `--scope project` is the default current-project bucket; `--scope global` uses the shared `__global__` bucket and is invisible from project listings without that flag.
- For brainstorm, run multiple pressure-test rounds. One answer plus one confirmation is review, not brainstorming.
- Wait for Trellis-emitted system events with `--kind done` or `--kind turn_finished`. `--tag` values (including help examples `phase_done` and `question`) are opaque labels; only `interrupt` has reserved behavior. Workers may mention a tag in prose without executing `send --tag <my_signal>`, so tags are unreliable completion signals. See “tag vs kind” in `references/command-reference.md`.
- Pretty `messages` output is an operator view and may truncate progress. Use `--raw` for audit.
- Forum channels are event-sourced; inspect `forum`, `thread`, `messages --thread`, and `context list` instead of reading `events.jsonl` first.
- `@mindfoldhq/trellis-core` owns channel/thread state, event append, sequence allocation, context/title projection, reducers, and task helpers. The CLI owns flags, rendering, prompts, worker lifecycle, and exits.

## Reference files

- `references/workflows.md`: collaboration patterns A–F (peer brainstorm, spawned review, dispatch/wait, forum capture, interrupt/redirect, one-shot run).
- `references/forum.md`: forums, threads, context, titles, renames, changelog boards, and filtering.
- `references/workers.md`: spawn, agent cards, context injection (`--file` / `--jsonl`), interrupts, and kill semantics.
- `references/progress-debugging.md`: progress/raw inspection, stalled-worker diagnosis, OOM guard, and exit codes.
- `references/command-reference.md`: current commands, flags, output, scope, and type model.

## Scope

A static review that needs only a markdown file and prompt, replacing normal tool calls with self-logging, and long-term memory retrieval do not need this skill. Use `trellis mem` through `trellis-session-insight` for session history.
