# 执行计划：补齐会话复盘提出的环境改进

## 前置

- 通知：开始测试前播放 notify-complete 短通知，收尾播放长通知。
- 本任务不改产品代码，验收以命令与文件证据为主，不需要浏览器轮次。

## 步骤

1. **R1 `.tmp` 报告**：新建 `scripts/tmp-report.mjs`，`package.json` 加 `tmp:report`。验证：`npm run tmp:report` exit 0；`npm run tmp:report -- --max-bytes 1` exit 1。
2. **R2 交互 helper**：`scripts/browser-preflight.mjs` 追加导出；新建 `tests/browser-interaction-helpers.test.mjs`，`package.json` 加 `test:browser-interaction` 并串入 `test`。验证：`npm run test:browser-interaction` exit 0，`npm run test:browser-preflight` 仍 exit 0。
3. **R3 `validate` 子命令**：`scripts/acceptance.py` 的 `main()` 增加子命令；`scripts/test_acceptance.py` 补断言（合法直通、缺字段拒绝）。验证：`npm run test:acceptance` exit 0；对一个真实任务跑 `validate` exit 0。
4. **R4 验收指南拆分**：新建 `.trellis/spec/frontend/browser-acceptance/preflight-assertions.md` 与 `resource-cleanup.md`，主文档改摘要 + 链接，更新 `.pi/skills/reader-test/SKILL.md` 与 `.trellis/spec/tooling/index.md` 的锚点。验证：主文件 < 32768 字节（`context_injection.max_file_bytes`）；`npm run check:docs` OK。
5. **R5 Sass 静音**：两处 Vite 配置加 `css.preprocessorOptions.scss.silenceDeprecations`。验证：`npm run build-prod` 日志无三类 `DEPRECATION WARNING`。
6. **R6 pending-work 收口**：重写 `pending-work.md`。验证：`npm run check:docs` OK，五处引用链接可解析。
7. **R7 归档兜底**：新建 `scripts/archive-fallback.sh`（可执行）+ `.trellis/spec/tooling/index.md` 新小节。验证：`bash scripts/archive-fallback.sh --dry-run <已归档任务>` 输出正常；`bash -n` 语法检查。
8. **收口**：`npm run check` exit 0；写 `validation.md`；回填 `acceptance.json` 后 `python3 scripts/acceptance.py summarize .trellis/tasks/10-27-env-retro-followups`；停止服务并清理临时产物；长通知。

## 验证命令

```bash
npm run tmp:report
npm run test:browser-interaction
npm run test:acceptance
npm run check:docs
npm run build-prod
npm run check
python3 scripts/acceptance.py validate .trellis/tasks/10-27-env-retro-followups
bash -n scripts/archive-fallback.sh
```

## 回滚点

每一步独立可回退；R4 拆分后若锚点断裂，先恢复主文档再改引用。
