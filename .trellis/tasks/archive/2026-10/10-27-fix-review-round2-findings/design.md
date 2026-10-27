# 设计：12 处工具链偏差的落点

## 边界

只碰工具链与文档：`scripts/**`、`tests/**`、`.trellis/spec/**`、`vite.config*.ts`、`package.json`，以及归档任务目录里的 `validation.md`/`design.md`/`implement.md`。不碰 `core/`、`src/`，不碰 `.trellis/scripts/**`。

## R1 validate 入 spec

`scripts/acceptance.py` 的 `main()` 用 `for name in ("summarize", "validate", "archive", "run")` 注册子命令，`validate_record()` 复用 `validate()` 后返回 `{valid, task, checks, criteria, counts, observedStatus}`，失败时 `load()` 抛 `Invalid` 走 `except` 分支返回 `valid:false` + exit 2。

`quality-guidelines.md` 的 `### Execute, summarize and close` 段现在只有 `run`/`summarize`/`archive` 三条命令。补一条 `validate`，并说清它与 `archive` 的分工：

- `validate` 只读，不写回、不委派、不移动目录；
- 退出码 0 = 记录自洽，2 = 记录不自洽（与 `summarize` 的 2 同义）；
- `archive` 内部的记录校验是唯一把门禁与归档绑在一起的地方，`validate` 只是提前自检。

顺便修正同段末句：现在写「only `acceptance.py archive` verifies it」，与新增的 validate 冲突，改为「`archive` 是唯一在归档路径上强制校验的入口，`validate` 提供同一套校验的只读预检」。

## R2 Sass 静音常量

新增 `sass-silence.config.mjs`（仓库根，与 `vite.config.ts` 同级），导出：

```js
export const sassSilenceDeprecations = ['color-functions', 'global-builtin', 'import'];
```

两份配置都 `import { sassSilenceDeprecations } from './sass-silence.config.mjs'`，`css.preprocessorOptions.scss.silenceDeprecations` 直接引用。

选 `.mjs` 而不是 `.ts`：`vite.config.ts` 由 esbuild 转译，`.ts` 常量文件也可以，但 `scripts/browser-preflight.mjs` 的 `INPUTS` 指纹需要能读到——`.ts` 同样能读，只是 `.mjs` 让「这份文件同时被构建配置和 Node 脚本消费」更直白。**必须**把新文件加进 `scripts/browser-preflight.mjs` 的 `INPUTS` 数组，否则构建配置变化不会被指纹捕获，`verify-browser` 会放过旧产物。

## R3 tmp-report 吞异常

现状 `walkFiles`/`referencedTmpPaths`/`directorySize`/`roundEntries` 四处 `catch {}` 全静默。改法：

- 加模块级 `const readFailures = []`，每个 `catch (error)` 里 `readFailures.push({ path, reason: error.code ?? error.message })`；
- 报告末尾（人读版与 `--json` 版都）输出 `readFailures.length` 与按 reason 聚合的前几条路径；
- 退出码语义不变（仍只由预算决定），失败计数只在报告里可见——因为读取失败不该让「预算内」误报成超预算，但必须让人看见。

`statSync` 竞态（文件在列举与 stat 之间消失）也记进去，不区分。

## R4 archive-fallback glob 展开

现状 `rule[:-3] if rule.endswith('/**') else rule` 只处理 `dir/**`。改为用 `git ls-files -- <rule>` 展开，失败或空结果时打印 `warning: scope rule matched no tracked path: <rule>`。

先试不引入外部依赖的方案：Python 侧用 `glob.glob(rule, recursive=True)`，但 `glob` 不懂 git 忽略规则，会把 `.tmp/` 这类未跟踪文件也展开。**用 `git ls-files`** 更贴合「提交范围」的语义，而且脚本本来就在 git 仓库里跑。

具体：把 `python3 -c` 那段扩展为对每条 rule 先 `print` 一条哨兵 `__RULE__<rule>`，再 `subprocess.run(['git', 'ls-files', '--', rule])` 输出匹配路径。bash 侧解析时，`__RULE__` 后无后续路径的即视为空匹配，打警告。

（`**` 在 `git ls-files` 的 pathspec 里是 glob，`dir/**` 与 `scripts/*.py` 都能展开。）

## R5 dismissSimpleDialog 选择器

加常量：

```js
const DIALOG_ACTION_SELECTOR = '.operation-bar .flat-button.operation > a';
```

`page.evaluate` 改成接收参数：`page.evaluate((selector) => { … querySelectorAll(selector) … }, DIALOG_ACTION_SELECTOR)`。选中最后一个。保留 `rect.width === 0 || rect.height === 0` 的判空。

