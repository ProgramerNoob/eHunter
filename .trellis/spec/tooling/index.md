# 项目工具规范

此目录维护 Pi/Trellis 开发工具契约，与阅读器产品规范分开。

| 文档 | 使用时机 |
| --- | --- |
| [Pi 子代理上下文与压缩](pi-context.md) | 修改工具 schema/提示、技能文本、角色白名单、上下文注入、压缩续接或对应验收 |
| [任务改动范围门禁](task-scope-gate.md) | 修改任务 scope、start 快照、archive 检查或排查越界/legacy 诊断 |
| [验收资源清理检查](../frontend/browser-acceptance/resource-cleanup.md#资源清理检查) | 修改 `cleanup-browser` 输入、分类或退出码，或核对浏览器收尾资源 |
| [临时产物体积报告](tmp-hygiene.md) | 检查 `.tmp/` 占用、核对哪些轮次产物仍被 `acceptance.json` 引用 |
| [归档提交兜底](archive-fallback.md) | `task.py archive` 内部 git 提交失败、需要手工补齐归档提交 |

## 脚本入口

| 脚本 | 契约 |
| --- | --- |
| [acceptance.py](../../../scripts/acceptance.py) | 验收记录的唯一读写入口，子命令 `summarize` / `validate` / `archive` / `run` / `verify-browser` / `cleanup-browser`。`run <task-dir> <check-id> -- <argv...>` 执行并记录退出码/日志；`validate` 只校验不写（退出 0 合法 / 2 非法）；`summarize` 输出聚合 JSON（0 passed / 1 未通过 / 2 非法 / 3 waived）；`verify-browser` 校验浏览器轮次产物（0 passed / 1 stale 或 blocked / 2 invalid / 3 legacy）；`cleanup-browser` 核对浏览器收尾资源；`archive` 校验通过后委派 `task.py archive`（`--skip-branch-validation` 可透传），记录未通过时退出 1、非法时退出 2，委派后原生失败一律退出 4（`archiveExitCode` 保留原生返回码，启动失败为 null）。改记录元数据的 `set-meta`、以及只校验上下文清单的 `validate` 属于 `task.py`，不是本脚本子命令 |
| [tmp-report.mjs](../../../scripts/tmp-report.mjs) | 只读统计 `.tmp` 体积与未引用轮次；两个独立阈值——总量 `--max-bytes` 默认 3 GiB、孤儿轮次 `--max-orphan-bytes` 默认 2 GiB，任一超出即退出 1；`.tmp` 不存在按 0 字节处理。用法与引用口径见[临时产物体积报告](tmp-hygiene.md) |
| [check-syntax.mjs](../../../scripts/check-syntax.mjs) | 对 `scripts/` 与 `tests/` 下全部 `.mjs`/`.cjs` 跑 `node --check`；任一文件失败、某个根目录不可读或一个文件都没收集到时，打印诊断并退出 1 |

## 本地提交门禁

`.github/workflows/check.yml` 在 push 与 PR 上跑 `npm run check`；本地默认没有任何 hook，提交前是否跑检查全靠人记。仓库内提供 `.githooks/pre-commit`（调用同一个 `npm run check`），每个 clone 需手动启用一次：

```bash
git config core.hooksPath .githooks
```

`git commit --no-verify` 仍可绕过；只改文档或任务产物时可改跑 `npm run check:docs` 并跳过 hook。hook 失败时先修，不用 `--no-verify` 掩盖类型、测试、构建或链接问题。

`npm run check` 的扩展测试需要 Pi SDK：普通终端提交时按 `~/.pi/agent/install/current-version` 定位托管安装，只有装在非默认位置时才需显式设 `PI_MANAGED_INSTALL_ROOT`。

## 归档门禁

`task.py archive` / `acceptance.py archive` 依次卡三道门：

1. **验收记录**：`acceptance.py archive` 先重算记录，failed/partial/blocked/unrun 返回 1，非法返回 2，只有 passed/waived 才委派。裸跑 `task.py archive` 不查该记录。
2. **改动范围**：`scopePolicyVersion` 任务比对 `meta.scope` 与 `scope-start.json` 基线，越界即拒绝且不改任何状态；改动范围合法但基线过期时，先 `set-meta scope` 重写再 `start` 重建基线。详见[任务改动范围门禁](task-scope-gate.md)。
3. **分支与上下文**：`task.py archive` 在 `branch` 与 `base_branch` 相同时报 `branch and base_branch are both '<name>'` 并拒绝，只有显式传 `--skip-branch-validation` 才放行；`acceptance.py archive` 同样接受该 flag 并原样透传给 `task.py`，未传时保持上面的拒绝行为，验收记录那道门不受该 flag 影响。`implement.jsonl`/`check.jsonl` 为空时 `start` 报 `implement.jsonl and check.jsonl have no curated entries`，先用 `add-context` 补条目。

该 flag 只在任务从未走 PR 分支时使用（本地直提 `master` 的任务就是这种情形）；元数据确实描述过一次 PR 合并时，应修正 `branch`/`base_branch` 而不是跳过校验。

开发前核对实际角色声明与启动器。质量检查按上述规范验证工具暴露、调用结果、交付及退出状态；只改工具文本时无需产品浏览器或构建。验收记录遵循 [验收协议](../frontend/quality-guidelines.md#acceptance-record-schemaversion-1)。
