# Spec Kit → Trellis 迁移审计

基线：`647ff26`。范围：文档与开发工作流，不修改 `core/`、`src/`、构建配置或依赖。两次只读 Explore 调查均已结束；主会话复核 Git 文件清单、有效引用及任务计数。本文记录迁移前事实，旧路径是来源证据，不是迁移后的执行入口。

## 覆盖结论

`.trellis/spec/frontend/` 已有工程规范，但依赖旧功能契约，没有完整承接任一功能的需求、数据模型、验收流程与历史记录。根 `design.md` 的产品目标仍需迁移。

- `specs/` 有 57 个受版本控制文件：7 个功能 × 8 个文件，加 1 份行为决策。
- 每个功能包含 `spec.md`、`data-model.md`、`quickstart.md`、`contracts/*`、`plan.md`、`research.md`、`tasks.md`、`checklists/requirements.md`。
- `.specify/` 有 40 个受版本控制文件；15 个 `.pi/prompts/speckit.*.md`；另有根 `design.md` 和两份 `.pi/` 指南。共 115 个受版本控制源文件，逐文件清单及 SHA-256 见 `source-inventory.json`。
- 本机额外文件：`specs/.DS_Store`、`.specify/.DS_Store`、`.specify/feature.json`。前两者是 Finder 元数据，后者是退役工具的当前功能指针；均在用户要求移除的目录内。
- `.pi/settings.json` 未被 Git 跟踪，包含 15 个对应的 prompt 禁用项。只删除这些失效项，保留 Trellis 扩展、`./prompts` 和其他本机设置，不将该文件纳入版本控制。

## 逐功能保全矩阵

| 功能 | tasks 已勾/总数 | 未勾任务 | Trellis 已有内容 | 必须完整保留的独有内容 |
| --- | --- | --- | --- | --- |
| `001-add-pageflip-toggle` | 32/36 | T029、T030、T032、T033 | 无合法偏好时计算默认动效；保存其他设置不重算 | 三档动效、快捷键、UI 约定、指标与 OpenAPI 契约 |
| `001-add-pageview-magnifier` | 39/39 | 无 | composable 职责、持久偏好与会话开关 | 几何不变量、20–300 整数尺寸、2–5 倍率、默认 80/3、±10px、桌面范围、裁切与菜单动作 |
| `001-dockable-panel-layout` | 35/35 | 无 | 组件示例、两模式布局偏好分离 | 槽位模型、拖拽缩放、layout 契约、新 block 接入与验收 |
| `001-gallery-download-bundle` | 27/37 | T004、T011、T018、T024、T030–T035 | 下载元信息决策的引用 | metadata.json 七字段、图片命名、分片、通知、失败语义、fflate、下载实际验收 |
| `001-platform-injection` | 51/149 | 98 项，见下文 | 启动链、目录边界、错误联合类型、120000ms 现状 | AlbumService 契约、场景及性能指标、新增平台流程、EH/NH 待办与验收 |
| `001-thumb-expand-modal` | 26/26 | 无 | typed event、grid、Teleport 示例 | 分页、跳转定位、数据模型、OpenAPI 契约、验收步骤 |
| `002-more-settings-modal` | 42/44 | T036、T037 | schema 3 迁移、共享存储、默认值、重置规则 | 五分类、固定首项、排序、清缓存与重置确认、QuickBar、i18n、契约 |

合计 366 条任务：252 已勾、114 未勾。另有 requirements checklist 124 条（12 未勾），quickstart 24 条（24 未勾）；后两者与 tasks 状态独立，迁移时保留全部原状态，不能把它们相加当成产品缺陷数。

平台 98 项为：T037–T042、T043–T072、T073–T082、T098、T149、T099–T118、T119–T130、T131–T136、T137–T148。逐项原文保留于迁移后的 `tasks.md`，未完成工作入口列出全部编号并链接原文。

## 必须保留的状态差异

