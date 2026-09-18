---
description: Convert existing tasks into actionable, dependency-ordered GitHub issues for the feature based on available design artifacts.
tools: ['github/github-mcp-server/list_issues', 'github/github-mcp-server/issue_write']
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Pre-Execution Checks

**Check for extension hooks (before tasks-to-issues conversion)**:
- Check if `.specify/extensions.yml` exists in the project root.
- If it exists, read it and look for entries under the `hooks.before_taskstoissues` key
- If the YAML cannot be parsed or is invalid, do not skip silently: tell the user that `.specify/extensions.yml` could not be read (include the parser error) and that no hooks were checked, including any mandatory (`optional: false`) hooks registered there, then continue normally
- Filter out hooks where `enabled` is explicitly `false`. Treat hooks without an `enabled` field as enabled by default.
- For each remaining hook, do **not** attempt to interpret or evaluate hook `condition` expressions:
  - If the hook has no `condition` field, or it is null/empty, treat the hook as executable
  - If the hook defines a non-empty `condition`, skip the hook and leave condition evaluation to the HookExecutor implementation
- For each executable hook, output the following based on its `optional` flag:
  - **Optional hook** (`optional: true`):
    ```
    ## Extension Hooks

    **Optional Pre-Hook**: {extension}
    Command: `/{command}`
    Description: {description}

    Prompt: {prompt}
    To execute: `/{command}`
    ```
  - **Mandatory hook** (`optional: false`):
    ```
    ## Extension Hooks

    **Automatic Pre-Hook**: {extension}
    Executing: `/{command}`
    EXECUTE_COMMAND: {command}

    Wait for the result of the hook command before proceeding to the Outline.
    ```
    After emitting the block above you MUST actually invoke the hook and wait for it to finish before continuing. Run it the same way you would run the command yourself in this agent/session (the invocation may differ from the literal `{command}` id shown above, e.g. a skills-mode agent runs it as `/skill:speckit-...` or `$speckit-...`). Emitting the block alone does not run the hook.
- If no hooks are registered or `.specify/extensions.yml` does not exist, skip silently

## Outline

1. Run `.specify/scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks` from repo root and parse FEATURE_DIR and AVAILABLE_DOCS list. All paths must be absolute. For single quotes in args like "I'm Groot", use escape syntax: e.g 'I'\''m Groot' (or double-quote if possible: "I'm Groot").
1. **IF EXISTS**: Load `.specify/memory/constitution.md` for project principles and governance constraints.
1. From the executed script, extract the path to **tasks**.
1. Get the Git remote by running:

```bash
git config --get remote.origin.url
```

> [!CAUTION]
> ONLY PROCEED TO NEXT STEPS IF THE REMOTE IS A GITHUB URL

1. **Build feature-scoped task keys**: Normalize FEATURE_DIR to its repository-relative path using `/` separators and no trailing slash, e.g. `specs/002-more-settings-modal`. Use this full path as FEATURE_KEY, not a historical branch name or numeric prefix. Stop if the feature is outside the target repository. Parse only Markdown task checkbox lines and extract each leading task ID with `\bT\d{3,}\b` (including T1000 and longer IDs); ignore ID mentions in descriptions, dependencies, and examples. Each identity is the pair `(FEATURE_KEY, TASK_ID)`. Duplicate task definitions in this tasks file are an error to report before creating issues.
1. **Fetch existing issues for deduplication**: Use the GitHub MCP server's `list_issues` for the repository identified by the remote. Include open and closed issues (omit `state`), request `perPage: 100`, and paginate with `after` using the previous `endCursor`. Fetch issue bodies if the listing omits them.
   - Match the exact body marker `<!-- speckit-task: FEATURE_KEY#TASK_ID -->` or the canonical title prefix `[FEATURE_KEY] TASK_ID: `. Compare the complete feature path and complete ID; another feature's T001 and T1000 versus T100 are distinct.
   - For legacy titles such as `T001: ...` or `[T001] ...`, require an exact reference to this feature's `tasks.md` or `spec.md` path/link in the issue body before counting a match. A bare task ID or similar description is insufficient. If a same-ID legacy issue has no clear feature ownership, report it as ambiguous and defer that task's creation until ownership is resolved; continue with unambiguous tasks.
   - Stop when every task key has a confirmed match or there are no more pages. Record confirmed matches and ambiguous candidates separately. If existing markers and titles disagree about ownership, report the conflict and defer the affected task.
1. **Create only missing, unambiguous tasks**: Strip the leading Markdown checkbox (`- [ ]`, `- [x]`, or `- [X]`) and optional `[P]` / `[US#]` markers to obtain TASK_ID and description. Create a title `[FEATURE_KEY] TASK_ID: <description>` and include the exact body marker plus the feature's repository-relative `tasks.md` path. Example: `[specs/002-more-settings-modal] T001: Create project structure`, with `<!-- speckit-task: specs/002-more-settings-modal#T001 -->` in the body.
   - Skip confirmed matches and report their issue numbers. Add each successfully created key to the matched set immediately so a retry in this run does not duplicate it.
   - Do not modify existing issues while deduplicating. Report ambiguous or failed tasks separately from created and skipped tasks.

> [!CAUTION]
> UNDER NO CIRCUMSTANCES EVER CREATE ISSUES IN REPOSITORIES THAT DO NOT MATCH THE REMOTE URL

## Post-Execution Checks

**Check for extension hooks (after tasks-to-issues conversion)**:
Check if `.specify/extensions.yml` exists in the project root.
- If it exists, read it and look for entries under the `hooks.after_taskstoissues` key
- If the YAML cannot be parsed or is invalid, do not skip silently: tell the user that `.specify/extensions.yml` could not be read (include the parser error) and that no hooks were checked, including any mandatory (`optional: false`) hooks registered there, then continue normally
- Filter out hooks where `enabled` is explicitly `false`. Treat hooks without an `enabled` field as enabled by default.
- For each remaining hook, do **not** attempt to interpret or evaluate hook `condition` expressions:
  - If the hook has no `condition` field, or it is null/empty, treat the hook as executable
  - If the hook defines a non-empty `condition`, skip the hook and leave condition evaluation to the HookExecutor implementation
- For each executable hook, output the following based on its `optional` flag:
  - **Optional hook** (`optional: true`):
    ```
    ## Extension Hooks

    **Optional Hook**: {extension}
    Command: `/{command}`
    Description: {description}

    Prompt: {prompt}
    To execute: `/{command}`
    ```
  - **Mandatory hook** (`optional: false`):
    ```
    ## Extension Hooks

    **Automatic Hook**: {extension}
    Executing: `/{command}`
    EXECUTE_COMMAND: {command}
    ```
    After emitting the block above you MUST actually invoke the hook and wait for it to finish before continuing. Run it the same way you would run the command yourself in this agent/session (the invocation may differ from the literal `{command}` id shown above, e.g. a skills-mode agent runs it as `/skill:speckit-...` or `$speckit-...`). Emitting the block alone does not run the hook.
- If no hooks are registered or `.specify/extensions.yml` does not exist, skip silently
