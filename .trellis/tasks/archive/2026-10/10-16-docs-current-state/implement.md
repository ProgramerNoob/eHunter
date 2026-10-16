# 执行清单：文档与注释只描述当前状态

## 顺序原则

`先补 spec → 再删注释 → 再删文档 → 最后同步引用 → 全量检查`。

先补后删，避免约束在两处同时缺席；引用同步放在删除之后，因为只有删完才知道哪些链接断了。

## 阶段 0：前置快照

- [ ] T001 记录基线：`git status --short`、`git rev-parse HEAD`；确认工作区只有本任务目录未提交。
- [ ] T002 录制检查基线：`npm run check:docs`、`npm run type-check` 退出码，作为改动前对照。

## 阶段 1：`AGENTS.md` 两条要求

- [ ] T003 在 `AGENTS.md` "文档维护与提交"一节（第 46–52 行）内新增两条，作为该节首条，表述为祈使句、不含动机：
  - 所有文档和代码注释均描述当前状态，不记录任何 AI 历史修改记录、已废止决策或阶段规划；更新当前状态描述时不得把尚未确认的实现偏差写成新的业务规则。
  - 代码是唯一证据；不写注释，文字说明放在文档里。
- [ ] T004 改写 `AGENTS.md:6` 的 `core_old/`、`old/` 表述，从"历史实现"改为当前用途描述（不被 `src/`、`core/` 引用、不参与构建与脚本产物、不复制其结构）。
- [ ] T005 检查 `AGENTS.md` "修改前按需读取"一节第 20 行"目标、历史计划与当前实现有冲突时"的表述：删掉"历史计划"一词，改为"目标与当前实现有冲突时先追溯决策"。
- [ ] T006 校验：`AGENTS.md` 第 53 行起的 Trellis 托管块与改动前逐字节相同——`git diff AGENTS.md` 的改动行全部落在第 1–52 行。

## 阶段 2：把代码注释承载的约束补进 spec

- [ ] T007 读取 `core/store/app.ts` 全部注释行（89 行），按 design.md 第 6 节三类分类，产出分类清单。
- [ ] T008 在 `.trellis/spec/frontend/state-management.md` 补写当前行为约束，覆盖至少四项：
  - 共享通道读取：有用户脚本存储时读共享数据，否则按 origin 降级到本站 localStorage；确认重置后的读取只信共享通道、不读本站旧副本
  - reset 身份的构成：共享标记 `resetId` 优先，缺失时用 `migratedAt`，无时间戳退化为 `blocked-without-timestamp`；不得比较墙钟
  - 旧副本处理：重置前写入的条目按缺失处理，但不删除、不覆盖存储值；显式重置后禁止再次导入旧副本
  - schema 规范化顺序：各来源先按自身 schema 规范化再合并，避免旧 schema 字面量混进以当前 schema 返回的结果
- [ ] T009 补写 `legacy` 前缀标识符的当前数据契约：键 `ehunter:reader:prefs:legacy-migration`、`schemaVersion: 1`、`legacyImport` 取值 `done`/`blocked`、`resetId` 可选。不含"为什么叫 legacy"。
- [ ] T010 用同样方式处理 `core/store/layoutPreference.ts`（23 行）、`core/model/layout.ts:20`、`core/store/event.ts:211`、`core/components/TopBar.vue`（20 行）、`core/components/ThumbScrollView.vue`（17 行）、`core/components/AlbumScrollView.vue`、`core/components/AlbumBookView.vue`、`core/components/PageView.vue` 的约束性注释；同文件内约束合并成一节写入 `state-management.md` 或对应 spec。
- [ ] T011 处理 `src/platform/`（68 行）：`src/platform/types.ts`（16 行）、`src/platform/eh/service/AlbumServiceImpl.ts`（18 行）、`src/platform/initializer.ts`（7 行）、`src/platform/detector.ts`、`src/platform/eh/parser/IntroHtmlParser.ts`、`src/platform/nh/service/AlbumServiceImpl.ts:4`。平台相关约束写入 `001-platform-injection/spec.md` 或 `state-management.md`。
- [ ] T012 校验 spec 已覆盖被删约束：对阶段 2 的每条注释，确认约束已在 spec 中有对应表述，未覆盖的不删。

