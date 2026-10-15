# 实施计划：归档 evidence 路径同步

## 1. 启动前门禁

- [x] 修正并验证 PRD 的 `## Acceptance Criteria` 使用唯一 `[AC1]`–`[AC5]` 标识。
- [x] 将 PRD、设计和本实施计划加入 implement/check context manifest，并运行 `task.py validate`。
- [x] 运行 `python3 ./.trellis/scripts/task.py start .trellis/tasks/10-15-archive-evidence-paths`，确认任务进入 `in_progress`。

## 2. 实现与单元回归

- [x] 在 `.trellis/scripts/common/task_store.py` 增加 `_rewrite_archived_acceptance_evidence(archive_dest, active_task_dir, repo_root) -> bool`。
  - 复用 `read_json_checked()`、`describe_json_read_failure()`、`write_json()`。
  - 仅在 `checks[*].evidence` 字符串拥有 active task 路径前缀时替换到实际 archive 目标前缀。
  - 缺失文件和无匹配 evidence 返回成功；结构/读取/写入失败输出诊断并返回失败。
- [x] 在 `cmd_archive()` 的实际移动成功分支中、auto-commit 前调用同步函数；同步失败返回非零并跳过自动提交，成功/no-op 保持既有自动提交和 hook 流程。
- [x] 新增 `scripts/test_archive_evidence.py`，覆盖成功替换、路径边界、非任务 evidence、缺失/无匹配、非法/不可读/写入失败，以及临时任务的真实 `cmd_archive --no-commit` 流程。

## 3. 分阶段验证

- [x] 测试开始前按 `.pi/skills/notify-complete/SKILL.md` 播放短提示。
- [x] 运行 `python3 -m unittest discover -s scripts -p 'test_archive_evidence.py'`。
- [x] 运行 `python3 -m unittest discover -s scripts -p 'test_acceptance.py'`。
- [x] 运行 `python3 -m unittest discover -s scripts -p 'test_archive_autocommit.py'`。
- [x] 用临时任务执行真实归档流程，并用 `python3 scripts/acceptance.py summarize <archive-dir>` 验证 `valid: true`；临时目录不进入仓库交付物。

## 4. 收口检查

- [x] 运行 `npm run check`，记录实际退出码和日志；不报告未运行的 lint 或浏览器验收。
- [x] 运行 `node scripts/check-docs.mjs`（已被 `npm run check` 覆盖），确认 PRD/design/implement/context 引用合法。
- [x] 核对 `git diff` 仅包含任务范围文件，确认没有改动历史 archive evidence、`scripts/acceptance.py` schema 或自动提交 pathspec。
- [x] 生成/更新任务 `acceptance.json`，为每个 AC 记录真实命令、日志和观察结果；5/5 checks 为 passed。
- [x] 运行 trellis-check 自检；发现的机械问题已修复并重跑受影响检查。
- [x] 测试完成后按 `.pi/skills/notify-complete/SKILL.md` 播放长提示；清理本任务创建且无需保留的 `.tmp` 产物。
- [x] 更新必要的 tooling spec/任务交付记录，提交代码和任务产物；提交前确认工作区状态、任务状态和 acceptance 证据。

## 回滚点

- 启动前：仅任务规划文档和 context manifest。
- 实现后测试失败：回退 `task_store.py` 与新增测试，保留任务文档用于修订。
- 归档行为出现问题：不运行 destructive Git 操作；使用临时任务验证，代码回退后重跑归档回归。
