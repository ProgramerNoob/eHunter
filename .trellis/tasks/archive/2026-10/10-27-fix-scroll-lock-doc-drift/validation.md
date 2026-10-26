# 验收记录：去掉跳转锁文档的时长硬编码并补重钳制不写存储的守卫

## 结论

两条都已完成。决策文档不再含与实现绑定的时长字面量；`reclampThumbSizes` 不写持久化这条 MUST 有了函数体级守卫，且已证实能在违规时失败。

## 1. 文档去硬编码（AC1）

`.trellis/spec/frontend/decisions/2026-10-26-jump-scroll-lock.md` 改动：

| 位置 | 原文 | 现文 |
| --- | --- | --- |
| 问题节 | 「每页约 1316px」「390 宽下每页约 409px」「同时存在 2–3 页」 | 「宽视口常见」「窄视口常见」「会同时存在好几页，反算结果比视觉起始页偏后」 |
| 问题节 | 「用 800ms 平滑滚动」「50ms 采样触发」 | 「用 `animationTime` 定义的平滑滚动」「按固定采样间隔轮询」 |
| 机制节 | 「设为『动画时长 + 200ms 余量』」 | 「设为动画时长加一段余量」 |
| 已知边界 | 「需等锁自然到期（默认约 1s）」 | 「需等锁自然到期」 |

校验：`grep -nE "[0-9]+ ?(ms|px|s)\b|约 [0-9]"` 对该文件无匹配（exit 1）。

## 2. 守卫测试（AC2）

`tests/layout-model.test.cjs` 追加 `layout: reclamping must not persist the clamped size`：读 `core/store/app.ts`，用 `function reclampThumbSizes` 定位起点、下一个 `\n}` 定位函数体结束，断言函数体内不含 `persistCurrentModeLayoutPreference`。范围限定在函数体，因为同文件其它函数会合法调用该持久化函数。

## 3. 守卫可失败性（AC3）

临时在 `reclampThumbSizes` 的 `store.thumbViewHeight = nextHeight` 之后插入 `persistCurrentModeLayoutPreference()`：

- 注入后 `node --test tests/layout-model.test.cjs` → `✖ layout: reclamping must not persist the clamped size`，`pass 7 / fail 1`。
- 还原后 → `pass 8 / fail 0`。
- `git status --short core/` 输出 0 行，产品代码无残留改动。

## 4. 全量校验（AC4）

- `npm run test` → exit 0，日志 `.tmp/scroll-lock-doc-drift-test.log`（426 行，含 `tests 4 / pass 4` 与 `tests 8 / pass 8` 两组）。
- `npm run check:docs` → exit 0，`check-docs: 40 md, 6 yaml, 227 本地链接, 0 外链(仅记录), 70 $ref` / `check-docs: OK`，日志 `.tmp/scroll-lock-doc-drift-docs.log`。

## 未覆盖

- 未做浏览器验收：本任务无运行时行为改动，守卫是源码级断言。
- 「重钳制单向」本身仍只有 `10-26-fix-spec-reclamp-gaps` 的浏览器轮证据，没有单测；它依赖视口变化与 store 交互，属集成行为，不在本任务范围。
