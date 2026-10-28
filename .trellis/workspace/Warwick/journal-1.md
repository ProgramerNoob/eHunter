# Journal - Warwick (Part 1)

> AI development session journal
> Started: 2026-09-19

---



## Session 1: 完成 eHunter 前端开发规范初始化
<!-- trellis-session: v=2 fp=b726c8e00721efdf -->

**Date**: 2026-09-19
**Task**: 完成 eHunter 前端开发规范初始化
**Branch**: `master`

### Summary

完成 00-bootstrap-guidelines：六份基于源码的前端指南与索引，文档验证和独立审查通过，任务已归档。

### Main Changes

- 补齐目录结构、组件、composable、状态与持久化、类型安全及质量规范，共 7 个文件、567 行。
- 归档任务至 .trellis/tasks/archive/2026-09/00-bootstrap-guidelines；归档自动提交引用未跟踪的旧路径失败，已用明确归档路径补交 bfda3e3。

### Git Commits

| Hash | Message |
|------|---------|
| `4caba7c` | docs(trellis): 补齐 eHunter 前端开发规范 |

### Testing

- [OK] 通过 93 个相对链接、6 份指南索引覆盖、8 个 npm 脚本和 4 段 TypeScript 源码示例核验。
- [OK] 任务上下文验证、格式检查和独立只读审查通过；功能构建、类型检查及浏览器验收未运行（纯文档任务）。

### Status

[OK] **Completed**

### Next Steps

- 后续开发从 .trellis/spec/frontend/index.md 按修改范围读取相关指南。


## Session 2: Spec Kit 规范与工作流迁入 Trellis
<!-- trellis-session: v=2 fp=833122a97df7c474 -->

**Date**: 2026-09-19
**Task**: Spec Kit 规范与工作流迁入 Trellis
**Branch**: `master`

### Summary

保全 59 份资料、366 条任务原状态及 114 条待办，完成旧工具退役与有效入口更新；文档检查和固定版本独立审查通过。

### Main Changes

- 115 个来源有逐文件处理记录；59 份文档迁入 frontend，稳定规则合并，旧 specs/design/.specify/prompts 与专项旧指南退役。
- 产品目标、功能索引、待办、行为决策与浏览器验收流程均可从 AGENTS 找到；本机设置仅移除 15 个旧 prompt 项。

### Git Commits

| Hash | Message |
|------|---------|
| `fb8f136` | chore(trellis): 迁移 Spec Kit 规范并退役旧工作流 |

### Testing

- [OK] 正文及契约保全、366 tasks/124 requirements/24 quickstart 的文本顺序状态、558 个引用与锚点、70 个 YAML refs、198 个保护文件检查通过。
- [OK] 文档格式、任务 JSONL、Trellis 上下文发现与 npm dry-run 发布排除通过；195 项固定哈希独立审查无阻塞项。
- [NOT RUN] 文档/工作流变更未运行产品 build、type-check、单元或浏览器验收；本机 settings 前后差异依据实施阶段记录，独立审查仅核对当前状态。

### Status

[OK] **Completed**

### Next Steps

- 从 .trellis/spec/frontend/features/pending-work.md 选择后续工作，T149 等历史未完成项保持原状态。


## Session 3: NH 缩略图 src 修复与 T113 真机验收（T149）
<!-- trellis-session: v=2 fp=ca9d98a2d2b8f8d8 -->

**Date**: 2026-09-20
**Task**: NH 缩略图 src 修复与 T113 真机验收（T149）
**Branch**: `master`

### Summary

修复 IntroHtmlParser 只读 data-x-src 导致 45 项 ThumbInfo.src 全空：回退读取被改写的 x-src，保留 data-src 优先；R4 依真实图片页证据判定 ImgHtmlParser.ts:38 无同类缺陷不动。完成 NH 真实图集验收（45/45 加载、双视口、跳页定位）并回填 T149/T113 记录、新增前端 Quality Check 入口与 NH 标记改写约定。C2（类型检查清理）待启动。

### Git Commits

| Hash | Message |
|------|---------|
| `e7e343c` | fix(platform-nh): 修复图集缩略图 src 取空（回退读取被改写的 x-src） |
| `fd64ee7` | docs(specs): 回填 NH 缩略图修复与 T113 验收记录（T149） |
| `3c5054c` | docs(specs): 新增前端质量检查入口并记录 NH 标记改写约定 |
| `43b7ca6` | docs(tasks): 建立 NH 缩略图修复与类型检查清理任务树 |

