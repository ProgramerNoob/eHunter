# 设计：文档与注释只描述当前状态

## 1. 两条要求的落点与自指一致性问题

两条要求本身会被写进 `AGENTS.md`，而 `AGENTS.md` 也是文档，于是出现自指：**要求 2 的理由**（"注释容易和历史混在一起""注释不可信"）本身是一段演变解释，按要求 1 不应写进文档。

处理：把两条要求写成**当前约束的祈使句**，不写动机、不写"以前是怎么做的"。

| 写法 | 结论 |
| --- | --- |
| "代码是唯一证据，不写注释，说明放文档" | 保留——陈述当前必须遵守的规则 |
| "因为历史上注释与代码不同步，所以……" | 删除——记录历史原因 |
| "文档只描述当前状态，不保留已废止决策与阶段规划" | 保留——陈述当前要求 |
| "本次新增两条要求，用于替换过去的做法" | 删除——本次任务的过程属于任务记录 |

动机留在本任务的 `prd.md`（任务记录），不进入长期文档。这与"归档任务保留历史"是同一条边界：**任务目录是历史，`AGENTS.md`/`.trellis/spec/` 是现状**。

## 2. `AGENTS.md` 的改动边界

- 新增要求放在"文档维护与提交"一节（第 46–52 行）内，作为该节首两条，因为该节已经在管"什么内容归哪里"。
- 第 53–73 行的 `<!-- TRELLIS:START -->` 块由 `trellis update` 维护，手工改动会被覆盖，因此新增内容必须落在第 52 行之前。
- 第 6 行 `core_old/`、`old/` 的"历史实现"表述改为当前用途：

  原：`core_old/`、`old/` 是历史实现，修改时须说明目的，参考时避免直接复制旧结构
  改：`core_old/`、`old/` 不被 `src/`、`core/` 引用，也不参与构建与脚本产物；仅作对照查阅，新增和修复不落在其中，也不复制其结构

  理由：旧表述用"历史"给目录定性，读者会以为"带迁移目的就可以改"，而实际边界是这个目录不进构建产物。改成用途描述后，同一句话同时表达"能读不能写"和"为什么"。

## 3. 删除范围与保留范围的判定规则

判定规则：**这份文件描述的是"当前系统是什么"，还是"某次开发过程发生了什么"？**

- 描述当前系统 → 保留（`spec.md`、`data-model.md`、`contracts/*`）
- 描述开发过程 → 删除（`plan.md`、`research.md`、`tasks.md`、`checklists/requirements.md`）
- 两者混杂 → 保留文件，改写为当前描述（`quickstart.md`）

`quickstart.md` 属于验收步骤，是当前系统的可执行说明，因此保留；但它含"历史验收说明""Historical YAML/task checks do not establish acceptance"这类记录时态文字，按 R3 改写。

`001-platform-injection/quickstart.md:401-404` 的 References 节列出 `plan.md`、`research.md`，删文件后必须删掉这两条，否则 `check:docs` 断链。

## 4. 被删内容的去向

只删文件会导致"未收口的工作项"一起消失，因此先把仍有价值的部分搬走，再删：

| 被删内容 | 去向 | 判据 |
| --- | --- | --- |
| `tasks.md` 中的未完成项 | `pending-work.md`，改写为当前待办描述 | 仍是待办，不是历史 |
| `tasks.md` 已完成项、勾选状态 | 直接丢弃 | 属于开发过程记录 |
| `tasks.md` 里的历史计数表（366/252/114 等） | 直接丢弃 | 基线口径的计数是过程指标 |
| `requirements.md`/`quickstart.md` 的未勾项 | 已并入各功能 `spec.md` 的当前要求描述 | 未勾代表要求未验收，属现状 |
| `tasks.md` 的临时字段、注释要求（T032 "补最小注释"、T138 "Add inline code comments"） | 直接丢弃 | 与要求 2 冲突，作废 |

T032/T138 与本轮要求 2 直接冲突：旧计划要求"为复杂解析逻辑添加行内注释"。按"不得把尚未确认的实现偏差写成新的业务规则"，作废的是旧计划条目，要求 2 生效，`AGENTS.md` 不记录这次冲突。

## 5. 现役兼容机制与"历史"的区分

`core/store/app.ts` 中的 `legacy` 前缀标识符（`legacyMigrationPreferenceKey`、`LegacyImportState`、`legacyImportStatusBlocked`、`parseLegacyMigrationState`）是**现役数据契约**：这些键名与状态值存在于用户浏览器的持久存储中，改名会破坏兼容。

处理：**标识符不动，注释删除，行为写进 spec**。文档描述写成当前契约：

- 存储键 `ehunter:reader:prefs:legacy-migration`，`schemaVersion: 1`
- 状态字段 `legacyImport` 取值 `done` / `blocked`
- `resetId` 可选，缺失时退化为 `migratedAt`

不写"为什么叫 legacy"，那属于演进史。

## 6. 注释清理的分类判据

在 `core/`（191 行注释行）、`src/platform/`（68 行）中按以下三类处理：

