---
name: trellis-meta
description: "Understand or customize local Trellis: .trellis, platform hooks/settings/agents/skills/commands/prompts/workflows, channel runtime and bundled agents, workflow templates, registry spec refresh, trellis mem, and bundled-skill dispatch."
---

# Trellis Meta

Use this skill in a project initialized with `trellis init`. Treat actual local files as authoritative; customize generated `.trellis/`, platform integration files, and `.agents/skills/`. The user need not have the upstream source repository. Keep project changes out of the global npm install and `node_modules`.

## Read before editing

1. Read `references/local-architecture/overview.md` for the local system model.
2. For a specific AI platform, read `references/platform-files/platform-map.md` and the relevant platform notes.
3. For multi-agent dispatch/channel workers, read `references/local-architecture/multi-agent-channel.md` and the bundled `.trellis/agents/` definitions.
4. For behavior changes, read `references/customize-local/overview.md`, then the applicable topic.
5. Read the actual target files; check `.trellis/.template-hashes.json` before replacing managed content. Preserve user changes and prefer `.new` sidecars over destructive template overwrites.

## Local architecture and rules

| Surface | Contract |
| --- | --- |
| `.trellis/workflow.md` | Workflow source of truth. Init selects `native`, `tdd`, `channel-driven-subagent-dispatch`, or a marketplace template; `trellis workflow --template <id>` reselects it. Missing referenced `.trellis/agents/<name>.md` produces a non-blocking stderr warning pointing to `trellis update`. |
| `.trellis/config.yaml` | Project configuration: lifecycle `hooks.after_create` / `after_start` / `after_finish` / `after_archive`; journal `session_commit_message` / `max_journal_lines` / `session_auto_commit`; `channel.worker_guard.idle_timeout` / `max_live_workers`; `codex.dispatch_mode` (`inline` / `sub-agent`); `registry.spec.source` + `registry.spec.template`. |
| `.trellis/spec/` | Project coding conventions/design constraints. With `registry.spec`, `trellis update` refreshes specs and hash tracking reports local edits as "modified by user" conflicts. |
| `.trellis/tasks/` | PRD, design, implementation plan, research, JSONL context, and task trees. Commands: `task.py create --parent <slug>`, `task.py add-subtask <parent> <child>`, `task.py remove-subtask <parent> <child>`, `task.py list-context <task>`. Creation rejects slugs already under `.trellis/tasks/archive/**`. |
| `.trellis/workspace/` | Deliberately written developer journals. Raw conversation history remains in platform stores and is queried with the `trellis mem` subcommands `search`, `extract`, and `context`. |
| `.trellis/agents/{check,implement}.md` | Editable platform-neutral channel workers loaded by `trellis channel spawn --agent <name>`; update backfills missing files. Per-platform agent edits do not affect these workers. |
| `.trellis/.template-hashes.json`, `.trellis/.runtime/` | Managed hashes and runtime state; confirm necessity before editing. |

Trellis v0.6 adds the channel runtime, cross-session memory, and paired CLI/SDK packages to workflow, persistence, and platform integration:

- `trellis channel` coordinates workers through `~/.trellis/channels/<project>/<channel>/events.jsonl`, outside the project. The user-owned store supports worker OOM guards, forum/thread channels, durable `idempotencyKey`, and file-locked sequence allocation. Write through the CLI or `@mindfoldhq/trellis-core/channel`, not by hand-editing events.
- `trellis mem list | search | context | extract | projects` reads raw local Claude Code, Codex, and Pi JSONL (`~/.claude/projects/`, `~/.codex/sessions/`, `~/.pi/agent/sessions/`), slices with `--phase brainstorm|implement|all`, and uploads nothing. OpenCode adapter support is degraded in the v0.6 line. `trellis-session-insight` guides recall.
- `@mindfoldhq/trellis` (CLI) and `@mindfoldhq/trellis-core` (SDK: `/channel`, `/task`, `/mem`, `/testing`) ship in lockstep with one version and git tag.

