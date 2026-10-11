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
- [OK] 未验证远端Actions、Ubuntu实机、分支保护、真实GM跨站与浏览器；本轮未推送。

### Status

[OK] **Completed**

### Next Steps

- 复盘03–08仍为建议，按后续需求另行规划；本轮已归档，当前无活动任务。