**保留（结构性指令，不是注释）**
- `/// <reference types="vite-svg-loader" />`——TypeScript 三斜线指令，删掉会编译报错
- `.vue` 的 `<style lang="scss">` 与 SCSS 规则注释——属于样式表语法，若位于会进入产物的位置则保留
- 任何被工具读取的指令注释

**保留（已确认的格式约定）**
- 说明"这段代码对应哪个契约"的短句，若能一行说清且不涉及演变，可保留；否则移入 spec

**删除（叙述性/历史性）**
- 描述演进、来源、被取代做法：`src/platform/nh/service/AlbumServiceImpl.ts:4` "Ported from legacy NH service behavior"
- 引用内部编号：`core/store/app.ts:687` "（决策第 2 节）"、`core/store/app.ts:1225` "决策第 3 节"——决策文档是行为契约，正文引用它不算演变史，但注释不是承载它的地方，改为在 spec 中引用
- 解释"为什么这样写"的长段约束：`core/store/app.ts:777-780`（历史标记缺 resetId 时回退 `migratedAt`）、`core/store/app.ts:891-898`（旧副本按缺失处理、显式重置后禁止再导入）、`core/store/app.ts:860-878`（不能比较墙钟时钟回拨）——**先搬进 `state-management.md`，再删**

`core/store/app.ts` 单文件 89 行注释是本轮最大改动面，其承载的约束最密集，顺序必须是"先补 spec、再删注释、再跑 type-check"。

## 7. 引用同步（防止 `check:docs` 断链）

删除 28 个文件后，下列引用点必须同步，否则 `npm run check:docs` 退出码非 0：

- `.trellis/spec/frontend/features/index.md`——七组资料表的"历史资料"列、顶部"阅读顺序与权威"第 3 条、"已知状态差异"整节
- `.trellis/spec/frontend/features/pending-work.md`——独立状态表的 7 个文件链接、各节 `tasks.md`/`checklists`/`quickstart` 链接
- `.trellis/spec/frontend/index.md:37` 附近——`pending-work` 的"Historical unfinished work"表述
- `.trellis/spec/frontend/features/*/spec.md:12,15`——`[tasks.md](tasks.md)` 链接与"勾选记录历史进度"说明
- `.trellis/spec/frontend/features/*/data-model.md:9,80`——`[tasks.md](tasks.md)`、`plan.md` 引用
- `.trellis/spec/frontend/features/001-gallery-download-bundle/quickstart.md:25,38`——`plan.md via tasks.md T036–T037`
- `.trellis/spec/frontend/features/001-platform-injection/quickstart.md:401,404`——References 的 plan/research 两条
- `README.md:65`、`README_CN.md:63`——pending-work 的"历史待办"表述
- `.trellis/spec/frontend/product-goals.md:1-3`、`features/001-platform-injection/spec.md:1-8` 等——`migration-note` 块

`001-platform-injection` 五份保留下来的文档共享同一段"平台差异"引言（60 秒契约 vs `TIMEOUT_MS = 120000`、T149 修复史）。这段同时含当前差异与修复史：**保留当前差异（`initializer.ts` 为 120000），删掉 T149 的编号与修复过程**。当前契约与实现的差异是现状，必须留。

## 8. `pending-work.md` 的形态

原文件是"迁移基线口径"的清单，依赖 7 个已删文件。改写为只列当前未收口项：

- 去掉"独立状态表"的计数矩阵（引用了已删清单）
- 去掉"2026-10-03 已完成"三段历史说明（过程记录）
- 保留仍未收口的项，改写为当前描述：下载 `metadata.json` 时间戳 UTC 与用户本地时区的差异（`spec.md` 要求本地时区，实现用 `toISOString()`）、放大镜 requirements 中未验收的项、平台四份 `validation-us*.md` 未产出
- 明确本页是"发现入口，不是缺陷计数"

## 9. 风险与回退

| 风险 | 处理 |
| --- | --- |
| 删注释时误删代码 | 逐文件 `git diff --stat` 核对，改动应只落在注释行；`type-check` + `build-prod` + `test` 作为门禁 |
| 误删仍被引用的文件 | 删除前用 `grep -rn` 全仓库核对引用点，`check:docs` 校验 |
| 结构性指令被当注释删除（三斜线指令） | 清理清单按第 6 节三类预先分类，不按行号机械匹配 |
| spec 链路丢失"未收口工作项" | 先改 `pending-work.md`，再删 `tasks.md` |
| `AGENTS.md` 自指导致新要求被自己判定为违规 | 按第 1 节写成祈使句，不写动机 |

回退：本轮全部改动为文本删除与改写，`git checkout -- <path>` 可整体还原；不使用 `reset --hard`。

## 10. 与既有约束的相容性

- 不触碰 `.trellis/tasks/archive/**`：`scripts/acceptance.py archive` 依赖归档证据路径，改动会破坏历史任务的可追溯性。
- 不触碰 `core_old/`、`old/`：`vite.config.prod.ts` 的产物不含它们，但历史对照仍有价值；且其注释改动无收益。
- `AGENTS.md` 要求"每次功能新增或修改后必须完成对应功能测试"，本轮无功能改动，按"纯文档修改验证引用、格式和所述命令"执行：`check:docs` + 文本扫描 + `type-check` + `build-prod` + `test`。
