# 范围门禁文档补充目录规则与引号写法

## Goal

在 `.trellis/spec/tooling/task-scope-gate.md` 的「声明」节补上两条操作约束，避免再次写出永远匹配不到文件的死规则。

## Background

归档任务 `10-24-close-known-spec-gaps` 时，scope gate 报出唯一一条越界路径：

```
Scope violation: .trellis/spec/frontend/decisions/2026-09-18-reader-behavior.md [head, index] — no category rule matches
```

根因不在 `extend-scope`：`extend_scope_category`（`.trellis/scripts/common/scope_gate.py:540-575`）只把命令行收到的字符串原样写入，不访问文件系统。问题出在调用方式——命令行传的是未加引号的 `.trellis/spec/frontend/**`，本机 `bash 3.2.57` 无 globstar，`**` 退化为 `*`，于是 shell 展开了 11 项，其中两个目录 `decisions` 与 `features` 变成精确规则。而 `rule_matches`（`scope_gate.py:72-79`）对非 `/**` 规则只做 `path == rule`，目录精确规则永远匹配不到任何文件。

该任务最终的 `categories.spec` 12 条规则里，`decisions` 这条是死规则，`features` 靠事后补 `features/**` 才救回。

## Requirements

### R1 目录规则写法

在「声明」节说明：规则写目录时必须写末尾 `/**` 的目录前缀，只写目录名会成为永远匹配不到文件的精确规则。

### R2 命令行参数引号

在「声明」节说明：`extend-scope` 等命令的规则参数需加引号，否则 shell 的 glob 展开会把单个目录规则拆成若干精确路径（并说明 `bash` 无 globstar 时 `**` 退化为 `*`）。

## Constraints

- 只改 `.trellis/spec/tooling/task-scope-gate.md`；不改 `scope_gate.py`、`task_store.py` 或测试。
- 只描述当前行为，不记录本次归档事件的过程细节。
- 该文件不在 `.trellis/.template-hashes.json` 中，改动不受 `trellis update` 覆盖。

## Out of Scope

- `extend-scope` 自动把目录规则改写为 `dir/**`。
- 归档时对未命中任何改动路径的规则告警。

## Acceptance Criteria

- [AC1] `.trellis/spec/tooling/task-scope-gate.md` 的「声明」节包含目录规则必须写 `/**` 的说明，以及命令行参数需加引号以免 shell 展开的说明。

## Notes

- 纯文档改动，按 `quality-guidelines.md` 的验收路由走文档路线，只验证引用、格式与所述命令。
