# 验收记录：收紧检查流水线

## 环境

| 项 | 值 |
| --- | --- |
| 仓库 | `/Users/warwick/claude/eHunter`，分支 `master` |
| Node | v24.22.1（本机）；CI 为 Node 22 |
| Python | 3.13.14（本机）；CI 为 3.12 |
| 执行日期 | 2026-10-28 20:40–20:52 +08:00 |
| `.tmp` 现状 | 2.61 GiB（预算 3 GiB）；孤儿轮次 933.3 MiB（预算 2 GiB）；176 轮次 / 35 孤儿 |
| 浏览器 | 本任务不涉及 UI，未启动任何浏览器或本地服务 |

## AC1 — `.tmp` 预算进检查链

`bash .tmp/tighten-ac1.sh` exit 0，日志 `.tmp/tighten-ac1-run.log`。

| 断言 | 实测 |
| --- | --- |
| `npm run check` 全绿 | exit 0，539 行；`notice run ehunter@3.1.0 tmp:report` 在第 3 行、`check:syntax` 在第 19 行、`type-check` 在第 23 行 |
| 报告内容 | `.tmp total: 2.61 GiB`、`browser-preflight rounds: 176, orphan rounds: 35` |
| 超预算时链首即失败 | 预算改 1 KiB 后 exit 1，日志 19 行，直接以 `FAIL .tmp is 2.61 GiB, over the 0.0 MiB budget` 结束，无 `check:syntax` 与 `type-check` 启动记录 |
| 全新 clone 无 `.tmp` | `/tmp/ac1-empty` 下 exit 0，`tmpBytes 0`、`roundCount 0`、`readFailures {"count":0}` |
| 符号链接路径调用 | 经 `/tmp`（真实路径 `/private/tmp`）调用仍真正执行并打印 `.tmp total: 0.0 MiB` |

最后一条是本轮新发现的缺陷：旧守卫用 `resolve(process.argv[1]) === fileURLToPath(import.meta.url)` 比较，`/tmp` 与 `/private/tmp` 前缀不同即不相等，脚本静默空转且 exit 0。改为两侧 `realpathSync` 后修复。

## AC2 — 语法检查覆盖 `scripts/` 与 `tests/`

`bash .tmp/tighten-ac2.sh` exit 0，日志 `.tmp/tighten-ac2-run.log`。

| 场景 | 实测 |
| --- | --- |
| 正常仓库 | exit 0，`check-syntax: 23 files, 0 failed, 0 unreadable`，与 `find` 计数一致 |
| 注入语法错误 | `tests/zz-ac2-bad.test.mjs` 含 `const a = 1,,;` → exit 1，打印 `FAIL tests/zz-ac2-bad.test.mjs` 与 `SyntaxError: Unexpected token ','` |
| 恢复 | exit 0 + `check-syntax: OK`，临时文件已删除 |
| 根目录不可读 | `/tmp/ac2-unreadable` 的 `tests` 置 000 → exit 1，`FAIL tests` / `unreadable directory: EACCES` |
| 根目录缺失 | `/tmp/ac2-missing` 只有 `scripts` → exit 1，`unreadable directory: ENOENT` |

后两项是本轮新增：改动前 `catch { return; }` 使整个根目录不可读时收集到 0 个文件、打印 `0 files, 0 failed` 并 exit 0，即静默漏覆盖。

## AC3 — `tmp-report` 单元测试

`bash .tmp/tighten-ac3.sh` exit 0，日志 `.tmp/tighten-ac3-run.log`。

- `npm run test:tmp-report` exit 0，`ℹ tests 9 / pass 9 / fail 0`；`npm test` exit 0 且执行了 `notice run ehunter@3.1.0 test:tmp-report`。
- 覆盖场景：缺 `.tmp`（不记读失败）、无轮次、总量超预算、孤儿超预算、被引用轮次不计孤儿、不可读目录计入 `readFailures`、三条参数解析。
- 七条变异全部 KILLED：overBudget 恒 false、overOrphanBudget 恒 false、readFailures 不收集、exitCode 恒 0、引用判定恒 false、orphanBytes 恒 0、ENOENT 也记读失败。
- 「不可读目录」用例是本轮补的：豁免 ENOENT 后原有用例不再产生任何读失败，`readFailures 不收集` 变异一度存活，说明读失败统计当时没有任何用例保护。

