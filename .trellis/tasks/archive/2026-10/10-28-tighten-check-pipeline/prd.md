# 收紧检查流水线：tmp 预算、语法检查与规范收窄

## Goal

把 2026-10-28 复盘（retro）里成本低于 5 分钟、收益确定的三项检查补进 `npm run check`，并把两条只写在规则里、实际无人执行或适用范围写宽的规范改准：让 `.tmp` 超预算无法悄悄发生、让 `scripts/` 与 `tests/` 的语法错误在检查期而非运行期暴露、让「代码不写注释」的适用边界与工具契约的导航入口和现状一致。

## Background

当前 `npm run check` = `type-check && test && build-prod && check:docs`，实测输出 31078 字节 / 496 行 / 303 个 ✔，挂在 `.githooks/pre-commit` 与 `.github/workflows/check.yml`。复盘实测到三个缺口：

- `scripts/tmp-report.mjs` 已实现 `.tmp` 总量与孤儿轮次预算（默认 3 GiB / 2 GiB，超预算 exit 1），耗时 0.25 s，但**不在 `npm run check` 里**。本会话中 `.tmp` 曾涨到 14.45 GiB 而全程无人察觉，靠事后逐目录清理才回到 2.61 GiB。
- `tsconfig.json` 的 `include` 只有 `env.d.ts`、`src/main.ts`、`src/platform/**/*`、`core/**/*`，`allowJs: true` 但 `checkJs: false`；`scripts/*.mjs`（`browser-preflight.mjs` 1351 行、`tmp-report.mjs` 196 行）与 `tests/*.mjs`（`browser-preflight.test.mjs` 1493 行）完全不在任何静态检查范围内。所有 `.mjs`/`.cjs` 文件全部 `node --check` 耗时不到 1 s。
- `.trellis/spec/frontend/quality-guidelines.md` 的 Documentation boundaries 写「keep comments out of `src/` and `core/`」，但同段落标题下未声明该规则只约束这两处；实际 `scripts/` 有 81 条注释、`tests/` 有 17 条，规则对它们无约束也无检查。
- `.trellis/spec/tooling/index.md` 没有 `scripts/acceptance.py`（699 行，`run`/`summarize`/`set-meta`/`verify-browser` 等子命令）与 `scripts/tmp-report.mjs` 的导航入口，`task.py` 的归档三门禁只散落在各任务踩坑记录里。

复盘另外两条建议（变异测试自动化、`check:quiet`）经实测后不进入本任务：变异测试对不可达死代码无能为力，Node 的 `--test-coverage-lines` 阈值被截断成整数、拦不住 <1 个百分点的退化；`check:quiet` 只降低 agent 的 token 消耗，不改善代码质量。

## Requirements

- R1 `npm run check` 开头追加 `.tmp` 预算检查，使用已存在的 `scripts/tmp-report.mjs`，不加新参数、不改其退出码语义；放在链首是为了超预算时立刻失败，不先付出全量检查成本。
- R2 新增一个语法检查脚本，对 `scripts/` 与 `tests/` 下所有 `.mjs`/`.cjs` 逐个跑 `node --check`，任一失败即以非零退出并打印失败文件；它在 `npm run check` 里紧接 `.tmp` 预算检查之后，理由同上：亚秒级、只读仓库内容。
- R3 `scripts/tmp-report.mjs` 在 `.tmp`、`.tmp/browser-preflight` 不存在时必须照常 exit 0：CI 全新 clone 没有 `.tmp`，缺目录不是超预算。
- R4 `scripts/tmp-report.mjs` 的预算判定与既有实现一致，不因为该文件自身的输出无关紧要而跳过测试；本次为它补最小单元测试（缺目录、超预算、孤儿超预算三种输入）。
- R5 `quality-guidelines.md` 的 Documentation boundaries 明写「代码不写注释」只约束 `src/` 与 `core/`，不新增 grep 检查。
- R6 `.trellis/spec/tooling/index.md` 增加 `scripts/acceptance.py` 与 `scripts/tmp-report.mjs` 的导航行，并在合适位置汇总 `task.py` 归档的三道门禁。
- R7 不改 `scripts/browser-preflight.mjs`、不改 `scripts/acceptance.py`、不改任何 `src/` 或 `core/` 代码。
- R8 `npm run check` 在 macOS 与 Node 22（CI）上都能通过；新脚本只依赖 Node 标准库。

## Acceptance Criteria

- [AC1] `npm run check` 的输出里出现 `.tmp` 报告行，且 `.tmp` 超预算时 `npm run check` 以非零退出；在 `.tmp` 与 `.tmp/browser-preflight` 都不存在的全新目录下 `node scripts/tmp-report.mjs` exit 0。
- [AC2] 语法检查脚本覆盖 `scripts/` 与 `tests/` 下全部 `.mjs`/`.cjs`，人为注入语法错误时退出码非零并打印该文件路径，恢复后退出码为 0。
- [AC3] `scripts/tmp-report.mjs` 的单元测试覆盖缺目录、总量超预算、孤儿超预算三种输入，并在 `npm test` 中执行。
- [AC4] `quality-guidelines.md` 明确该规则只约束 `src/` 与 `core/`；`.trellis/spec/tooling/index.md` 含 `acceptance.py` 与 `tmp-report.mjs` 的导航行与 `task.py` 归档门禁摘要；`npm run check:docs` 通过。
