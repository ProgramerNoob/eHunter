# 项目工具规范

此目录维护 Pi/Trellis 开发工具契约，与阅读器产品规范分开。

| 文档 | 使用时机 |
| --- | --- |
| [Pi 子代理上下文与压缩](pi-context.md) | 修改工具 schema/提示、技能文本、角色白名单、上下文注入、压缩续接或对应验收 |
| [任务改动范围门禁](task-scope-gate.md) | 修改任务 scope、start 快照、archive 检查或排查越界/legacy 诊断 |
| [验收资源清理检查](../frontend/browser-acceptance.md#资源清理检查) | 修改 `cleanup-browser` 输入、分类或退出码，或核对浏览器收尾资源 |

开发前核对实际角色声明与启动器。质量检查按上述规范验证工具暴露、调用结果、交付及退出状态；只改工具文本时无需产品浏览器或构建。验收记录遵循 [验收协议](../frontend/quality-guidelines.md#acceptance-record-schemaversion-1)。
