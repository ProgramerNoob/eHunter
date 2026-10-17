# 浏览器验收证据校验

## Goal

为浏览器预检产物增加新鲜度与结果语义一致性校验，并保留历史验收兼容。

## Background and constraints

- `scripts/acceptance.py` 的 acceptance schemaVersion 1 固定要求 `schemaVersion`、`criteria`、`checks`，且由主会话作为唯一写入方；文件可读不代表证据真实或语义等价。
- `scripts/browser-preflight.mjs` 已生成 `manifest.json` 与 `result.json`，包含运行状态、环境、身份和 source fingerprint 事实；不能将其 blocked/failed 状态由人工 acceptance 文字覆盖为 passed。
- 历史 artifact 缺少新 provenance 时必须能继续读取并明确报告 legacy，不静默升级为 fresh passed，也不破坏既有 EH/NH/Vite preflight。

## Requirements
- R1 preflight artifact 记录稳定 provenance：build/loader/source hash、非空的调用方声明 scenario/test inputs 与 hash、有效 URL、viewport/profile、task space/page（调用方提供时）、artifact 目录、`result.json` 关联及生成时间。
- R2 提供独立入口 `python3 scripts/acceptance.py verify-browser <artifact-dir>`，由 acceptance 侧读取 manifest/result/source 并重算当前 build/loader/source 及 scenario/test input freshness；preflight 仍只生成事实证据，不导出或写入 acceptance check。
- R3 verifier 检查 `observed`、`checks`、`errors`、`eventCollection.unresolved` 与 source-specific identity；`blocked`、`failed`、未完成检查、未解决事件、未声明 scenario inputs 或身份不一致均不得归为 fresh passed。
- R4 当前产物与对照一致时可判定 fresh；输入变化能明确判 stale，并指出不匹配事实。校验结果不修改 artifact 或 `acceptance.json`。
- R5 缺少 provenance 的历史产物返回 legacy/需回填诊断，不补造新鲜度或通过结论；acceptance schemaVersion 1 既有记录继续可读。
- R6 EH、NH、Vite source kind、动态 host script 与身份边界均有自动化 fixture 覆盖，不重新实现 browser-preflight 已有日志归因或产品断言。

## Acceptance Criteria

- [AC1] verifier 能将 `observed: blocked` 或 `observed: failed` 的 artifact 判为非通过；acceptance/report 中的 passed 不能升级该结果。
- [AC2] `checks` 未执行、`errors` 非空、`eventCollection.unresolved` 非空、scenarioInputs 缺失/为空或 source-specific identity 缺失/不匹配时，verifier 给出可定位的非通过结果。
- [AC3] build/loader/source 与非空 scenarioInputs 对照相符的 fixture 可通过；任一被跟踪输入变化后旧 artifact 明确判 stale。
- [AC4] 缺少 provenance 的历史 fixture 明确标为 legacy/需回填，现有 schemaVersion 1 acceptance 记录仍可解析。
- [AC5] EH/NH/Vite 与动态 host script 相关 fixture 覆盖必要 source identity 情况，既有 `tests/browser-preflight.test.mjs` 不回归。

## Out of scope

- 不把 acceptance schema 写入 `browser-preflight`，不自动改写 `acceptance.json`。
- 不改 reader/platform 产品行为、浏览器 UI、产品断言或真实站点压力测试。
- 不重做已有日志归因、身份采集和 event collection 机制。
