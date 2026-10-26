# 项目工具规范

此目录维护 Pi/Trellis 开发工具契约，与阅读器产品规范分开。

| 文档 | 使用时机 |
| --- | --- |
| [Pi 子代理上下文与压缩](pi-context.md) | 修改工具 schema/提示、技能文本、角色白名单、上下文注入、压缩续接或对应验收 |
| [任务改动范围门禁](task-scope-gate.md) | 修改任务 scope、start 快照、archive 检查或排查越界/legacy 诊断 |
| [验收资源清理检查](../frontend/browser-acceptance/resource-cleanup.md#资源清理检查) | 修改 `cleanup-browser` 输入、分类或退出码，或核对浏览器收尾资源 |
| [临时产物体积报告](tmp-hygiene.md) | 检查 `.tmp/` 占用、核对哪些轮次产物仍被 `acceptance.json` 引用 |
| [归档提交兜底](archive-fallback.md) | `task.py archive` 内部 git 提交失败、需要手工补齐归档提交 |

## 本地提交门禁

`.github/workflows/check.yml` 在 push 与 PR 上跑 `npm run check`；本地默认没有任何 hook，提交前是否跑检查全靠人记。仓库内提供 `.githooks/pre-commit`（调用同一个 `npm run check`），每个 clone 需手动启用一次：

```bash
git config core.hooksPath .githooks
```

`git commit --no-verify` 仍可绕过；只改文档或任务产物时可改跑 `npm run check:docs` 并跳过 hook。hook 失败时先修，不用 `--no-verify` 掩盖类型、测试、构建或链接问题。

开发前核对实际角色声明与启动器。质量检查按上述规范验证工具暴露、调用结果、交付及退出状态；只改工具文本时无需产品浏览器或构建。验收记录遵循 [验收协议](../frontend/quality-guidelines.md#acceptance-record-schemaversion-1)。
