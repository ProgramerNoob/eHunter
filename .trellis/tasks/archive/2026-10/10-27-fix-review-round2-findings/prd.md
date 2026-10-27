# 修复两轴审查指出的 12 处工具链偏差

## Goal

把 `527861a..HEAD` 双轴审查的 12 条落成改动。审查范围是三个提交（`658f78a` 主体、`26dcb47` 归档、`9e58ebc` 索引修复），共 28 文件。

## Background

`658f78a` 落地了会话复盘提出的 7 项环境改进（`.tmp` 报告、浏览器交互 helper、`acceptance.py validate`、验收指南拆分、Sass 静音、`pending-work` 收口、归档兜底脚本）。`9e58ebc` 随后修掉了它的一个真实缺陷：`.githooks/pre-commit` 导出的 `GIT_INDEX_FILE` 被 `scripts/test_scope_gate.py` 的 fixture 继承，导致 `git add -A` 把 fixture 文件写进外层 index，之后所有 `git commit` 因 `invalid object … for 'docs/readme.md'` 失败。审查在这三个提交上给出 6 条 Standards 与 6 条 Spec 结论，全部经复现属实。

## Requirements

### Standards

- R1 `quality-guidelines.md` 的命令清单补上 `acceptance.py validate`，让 CLI 契约与实现一致。
- R2 两份 Vite 配置的 Sass 静音列表抽到共享常量，避免将来加一类废弃告警时漏改一处而静默退回告警。
- R3 `scripts/tmp-report.mjs` 吞掉的读取异常必须在报告里可见，避免拿低估的体积做删除决策。
- R4 `scripts/archive-fallback.sh` 必须展开 `meta.scope.categories` 里的 glob 规则；展不开时报告而不能静默丢弃。
- R5 `dismissSimpleDialog` 的选择器必须表达验收指南记录的规则（点击落在 `.flat-button.operation` 内层 `<a>`）。
- R6 交互 helper 的测试必须能抓到选择器回归，而不只是验证 CDP 参数形状。

### Spec

- R7 `.trellis/spec/tooling/archive-fallback.md` 的归因按 `9e58ebc` 定位到的真因改写，不能把已修复问题写成「原因不明、别动 index」。
- R8 归档任务的 `validation.md` 补记 pre-commit hook 场景（`658f78a` 的 AC8 只在干净环境验过）。
- R9 归档任务里 `design.md`/`implement.md` 的 R4 验证口径（`< 24000`）与实际 PRD（`< 32768`）对齐。
- R10 `browser-acceptance.md` 的「资源清理检查」归位到第 4 节下，回到 `## 4.5` 之前。
- R11 `acceptance.py validate` 的规格描述与实现对齐，并补一条否定路径测试。
- R12 补记审查指出的两处范围申报：`tmp-report.mjs` 的 `--max-orphan-bytes` 与 `9e58ebc` 的索引修复。

## Constraints

- 不改 `.trellis/scripts/**`（会破坏 `.trellis/.template-hashes.json`，影响 `trellis update`）。
- 不引入新依赖，不改产品运行时行为。
- 归档任务的文档可以编辑，但只追加或纠正，不重写历史结论。
- `npm run check` 必须整体通过；`.githooks/pre-commit` 场景要单独验证。

## Acceptance Criteria

- [AC1] `quality-guidelines.md` 的命令清单与 `acceptance.py` 的 `main()` 子命令集合一致（`summarize`、`validate`、`archive`、`run` 四者都在），且说明 validate 的只读语义与退出码。
- [AC2] 两份 Vite 配置引用同一个 Sass 静音常量，`npm run build-prod` 无 `DEPRECATION WARNING`，且该常量文件被 `browser-preflight.mjs` 的指纹输入覆盖。
- [AC3] `tmp-report.mjs` 在读取失败时把计数写进报告（人读与 `--json` 两路都可见），失败计数非零时退出码不受影响的说明写在 spec 里。
- [AC4] `archive-fallback.sh` 对 `core/**` 与 `scripts/*.py` 两类规则都展开成具体路径；展开为空时打印警告并继续，不静默丢弃。
- [AC5] `dismissSimpleDialog` 的选择器常量为 `.operation-bar .flat-button.operation > a`，并作为 `evaluate` 参数传入。
- [AC6] `tests/browser-interaction-helpers.test.mjs` 断言选择器常量与传入 `evaluate` 的值，删除该断言后测试变红。
- [AC7] `.trellis/spec/tooling/archive-fallback.md` 记录 `GIT_INDEX_FILE` 真因与 `scripts/test_scope_gate.py` 的修复位置。
- [AC8] 归档任务 `10-27-env-retro-followups` 的 `validation.md` 含 hook 场景记录，`design.md`/`implement.md` 的 R4 口径为 `< 32768`。
- [AC9] `browser-acceptance.md` 的「资源清理检查」位于第 4 节内、`## 4.5` 之前，`npm run check:docs` 通过。
- [AC10] `test_acceptance.py` 覆盖 `validate` 的否定路径（缺 evidence 的 passed 记录 → exit 2），实现与规格描述一致。
- [AC11] `tmp-hygiene.md` 记录 `--max-orphan-bytes` 的用途，归档 `validation.md` 记录 `9e58ebc` 的索引修复。
- [AC12] `npm run check` 整体 exit 0，且在 `.githooks/pre-commit` 导出的 `GIT_INDEX_FILE` 环境下同样通过。

## Notes

- 本轮只改工具链与文档，不动 `core/`。
- AC12 的 hook 场景要用 `sh .githooks/pre-commit` 实测，不能只跑干净环境的 `npm run check`。
