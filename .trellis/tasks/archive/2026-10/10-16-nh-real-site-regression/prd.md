# NH 真站回归验收

## Goal

在 nhentai.net 真实站点完成 NH 平台链路的端到端回归验收，收口 `001-platform-injection` 的 T108–T116 历史未验收项。本任务不修改阅读器或平台产品代码；如准备门确实缺少 NH 支持，只允许补充最小验收 tooling/test fixture，并单独记录其变更，发现产品缺陷时另开修复任务。

## 背景与约束

- NH 链路（parser/service/factory）实现已存在，T113 缩略图已于 2026-09-20 真站验收（任务 `09-20-nh-thumb-src-parser`），其余 NH 真站项从未验证。
- 现有 `eh-test` skill 面向 EH（登录态、source.kind='eh'、默认 `/s/` 页）；NH 无需登录，但需参照其准备门与证据协议，复用同一 dev loader（已含 `@match https://nhentai.net/*`）与 bundle server。
- 本轮允许为 NH 准备门补充最小验收 tooling/test fixture；不修改 reader/platform 产品代码。工具链变更须单独记录，不能替代真实功能验收。
- 验收遵循 [浏览器验收指南](../../spec/frontend/browser-acceptance.md)：生产构建、准备门（脚本身份/权限/coverage）、桌面与移动双视口、控制台与未捕获异常、截图取证。
- nhentai 可能有 Cloudflare 挑战或地区封锁，属于准备阻塞，按 Ego 接管流程交还用户，不降级为模拟环境冒充真站验收。
- 默认测试 URL：可访问的 `https://nhentai.net/g/[id]/1/` 阅读页，现场选取并记录实际地址。

## Requirements

- R1 生产包构建成功，bundle server 与 dev loader 链路在 NH 域可用（构建日志、监听与 URL 核实、安装状态证据）。
- R2 准备门通过：当前文档恰好一个生产候选且与产物一致、初始化与日志、严格环境检查。
- R3 NH 初始化：加载动画、阅读器正常打开（T109）。
- R4 标题、总页数、当前页正确（T110）。
- R5 书页模式显示与翻页（键盘方向键、点击导航）（T111、T114）。
- R6 卷轴模式显示正常（T112）。
- R7 缩略图加载、点击跳页与当前页定位（参照 T113 已验收口径快速复核，不重复全量）。
- R8 错误处理：无效 gallery URL 显示含技术细节的错误 UI（T115）。
- R9 EH/NH 行为对比：书页、卷轴、缩略图在两端表现一致（T116，FR-022）；EH 侧可引用既有验收证据，差异须实查。
- R10 桌面（1200×900）与移动（390×844）双视口关键交互与截图；控制台无未捕获异常。
- R11 验收后按 acceptance 协议回填逐项结果，报告含已验证/未验证范围；T108–T116 在 `001-platform-injection/tasks.md` 按实际结果勾选。

## Acceptance Criteria

- [AC1] 构建、server、loader 安装与 NH 域注入证据齐全（日志与核实输出存 `.tmp/`）。
- [AC2] 准备门通过并有指纹/coverage 证据；无 Vite 编译错误、控制台无未捕获异常。
- [AC3] R3–R8 各项在真实 NH 页面实测通过，桌面+移动截图逐张查看。
- [AC4] R9 对比结论明确（一致项与差异项分列，附依据）。
- [AC5] 测试报告写入 `.tmp/test-reports/`，逐项 passed/failed/blocked/unrun 分类正确。
- [AC6] T108–T116 按实测结果更新勾选；未通过项记录原因与后续任务建议。
- [AC7] 收尾：本轮 server 进程退出、端口释放、PID 文件已清理；验收完成后按指南 finish。
## 非目标

- 不修改 NH 解析/服务代码；不做 NH 下载链路冒烟（另列候选）。
- 不重复 T113 缩略图全量验收；不做物理设备、非 Ego 浏览器验证。

## Notes

- 参照证据：`.trellis/spec/frontend/features/001-platform-injection/tasks.md` T108–T116 原文；`09-20-nh-thumb-src-parser` 的 NH 验收记录。
- 平台差异备忘：`initializer.ts` 当前 `TIMEOUT_MS = 120000`（旧契约 60 秒不作为本轮判定依据）。