## 阶段 3：删除代码注释

- [ ] T013 删除 `core/`、`src/platform/` 的叙述性/历史性注释。保留：三斜线指令 `/// <reference types="vite-svg-loader" />`、`.vue` 的 `<style lang="scss">` 段注释与 SCSS 规则注释、工具读取的指令注释。
- [ ] T014 逐文件核对 `git diff --stat`，确认改动只落在注释行；`git diff -U0 <file> | grep '^[+-]' | grep -v '^[+-][+-]'` 的每一行都应是注释。
- [ ] T015 门禁：`npm run type-check` 退出码 0。
- [ ] T016 门禁：`npm run build-prod` 退出码 0。
- [ ] T017 门禁：`npm test` 通过（含 `test:acceptance`、`test:storage`、`test:browser-preflight`、`test:reader-lifecycle`）。

## 阶段 4：改写 `pending-work.md`（先于删除）

- [ ] T018 从 7 个 `tasks.md` 提取仍未收口的项，改写为当前待办描述，去掉 `T0xx` 编号与勾选状态：下载 `metadata.json` 时间戳 UTC 与用户本地时区的差异（`spec.md` 要求本地时区，实现用 `toISOString()`）、放大镜 requirements 中未验收的项、平台四份 `validation-us*.md` 未产出。
- [ ] T019 删除"独立状态表"计数矩阵、"2026-10-03 已完成"三段历史说明、"迁移基线口径"表述；保留"本页是发现入口，不是缺陷计数"的定位。
- [ ] T020 删除 `pending-work.md` 中所有指向 `tasks.md`、`checklists/requirements.md`、`quickstart.md` 的链接（这些文件即将删除或已改变标题）。

## 阶段 5：删除 spec-kit 计划型产物

- [ ] T021 删除 7 组 × `plan.md`（7）、`research.md`（7）、`tasks.md`（7）、`checklists/requirements.md`（7），合计 28 个文件。
- [ ] T022 按 design.md 第 4 节的去向表核对：未完成项已进 `pending-work.md`；T032/T138 一类"补注释"条目确认为作废，未搬入任何文档。

## 阶段 6：改写保留的功能资料

- [ ] T023 七组 `spec.md`：删除 `<!-- migration-note:start -->` 块；第 12 行的"状态注"删掉 `tasks.md` 引用与"勾选记录历史进度"；第 15 行的"决策依据（2026-09-18）"删掉 `[tasks.md](tasks.md)` 链接与"原始 Input 保留历史背景"，只留当前生效的契约指针。
- [ ] T024 七组 `data-model.md`：第 9 行"当前约束"删掉 `[tasks.md](tasks.md)` 引用；`001-gallery-download-bundle/data-model.md:80` 的 `plan.md` 引用改为当前描述（直接写明实现用 UTC ISO 8601，与 `spec.md` 的本地时区要求存在差异，差异记录在 `pending-work.md`）。
- [ ] T025 `001-gallery-download-bundle/quickstart.md:25,38`：删掉 "via `tasks.md` T036–T037" 与 "recorded in `plan.md`"，改为记录在当前脚本或 `pending-work.md`。
- [ ] T026 `001-platform-injection` 五份文档的"平台差异"引言：保留当前差异（`src/platform/initializer.ts` 为 `TIMEOUT_MS = 120000`，契约目标 60 秒），删掉 T149 编号、修复过程与 `tasks.md` 引用，只留当前解析行为（NH 构造器把 `src` 改写为 `x-src`、`data-src` 改写为 `data-x-src`，parser 需同时接受改写后的名称与旧 `data-src`）。
- [ ] T027 `001-platform-injection/quickstart.md:401-404` References 节：删除 `Implementation Plan`(plan.md) 与 `Research Document`(research.md) 两条。
- [ ] T028 其余含 `migration-note` 块的文件：`product-goals.md:1-3`、`001-platform-injection/checklists`（已删）、`spec.md` 等，删块并核对正文无"迁移来源/基线 `647ff26`"字样。

## 阶段 7：重写 `features/index.md` 与上层导航