## AC4 — 规范范围与导航

`bash .tmp/tighten-ac4.sh` exit 0，日志 `.tmp/tighten-ac4-run.log`。

- `npm run check:docs` exit 0：`45 md, 6 yaml, 240 本地链接, 0 外链(仅记录), 70 $ref` 与 `OK`（改动前 235 条本地链接）。
- 工具契约按实测校正：`acceptance.py --help` 只列 `summarize`/`validate`/`archive`/`run`/`verify-browser`/`cleanup-browser`；`acceptance.py set-meta` 被拒绝（exit 2）；`task.py set-meta` 存在。`tooling/index.md` 已删除把 `set-meta` 写成 `acceptance.py` 子命令的错误行，补上 `cleanup-browser`、归档委派失败退出 4、`tmp-report` 的两个独立阈值、`check-syntax` 的不可读/零文件失败条件。
- 注释规则范围：`quality-guidelines.md` 保留 `The comment ban covers src/ and core/ only.`；`AGENTS.md` 同步改为「不写注释（限 `src/` 与 `core/`，边界见质量规范）」，消除两处互相矛盾。
- 命令表补齐 `test:tmp-report`、`check:docs`、`check:syntax`、`tmp:report` 四行并改写 `npm run check` 一行。

## 用户审查提出的其余两条

- **#4 `tmp:report` 的位置**：已前置到 `check` 链首。理由记入 R1 与 `quality-guidelines.md`：0.25 s 就能拦住超预算，不必等 type-check、测试与构建全跑完才失败；AC1 第 2 条断言钉住了「超预算时不启动 type-check」。代价是本地 `.tmp` 超预算会让任何改动在链首失败，规范里写明处理动作是清理而非绕过。
- **#6 小问题**：PRD/implement 中「22 个文件」改为不写死数量（实际 23）；命令表补 `test:tmp-report`；`scripts/tmp-report.mjs` 的引用判定改为循环外展开 `referencedList` 一次；`tests/tmp-report.test.mjs` 的超预算用例只用几百字节，未引入 GiB 级真实字节。

## 复审提出的两处遗留

- **tmp-hygiene.md 与 check 行为脱节**：`tmp-hygiene.md` 首段从「供人工决定清理范围」改为「既是 `npm run check` 的首道门禁，也是人工清理范围的依据」；用法块下新增一段：`npm run check` 的首步即 `npm run tmp:report`，超预算会在 `check:syntax` 与 `type-check` 之前失败，全新 clone 或 CI 无 `.tmp/` 时按 0 字节通过。两份规范对同一工具的门禁地位现在一致。
- **`check:syntax` 移至链第二位**：`check` 改为 `npm run tmp:report && npm run check:syntax && npm run type-check && npm test && npm run build-prod && npm run check:docs`。0.5 s 的静态检查不再排在 `build-prod` 之后；`quality-guidelines.md` 新增一段写明它与 `tmp:report` 前置的理由相同，且只读仓库文件、不受本地 `.tmp` 状态影响。断言同步：AC1 第 1 条除 `tmp:report` 早于 `type-check` 外，还断言 `check:syntax` 早于 `type-check` 且晚于 `tmp:report`，并断言日志含 `check-syntax: N files, 0 failed, 0 unreadable`；第 2 条新增「超预算时不得有 `check:syntax` 启动记录」。

## 未验证范围

- 未在 Node 22 与 Python 3.12 上实跑（本机为 Node 24 / Python 3.13）；CI 配置未改动。
- 未验证 CI 环境（无 `.tmp`）下的链首报告输出，仅用 `/tmp/ac1-empty` 模拟。
- `check-syntax` 的「一个文件都没收集到」分支无实测样例：两个根目录都存在，删掉 `scripts/check-syntax.mjs` 自身后它已被收集，实际由 `ENOENT` 判失败覆盖。
