# 浏览器预检任务的分支修正

2026-10-14，用户指出本任务的提交误落在 `fix/trellis-acp-context`，并选择从本地 `master` 创建独立任务分支、迁移本任务四个提交，同时将 ACP 分支恢复到本任务提交前的位置。本次仅修正 Git 归属及关联记录，没有修改产品实现或重新执行浏览器验收。

## 修正结果

- 当前任务分支：`feat/browser-acceptance-preflight`，基于本地 `master` 的 `3b64ddf`。
- ACP 分支恢复到 `d2d81c4`；`master` 未移动。
- 原四个提交完整保存在 `backup/browser-preflight-before-branch-fix-20261014`，指向 `2d14d57`。
- 未推送远端；既有 `scripts/__pycache__/` 和 `.tmp/` 证据保留。

| 原提交 | 独立分支提交 | 内容 |
| --- | --- | --- |
| `6f3dc84` | `13fc961` | 预检实现、两个阅读器阻塞修复及测试 |
| `23910a2` | `067894c` | 任务归档 |
| `8b5658d` | `4295e8e` | 归档后的引用校正 |
| `2d14d57` | `e422180` | 本任务会话日志 |

最后一个提交的工作区索引发生冲突。合并时保留 master 已有八次会话，仅追加浏览器预检任务为第九次会话，移除自动合并带入的 ACP 会话记录，并更新分支与提交哈希。ACP 会话仍保留在 ACP 分支和备份分支。本任务的 [task.json](../task.json) 与 [实施记录](../implement.md) 同步指向新分支提交；历史研究和原始运行证据中的旧分支、旧哈希保持原样，不冒充在新分支重新执行的结果。

## 验证

[修正审计](../../../../../../.tmp/branch-repair/verification.json) 对照迁移前记录核实：

- 34 个原任务文件中，30 个全文哈希不变，包括产品代码、全部测试、package.json、预检 helper、操作规范和 acceptance.json；四处差异仅为任务元数据、实施记录、会话日志和索引。
- 新分支相对 master 没有带入 ACP 的 agent、tooling spec 或 workflow 改动；既有用户文件哈希不变，冲突标记已清除。
- `task.py validate` 与 `git diff --check` 通过。
- [验收汇总](../../../../../../.tmp/branch-repair/acceptance-summary.json) 重新计算仍为 21 passed，0 failed/partial/blocked/unrun/waived。原运行结果未改写。

产品和测试内容完全相同，因此本次未重跑 229 项自动测试、生产构建或四个浏览器场景；沿用原已验证版本的证据。
