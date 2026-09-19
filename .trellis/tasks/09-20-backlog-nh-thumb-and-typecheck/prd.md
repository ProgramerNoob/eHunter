# 清理历史待办：NH 缩略图修复与 type-check 基线

## Goal

依据 `.trellis/spec/frontend/features/pending-work.md` 的核对结果，交付两件事：修复 NH 缩略图地址解析（历史 T149）并完成 T113 真实 NH 验收；消除 `npm run type-check` 的全部 22 项错误，恢复绿灯基线。

## Source Requirements

来源为 `.trellis/spec/frontend/features/pending-work.md` 与对应历史 tasks；迁移前言中的状态免责声明继续有效，旧勾选不构成验收。

1. **R1（对应历史 T149）**：`src/platform/nh/parser/IntroHtmlParser.ts` 需同时兼容旧 `data-src` 与当前原生 `src`，两种 HTML 输入都提取出非空缩略图地址。当前实现把 `src=` 改写成 `x-src=`（`IntroHtmlParser.ts:13`）却只读 `data-x-src`（`IntroHtmlParser.ts:23`），导致 NH 图集缩略图地址全为 `null`。
2. **R2（对应历史 T113）**：在真实 NH 图集完成缩略图加载与导航验收，判定依据是逐张 `img.complete && img.naturalWidth > 0` 且图片实际可见；覆盖书页/卷轴切换、缩略图点击跳页与当前页定位；桌面 1200×900 与移动 390×844 双视口，记录控制台、未捕获异常与截图。
3. **R3（对应历史 T033/T037 的前提）**：`npm run type-check`（`vue-tsc --noEmit`）在干净工作区必须退出码为 0，才可勾选历史上依赖它的待办项。
4. **R4**：`core/components/TopBar.vue` 的 `getItemStyle()`（`TopBar.vue:81-91`）返回值类型需与 Vue 模板 prop 类型兼容，消除 `TopBar.vue(20,14)` 错误而不改变运行时布局行为。
5. **R5**：不得改变 NH/EH 缩略图的既有数据结构（`ThumbInfo`）、调用链或缓存语义；`AlbumService` 契约与 120000ms 初始化超时保持现状（历史 60 秒契约不得回写）。

## Child Task Map

| 子任务 | 目录 | 交付 | 独立验收 |
| --- | --- | --- | --- |
| C1 NH 缩略图解析修复 | `.trellis/tasks/09-20-nh-thumb-src-parser` | R1、R2 | 真实 NH 图集缩略图可见且可跳页 |
| C2 type-check 基线清理 | `.trellis/tasks/09-20-typecheck-dead-code-cleanup` | R3、R4 | `npm run type-check` 退出码 0 |

两个子任务无代码依赖（文件集不重叠），可独立实现与验收。C1 的浏览器验收依赖本地 bundle 服务与 ego-browser；C2 只依赖仓库内静态检查。

## Acceptance Criteria

- [ ] C1 与 C2 的各自验收标准在对应子任务内全部通过，并记录实际检查结果与未验证范围。
- [ ] 父任务级集成检查：在 C1 代码与 C2 清理同时落地的版本上，`npm run type-check` 退出码为 0，且真机 NH 图集缩略图仍可见（清理不得破坏 parser 引用链）。
- [ ] `pending-work.md` 与相关历史 tasks 的状态按实际验收结果回填，未验证项不得标记为通过。
- [ ] 交付说明区分已验证/未验证范围，并记录桌面与移动视口的实际证据路径；未运行的 EH 回归须显式列出。

## Out of Scope

- 平台 T119–T148 的文档与验收计划产物（多数为历史计划文件，价值密度低，另行评估）。
- 下载打包、翻页、放大镜、可停靠面板的文档/契约对齐与 requirements 复测。
- 改造 `core_old/`、`old/` 历史实现；将 120000ms 超时改回历史 60 秒契约。
- 新增自动化测试框架（仓库当前无 lint/单测脚本）。

## Notes

- 关键证据：`.tmp/nh-thumb-diagnosis.md`（2026-09-19，源码 887c30e，`nhentai.net/g/631366`，45 页）。HEAD 之后仅两个纯文档提交，结论仍适用。
- 保留历史任务编号与原勾选：本父任务不改写历史 tasks 状态，只做回填与新增记录。
