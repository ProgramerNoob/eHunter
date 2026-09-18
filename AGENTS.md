# AGENTS.md

## 项目与实现边界

- eHunter 是面向 e-hentai/exhentai、nhentai 的油猴阅读器，支持书页模式和卷轴模式；项目仍处于重构阶段。
- `core/`、`src/` 是当前实现，新增和修复优先落在这两个目录；`core_old/`、`old/` 是历史实现，修改时须说明目的，参考时避免直接复制旧结构。
- 入口 `src/main.ts` 根据平台识别结果初始化，并通过 `src/platform/factory.ts` 创建 EH、NH 或 TEST 服务；不支持的平台跳过初始化。根组件目前名为 `core/TestApp.vue`，组件名不表示始终使用测试服务。
- 平台迁移优先保证 `src/platform/eh/` 链路，再处理 `src/platform/nh/`；修改 `src/platform/base/` 时同步评估两端影响。
- `src/` 与 `core/` 存在交叉依赖，import 调整采用最小改动，避免一次性大迁移。重构需可读、可迁移、可回退。

## 技术与 UI 约束

- 使用 Vue 3、TypeScript、Vite；当前样式以 SCSS 为主，历史样式含 Less。
- 依赖和版本以 [package.json](package.json) 与锁文件为准；开发构建见 [vite.config.ts](vite.config.ts)，脚本注入产物见 [vite.config.prod.ts](vite.config.prod.ts)（IIFE、CSS 注入）。
- 所有 UI 组件自建，不使用第三方 UI 库。
- UI 默认使用 flex 布局，显式指定 `flex-direction`。

## 修改前按需读取

- 改变阅读模式、设置或平台设计时，读取 [design.md](design.md) 的产品目标及对应 `specs/<feature>/spec.md`、契约和 quickstart。目标、历史计划与当前实现有冲突时，先追溯决策；无法确定的用户可见行为须对齐后修改。
- 涉及 DOM 解析时，检查选择器稳定性、异步加载和页面结构变化的容错。
- 涉及渲染时，检查书页/卷轴模式一致性、图片加载与缓存、渲染性能和滚动体验。
- 涉及 EH 的 `AlbumCacheService`、`ImgUrlListParser` 时，额外检查 Normal/Large 缩略图切换、缓存版本迁移与刷新、并发队列及超时重试。

## 通知、调试与验收（强制）

- 每次测试开始前执行 [notify-complete](.pi/skills/notify-complete/SKILL.md) 的短通知；每次任务完成后执行长通知（实现、修复、排查、文档、测试、说明均适用）。只有用户明确要求静音或跳过通知时省略。
- 日志、截图、trace、临时导出等调试产物统一放在仓库 `.tmp/` 下。
- 每次功能新增或修改后必须完成对应功能测试。纯文档修改验证引用、格式和所述命令；未运行的功能验收不得报告为通过。
- 非平台功能改动：按 [.pi/browser-testing.md](.pi/browser-testing.md) 启动本地后台服务并使用当前会话的 `ego-browser` 技能验收。指南集中维护服务归属与清理、任务空间、视口、控制台日志、刷新和截图流程；开始调试或页面操作前必须读取。
- 平台改动（尤其 `src/platform/**`、注入链路、DOM 抓取、请求适配）：使用 [eh-test](.pi/skills/eh-test/SKILL.md)，在 EH 场景验证实际表现。
- 浏览器验收须确认本次代码已加载、无 Vite 编译错误，检查控制台与未捕获异常，完成涉及的打开/关闭、切换、数据抓取、渲染和异常分支。
- UI 改动须按浏览器指南完成桌面和移动两种视口的关键交互、截图与视觉检查；涉及断点时补测边界。
- 抓取、解析、缓存改动至少验证首屏页数/标题/当前页、书页与卷轴切换、缩略图加载与定位，以及平台支持的原图/换源操作。
- 修改 `TextReq`、`ReqQueue`、`MultiAsyncReq` 等基础请求层时，优先回归 EH 与 NH 两条链路。
- 交付时说明已验证和未验证范围；清理本次创建且无需保留的服务和临时产物，核实进程退出与端口释放，保留交付物及用户已有资源。

## 文档维护与提交

- 本文件保留项目边界、稳定约束和按需读取入口。具体功能约定归 `specs/`，版本/依赖归配置文件，操作步骤归上面的专项指南。
- 修改 Spec Kit 提示、升级安装、抽取 hooks 或启用 agent-context 扩展时，读取 [.pi/speckit-maintenance.md](.pi/speckit-maintenance.md)，核对本地修正及上下文维护边界。
- 提交信息建议标注作用域，例如 `refactor(core)`、`feat(src)`、`fix(platform-eh)`、`fix(platform-base)`、`fix(parser)`；迁移说明注明来源目录、目标目录和原因。