依据：`core/components/widget/SimpleDialog.vue` 的 `flat-button.operation` 通过 Vue fallthrough 落到 `div.flat-button.inline.operation`，内层是 `<a>`；`counting-assertions.md` 记录的就是「点外层 `.flat-button` 无效」。

## R6 helper 测试补选择器断言

`PageFixture.evaluate` 已经记录 `{ method: 'evaluate', argument }`。给 `dismissSimpleDialog` 的用例加断言：`page.calls.filter(c => c.method === 'evaluate').some(c => c.argument === DIALOG_ACTION_SELECTOR)`。

为了让测试拿到常量，从 `browser-preflight.mjs` 一并导出 `DIALOG_ACTION_SELECTOR`（`dismissSimpleDialog` 已导出，常量跟着走不增加 API 面）。这条断言的价值：有人把选择器改回 `.operation-bar a, .operation-bar .flat-button` 时测试变红。

## R7 archive-fallback.md 归因改写

删掉「对象从未存在于仓库…属于索引与工作树之外的历史残留，不要为了『修好』去重建 `.git/index`」这段，改为：

1. 真因：`.githooks/pre-commit` 导出 `GIT_INDEX_FILE`，fixture 仓库的 `git add -A` 把文件写进外层 index；
2. 修复位置：`scripts/test_scope_gate.py` 的 `ScopeGateFixture.setUp()` 弹出全部 `GIT_*` 并在 `addCleanup` 复原；
3. 症状清理：定位到幽灵条目后 `git update-index --force-remove <path>` 即可，无需重建 index；
4. 兜底脚本仍是收尾手段，但先确认不是 hook 污染复现。

## R8/R9 归档任务文档

- `10-27-env-retro-followups/validation.md` 追加一节「pre-commit hook 场景」，记录：`658f78a` 交付时 AC8 只在干净环境跑过；`9e58ebc` 证明了 hook 环境与干净环境不等价；现在 AC12 覆盖两者。
- `design.md:43` 与 `implement.md:13` 的 `< 24000` 改为 `< 32768`，与 `prd.md:33` 的 AC4 一致，并注明实际 25922 字节。

## R10 章节归位

`browser-acceptance.md` 现在层级是 `## 4. → ## 4.5 → ### 资源清理检查 → ## 5.`。资源清理原本属第 4 节，拆文档时被接在 4.5 之后。改为：`### 资源清理检查` 移到 `## 4.5` **之前**（紧跟 `## 4. 证据、截图和失败回填` 的正文），锚点 `### 资源清理检查` 不变，`resource-cleanup.md` 里的相对链接不受影响。

`check:docs` 只验证链接可解析，验证不了层级，所以 AC9 用文本顺序断言（`## 4.` 的行号 < `### 资源清理检查` 的行号 < `## 4.5` 的行号）。

## R11 validate 规格与否定路径测试

- `design.md` 里原写「只打印 `OK: <n> checks` 或 `Invalid` 文案，退出码 0/1」，实现是 JSON + exit 2。以实现为准改规格：stdout 是单个 JSON 对象，退出码 0/2，与 `summarize` 对齐。
- `test_acceptance.py` 加一条：`observed: passed` 但 `evidence: []` → `validate` exit 2 且错误含 `passed needs evidence`。这条走的是 `validate()` 的字段级分支，与已有的「AC id 不匹配」路径不同。

## R12 范围申报补记

- `.trellis/spec/tooling/tmp-hygiene.md` 补一段：`--max-orphan-bytes` 只统计 `browser-preflight` 轮次目录、默认 2 GiB，用于把「总量达标但这批轮次已无引用」单独暴露出来。
- `10-27-env-retro-followups/validation.md` 追加 `9e58ebc` 的记录：不在原 PRD 七项内，来源是 AC12 的 hook 场景暴露，作为补救提交单独实施。

## 兼容性与回滚

- R2 新增一个仓库根文件；回滚 = 删文件 + 两处 `import` 与 `css` 块还原。
- R4 改变兜底脚本的路径来源；回滚 = 恢复原 `python3 -c` 段。脚本只用显式 pathspec，展开多出路径也不会误提交无关文件。
- R5 改变选择器；若未来 SimpleDialog 的 DOM 结构变化导致选不中，`dismissSimpleDialog` 返回剩余计数 > 0，调用方能立刻发现（不会静默失败）。
- R10 移动的是小节位置，`check:docs` 会验证链接，锚点文本未变。

## 验证

- `npm run check`（type-check + test + build-prod + check:docs）
- `sh .githooks/pre-commit`（带 hook 环境）
- `npm run tmp:report`、`bash scripts/archive-fallback.sh --dry-run <slug>`
- `python3 -m unittest discover -s scripts -p 'test_acceptance.py'`
- `node --test tests/browser-interaction-helpers.test.mjs`