### Status

[OK] **Completed**


## Session 4: type-check 基线清理与父任务集成验收
<!-- trellis-session: v=2 fp=9101d66587984c78 -->

**Date**: 2026-10-03
**Task**: type-check 基线清理与父任务集成验收
**Branch**: `master`

### Summary

清理 6 个无引用遗留文件（643 行）并修正 TopBar.vue 的 getItemStyle 返回类型，npm run type-check 从 22 项错误恢复到退出码 0；随后在被测版本上完成父任务的 NH 集成验收（45/45 缩略图、跳页定位、书页/卷轴切换、双视口），回填 pending-work 与三条历史 type-check 条目，归档 C2 与父任务。

### Main Changes

- 删除 src/platform/{base,eh,nh}/index.ts 与 eh/service/AlbumServiceImpl.old.ts、nh/service/AlbumServiceImpl.old.ts、eh/service/AlbumCacheService.ts，删除前逐文件核对 import 引用；core/components/TopBar.vue 的 getItemStyle() 补 CSSProperties 返回注解（三个返回分支取值不变）。
- 同步 .trellis/spec/frontend/state-management.md、directory-structure.md 与 AGENTS.md 中被删文件的表述（保留 ImgUrlListParser），历史任务产物与 .tmp 证据按原样保留并说明原因。
- 父任务新增 acceptance.md 记录集成验收结论与已验证/未验证范围；pending-work.md 新增 2026-10-03 状态说明，翻页 T033、下载 T033（结果写入 001-gallery-download-bundle/plan.md）、更多设置 T037 已勾选。
- browser-acceptance.md 新增「计数类断言与来源判定」小节：DockWorkspace 双面板槽位计数、nhentai 自带 .webp.webp、控制台报错脚本归因、窄视口顶栏整体隐藏、429 限流节奏。

### Git Commits

| Hash | Message |
|------|---------|
| `3299da9` | refactor(src): 删除遗留平台死文件并修复 TopBar 样式类型 |
| `655e054` | docs(specs): 同步删除遗留平台文件后的规范表述 |
| `2b78f39` | docs(trellis): 回填 type-check 基线解锁项并记录父任务集成验收 |
| `9842554` | chore(task): archive 09-20-typecheck-dead-code-cleanup |
| `0df1faf` | chore(task): archive 09-20-backlog-nh-thumb-and-typecheck |

### Testing

- [OK] [OK] npm run type-check 退出码 0、0 错误；npm run build-prod 退出码 0，dist/ehunter.iife.js 445526 字节（sha256 3ea2726b…）。
- [OK] [OK] C2 浏览器验收（EH 阅读页 /s/80813c92df/3482416-1，桌面 1200×900 与移动 390×844）：顶栏字段显隐、更多菜单与快捷设置重排无变化，控制台无新增报错。
- [OK] [OK] 父任务 NH 集成验收（nhentai.net/g/631366/2/，45 页）：45/45 缩略图 complete 且 naturalWidth>0、空 src 0，点击第 20 张跳页（当前页 2→20、scrollTop 1407→25340），书页/卷轴双向切换 45⇄14，双视口截图齐全。
- [OK] [NOT RUN] EH 链路未在本轮实机回归（改动不触及现役 EH 服务）；NH 未做多轮重载压力验证（期间触发站点 429 限流）；未做像素比对（TopBar 改动为纯类型注解）。

### Status

[OK] **Completed**

### Next Steps

- 从 .trellis/spec/frontend/features/pending-work.md 选择后续工作；type-check 恢复绿灯后应作为阻塞项，出现错误按回归处理。
- 可选清理：core/App.vue:75 的 ThumbScrollView 未使用 import（实际渲染位于 core/components/ReaderView.vue:12）。


## Session 5: 收尾 A 类历史待办：翻页死代码、废弃 i18n key 与下载通知验收
<!-- trellis-session: v=2 fp=0bcddaaa74bd9c64 -->

**Date**: 2026-10-03
**Task**: 收尾 A 类历史待办：翻页死代码、废弃 i18n key 与下载通知验收
**Branch**: `master`

### Summary

删除 core/store/app.ts 与 core/components/TopBar.vue 的零引用死代码、core/assets/i18n.ts 的 13 个零引用 key，并实机复核 T024 通知栈响应式表现；type-check 与 build-prod 退出码均 0，独立核验 AC1–AC9 全部通过。

### Main Changes

