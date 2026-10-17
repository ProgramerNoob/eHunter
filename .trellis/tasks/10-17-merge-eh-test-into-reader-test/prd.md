# EH/NH 验收技能合并为 reader-test

## Goal

把只面向 EH 的 `.pi/skills/eh-test/` 验收技能改造为按平台参数化的 `reader-test` 技能，同一套构建、注入身份、准备门和证据流程同时覆盖 EH 与 NH；同步更新仓库内所有现存引用。不修改阅读器、平台产品代码和 `scripts/browser-preflight.mjs` 的既有契约。

## Background and constraints

- 现有 `.pi/skills/eh-test/SKILL.md` 的入口参数只有 `url` / `tests` / `mode`，默认页是 `https://exhentai.org/s/80813c92df/3482416-1`，source 固定 `kind: 'eh'`，要求 Ego 已登录 exhentai.org，报告固定写 `.tmp/test-reports/eh-test-<timestamp>.md`。
- NH 侧不需要 EH 登录态；`.trellis/spec/frontend/browser-acceptance.md:60` 已定义 `source.kind: 'nh'`，要求当前文档 URL 匹配 `https://nhentai.net/g/<id>/<page>/`。
- `scripts/browser-preflight.mjs:719-720` 已分别校验 EH `/s/` 页与 NH `/g/<id>/<page>/` 页；`:1045-1046` 中 NH 只要求 `dynamicLoaderEnabled` + `staticScriptDisabled`，EH 额外要求 `loggedIn`。准备门、bundle/loader 指纹、单一生产候选、coverage 逻辑对两者完全相同。
- `.pi/skills/eh-test/ehunter-dev-loader.user.js` 的 `@match` 已含 `https://nhentai.net/*`，`@connect` 已含 `nhentai.net`。新建独立 NH 技能会复制约 12 KB 的准备门与证据流程，两份必然分叉。
- `src/platform/nh/service/AlbumServiceImpl.ts` 的 `isSupportOriginImg()` 与 `isSupportImgChangeSource()` 均返回 `false`，`isSupportThumbView()` 返回 `true`：NH 的原图/换源验收项应为 N/A，不是失败。
- 仓库现存 `eh-test` 引用约 71 处，其中活跃文件（非 `archive/`）为：`.pi/skills/eh-test/SKILL.md`、`.trellis/spec/frontend/{index.md,browser-acceptance.md,quality-guidelines.md}`、`.trellis/spec/frontend/features/{index.md,001-add-pageflip-toggle/quickstart.md,001-add-pageview-magnifier/quickstart.md,002-more-settings-modal/quickstart.md}`、`AGENTS.md`、`scripts/serve-bundle.mjs`、`scripts/cleanup_browser.py`。`.trellis/tasks/archive/**` 属于历史记录，不改写。
- NH 站点会限流：反复重载会触发 429（`TextReq … : 429` → `Platform initialization failed`），`browser-acceptance.md:193` 已记录。技能必须要求单次加载会话内完成、重试前冷却，不得把 429 归为产品断言失败。
- NH 页面自带 `Uncaught (in promise)` 等第三方错误（`browser-acceptance.md:191`），按来源归因，不上升为产品失败。
- 不改 `scripts/browser-preflight.mjs` 与 `tests/browser-preflight.test.mjs`：其 EH/NH 契约已满足需要，本任务是技能与文档层改动。

## Requirements

- R1 技能重命名：目录 `.pi/skills/eh-test/` → `.pi/skills/reader-test/`，frontmatter `name: reader-test`，description 覆盖 EH 与 NH；loader 文件名 `ehunter-dev-loader.user.js` 保持不变（已同时匹配两端，改名只会增加引用噪声）。
- R2 平台参数化：技能新增 `platform: eh|nh` 入口参数（默认 `eh`），并给出平台差异表：入口 page 形态、`source.kind`、登录前置、默认 URL 获取方式、原图/换源支持、限流与第三方错误处理。
- R4 NH 链路：`kind: 'nh'` source 模板、`/g/<id>/<page>/` 准备门、不要求 `loggedIn`、默认页 `https://nhentai.net/g/688467/1/`（不可访问时选取其他可访问 gallery 并记录实际地址）、单次加载会话完成验收、429 冷却重试规则、原图/换源记为 N/A 而非 failed。
- R5 引用同步：更新 R 覆盖的活跃文件中的路径与名称引用；`archive/` 历史任务、`.tmp/` 历史证据不改。`scripts/check-docs.mjs` 只扫 `.trellis/spec/`，改完后 `npm run check:docs` 必须零断链。
- R6 报告与验收路径：报告改名为 `.tmp/test-reports/reader-test-<platform>-<timestamp>.md`；技能仍要求按通用指南回填 `acceptance.json`，并保留资源清理收尾步骤。
- R7 自洽：技能内部链接（notify-complete、`ehunter-dev-loader.user.js`、browser-acceptance 锚点）在改名后全部有效；`/skill:reader-test` 三类调用示例（含 `platform: nh`）可直接执行。

## Acceptance Criteria

- [AC1] `.pi/skills/reader-test/SKILL.md` 与 `.pi/skills/reader-test/ehunter-dev-loader.user.js` 存在，`eh-test` 目录已不存在；frontmatter `name`、description、`/skill:reader-test` 示例与平台参数说明一致，`platform: eh` 与 `platform: nh` 两条路径各自可读、无未定义字段。
- [AC2] 平台差异表事实正确：NH 不要求 `loggedIn`（对齐 `scripts/browser-preflight.mjs:1045`）、URL 形态对齐 `:720` 的 `/g/<id>/<page>/`、原图/换源 N/A 对齐 `src/platform/nh/service/AlbumServiceImpl.ts` 的 `isSupportOriginImg()` / `isSupportImgChangeSource()`。
- [AC3] 活跃引用全部更新：`.trellis/spec/frontend/{index.md,browser-acceptance.md,quality-guidelines.md}`、`.trellis/spec/frontend/features/{index.md,001-add-pageflip-toggle/quickstart.md,001-add-pageview-magnifier/quickstart.md,002-more-settings-modal/quickstart.md}`、`AGENTS.md`、`scripts/serve-bundle.mjs`、`scripts/cleanup_browser.py` 不再指向 `eh-test`；`archive/` 未被改动。
- [AC4] `npm run check:docs` 通过（零断链），`grep -rn "skills/eh-test"` 在活跃文件（排除 `.tmp/`、`.trellis/tasks/archive/`）零命中。
- [AC5] 真实平台证据：`platform: nh` 在真实 `https://nhentai.net/g/688467/1/`（默认页不可访问时换其他可访问 gallery 并记录实际地址）跑通准备门（单一生产候选 + 指纹 + coverage）与首屏断言，桌面 profile 至少一次；`platform: eh` 至少验证一条既有 EH 页仍能进入准备门。构建或真实页面受阻时如实记为 blocked 并说明下游未执行范围，不得以构建成功替代。
- [AC6] 报告与收尾：报告文件名符合 R6，资源清理步骤保留；本轮 server PID 文件清理、端口释放已核实。

## Out of scope

- 不改 `scripts/browser-preflight.mjs`、`tests/` 与 `.trellis/scripts/`。
- 不改阅读器 UI、`src/platform/**` 产品行为。
- 不重命名 loader 文件，不改 `.pi/settings.json`（技能发现走目录扫描，无需登记）。
- 不改写 `.trellis/tasks/archive/**` 的历史记录。
- 不做 NH 下载链路冒烟、429 长期稳定性测试或多浏览器矩阵。