- [ ] T029 重写 `.trellis/spec/frontend/features/index.md`：改为当前实现与契约导航。删除"历史资料"列、"阅读顺序与权威"第 3 条（plan/research/tasks 保留历史进度）、"已知状态差异"整节中依赖已删清单的条目。
- [ ] T030 保留 `index.md` 中仍属现状的内容：契约与实现差异（`TIMEOUT_MS = 120000`）、OpenAPI 是逻辑契约而非部署 HTTP API、功能变更须按浏览器验收或 EH 技能重测。
- [ ] T031 删除 `index.md` 末尾的迁移去向段落（"迁移前后逐文件去向、原 SHA-256……旧框架原文可从基线 `647ff26` 追溯"）。
- [ ] T032 `.trellis/spec/frontend/index.md:37` 附近：`historical unfinished work and independent checklist states` 改为当前表述（未收口的工作项）。
- [ ] T033 `README.md:65`、`README_CN.md:63`：`historical pending work`/`历史待办` 改为"待办"，去掉"distinguish targets, implementation history, and acceptance results"这类按记录时态组织链接的说法。

## 阶段 8：清理 `product-goals.md` 等其余 spec 文档

- [ ] T034 `product-goals.md`：删 `migration-note` 块；第 9 行"不代表当前实现已全部完成……记录同时列出待同步规格与待修正实现"改为当前状态描述；第 93 行"配置迁移（重构阶段强约束）"标题去掉"重构阶段"；第 107 行 `core_old/` 表述改为当前用途描述（与 T004 保持一致）。
- [ ] T035 `state-management.md:130` 的 `As of 2026-10-03 the two tables are isomorphic` 与 `:174` 的 `were deleted on 2026-10-03` 改为当前事实陈述（去掉日期与删除过程）。
- [ ] T036 `quality-guidelines.md`、`type-safety.md`、`directory-structure.md`：把 "legacy EH cache/parser path"、"migration boundaries"、"EH is the first migration target" 等表述改为当前状态（去掉迁移阶段叙事，保留实际约束）。
- [ ] T037 `.trellis/spec/tooling/pi-context.md:53` 的"退出诊断示例（历史，pi-graft 已于 2026-10 从项目移除）"段：删除整条历史示例，保留"按实际日志区分执行/清理预算"的当前要求。

## 阶段 9：全量检查与交付

- [ ] T038 文本扫描（排除 `.trellis/tasks/archive/**`、`.trellis/workspace/**`、`core_old/`、`old/`、`node_modules`、`.tmp/`、`dist/`）：
  `grep -rniE "phase ?[0-9]|migration-note|迁移基线|历史实现|历史待办|647ff26|spec-kit|speckit" .`
  期望：无匹配。
- [ ] T039 扫描 `T0xx`/`T1xx` 编号残留：`grep -rnE "\bT[0-9]{3}\b" .`（同上排除），期望无匹配。
- [ ] T040 `npm run check:docs` 退出码 0。
- [ ] T041 `npm run type-check` 退出码 0；`npm run build-prod` 退出码 0；`npm test` 通过。
- [ ] T042 代码行为零改动核对：`git diff --stat` 中 `src/`、`core/` 的改动只出现在注释；抽查 `core/store/app.ts` 的非注释 diff 为空。
- [ ] T043 交付说明：列出已验证范围（`check:docs`、`type-check`、`build-prod`、`test`、文本扫描）与未验证范围（无浏览器验收，产品行为未变），说明未触碰 `core_old/`、`old/`、`.trellis/tasks/archive/**`。

## 验证命令汇总

```bash
npm run check:docs
npm run type-check
npm run build-prod
npm test
grep -rniE "phase ?[0-9]|migration-note|迁移基线|历史实现|647ff26" . \
  --exclude-dir={node_modules,.git,.tmp,dist,archive,core_old,old,workspace}
```

## 回退点

- 阶段 1 后：`git checkout -- AGENTS.md`
- 阶段 3 后：`git checkout -- core src`
- 阶段 5 后（删除操作）：`git checkout -- .trellis/spec/frontend/features`
- 全程不使用 `reset --hard` 或强制推送。

## 评审门禁

- 阶段 1 完成后（`AGENTS.md` 两条要求定稿）停一次，确认表述方向正确再动 spec。
- 阶段 2 完成后（约束已进 spec）停一次，确认无遗漏再进阶段 3 删除注释。
- 阶段 9 的 T038–T042 是提交前必须全绿的收口门禁。
