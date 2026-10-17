# 实施计划：浏览器验收证据校验

## 1. 契约与输入

1. 固定 `artifactVersion`、`provenance`、manifest/result 关联及 source path/hash 规则；逐项核对现有 `withBrowserPreflight` 的 EH/NH/Vite source identity，不删除旧字段。
2. 为本 child 声明 `meta.scope`，确认修改只覆盖 preflight、acceptance verifier、专项 fixture/测试和本任务证据。

## 2. 实现与测试

3. 在 `withBrowserPreflight` 增加 repo-relative `scenarioInputs` 参数并写入 input path/hash provenance；要求列表非空，覆盖 URL、profile/viewport、task space/page、source hash、run id 和时间。
4. 在 `scripts/acceptance.py` 增加 `verify-browser` parser/dispatch、JSON 错误输出和固定退出状态；不要求调用方另存 expected 文件，不写 acceptance check。
5. 对 EH/NH bundle/loader 与 Vite fingerprint 输入实现当前文件重算，校验仓库内路径、hash、identity 与语义状态。
6. 增加 fresh/stale、blocked/failed/unresolved、identity mismatch、EH/NH/Vite、动态 host script、legacy、path escape 和 unreadable source fixture。
7. 运行现有 `tests/browser-preflight.test.mjs` 及 verifier 专项测试，确认 schemaVersion 1 acceptance、旧 artifact 和既有命令不回归。

## 3. 收口

8. 保存 `.tmp/` 测试输出，核对 verifier 不修改输入；把字段、失败分类和调用示例交给父任务更新规范。
9. 固定本 child 的代码/测试版本后接受 review-only；发现跨子任务 dispatcher 冲突时停止并由父任务串行接线。

## 4. 验证命令

- `npm run check`（type-check + 全部测试 + build-prod + check:docs）
- `cd scripts && python3 -m unittest test_browser_artifact_verification`