- core/store/app.ts：删 showMoreSettings、toggleShowMoreSettings、setThumbInfos、setImgPageInfos、markBookInstructionShown 与 hasShownBookInstruction（含归一化与序列化项）、volumePreloadCount 死注释、两行调试 console.log；为 isReverseFlip（由 settingFieldRuntime.ts:18/46 路由）与 toggleShowMoreSettingsDialog（event.ts:84 Shift）补最小注释
- core/components/TopBar.vue：删未被命中的 .icon-margin，保留仍被语言字段使用的 .less-margin
- core/assets/i18n.ts：删 13 个零引用 key 的三语言条目
- 规范：component-guidelines.md 增补翻译 key 删除的两步审计（字面量 + i18n[...]/*I18nKey 数据驱动查找点）；state-management.md 增补「字段可被路由但无 UI 入口」的反向约定
- 清单：勾选翻页 T032、更多设置 T036、下载 T024，pending-work.md 记录两条遗留

### Git Commits

| Hash | Message |
|------|---------|
| `eac3d63` | refactor(core): 清理翻页残留死代码与 13 个零引用 i18n key |
| `80b1ab3` | docs(specs): 勾选 T032/T036/T024 并补 i18n 删除与设置字段审计约定 |
| `12c64c4` | chore(task): archive 10-03-cleanup-pageflip-i18n-notification |

### Testing

- [OK] [OK] [OK] npm run type-check 退出码 0、0 错误；npm run build-prod 退出码 0
- [OK] [OK] [OK] AC8 自检：变更行号集合与保护区间 core/store/app.ts:960-1010、:1322-1360、:1834-1847 交集为空
- [OK] [OK] [OK] T024 实机复核（eHunter 真实三并发下载）：桌面 1200×900 与移动 390×844 下通知位于右下角、.status-pannel 上方，垂直堆叠 8px 间距不重叠，无未捕获异常
- [OK] [OK] [NOT RUN] 移动端通知截图为 DPR 1（未按指南用 DPR 3）；中止下载后通知不消失属 001-gallery-download-bundle 既有问题，非本次回归

### Status

[OK] **Completed**

### Next Steps

- 从 .trellis/spec/frontend/features/pending-work.md 选择后续工作；type-check 保持阻塞项地位
- 两条已记录遗留：isReverseFlip 字段与 core/store/settingFieldRuntime.ts:18/46 路由无 UI 入口（跨文件，未处理）；T024 的两处可选硬化（标题 overflow-wrap、通知列表 max-height/overflow-y）未做


## Session 6: Session 6: 清理反转翻页死字段 isReverseFlip
<!-- trellis-session: v=2 fp=5697b17fc99803dc -->

**Date**: 2026-10-03
**Task**: Session 6: 清理反转翻页死字段 isReverseFlip
**Branch**: `master`

### Summary

删除从未被读取的 isReverseFlip 字段与两条运行时路由，删除后设置定义表与路由表同构 21/21

### Main Changes

- core/store/app.ts: 删归一化表项、序列化项、字段声明与 toggleIsReverseFlip 动作
- core/store/settingFieldRuntime.ts: 删 getFieldValue/setFieldValue 两条 case 'isReverseFlip'
- state-management.md: 过期示例改写为「路由表与定义表必须同步」维护规则 + 21/21 同构事实
- pending-work.md: 标记该跨文件遗留已收口

### Git Commits

| Hash | Message |
|------|---------|
| `9ab472a` | refactor(core): 删除反转翻页死字段与运行时路由 |
| `5b98934` | docs(specs): 更新反转翻页死字段清理后的规范表述 |

### Testing

- [OK] npm run type-check exit 0；npm run build-prod exit 0（442783 字节，重建前后 sha256 一致）
- [OK] 同构核对 routed 21 / defs 21，两侧差集均空；grep isReverseFlip 在 core/ src/ 命中 0
- [OK] EH 生产包桌面实机：缩略图栏开关双向持久化（150→0→150，均经 ignoreCache 刷新保持），0 未捕获异常

### Status

[OK] **Completed**

### Next Steps

- T024 两处可选硬化（通知标题 overflow-wrap、通知列表 max-height/overflow-y）


## Session 7: 硬化下载通知栈的标题换行与列表高度
<!-- trellis-session: v=2 fp=a199013f5acb7540 -->

**Date**: 2026-10-03
**Task**: 硬化下载通知栈的标题换行与列表高度
**Branch**: `master`

### Summary

T024 遗留的两处可选硬化落地：通知标题超长无空格串不换行会把关闭按钮挤出卡片，通知列表超高会顶出视口。改动为 4 行 scoped SCSS，静态检查与实机验收通过。

### Main Changes

- core/components/status/StatusNotificationItem.vue 的 header > strong 增加 min-width: 0 与 overflow-wrap: anywhere
- core/components/status/StatusNotificationStack.vue 的 > .list 增加 max-height: calc(100vh - 48px) 与 overflow-y: auto
- component-guidelines.md 补「定宽卡片长文本 + 列表高度」样式约定

### Git Commits

| Hash | Message |
|------|---------|
| `adf9c45` | docs(specs): 补定宽卡片长文本与列表高度的样式约定 |

### Testing

- [OK] type-check exit 0；build-prod exit 0，dist/ehunter.iife.js 442864 字节（改动前 442783）
- [OK] EH 实机桌面 1200×900：超长标题换行 5 行、关闭按钮右边界 1179 < 卡片 1192（旧声明 2052）；12 项列表 clientHeight 852 < scrollHeight 1812、顶边 20（旧声明 −940）
- [OK] 移动 390×844 DPR3：卡片 342×140 位于 (42,672)，list 底边 812 < .status-pannel 顶边 826
- [OK] Runtime/Log 域下重载：init 115 事件、idle 26 事件，exceptionThrown 0、error/warning 级 console 0、Log error 0

### Status

[OK] **Completed**

### Next Steps

- T024 遗留清零；下一步可从 pending-work.md 挑 B 类文档同步或 C 类实机验收


## Session 8: 全会话复盘与首批环境改进收口
<!-- trellis-session: v=2 fp=4435f806bdb19128 -->

**Date**: 2026-10-11
**Task**: 全会话复盘与首批环境改进收口
**Branch**: `chore/retrospective-checks`

### Summary

完成本机70条历史记录复盘，并落地验收结果门禁与存储生命周期自动检查；父子三个任务通过门禁归档，归档后证据引用与实际观察保持一致。

### Main Changes

- 01：逐项验收协议、run/summarize/archive CLI、37个Python回归及检查/提交/归档流程接线。
- 02：46个真实模块VM存储用例、npm run check与GitHub Actions；未修改产品源码、依赖或锁文件。
- 归档父子三任务，修正移动后证据路径、上下文清单与导航链接；完整复盘和交付记录保存在 .trellis/tasks/archive/2026-10/10-11-project-session-retrospective/research/。

### Git Commits

| Hash | Message |
|------|---------|
| `903d99e` | feat(tooling): 添加逐项验收门禁与收口接线 |
| `6fb03d2` | test(storage): 固化生命周期回归并接入自动检查 |
| `08e5cea` | docs(retro): 保存全会话复盘与整合验收 |

### Testing

- [OK] 实施阶段Node22/Python3.12干净副本的类型检查、37个Python用例、46个存储用例和生产构建通过；错误断言、类型错误、历史故障及阶段失败传播探针均得到预期非零。
- [OK] 收口阶段三次archive均exit0/passed；归档后三份summarize及context validate均exit0，无豁免；193个原有本地链接文件目标和30个上下文条目有效，原始验收观察未改。未重复运行产品测试。
- **未验证**：远端 Actions、Ubuntu 实机、分支保护、真实 GM 跨站与浏览器；本轮未推送。

### Status

[OK] **Completed**

### Next Steps

- 复盘03–08仍为建议，按后续需求另行规划；本轮已归档，当前无活动任务。


## Session 9: Trellis ACP 工具与压缩续接修复
<!-- trellis-session: v=2 fp=e4a81c6d362df691 -->

**Date**: 2026-10-14
**Task**: Trellis ACP 工具与压缩续接修复
**Branch**: `fix/trellis-acp-context`

### Summary

完成项目内 ACP 工具白名单和上下文复用修复、有限行为对照与正式审查；父任务及两个子任务通过验收包装器归档，归档后 12 项验收通过且无豁免。

### Main Changes

- 为 implement/check/research 保留原工具限制并增加 compress、decompress、search_context、acp_status；复用完整注入上下文，压缩后继续下一动作。
- 规范沉淀到 .trellis/spec/tooling/pi-context.md；任务与证据归档到 .trellis/tasks/archive/2026-10/10-13-trellis-acp-*，同步清单、验收引用及文档命令路径，保留原始观察和执行记录。

### Git Commits

| Hash | Message |
|------|---------|
| `04f1365` | fix(trellis): 恢复 ACP 工具并复用压缩后的任务上下文 |

### Testing

- [OK] 实现阶段：真实 ACP 压缩、事实恢复及原生代表派发完成；最终样本 191.426 秒自然退出；有限对照的任务/规范读取从 6 次降为 0 次，37 项验收协议回归通过，trellis-check 无阻塞项。
- [OK] 本轮收口：三次 archive 均 exit 0、acceptanceStatus passed；归档后 summarize 共 12 passed，无豁免；三个 manifest validate 通过，18 个 Markdown 文件目标存在，原始 observed/execution/note/waiver 未修改。
- [未验证] 本轮未重跑产品构建、类型检查或浏览器验收；未覆盖其他模型、长期压力或主会话长窗口。旧超时及重试样本保持原记录，pi-graft 约 120 秒退出计时器仅作本地版本观察，未修改全局配置或安装包，不承诺长期缓存收益。

### Status

[OK] **Completed**

### Next Steps

- 浏览器验收前置检查任务保持 in_progress，其已有未提交改动未纳入本轮归档或提交。
- 如需进一步验证，另行安排长期运行或主会话场景；本轮分支未推送。


## Session 10: 浏览器预检落地与两个运行阻塞修复
<!-- trellis-session: v=2 fp=8ce089c1eb8aa9d4 -->

**Date**: 2026-10-14
**Task**: 浏览器预检落地与两个运行阻塞修复
**Branch**: `feat/browser-acceptance-preflight`

### Summary

浏览器预检及更新通知/EH移动根布局修复完成。21项验收全部passed；经acceptance协议归档并校正迁移引用。

### Main Changes

- 统一Vite/EH当前脚本身份、执行证据、固定视口、权限集合、分阶段日志与阻断契约。
- 可选更新请求按唯一源单次15秒降级；EH移动打开约束根溢出，关闭恢复原属性和viewport。

### Git Commits

| Hash | Message |
|------|---------|
| `13fc961` | feat(test): 增加浏览器验收预检并修复阅读器阻塞 |
| `4295e8e` | docs(task): 校正预检归档后的证据引用 |

### Testing

- [OK] npm run check通过：37 Python、46 storage、96 preflight、50 reader-lifecycle，共229项；vue-tsc和生产构建通过。
- [OK] Vite/EH桌面1200×900和移动390×844四轮完整通过；17张截图逐张查看，EH移动两次关闭恢复；负例及权限矩阵通过。
- [OK] Standards/Spec审查完成，P3文档符号修正；归档后记录/引用审计通过，21 passed且无豁免。
- [OK] 服务及npm四进程退出，5175/8787释放，空间3正常finish一次；保留原有scripts/__pycache__和.tmp证据。

### Status

[OK] **Completed**

### Next Steps

- 人工快速查看归档research/post-fix-runtime.md及两张移动截图。NH真站、物理设备、远端成功通知和Node22/Python3.12未验证；当前运行Node24.18.0/Python3.13.14。

---

## Session: Trellis lean 上下文精简（2026-10-15）

**任务**：`10-15-trellis-lean-tool-descriptions`（已归档 `archive/2026-10/`）  
**分支**：`feat/trellis-lean-context`，基线 `e7e5f28`  
**提交**：`7d04102` refactor(tooling): 精简 Trellis 上下文并保留调用契约

### 完成内容

- 精简 `trellis_subagent` 工具定义、调用指导、workflow 索引、9 个 Trellis skills、3 个命令模板和 3 个角色文件。
- 在 Pi `prepareArguments`（校验前）接入确定性参数补全：缺省 agent/mode、短名前缀、trim 和空项过滤；先检查原始数组长度，maxItems=6 不被绕过；歧义输入给明确错误。
- 工作流源文件保留状态标记；输出时去 HTML 注释、合并多余空行。session overview 采用紧凑格式。
- 新增回归脚本：`scripts/test-trellis-extension.mjs`（11 用例）、`scripts/test_trellis_lean_context.py`（10 用例）、`scripts/measure-trellis-context.mjs`。

### 计数结果（Unicode 字符 / ceil(chars/4) 代理值，非 provider token）

| 范围 | 原代理值 | lean 代理值 | 减少 |
| --- | ---: | ---: | ---: |
| 工具定义 | 181 | 121 | 33.3% |
| 工具调用指导 | 78 | 30 | 62.1% |
| 9 个 skill 索引 | 1,263 | 832 | 34.1% |
| workflow 索引 | 1,849 | 958 | 48.2% |
| Trellis 固定 system | 2,479 | 1,434 | 42.2% |

### 验证

- 扩展测试 11/11；上下文测试 10/10；验收协议回归 37/37；真实 research 子代理派发 exit 0。
- Standards/Spec 审查（trellis-check）：R1 发现 update-spec 触发范围缩窄，修复后定向复核关闭；最终 9 项验收全部通过，0 豁免。
- 详细计数：`research/token-report.md`；派发证据：`research/live-dispatch.md`；审查记录：`research/review.md`、`research/review-followup.md`。

### 未验证

真实 parallel/chain 模式、精确 tokenizer 计数（字符代理有中文误差）、全量 tsc strict、Windows/Linux、ACP 主动压缩。

### 维护说明

本项目为本地直接定制，无额外 lean 开关。`trellis update` 可能覆盖托管文件，更新前保存差异，更新后运行上述三条回归命令并检查触发规则。规范沉淀于 `.trellis/spec/tooling/pi-context.md`（第 8 节）。

## 2026-10-15 · 10-15-retrospective-followup（复盘遗留改进收口）

分支 feat/retrospective-followup，8 个提交，验收 9/9 passed，已归档。

- 04 trellis-check 双模式：agent 定义 + SKILL + AGENTS + pi-context 四处文案；review-only 由派发方 prompt 声明，工具白名单强制为已知限制。真实派发一次 review-only 审查验证契约（子代理未写文件，返回 F1/F2/F3）。
- 05 归档未跟踪提交失败：抽 `_archive_commit_paths` 纯函数 + 10 例 unittest（mock git 记录 pathspec）+ 真实临时任务端到端归档验证（无 WARN）。
- 06 check-docs.mjs：spec 树链接/锚点/$ref 检查接入 npm run check；注入断链/坏锚点验证返回 1；pending-work.md 通知硬化遗留句同步为已实现。
- 03 预检断言清单：browser-acceptance.md 4.5 节盘点已覆盖/未覆盖；下载冒烟列为后续独立任务候选（eh-test 场景）。
- 教训：改 `.trellis/scripts/**` 后必须重跑 `measure-trellis-context.mjs`（--check 会因输入文件 sha 变化失效）——审查 F1 即此因；F2 建议在 implement.md 模板加显式检查项。


## Session 11: 文档与注释只描述当前状态
<!-- trellis-session: v=2 fp=76f79f92f9b093ac -->

**Date**: 2026-10-17
**Task**: 文档与注释只描述当前状态
**Branch**: `master`

### Summary

在 AGENTS.md 增加两条硬要求，并清理 .trellis/spec 的 spec-kit 遗留计划文档与 core/、src/platform/ 的叙述性注释。

### Main Changes

- AGENTS.md 新增两条要求：文档与代码注释只描述当前状态；代码是唯一证据，不写注释
- core_old/、old/ 从「历史实现」改写为当前用途描述
- state-management.md 承接被删注释的机制约束（reset 身份、布局偏好、平台请求与手势契约）
- features/ 下删除 28 个计划型文件，保留下来的 spec/data-model/quickstart/contracts 去掉 migration-note 与 T0xx 编号
- pending-work.md 重写为「未收口项」，features/index.md 去掉「历史资料」列
- 删除 core/ 与 src/platform/ 共 33 个文件的叙述性注释，保留三斜线指令、SCSS 段注释与执行期时序守卫

### Git Commits

| Hash | Message |
|------|---------|
| `9915f78` | docs(agents): 要求文档与注释只描述当前状态 |
| `418389f` | docs(spec): 功能资料只描述当前状态 |
| `68cafca` | refactor(core): 删除叙述性注释 |

### Testing

- [OK] acceptance.py summarize/archive：8/8 check passed，无 waiver
- [OK] npm run check（type-check + 4 套回归 + build-prod）退出码 0
- [OK] npm run check:docs 退出码 0：38 md, 220 本地链接
- [OK] 文本扫描无 Phase N / T0xx / migration-note / 迁移基线 残留

### Status

[OK] **Completed**

### Next Steps

- 按 pending-work.md 的未收口项逐个建任务：下载时间戳时区、抓取并发、各组 quickstart 验收
- 手动验证 10-16-acceptance-guardrails 任务是否继续


## Session 12: 合并 EH 验收技能为 reader-test
<!-- trellis-session: v=2 fp=c66df541043d2901 -->

**Date**: 2026-10-17
**Task**: 合并 EH 验收技能为 reader-test
**Branch**: `master`

### Summary

把只面向 EH 的验收技能重命名为 reader-test 并按 platform: eh|nh 参数化准备门、source 与报告路径；回填 acceptance.json 并在真实 NH/EH 页面完成桌面轮验收。

### Main Changes

- 原 EH 验收技能目录（`.pi/skills/` 下以 eh 命名的旧目录）重命名为 `.pi/skills/reader-test`，SKILL.md 新增平台差异表、NH source 与 EH/NH 报告路径
- 同步 AGENTS.md、frontend spec 与三份 features quickstart、serve-bundle/cleanup_browser 注释路径
- acceptance.json 七项检查全部 passed，含 check:docs 与 grep 门禁、NH 688467 与 EH 图页桌面轮、两次 cleanup-browser 报告

### Git Commits

| Hash | Message |
|------|---------|
| `1ee549d` | refactor(tooling): 合并 EH 验收技能为 reader-test |

### Testing

- [OK] npm run check 退出码 0（type-check + 回归 + build-prod + check:docs）
- [OK] npm run check:docs：39 md / 222 本地链接 / 0 断链
- [OK] reader-test NH 轮（nhentai.net/g/688467/1/，18 页）：observed passed、verify-browser passed、cleanup-browser clean
- [OK] reader-test EH 轮（exhentai.org/s/f9cb170d76/4257612-1，69 页）：observed passed、verify-browser passed

### Status

[OK] **Completed**

### Next Steps

- 需要移动视口时补跑 platform: nh 的 690×1044 轮次
- 按 pending-work.md 收口剩余的阅读器与抓取改造项


## Session 13: NH 移动视口验收补跑
<!-- trellis-session: v=2 fp=ded7ded1afa40194 -->

**Date**: 2026-10-18
**Task**: NH 移动视口验收补跑
**Branch**: `master`

### Summary

按 reader-test platform:nh 补齐移动视口验收：严格 mobile profile 轮通过准备门与全部功能断言，`verify-browser` 返回 `passed`；690×1044 补充轮记录实际 CDP 参数、回读视口与截图。验收记录六条 check 全部 `passed`，报告落在 `.tmp/test-reports/reader-test-nh-20261018-2020.md`。副产物：发现任务 `acceptance.json` 列入 `scenarioInputs` 会让轮次在回填后变 `stale`，规则已补进浏览器验收指南。

### Main Changes

- 按 reader-test platform:nh 补跑严格 mobile 轮（390×844 DPR3 touch5，withBrowserPreflight）与 690×1044 补充轮；严格轮 observed=passed 且 verify-browser passed，690 轮记录 CDP 下发/回读与截图
- acceptance.json 六条 check 全部回填 passed（2 command + 2 runtime + 2 inspection），acceptance.py summarize exit 0

### Git Commits

| Hash | Message |
|------|---------|
| `5fc3fe9` | docs(spec): scenarioInputs 排除回填后变化的任务记录文件 |
| `5837d27` | test(reader-test): 补跑 NH 移动视口验收并回填 acceptance |
| `4945d96` | chore(task): archive 10-18-nh-mobile-acceptance |

### Testing

- [OK] python3 scripts/acceptance.py summarize .trellis/tasks/10-18-nh-mobile-acceptance → passed；verify-browser .tmp/reader-test-nh/run-nh-mobile-10 → passed；cleanup-browser → aggregate clean（3 clean / 0 residual）

### Status

[OK] **Completed**

### Next Steps

- 评估 390 宽下阅读模式切换入口（顶栏测量隐藏 + showInDialog:false + 快捷键无此项）是否需要产品调整


## Session 14: 新增 task.py extend-scope
<!-- trellis-session: v=2 fp=493d10b07e051e90 -->

**Date**: 2026-10-18
**Task**: 新增 task.py extend-scope
**Branch**: `master`

### Summary

Session summary was not supplied.

### Main Changes

- 新增 task.py extend-scope：保留 start 基线，合并 meta.scope 规则并重签快照摘要，记录 scopeExtensions
- 拒绝 hash/digest 不符、快照缺失、已归档与 legacy 任务；写失败回滚快照

### Git Commits

| Hash | Message |
|------|---------|
| `7db8b73` | chore(task): archive 10-18-extend-scope-cli |

### Testing

- [OK] python3 -m unittest discover -s scripts -p test_scope_gate.py（73 tests OK）
- [OK] npm run test:acceptance；npm run check:docs

### Status

[OK] **Completed**

### Next Steps

- 可选：让 acceptance.py archive 的 branch 校验对直接提交到 master 的任务给出更明确的跳过提示

## Session 15: 四组 quickstart 验收收口与分类跳转整改
<!-- trellis-session: v=2 fp=cdd1c0b7d0f4a513 -->

**Date**: 2026-10-28
**Task**: 10-25-close-feature-quickstart-acceptance、10-28-tighten-settings-navigation
**Branch**: `master`

### Summary

收口四组 quickstart 验收（dockable-panel / thumb-expand-modal / pageflip-toggle / more-settings-modal，共 42 项 check 全 passed），归档父任务；随后按 code-review 结论整改分类跳转实现，并以变异测试纠正「测试保护关系」的判断方式。

### Main Changes

- 四组验收重跑与回填：修复 stale 产物后重跑全部轮次，失败轮保留在 `.tmp/browser-preflight/` 作反证；父任务 4/4 passed 并归档。
- 验收中发现分类跳转高亮滞后一档、末组无法对齐（`offsetTop` 偏移未扣除内容区顶部），另开任务修复（`8cef307`）。
- 整改分类跳转（`19a06ac`）：删 `getCategoryRef` 与六个分组 `ref`，`categorySections` 改由 `.ehunter-group[data-category]` 派生；`resolveActiveSettingsCategory` 泛型化返回 `T | null`，空列表返回 `null`；两处 `any` 清除。
- 移除滚底守卫中恒不生效的第三条件，并更正对应测试名称（`72a87c7`）。
- 将「按变异测试判定测试保护关系」写入 quality-guidelines（`3584b26`）。

### Git Commits

| Hash | Message |
|------|---------|
| `8cef307` | fix(core): 修正更多设置弹窗分类跳转高亮与末组对齐 |
| `6357dab` | chore(task): 回填四组 quickstart 验收收口结论并更新 pending-work |
| `b80cafc` | chore(task): archive 10-25-close-feature-quickstart-acceptance |
| `19a06ac` | refactor(core): 分类跳转由 DOM 派生分组并收紧类型契约 |
| `b4d9c3b` | chore(task): archive 10-28-tighten-settings-navigation |
| `72a87c7` | fix(core): 移除分类跳转的死条件并更正对应测试名称 |
| `3584b26` | docs(spec): 记录按变异测试判定测试保护关系的做法 |

### Testing

- [OK] `npm run check`（type-check、单测、构建、check:docs）多次 exit 0
- [OK] `python3 scripts/acceptance.py verify-browser` 逐轮校验，四组产物全 passed
- [OK] 桌面 1200×900 / 移动 390×844 分类跳转回归，数值与修复前记录一致
- [OK] 变异测试：守卫改 `if (false)` 后 2 条用例同时变红

### Status

[OK] **Completed**

### Next Steps

- `.tmp` 已清理到 2.61 GiB（低于 3 GiB 默认预算）：删掉 402 个未引用轮次的 `commands.jsonl`、3 个非轮次大块、46 个未被引用的散目录；保留 35 个失败反证轮次与 `acceptance.json` 引用的 1.43 GiB 证据。helper 已改为只在失败轮落完整命令回执（`ad18a93`、`7f0e34e`、`efdd0ad`）。
- `pending-work.md` 仍排队：`001-gallery-download-bundle`、`001-platform-injection`。


## Session 16: 收紧检查流水线：tmp 预算前置与语法检查
<!-- trellis-session: v=2 fp=1115466b7775b9d3 -->

**Date**: 2026-10-28
**Task**: 收紧检查流水线：tmp 预算前置与语法检查
**Branch**: `master`

### Summary

把 tmp:report 前置到 npm run check 链首并新增 check:syntax，补 tmp-report 单测与 CLI 修复，收窄注释规则到 src/ 与 core/，补齐 acceptance.py 与 task.py 的 CLI 契约文档。

### Main Changes

- - 收紧 `npm run check` 链：`tmp:report` 移到链首、新增 `check:syntax` 并排在第二位（`19f8599`、`e00d0d0`）。

### Git Commits

| Hash | Message |
|------|---------|
| `19f8599` | feat(tooling): 检查链前置 .tmp 预算、补语法检查并收窄注释规则范围 |
| `e00d0d0` | fix(tooling): 语法检查前置到链第二位并同步 .tmp 门禁的两处规范 |
| `680c4fd` | chore(task): archive 10-28-tighten-check-pipeline |

### Status

[OK] **Completed**
