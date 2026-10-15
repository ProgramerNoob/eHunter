# 修复任务归档后的验收证据路径

## Goal

让 `task.py archive` 在移动任务目录后自动同步该任务 `acceptance.json` 中指向任务自身目录的 `evidence` 路径，避免归档后验收门禁因路径失效而报告 `not a readable file`。

## Background

当前归档流程把 `.trellis/tasks/<task-dir>/` 移到 `.trellis/tasks/archive/YYYY-MM/<task-dir>/`，但验收记录中的 repository-relative 路径不会随目录移动。`scripts/acceptance.py` 会从仓库根解析 `checks[*].evidence`，因此旧路径在归档后失效。现有归档任务已经出现该问题：同一条机械替换规则曾修复 `10-15-retrospective-followup` 的 3 条路径和 `10-15-trellis-lean-tool-descriptions` 的 13 条路径。

现有 `task.py archive` 的移动、子任务关系更新、会话指针清理和自动提交流程必须继续工作；不应扩大自动提交范围或修改验收结论。

## Requirements

- 在任务从 active 目录成功归档到 `archive/YYYY-MM/` 时，处理归档副本中的 `acceptance.json`。
- 仅改写 `checks[*].evidence` 中以当前任务 active 路径前缀 `.trellis/tasks/<task-dir>/` 开头的字符串，目标为实际归档路径前缀 `.trellis/tasks/archive/YYYY-MM/<task-dir>/`。
- evidence 指向仓库其他位置、`.tmp/` 或任务目录外部的路径保持不变；不做全 JSON 字符串的盲目替换。
- `acceptance.json` 缺失，或没有需要改写的 evidence 时，不改变现有归档行为。
- 改写使用现有 JSON 原子写入能力，保持 schemaVersion、criteria、checks、验收结论、note、observed 和其他字段不变；输出必须仍是合法 JSON。
- 归档后的自动提交继续只包含归档流程实际触及的任务路径，不夹带其他任务或用户已暂存文件。
- 为路径改写、无匹配路径、任务无 acceptance.json、不可读/非法 acceptance.json 及写入失败补充回归覆盖，并保留可诊断的错误或警告。

## Acceptance Criteria

- [AC1] 对包含旧任务路径 evidence 的有效 `acceptance.json` 执行 `task.py archive` 后，归档副本中的所有任务内 evidence 都指向真实存在的归档文件；`python3 scripts/acceptance.py summarize <archive-dir>` 返回 `valid: true`，且原验收结论未改变。
- [AC2] 任务外 evidence、`.tmp/` 路径、无 acceptance.json 和无匹配 evidence 的任务归档行为保持兼容，相关内容不被改写。
- [AC3] 非法 JSON、不可读文件或原子写入失败不会被静默覆盖或截断；命令输出能说明问题，已有归档/自动提交失败语义不被掩盖。
- [AC4] 新增回归测试覆盖成功改写、路径边界、无匹配/缺失文件和失败分支；现有 `test_acceptance.py`、`test_archive_autocommit.py` 及 `npm run check` 全部通过。
- [AC5] 代码和测试保持 Trellis 工具层边界，不修改 acceptance.json schema，不改变自动提交的窄路径约束；文档检查通过。

## Out of Scope

- 不批量修复历史归档任务；本任务只保证以后归档自动同步，历史数据由单独修复提交处理。
- 不改写 `acceptance.json` 中的提交 hash、验收 claim、note、observed 或 execution 结果。
- 不修改 `scripts/acceptance.py` 的验收协议或放宽 evidence 可读性要求。
- 不改变任务归档日期规则、分支校验、子任务关系、会话指针或 git 自动提交策略。

## Technical Notes

- 归档目标路径由 `archive_destination_for()` 计算；路径改写应使用实际返回的 archive destination，不能自行重新推导月份。
- 现有 `write_json()` 提供同目录临时文件 + `os.replace` 的原子写入，应复用而不是直接截断写文件。
- 归档移动发生在 `common/task_utils.py`，命令编排和自动提交发生在 `common/task_store.py`；实现应明确处理移动成功后验收文件更新失败，避免返回“完全成功”但留下静默失效记录。
- 任务已批准并启动；`task.py start` 已将任务置于 `in_progress`，后续实现与验收记录见任务产物。

## Verification

- `python3 -m unittest discover -s scripts -p 'test_acceptance.py'`
- `python3 -m unittest discover -s scripts -p 'test_archive_autocommit.py'`
- 新增归档 evidence 回归测试命令
- `npm run check`
- 至少用一个临时任务目录完成真实 `task.py archive` 流程验证，并确认归档后的 acceptance evidence 可由 `acceptance.py` 读取。

## Notes

- 任务由已确认的历史问题创建：归档目录移动后，两个已完成任务的 evidence 路径曾需要人工机械修复。
- 已完成实现与验收：`task.py start` 后修改 `.trellis/scripts/common/task_store.py`、`scripts/test_archive_evidence.py` 和 `package.json`；5/5 acceptance checks passed，`npm run check` exit 0。
