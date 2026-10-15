---
name: trellis-spec-bootstrap
description: "Create or refresh Trellis coding specs from codebase evidence using GitNexus, ABCoder, or source inspection; plan package/layer coverage and write concrete guidelines."
---

# Trellis Spec Bootstrap

Use this skill to create or refresh `.trellis/spec/` from the current codebase. One agent owns the loop: analyze the repository, choose boundaries, write concrete guidance, and verify it. The workflow is platform-neutral.

## Workflow

1. Confirm Trellis is initialized and inspect the current `.trellis/spec/` tree.
2. Analyze architecture with the best available tools: GitNexus, ABCoder, language tooling, and direct source reads.
3. Split work by package and layer only when the codebase has those boundaries.
4. Write concrete patterns, paths, examples, and anti-patterns from the project.
5. Check internal consistency and remove all template placeholders.

## Route to references

| Need | Read |
| --- | --- |
| Repository architecture analysis | [Repository analysis](references/repository-analysis.md) |
| Spec decomposition and task planning | [Spec task planning](references/spec-task-planning.md) |
| High-signal spec writing | [Spec writing](references/spec-writing.md) |
| GitNexus or ABCoder setup | [MCP setup](references/mcp-setup.md) |

## Operating rules

Treat templates as starting points. Delete, rename, split, or add files when the repository requires it. Base each important recommendation on source-backed patterns and real paths. Keep execution single-owner by default; helpers are optional. Write platform-specific guidance only for platforms the project standardizes on. Do not leave placeholders, empty headings, or copied boilerplate.

## Done criteria

- `.trellis/spec/` describes the current project.
- Relevant package/layer files contain practical guidance and real examples.
- Non-applicable template sections are removed.
- `index.md` files match the final file set.
- Required setup or analysis assumptions are recorded in the relevant spec or task notes.
