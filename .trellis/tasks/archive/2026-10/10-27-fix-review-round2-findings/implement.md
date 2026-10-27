# 执行计划

## 0. 准备

- 短通知（`notify-complete`）。
- 确认工作树干净、分支 `master`、`npm run check` 起点为绿。

## 1. Standards 六条（代码）

1. **R2 Sass 常量**：新建 `sass-silence.config.mjs`，导出 `sassSilenceDeprecations`；`vite.config.ts` 与 `vite.config.prod.ts` 引用它并删掉内联数组；把该文件加进 `scripts/browser-preflight.mjs` 的 `INPUTS`。
2. **R3 tmp-report 失败可见**：`scripts/tmp-report.mjs` 加 `readFailures` 收集器，四处 `catch` 记录 `{path, reason}`；人读与 `--json` 两路输出失败计数与前几条路径。
3. **R4 glob 展开**：`scripts/archive-fallback.sh` 的 `python3 -c` 段改为对每条 rule 先打 `__RULE__<rule>` 哨兵再 `git ls-files -- <rule>`；bash 侧对空匹配打 `warning: scope rule matched no tracked path: <rule>`。
4. **R5 选择器**：`scripts/browser-preflight.mjs` 加并导出 `DIALOG_ACTION_SELECTOR = '.operation-bar .flat-button.operation > a'`，`dismissSimpleDialog` 通过 `evaluate` 第二参数传入。
5. **R6 测试补选择器断言**：`tests/browser-interaction-helpers.test.mjs` 断言 `evaluate` 收到该常量。

## 2. Spec 六条（文档与测试）

6. **R1 validate 入 spec**：`quality-guidelines.md` 的 `### Execute, summarize and close` 补 `validate` 命令与语义；修正段末「only `acceptance.py archive` verifies it」的表述。
7. **R10 章节归位**：`browser-acceptance.md` 把 `### 资源清理检查` 移到 `## 4.5` 之前。
8. **R7 archive-fallback.md 归因**：按 `GIT_INDEX_FILE` 真因改写，给出 `scripts/test_scope_gate.py` 修复位置与 `git update-index --force-remove` 的症状清理方式。
9. **R11 validate 规格 + 否定路径测试**：`10-27-env-retro-followups/design.md` 的 CLI 描述按实现改；`scripts/test_acceptance.py` 加「passed 缺 evidence → exit 2」用例。
10. **R8/R9/R12 归档任务文档**：`10-27-env-retro-followups/validation.md` 补 hook 场景与 `9e58ebc` 记录；`design.md:43`、`implement.md:13` 的 `< 24000` 改 `< 32768`；`tmp-hygiene.md` 补 `--max-orphan-bytes` 说明。

## 3. 验证

```bash
node --test tests/browser-interaction-helpers.test.mjs
python3 -m unittest discover -s scripts -p 'test_acceptance.py'
npm run tmp:report
bash scripts/archive-fallback.sh --dry-run 10-27-env-retro-followups
npm run build-prod 2>&1 | grep -c 'DEPRECATION WARNING'   # 期望 0
npm run check
sh .githooks/pre-commit
```

`sh .githooks/pre-commit` 必须单独跑：它导出的 `GIT_INDEX_FILE` 与干净环境不等价，`9e58ebc` 证明过这条路径会挂。

## 4. 审批门

- 代码 + 测试全绿后跑一次 `trellis-check` 自检（README 与 spec 一致性、链接、脚本可执行位）。
- 回填 `acceptance.json`（12 条 check），`python3 scripts/acceptance.py summarize <task-dir>` 必须 `observedStatus: passed`。

## 5. 文档同步与提交

- 更新 `.trellis/spec/tooling/index.md`（若新增文件需登记）。
- 提交信息建议 `fix(tooling): 修复两轴审查指出的 12 处工具链偏差`。
- `task.py archive` 前 `task.py extend-scope` 声明 `scripts/**`、`tests/**`、`.trellis/spec/**`、`vite.config*.ts`、`package.json`、`sass-silence.config.mjs` 与归档任务路径。

## 回滚点

- 步骤 1、2 各自独立可回滚（新增文件 + 引用点）。
- 步骤 3 只影响兜底脚本的路径来源，回滚恢复原 `python3 -c` 段。
- 文档改动逐条可单独 revert。
