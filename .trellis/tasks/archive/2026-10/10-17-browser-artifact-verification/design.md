# 设计：浏览器验收证据校验

## 1. 边界与依赖

本子任务先交付四类护栏中的事实契约：扩展 `scripts/browser-preflight.mjs` 产物、在 `scripts/acceptance.py` 增加独立 `verify-browser` dispatch、增加 fixture/专项测试；不写 `acceptance.json`，不实现页面 bootstrap、scope gate 或 cleanup。父任务依赖本子任务的字段和失败分类更新共同 spec。

## 2. Artifact 契约

保留现有 `manifest.json`、`source.json`、`result.json`、identity、environment、fingerprint 和 `observed` 字段，增加向后兼容的 `artifactVersion: 1` 与 provenance。provenance 包含实际 URL、profile、viewport、可选 task space/page、artifactDir、`result: "result.json"`、source kind、build/loader/source hash、调用方显式声明的测试输入路径与 hash、run/round id 和生成时间。manifest 继续表示初始 `incomplete`，最终执行事实以 `result.json` 为准；verifier 检查两者的 run/round/artifact 关联，不把初始状态当最终状态。

## 3. Verifier 契约

命令为 `python3 scripts/acceptance.py verify-browser <artifact-dir>`。`withBrowserPreflight` 接受 repo-relative `scenarioInputs` 路径数组，新 artifact 要求至少一个输入；caller 路径不能越出仓库。verifier 读取 artifact 的 source/provenance，并重算当前源文件身份。EH/NH 对 `source.json` 指定的 bundle/loader 仓库路径重算 SHA-256；Vite 对初始 fingerprint 覆盖的每个仓库输入逐项重算并与记录值比较；所有 source kind 均重算 artifact 内 scenario input hash。路径必须在当前仓库内，越界、不可读、列表为空或 hash 变化均不 fresh。该设计避免另一个可能陈旧的对照文件。命令只读 artifact 和源文件，不修改 artifact 或 `acceptance.json`。

结构化输出包含 `valid/status/errors/artifact`；状态为 `passed`、`stale`、`blocked`、`legacy` 或 `invalid`。`observed=passed`、checks 已完成、errors 为空、unresolved 为空、manifest/result 关联完整、identity 满足 source-specific 契约且源 hash 仍一致，才可 `passed`。blocked/failed、未完成 checks、错误、unresolved、身份缺失/不一致均非通过，不能被报告文字升级。源变更为 `stale`；结构/路径非法为 `invalid`；缺少新增 provenance 的历史 artifact 为 `legacy`，不伪造 freshness。退出状态：passed 0，stale/blocked 1，invalid 2，legacy 3，由测试固定。

## 4. 兼容与测试

旧 acceptance schemaVersion 1 继续可读。fixture 覆盖 EH/NH/Vite、动态 host script、fresh/stale、blocked/failed/unresolved、legacy、identity 缺失和路径无效；现有 browser-preflight 测试继续验证原有日志、事件和产品断言。
