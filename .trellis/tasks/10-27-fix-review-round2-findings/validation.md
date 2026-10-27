# 验收记录：12 处工具链偏差

## 起点

- 分支 `master`，审查范围 `527861a..HEAD`（`658f78a` 主体、`26dcb47` 归档、`9e58ebc` 索引修复）。
- 审查结论 12 条经逐条复现，全部属实；其中三条的实际位置与审查描述略有差异（记录在下方「复核修正」）。

## 复核修正

| 审查条目 | 修正 |
| --- | --- |
| Standards #1「`quality-guidelines.md:374` 写着 only archive verifies」 | 该行讨论的是 scope gate，不是命令清单；真正的缺口是 `### Execute, summarize and close` 的命令块只列了三条命令。两处都改了：命令块补 `validate`，段末句改成「archive 是唯一同时校验记录并移动任务的入口」。 |
| Standards #5「选择器靠 DOM 顺序碰巧点对」 | 当前 `.operation-bar` 里 `div.flat-button` 与内层 `a` 交替，`querySelectorAll` 的末位确实是 `<a>`，所以现在是「碰巧正确」而非「点错」。缺陷是这条规则没有写进选择器，DOM 一改就悄悄失效。 |
| Spec #5「validate_record 无条件 valid:true」 | 属实，但条件是 `load()` 抛 `Invalid`。新增的否定路径测试走的是 `validate()` 的字段级分支（`passed needs evidence`），与既有「AC id 不匹配」用例覆盖不同路径。 |

## 改动

| 文件 | 改动 |
| --- | --- |
| `sass-silence.config.mjs`（新增） | 导出 `sassSilenceDeprecations`，供两份 Vite 配置共用。 |
| `vite.config.ts`、`vite.config.prod.ts` | 引用共享常量，删除逐字重复的 7 行数组。 |
| `scripts/browser-preflight.mjs` | `INPUTS` 增加 `sass-silence.config.mjs`（否则配置改动不进指纹）；新增并导出 `DIALOG_ACTION_SELECTOR`，`dismissSimpleDialog` 通过 `evaluate` 第二参数传入。 |
| `scripts/tmp-report.mjs` | 四处 `catch` 改为收集 `readFailures`；人读与 `--json` 两路输出失败计数、按 reason 聚合与最多 5 条样本；文件头 docstring 说明读取失败不影响退出码。 |
| `scripts/archive-fallback.sh` | scope 规则改用 `git ls-files -z -- <rule>` 展开；匹配为空且固定前缀目录仍存在时打印 `warning: scope rule matched no tracked path: <rule>`；前缀已被 `task.py archive` 移走的空匹配属预期，静默跳过。 |
| `scripts/acceptance.py` | 无逻辑改动（`validate` 子命令已在上一轮落地）。 |
| `tests/browser-interaction-helpers.test.mjs` | 新增 1 例断言 `DIALOG_ACTION_SELECTOR` 的取值并确认它作为 `evaluate` 参数传入；用例总数 13 → 14。 |
| `scripts/test_acceptance.py` | 新增 `test_cli_validate_rejects_a_passed_check_without_evidence`；用例总数 38 → 39。 |
| `.trellis/spec/frontend/quality-guidelines.md` | 命令块补 `validate`；新增 `validate` 的 JSON 形状与退出码 0/2 说明；段末句改为「archive 是唯一同时校验并移动的入口」。 |
| `.trellis/spec/frontend/browser-acceptance.md` | `### 资源清理检查` 从 `## 4.5` 之后移到第 4 节正文末尾（行号 203 < 221 < 225）。 |
| `.trellis/spec/tooling/archive-fallback.md` | 按 `GIT_INDEX_FILE` 真因重写；给出 `scripts/test_scope_gate.py` 修复位置、`git update-index --force-remove` 的症状清理方式、glob 展开与空匹配告警。 |
| `.trellis/spec/tooling/tmp-hygiene.md` | 说明两个预算的分工、`--max-orphan-bytes` 的用途、读取失败的可见性与「不影响退出码」的理由。 |
| `.trellis/tasks/archive/2026-10/10-27-env-retro-followups/` | `design.md:34` 的 `validate` 描述按实现改（JSON + exit 0/2）；`design.md:43`、`implement.md:13` 的 `< 24000` 改 `< 32768`；`validation.md` 追加 hook 场景与 `9e58ebc` 归属两节。 |

