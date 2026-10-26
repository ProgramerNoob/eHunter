# 预检断言覆盖清单

`withBrowserPreflight` 的所有环境断言走 `requireCondition`，失败即抛 `PreflightBlocked`：结果记 blocked，不进入功能 checks（按断言名对照 `scripts/browser-preflight.mjs`；行号会随改动漂移，不复用历史行号）。

已覆盖（交互前强制）：

- **CSS 视口 / DPR / 移动能力**：DPR 精确匹配（L328）、touchPoints/coarse 匹配（L329）、严格模式 CSS 视口宽高匹配（L330）；`profile` 固定 desktop/mobile，不接受调用方传入宽高或 mobile 目标（L605）。
- **CDP Emulation 回执**：每条仿真命令核对回执参数与下发一致（L326）；被 page 拒绝的命令（含 `Emulation.setDeviceMetricsOverride` / `setTouchEmulationEnabled` / `Debugger.enable` / `Profiler.startPreciseCoverage`）视为准备阻断。
- **产物身份与旧包防呆**：源码输入指纹（`fingerprint`）与轮次内不变性（L354）；EH 场景要求恰好一个当前生产 bundle 候选且有精确源码或全长执行证据（L449-452），同长度不同内容、不同长度陈旧 bundle、loader 元数据歧义均 blocked；Vite 场景核对必需模块清单完整（L454）。
- **grant/connect 等价**：userscript 元数据缺 `==UserScript==` 块或 grant/connect 为空直接 blocked（L71-74），本地地址覆盖并入等价判断（`permissions()`）。
- **运行时健康**：当前文档内 eHunter 归因 severe 日志 blocked（L345）、未归因 severe 需排查 blocked（L346）；历史文档的日志保留但不污染当前轮。
- **Vite 编译失效**：vite-error-overlay 存在即 blocked（L500/L512）；预期源码请求失败 blocked（L411）。
- **文档身份**：导航/取证期间 document loaderId 变化即 blocked（L369-372、L456），防止断言打到旧文档。
- **原站 viewport meta 恢复**：关闭阅读器时核对 meta 与本轮基线一致（L583-591）。
- **截图与动作防护**：受保护动作必须串行 await（L556）；截图前后复查环境且文件非空（L572-576）；阅读器未 mounted/open 或 overlay 存在时不进入功能（L516/L534）。

未覆盖（各自归属场景，非预检职责）：

- **物理设备矩阵**：真机 DPR/触摸/UA 组合；预检只保证 CDP 仿真回执一致。
- **Node/Python 版本矩阵**：CI 固定 Node 22 / Python 3.12（`.github/workflows/check.yml`），跨版本一致性由 CI 覆盖，预检不重复断言；本机解释器版本随开发者环境变化，不写进本规范。

真实下载冒烟已具备闭环验证路径：多分片下载后解压校验片内条目按页码命名、`metadata.json` 七字段与 `jpegMagic`，验收步骤与判定标准见 [001-gallery-download-bundle/quickstart.md](../features/001-gallery-download-bundle/quickstart.md)，归档任务 `10-24-download-concurrency-spec-alignment` 已按该步骤执行过一次；`reader-test` 仍需覆盖 EH/NH 生产包下的同类检查。

测试对照：`tests/browser-preflight.test.mjs`（`npm run test:browser-preflight`）逐条覆盖上述已覆盖项的阻断行为（仿真拒绝、旧包变体、身份排除、日志归因、健康条件、meta 恢复等），新增断言须同步加测试与本清单。

