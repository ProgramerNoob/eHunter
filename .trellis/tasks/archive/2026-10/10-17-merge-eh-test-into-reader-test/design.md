# 设计：EH/NH 验收技能合并为 reader-test

## 边界

- 改动范围：`.pi/skills/reader-test/`（新建，来自 `.pi/skills/eh-test/` 的 `git mv`）、活跃文档引用、`AGENTS.md` 一处、`scripts/serve-bundle.mjs` 与 `scripts/cleanup_browser.py` 的注释路径。
- 不改：`scripts/browser-preflight.mjs`、`tests/`、`src/`、`core/`、`.trellis/tasks/archive/**`。
- 技能是操作说明，不是代码：平台差异用表格与分支段落表达，不为两种平台各复制一份完整流程。

## 结构

`reader-test` 保留 eh-test 的既有骨架，只做参数化：

1. frontmatter：`name: reader-test`，description 写明"验证 eHunter 在 EH（exhentai.org）与 NH（nhentai.net）的生产包端到端行为"。
2. 调用示例：`/skill:reader-test`、`/skill:reader-test platform: nh`、带 `url` / `tests` / `mode` 的组合。参数解析新增 `platform`，缺省 `eh`；非法值直接报错，不猜。
3. 平台差异表（单一事实来源，正文其余部分只引用该表）：

| 项 | `platform: eh` | `platform: nh` |
| --- | --- | --- |
| 页面形态 | `/s/<hash>/<gid>-<page>` | `/g/<id>/<page>/` |
| `source.kind` | `'eh'` | `'nh'` |
| 登录前置 | Ego 已登录 exhentai.org，`installation.loggedIn === true` | 不需要 `loggedIn` |
| 必填 installation 字段 | `loggedIn`、`dynamicLoaderEnabled`、`staticScriptDisabled` | `dynamicLoaderEnabled`、`staticScriptDisabled` |
| 默认页 | `https://exhentai.org/s/80813c92df/3482416-1` | `https://nhentai.net/g/688467/1/`；不可访问时现场选取其他 `/g/<id>/1/` 并记录实际地址 |
| 原图/换源 | 平台支持时验证 | N/A（`isSupportOriginImg()`/`isSupportImgChangeSource()` 为 `false`） |
| 主要准备阻塞 | 登录页 / 403 / Sad Panda | Cloudflare 挑战、地区封锁、429 |

4. 无差异的公共段（准备、构建、bundle server、准备门、`runChecks`、报告、收尾）原文保留，只把"EH"措辞改为"EH 或 NH"，并把 `source` 模板按平台分支给出两份代码块——两者仅 `kind` 与 `installation` 字段不同，其余字段名一致。

## 契约

- 准备门字段名不变：`source = { kind, bundlePath, loaderPath, bundleUrl, build, installation }`。NH 的 `installation` 允许省略 `loggedIn`，但 `loggedIn` 若给出 `false` 会增加不必要的失败——技能明确写"NH 不要写 `loggedIn`"，避免调用方照抄 EH 模板。
- 报告命名：`.tmp/test-reports/reader-test-<platform>-<timestamp>.md`。旧名 `eh-test-<timestamp>.md` 不再生成新文件，历史报告不迁移。
- 任务空间名保持"eHunter 验收"不变（通用指南规定），不按平台新建空间。
- 硬编码 bundle URL `http://127.0.0.1:8787/ehunter.iife.js` 与 loader 路径 `${root}/.pi/skills/reader-test/ehunter-dev-loader.user.js` 同步更新；`PORT` 覆盖与 loader 安装副本核实规则不变。

## 引用更新清单

| 文件 | 改动 |
| --- | --- |
| `AGENTS.md:31` | 链接与技能名改为 `reader-test`，措辞从"EH 场景"改为"EH/NH 场景" |
| `.trellis/spec/frontend/browser-acceptance.md` | `:5` `:9` `:29` `:110` `:246` 的 `eh-test` → `reader-test`，`#2-准备-eh-source` 锚点改为新的小节标题（如"#2-准备-source"），并补 NH 一句 |
| `.trellis/spec/frontend/index.md:22,40` | 链接与"EH testing"标签改为"EH/NH production-bundle testing" |
| `.trellis/spec/frontend/quality-guidelines.md:117` | 路由表链接改为 reader-test，覆盖 EH 与 NH |
| `.trellis/spec/frontend/features/index.md:10` | 链接改为 reader-test |
| `features/001-add-pageflip-toggle/quickstart.md:7,39` 等 3 个 quickstart | 链接与"补验 NH"表述合并为"按 reader-test 在 EH 与 NH 分别验证" |
| `scripts/serve-bundle.mjs:2` | 注释路径改为 `.pi/skills/reader-test/ehunter-dev-loader.user.js` |
| `scripts/cleanup_browser.py:4` | docstring 路径改为 `.pi/skills/reader-test/SKILL.md` |

## 风险与回滚

- 锚点变更导致 `check-docs` 断链：改动同一次提交内完成，以 `npm run check:docs` 为准。
- 重命名后用户既有习惯调用 `/skill:eh-test` 失效：调用会找不到技能，属于预期；本轮不保留兼容别名（目录级别名会引入两份正文）。
- 沿用旧 `eh-test` 名称的存档任务指向不存在路径：`archive/` 明确排除，且 `check-docs` 不扫 `archive/`。
- 真实 NH 页面不可达（Cloudflare/地区）：AC5 记为 blocked 并停在该处，不降级为 fixture。
- 回滚点：单次提交，`git revert` 即可整体还原（含 `git mv` 反向改名）。
