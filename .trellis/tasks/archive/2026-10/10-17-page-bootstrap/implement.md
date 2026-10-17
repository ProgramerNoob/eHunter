# 实施计划：当前页面验收 bootstrap

## 1. 前置核对

1. 复核 `.trellis/spec/frontend/browser-acceptance.md` 的 task space、profile、事件消费和收尾规则；核对 `ReaderView.vue`、`AlbumScrollView.vue`、`AwesomeScrollView.vue`、`AlbumBookView.vue` 的当前 DOM 事实，但不修改这些产品文件。
2. 固定现有 `scripts/browser-preflight.mjs` 为 helper 承载位置，`tests/browser-preflight.test.mjs` 为 fixture 入口；为本子任务声明 `meta.scope` 后再启动 child。

## 2. 实现与测试

3. 实现 `bootstrapReader` 的 URL/task-space/profile 记录、reader open 观察、book/scroll mode 观察、真实 `.awesome-scroll-view` scroll metrics 和 page baseline 输出。
4. 接入正常 UI 的最小准备流程；保持 `withBrowserPreflight` 为唯一 `page.events()` consumer，串行执行页面动作，不清 storage、不注入 debug bridge。
5. 增加 persisted book/scroll、非起始页相对 delta、动态脚本/导航/初始化 blocked、desktop/mobile fixture；验证证据写入 `.tmp/` 且不把 unknown 变成 passed。
6. 用既有 preflight 测试和 helper 单元/fixture 测试验证接口；不启动真实站点压力测试。

## 3. 收口检查

7. 检查 helper 只改验收载具、fixture、skill/任务证据；确认 `core/` 和 `src/platform/**` 无改动。
8. 由父任务统一更新 browser acceptance/eh-test 文档，并在所有 child 完成后运行全量命令；本 child 不独占父任务文档收口。

## 4. 验证命令

- 本子任务 helper/fixture 专项测试（以实际载具脚本为准）
- `npm test`
- `npm run type-check`
- `npm run check:docs`
