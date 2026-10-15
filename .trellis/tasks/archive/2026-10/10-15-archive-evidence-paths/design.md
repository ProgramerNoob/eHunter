# 设计：归档时同步 acceptance evidence 路径

## 边界与行为契约

归档命令的现有顺序保持不变：校验 active task → 更新 `task.json`/子任务关系 → 清理会话指针 → 移动任务目录 → 自动提交 → 执行 `after_archive` hook。新增步骤只插入在“移动成功”和“自动提交”之间，使用 `archive_task_complete()` 返回的实际 `archive_dest`。

新增内部函数放在 `.trellis/scripts/common/task_store.py`，因为它属于 `task.py archive` 的编排行为，并且该模块已经拥有 `read_json_checked()`、`write_json()`、错误输出和自动提交边界；不把验收协议改动放进 `scripts/acceptance.py`，也不让通用 `archive_task_dir()` 依赖 acceptance schema。

函数契约：

```python
def _rewrite_archived_acceptance_evidence(
    archive_dest: Path,
    active_task_dir: Path,
    repo_root: Path,
) -> bool
```

- `archive_dest` 必须直接使用 `archive_task_complete()` 返回的实际目标；不重新计算月份。
- 由 `active_task_dir` 和 `archive_dest` 相对 `repo_root` 生成 POSIX 路径前缀：`.trellis/tasks/<name>/` → `.trellis/tasks/archive/YYYY-MM/<name>/`。
- 只读取归档副本的 `acceptance.json`，只遍历 `checks` 列表中的 `evidence` 列表；字符串值必须以 active 前缀（含末尾 `/`）开头才替换。这样不会误改 `.trellis/tasks/<name>-other/`、`.tmp/`、仓库其他路径或 note/claim 中相同文字。
- 无 `acceptance.json`、`checks` 中没有匹配值时返回 `True` 且不写文件，保持已有归档行为。
- 有匹配值时原地更新 evidence 字符串，调用既有 `write_json()` 原子写回；除 evidence 数组中的匹配字符串外不改变对象内容。
- JSON 不可读、非法 JSON、顶层或 `checks`/`evidence` 结构无法安全遍历、原子写入失败时返回 `False`，输出明确的 warning/error；不截断或覆盖原文件。调用方将归档视为部分失败并返回非零，不继续自动提交，避免把已知失效的验收记录报告为成功。任务目录已经移动的事实必须在输出中说明，用户可修复后手动提交/重试后续操作。

## 数据流与兼容性

1. 移动前保留 `task_dir`（仍代表 active 路径）。
2. `archive_task_complete(task_dir, repo_root)` 成功后得到 `archive_dest`。
3. `_rewrite_archived_acceptance_evidence(archive_dest, task_dir, repo_root)` 使用实际源/目标前缀完成最小 JSON 修改。
4. 成功或 no-op 才进入既有 auto-commit；auto-commit 失败仍走原有“磁盘已移动但 git auto-commit 未完成”的返回语义。
5. evidence 同步失败时不调用 auto-commit，输出“归档已在磁盘移动，但 acceptance evidence 未更新”，返回 1；这样不会把失败隐藏成成功，也不扩大提交 pathspec。
6. 成功后原有归档路径输出和 `after_archive` hook 保持不变。hook 看到的 `task.json` 路径不变。

不会处理历史 archive 目录，也不会改写 acceptance schema、验收结论、提交 hash、note、observed、execution 或不属于 active task 前缀的 evidence。

## 失败与回滚

- `acceptance.json` 缺失是可选记录：继续归档。
- 没有匹配证据：继续归档，保持字节内容不变（不强求 JSON 格式化）。
- 读取失败/结构异常/写入失败：原子写保证原文件不被半写；目录移动已发生，命令退出 1 并说明后续人工处理，不执行自动提交。
- 自动提交失败：沿用现有逻辑，退出 1；不因新增同步步骤改变 `_auto_commit_archive()` 的路径集合。
- 归档目标冲突、状态写入失败、子任务关系写入失败仍在新增步骤之前按现有路径返回。

## 测试设计

新增 `scripts/test_archive_evidence.py`：

- 函数级成功案例：多个任务内 evidence 被替换，任务外、`.tmp/`、相似前缀和非字符串值不变；完整 JSON 其他字段深度相等。
- no-op 案例：缺失 acceptance、无匹配 evidence 不写文件且返回 True。
- 失败案例：非法 JSON/不可读读取/非法 checks 结构/原子写入失败返回 False，错误可诊断，原始 bytes 保持不变。
- 命令级案例：在临时 `.trellis/tasks/<name>` 上调用真实 `cmd_archive(..., --no-commit)`，确认目录实际移动到当月 archive 目录、evidence 指向可读归档文件，且 `scripts/acceptance.py summarize` 可验证记录。

现有 `test_acceptance.py` 和 `test_archive_autocommit.py` 不修改其既有契约；完整 `npm run check` 作为收口门禁。

## 不采用的方案

- 不在 `scripts/acceptance.py archive` 中单独修复：原生 `task.py archive` 仍会绕过该包装器，无法保证所有归档入口一致。
- 不在通用移动函数中硬编码 acceptance schema：会扩大低层 utility 责任，并让其他移动调用方意外改写 JSON。
- 不做整个任务目录下所有文件或所有 JSON 字符串的替换：会改动 note、历史路径或外部证据，违反最小变更契约。
