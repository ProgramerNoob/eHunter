# 实施计划

## 前置

- 任务目录：`.trellis/tasks/10-28-tighten-check-pipeline`。
- 涉及文件：`package.json`、`scripts/tmp-report.mjs`、`scripts/check-syntax.mjs`（新增）、`tests/tmp-report.test.mjs`（新增）、`.trellis/spec/frontend/quality-guidelines.md`、`.trellis/spec/tooling/index.md`。
- 不改 `scripts/browser-preflight.mjs`、`scripts/acceptance.py`、`src/**`、`core/**`。

## 1. 语法检查

- 新建 `scripts/check-syntax.mjs`：遍历 `scripts/` 与 `tests/`（递归，跳过 `__pycache__`）下所有 `.mjs`/`.cjs`，逐个 `spawnSync(process.execPath, ['--check', file])`，收集失败文件，全部通过时打印文件数与退出 0，失败时打印每个文件的 `stderr` 并退出 1。
- `package.json` 增加 `check:syntax`。
- 验证：`npm run check:syntax` 退出 0 且报出全部 `.mjs`/`.cjs` 文件（实际 23 个）；往 `tests/` 临时写一个含 `const a = 1,,;` 的 `.mjs`，确认退出 1 并打印该路径，随后删除。
- 目录不可读与零文件也是失败：`catch` 里记录不可读根目录名单，收集到 0 个文件时退出 1。

## 2. tmp 预算进 check

- `package.json` 的 `check` 改为 `npm run tmp:report && npm run check:syntax && npm run type-check && npm test && npm run build-prod && npm run check:docs`。前两步都是亚秒级且只读仓库内容，任何一步失败都不必等 type-check、测试与构建全跑完；`tmp:report` 排首位是因为它的失败原因在本地磁盘而不在代码。
- 给 `scripts/tmp-report.mjs` 补最小单元测试 `tests/tmp-report.test.mjs`：用 `mkdtemp` 造临时仓库根（含 `scripts/` 与空 `.trellis/`），复制或直接调用导出的函数，覆盖三种输入——目录缺失（exit 0）、总量超 `--max-bytes`（exit 1）、孤儿超 `--max-orphan-bytes`（exit 1）。为可测试性把 `main()` 从「读 `process.argv` 并设置 `process.exitCode`」抽出为可传参的 `run(options, paths)`，并在文件末尾用 `import.meta.main` 或 `process.argv[1]` 判断保留 CLI 行为。
- `package.json` 增加 `test:tmp-report` 并挂进 `npm test`。
- `.tmp` 根目录与 `.tmp/browser-preflight` 缺失时统一豁免 ENOENT：`walkFiles` 与 `roundEntries` 都不记读失败，全新 clone 上报告不再出现 `read failures: 1` 噪音。
- 验证：`npm run test:tmp-report`；`npm run tmp:report` 仍 exit 0；`npm run check` 全绿。

## 3. 规范收窄与导航

- `.trellis/spec/frontend/quality-guidelines.md` 的 Documentation boundaries 段：把「keep comments out of `src/` and `core/`」补成明确的适用范围句，说明 `scripts/` 与 `tests/` 不受该条约束。
- `.trellis/spec/tooling/index.md`：表格增加 `scripts/acceptance.py`（CLI 子命令与退出码）与 `scripts/tmp-report.mjs` 两行；在「本地提交门禁」附近增加一小段 `task.py archive` 三道门禁摘要（scope 基线、`--skip-branch-validation`、`implement.jsonl`/`check.jsonl` 非空）。

## 4. 验证与收口

- `npm run check` 全绿；`npm run check:docs` 通过。
- 回填 `acceptance.json` 三个 check，`python3 scripts/acceptance.py summarize` 通过。
- 归档：`task.py set-meta scope` 重录 → `start` → `archive --skip-branch-validation`。

## 回滚点

三处独立改动，任一处出问题按文件 `git checkout -- <path>` 回退；`check` 的挂载点在 `package.json`，回退该行即恢复原流水线。
