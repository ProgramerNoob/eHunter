# 验收记录

对应任务 `10-27-env-retro-followups`：把会话复盘里 7 条环境改进落成仓库代码与文档。

## 改动范围

| 项 | 改动 |
| --- | --- |
| R1 `.tmp` 体积可见性 | 新增 `scripts/tmp-report.mjs` 与 `npm run tmp:report`；说明见 [临时产物体积报告](../../../spec/tooling/tmp-hygiene.md) |
| R2 浏览器交互 helper | `scripts/browser-preflight.mjs` 导出 `dispatchMouse`/`clickAt`/`clickElement`/`dragBy`/`dismissSimpleDialog`/`ensureTopBar`/`ensureThumbPanel`；测试 `tests/browser-interaction-helpers.test.mjs`（13 例） |
| R3 验收记录静态校验 | `scripts/acceptance.py` 新增 `validate` 子命令；`scripts/test_acceptance.py` 增加一致性用例 |
| R4 验收指南超限 | `browser-acceptance.md` 33850 → 25922 字节，拆出 `browser-acceptance/counting-assertions.md`、`preflight-assertions.md`、`resource-cleanup.md`，同步 `.pi/skills/reader-test/SKILL.md` 与 `.trellis/spec/tooling/index.md` 的锚点 |
| R5 Sass 警告去噪 | `vite.config.ts` / `vite.config.prod.ts` 加 `css.preprocessorOptions.scss.silenceDeprecations: ['color-functions', 'global-builtin', 'import']` |
| R6 未收口项收口 | `pending-work.md` 改为入口表，不再复述验收项 |
| R7 归档提交兜底 | 新增 `scripts/archive-fallback.sh`（`--dry-run`/`--dir`/`--message`）；说明见 [归档提交兜底](../../../spec/tooling/archive-fallback.md) |

## 逐项结果

全部 8 条 AC 通过。取证脚本一次性重跑（`.tmp/env-retro-run-all.sh`，日志 `.tmp/env-retro-run-all.log`），每条 AC 的详细日志见下表。

| AC | 结果 | 日志 |
| --- | --- | --- |
| AC1 `.tmp` 报告 | 默认预算 2.85 GiB 在 3 GiB 内 exit 0；`--max-bytes 1` → `FAIL .tmp is 2.85 GiB, over the 0.0 MiB budget` exit 1 | `.tmp/env-retro-tmp-report.log` |
| AC2 交互 helper | 13 pass / 0 fail（新测试）+ 155 pass / 0 fail（既有 preflight 测试） | `.tmp/env-retro-interaction-helpers.log` |
| AC3 `validate` 子命令 | 合法任务 rc=0（8 checks / 8 criteria / unrun）；删掉 AC8 覆盖后 `checks: uncovered ACs ['AC8']` rc=2 | `.tmp/env-retro-acceptance-validate.log` |
| AC4 验收指南体积 | 25922 字节 < 32768；check:docs 45 md / 237 链接 / 0 断链 | `.tmp/env-retro-spec-size.log` |
| AC5 Sass 静音 | build-prod 日志 `DEPRECATION WARNING` 计数 0（原 272 条）；产物 444.10 kB / gzip 143.98 kB | `.tmp/env-retro-sass-check.log` |
| AC6 `pending-work.md` | 五处入链均解析、6 个任务/规格指针存在、未复述验收项细节、check:docs 通过 | `.tmp/env-retro-pending-work.log` |
| AC7 归档兜底 | `bash -n` 通过；`--help` 与 `--dry-run` 正常；spec 记录触发场景与用法 | `.tmp/env-retro-archive-fallback.log` |
| AC8 全链检查 | `npm run check` exit 0；全链无 Sass 警告 | `.tmp/env-retro-check.log` |

## `.tmp` 实测数字

`npm run tmp:report` 在收尾时报告：`.tmp` 总计 2.85 GiB（3057026638 字节），被验收记录引用 524 个路径（其中 browser-preflight 1.82 GiB），`browser-preflight` 轮次 61 个，未引用 2 个（均 0.0 MiB）。这份数字只做基线，不代表清理结论。

## 未覆盖

- `archive-fallback.sh` 只验证了 `--dry-run`、`--help` 与语法，没有在真实归档失败场景下执行提交分支；该分支等价于两条显式 pathspec 的 `git add` / `git commit`。
- Sass 只是静音告警，`@import` 与 `lighten()`/`darken()` 的迁移不在本次范围，源码仍使用旧 API。
- `browser-acceptance.md` 拆分只动了章节归属与锚点，未重写内容；预检断言清单里的行号引用仍会随 helper 改动漂移。