1. 七份 spec 均为 Draft；任务勾选不代表规格整体完成。
2. `specs/001-add-pageflip-toggle/tasks.md:8` 与 `specs/002-more-settings-modal/tasks.md:3` 明示旧勾选不能证明 2026-09-18 新决策已实现/验收。保留这些免责声明。
3. 放大镜 tasks 为 39/39，requirements 仍有 5 项未勾，quickstart 5 项未勾；下载 T036/T037 有完成证据，requirements 仍有 3 项未勾。迁移不统一修改状态。
4. 平台 T043–T082/T098 未勾，但 EH/NH parser、service 及 factory 已存在：标注“实现存在，旧计划未按此清单验收”，不要标成已完成或要求从零重写。
5. 平台 T149 位于 `specs/001-platform-injection/tasks.md:186`：NH 原生 `src` 被构造器改成 `x-src`，parser 只读 `data-x-src`，45 页缩略图为空。只做过内存对照，业务代码未修、未验收；保留待修状态。
6. `specs/001-platform-injection/contracts/AlbumService.ts` 的历史超时为 60 秒；`src/platform/initializer.ts` 为 `TIMEOUT_MS = 120000`。保留原契约并在入口标注冲突，不能用旧值指导新实现。
7. 已确认行为决策覆盖旧的 YAML/jszip 下载方案、翻页默认值、偏好作用域/迁移/重置与放大镜几何。保留现有“历史计划”注释与实际验收日期/结果。
8. `.tmp/**` 是本机证据路径，迁移不得制造缺失产物，也不能声称本轮重新运行了历史验收。已有记录中的未修缺陷、harness 限制及环境说明一并保留。

## 规则与工具分诊

| 来源 | 保留内容/目标 | 退役内容 |
| --- | --- | --- |
| 根 `design.md` | 全文迁入 frontend 产品目标文档，继续声明目标不代表实现完成 | 旧根路径 |
| `specs/decisions/2026-09-18-reader-behavior.md` | 决策全文，修改规范时优先读取 | 旧路径 |
| `.pi/browser-testing.md` | 完整操作流程迁入 frontend 浏览器验收文档：服务归属、PID/端口核验、strictPort、任务空间、每轮 CDP、视口与触摸、刷新/错误检查、事件缓冲保存、截图/视觉检查、接管与清理 | 旧路径 |
| `.specify/memory/constitution.md` | I–V 原则及额外约束映射到现有 AGENTS/工程指南；补齐独立可测交付、异步/边界处理、双平台影响记录与破坏性 Git 操作约束 | Spec Kit 命令顺序、Constitution Check 模板义务、版本修订/Sync Impact Report 流程 |
| `.pi/speckit-maintenance.md` | 保留 AGENTS 非托管区由人工审阅维护、规则按需加载的边界 | Spec Kit 1.0.8 hooks/resolver/preset/agent-context 扩展维护流程 |
| `.specify/` 其余文件及 15 个 prompts | 在源清单记录删除理由；历史可用基线提交追溯 | 模板、安装清单、git 扩展、feature 指针、脚本及 hooks |

`.pi/skills/eh-test/SKILL.md`、油猴加载器、notify-complete、Trellis 的 prompts/agents/extensions 保留。仓库没有调用 Spec Kit 的 npm 脚本或 CI；业务代码没有导入 `specs/`。`.trellis/.template-hashes.json` 不管理 Spec Kit prompts，无需修改。

## 有效引用修复清单

- `AGENTS.md:20,30,40,41`：产品目标、功能规范、浏览器操作与旧框架维护入口。保留 `<!-- TRELLIS:START -->` 到 `<!-- TRELLIS:END -->` 托管块原样。
- `.trellis/spec/frontend/index.md:20–31`：产品目标、平台规格、决策、功能目录及浏览器验收。
- `.trellis/spec/frontend/directory-structure.md:8,25,54`：settings 契约、目录表、平台契约。
- `.trellis/spec/frontend/state-management.md:67` 与 `.trellis/spec/frontend/quality-guidelines.md:7,42`：决策及验收入口。
- `.pi/skills/eh-test/SKILL.md:31,83`：浏览器指南及 `#2-每轮先配置再操作` 锚点。
- `README.md:61`、`README_CN.md:59`、`.npmignore:5`：目录入口和发布排除（验证 `.trellis/` 不进入 npm 包）。
- 迁移文档内部：相对链接随目录深度重算；旧 `specs/` 路径改到迁入路径；已退役 `.specify/` 命令标注历史记录，不能留下可执行指令。

不要全局替换 `design.md`：Trellis 的任务设计产物仍用此名称。旧 archive/journal 的来源提及及本任务的迁移证据属于历史记录，和当前有效依赖分开检查。