## 验证

| 检查 | 命令 | 结果 | 日志 |
| --- | --- | --- | --- |
| AC1 + AC1b | `bash .tmp/r2-ac-checks.sh` | 12 项全 ok，`main()` 子命令集合 `{summarize, validate, archive, run}` 与 spec 一致 | `.tmp/r2-ac-checks.log` |
| AC2 | 同上 + `npm run check` | 两份配置引用同一常量，`sass-silence.config.mjs` 在 `INPUTS` 里，`DEPRECATION WARNING` 计数 0 | `.tmp/r2-check.log` |
| AC3 | `npm run tmp:report -- --json` | `readFailures: {count, reasons, sample}` 两路可见；临时把子目录 `chmod 000` 后得 `{"count":1,"reasons":["EACCES x1"]}`，退出码仍 0 | `.tmp/r2-tmp-report.log` |
| AC4 | `bash scripts/archive-fallback.sh 10-27-env-retro-followups --dry-run` | `core/**` 展开为 100 个已跟踪文件；`scripts/*.py` 展开为 9 个；空匹配告警逻辑用假 task.json 验证（`scripts/*.nomatch` 与 `core/**/*.nope` 都触发告警） | `.tmp/r2-archive-dryrun.log` |
| AC5 | `grep` 三处 | 常量导出、`querySelectorAll(selector)`、`}, DIALOG_ACTION_SELECTOR);` 均在 | `.tmp/r2-ac-checks.log` |
| AC6 | `node --test tests/browser-interaction-helpers.test.mjs` | 14 pass / 0 fail；把常量改回旧的宽松选择器后 13 pass / 1 fail | `.tmp/r2-helper-tests.log` |
| AC7 | `grep` spec | `GIT_INDEX_FILE`、`scripts/test_scope_gate.py`、`git update-index --force-remove` 均在，旧的「不要重建 index」表述已删 | `.tmp/r2-ac-checks.log` |
| AC8 | `grep` 归档任务 | `validation.md` 含 hook 场景与 `9e58ebc`；`design.md`/`implement.md` 的 `24000` 已全部改为 `32768` | `.tmp/r2-ac-checks.log` |
| AC9 | 行号比较 + `npm run check:docs` | `## 4.`(203) < `### 资源清理检查`(221) < `## 4.5`(225)；`check-docs: 45 md, 237 本地链接, 0 断链, OK` | `.tmp/r2-ac-checks.log` |
| AC10 | `python3 -m unittest discover -s scripts -p 'test_acceptance.py'` | 39 tests OK；把 `passed needs evidence` 那行注释掉后 2 failures（`0 != 2`） | `.tmp/r2-acceptance-tests.log` |
| AC11 | `grep` | `tmp-hygiene.md` 有 `--max-orphan-bytes`，归档 `validation.md` 有 `9e58ebc` | `.tmp/r2-ac-checks.log` |
| AC12 | `npm run check` + `sh .githooks/pre-commit` | 两次都 exit 0、都到 `check-docs: OK`、`DEPRECATION WARNING` 计数 0；hook 跑完 `git ls-files -s \| grep -c docs/readme` 为 0 | `.tmp/r2-check.log`、`.tmp/r2-hook.log` |

## 守卫可失败性

两条新增守卫都做了「改坏 → 变红 → 还原 → 变绿」：

- `test_cli_validate_rejects_a_passed_check_without_evidence`：注释掉 `passed needs evidence` 校验后 39 例中 2 例失败（`AssertionError: 0 != 2`），还原后 39 OK。
- `dismissSimpleDialog resolves actions through the documented selector`：把常量改成旧的 `.operation-bar a, .operation-bar .flat-button` 后 14 例中 1 例失败，还原后 14 OK。

## 未覆盖

- `archive-fallback.sh` 的提交分支仍未在真实归档失败场景执行；验证止于 `--dry-run` 与语法检查，与上一轮相同。
- `tmp-report.mjs` 的读取失败统计只用一个 `chmod 000` 目录验证过 `EACCES`，未覆盖文件在列举与 `stat` 之间消失（`ENOENT`）与 JSON 解析失败的组合。
- AC1b 的 grep 取 `scripts/acceptance.py` 里最后一处 `for name in (...)`——目前就是 `main()` 的子命令循环，若将来在该文件后面再新增同类循环，检查会取错目标。