## Platform and skill boundaries

Platform directories include `.claude/`, `.codex/`, `.cursor/`, `.opencode/`, `.kiro/`, `.gemini/`, `.qoder/`, `.codebuddy/`, `.github/`, `.factory/`, `.pi/`, `.reasonix/`, `.kilocode/`, `.agent/`, `.devin/`, and `.kimi-code/`. Actual settings/config decide which hooks, agents, skills, commands, prompts, and workflows run.

- Pi uses native `trellis_subagent` with `single` / `parallel` / `chain` and `isTrellisAgent()` validation.
- Reasonix stores workflow and subagent skills in `.reasonix/skills/<name>/SKILL.md`; subagents use `runAs: subagent`. It has no settings file; frontmatter controls behavior.
- Kimi Code shares workflow skills in `.agents/skills/`, delivers commands/agent prompts in `.kimi-code/skills/<name>/SKILL.md`, and installs the same agent prompts under `.kimi-code/agents/<name>.md`.
- `trellis-meta`, `trellis-spec-bootstrap`, `trellis-session-insight`, and `trellis-channel` are bundled multi-file skills, auto-dispatched to every platform skill root by `getBundledSkillTemplates()` in `packages/cli/src/templates/common/index.ts`. Adding a directory under upstream `packages/cli/src/templates/common/bundled-skills/` ships it on update.
- Keep team-private rules in project specs, local skills, tasks, or journals. Bundled skill directories are refreshed by `trellis update`; local customization requires maintaining that divergence.

Check local config and installed `trellis --help` before describing a mechanism as current. For channel worker behavior edit `.trellis/agents/<name>.md`; for platform subagents edit the platform definition. Upstream source and installed npm packages are not the default local customization target.

## References

### Local architecture

- `references/local-architecture/overview.md`: layers and customization principles.
- `references/local-architecture/generated-files.md`: init-generated files and boundaries, including `.trellis/agents/`.
- `references/local-architecture/workflow.md`: phases, routing, state blocks, and selectable templates.
- `references/local-architecture/task-system.md`: active tasks, JSONL context, task trees, and runtime.
- `references/local-architecture/spec-system.md`: organization, injection, and registry refresh.
- `references/local-architecture/workspace-memory.md`: journals, `trellis mem`, and the memory SDK.
- `references/local-architecture/context-injection.md`: hooks, subagent preludes, worker inbox routing.
- `references/local-architecture/multi-agent-channel.md`: commands, event store, forums, OOM guards, idempotency, and bundled agents.
- `references/local-architecture/bundled-skills.md`: bundled-skill auto-dispatch.

### Platform files

- `references/platform-files/overview.md`: shared files and hook/prelude/main-session/channel integration modes.
- `references/platform-files/platform-map.md`: platform paths, including Reasonix and Pi.
- `references/platform-files/hooks-and-settings.md`: hooks, plugins, extensions, worker guard, Codex dispatch mode.
- `references/platform-files/agents.md`: platform research/implement/check and channel agents.
- `references/platform-files/skills-and-commands.md`: skill/command/prompt/workflow entry points.

### Local customization

- `references/customize-local/overview.md`: select the customization entry point.
- `references/customize-local/change-workflow.md`: phases, routing, next actions, state, and templates.
- `references/customize-local/change-task-lifecycle.md`: creation, status, archive, tree links, slug collisions, and hooks.
- `references/customize-local/change-context-loading.md`: tasks, specs, journals, hook context, worker inbox, recall.
- `references/customize-local/change-hooks.md`: platform and lifecycle hooks, shell bridges.
- `references/customize-local/change-agents.md`: platform/channel agents and Codex dispatch mode.
- `references/customize-local/change-skills-or-commands.md`: local entry points and bundled dispatch.
- `references/customize-local/change-spec-structure.md`: spec layout and registry sources.
- `references/customize-local/add-project-local-conventions.md`: team rules in local specs/skills.
