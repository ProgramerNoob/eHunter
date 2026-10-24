# 执行计划：下载抓取并发对齐规格与进度语义

## 前置

- 工作区基线：`master` @ `c0cae52`，clean。
- Scope 已声明（见 `task.json` → `meta.scope`）：spec 五处、`core/assets/i18n.ts`、`core/service/GalleryDownloadService.ts`、两个测试文件、本任务目录。

## 步骤

### S1 规格：功能 spec 与数据模型

- `.trellis/spec/frontend/features/001-gallery-download-bundle/spec.md`
  - `:19` 用户故事：改为并发抓取、"压缩包内仍按页码顺序"。
  - `:27` Acceptance Scenario 1：去掉"顺序下载"，写并发抓取。
  - `:75` FR-001：三 worker 并发抓取画廊图片；单包内图片按页码排序后写入。
  - FR-005 保留（分片顺序），不动。
- `.trellis/spec/frontend/features/001-gallery-download-bundle/data-model.md`
  - `:21` `currentPage` 字段描述改为已完成页数口径。
  - `:22-23` 校验规则改写：已完成计数单调不减；说明并发抓取不改变该约束。
  - `:27` DownloadChunk 描述去掉 "sequential pages"。

验证：`grep -n "顺序\|逐张" spec 目录` 结果仅剩分片顺序与换源顺序两处合法表述。

### S2 规格：契约补充

- `.trellis/spec/frontend/features/001-gallery-download-bundle/contracts/gallery-download.openapi.yaml`
  - `:164` `processedPages` 补 `description`：已完成抓取的页数（成功与失败合计），并发抓取下单调不减。
  - 不改字段名、类型与 required 列表。

验证：`npm run check:docs` 通过（含 `$ref` 校验）。

### S3 决策与索引收口

- `.trellis/spec/frontend/decisions/2026-09-18-reader-behavior.md` 第 1 节末尾那句"抓取要求顺序执行，当前实现为三个并发 worker——该差异见…"改为已确认的并发口径（固定 3 worker，产物按页码排序）。
- `.trellis/spec/frontend/features/pending-work.md` 删除"下载图片抓取并发"整节。
- `.trellis/spec/frontend/features/index.md` 删除"已知状态差异"下并发那条，保留 `.tmp/` 与 validation 那条。

验证：`grep -rn "抓取并发\|三个并发 worker" .trellis/spec` 不再命中未收口表述。

### S4 实现：进度数字与文案

- `core/service/GalleryDownloadService.ts:496`：`current: pageNumber` → `current: processedPages`。
- `core/assets/i18n.ts:522` `downloadFetching`：三语改为已完成计数口径，占位符仍为 `{{current}}` / `{{total}}`。
  - cn：`已完成 {{current}}/{{total}} 张图片`
  - en：`Completed {{current}} / {{total}} images`
  - jp：`{{current}} / {{total}} 枚完了`

验证：`npm run type-check`。

### S5 测试

- `tests/download-metadata.test.cjs`：现有断言只检查 `phase` 序列与产物，不必改；若 S4 改动了推送次数则补一条"进度数字单调不减"断言。
- 跑 `npm run test:download-metadata`、`npm run test:download-time`。

验证：两条命令退出码 0。

### S6 浏览器验收

- 按 `.trellis/spec/frontend/browser-acceptance.md` 启动本地服务（或按 `.pi/skills/reader-test/SKILL.md` 用生产包），触发一次跨分片下载。
- 记录：进度数字序列、最终文案、解压后文件名顺序、书页与卷轴两种模式入口一致。
- 证据落 `.tmp/`，回填本任务 `acceptance.json`。

### S7 收口

- `npm run check:docs`、`npm run type-check`、下载相关测试全绿。
- `python3 scripts/acceptance.py summarize .trellis/tasks/10-24-download-concurrency-spec-alignment`。
- 提交（建议 `docs(spec):` + `fix(core):` 两条，或按改动合并）。
- `python3 scripts/acceptance.py archive .trellis/tasks/10-24-download-concurrency-spec-alignment`。

## 回退点

- S1–S3 纯文档，回退即 `git checkout` 对应文件。
- S4 改动两处一行级修改，回退无副作用；无持久化数据变化。

## 不做

- 不改并发度、不改分片逻辑、不重跑下载 quickstart 的完整分片校验矩阵（仍留在 `pending-work.md`）。
