# 实施计划：EH/NH 验收技能合并为 reader-test

## 1. 规划收口门槛

1. 读取 [browser-acceptance.md](../../spec/frontend/browser-acceptance.md)、[quality-guidelines.md](../../spec/frontend/quality-guidelines.md) 与现有 `.pi/skills/eh-test/SKILL.md`，确认平台差异表与 `scripts/browser-preflight.mjs` 的 `kind: 'eh' | 'nh'` 契约一致。
2. `python3 ./.trellis/scripts/task.py validate .trellis/tasks/10-17-merge-eh-test-into-reader-test` 通过；`prd.md` 的 AC 与 `acceptance.json` 的 `criteria` 完全一致。
3. 用户批准后执行 `task.py start`；本计划本身不启动任务、不改技能、不跑浏览器。

## 2. 技能改名与参数化（单写者：技能目录）

4. `git mv .pi/skills/eh-test .pi/skills/reader-test`，确认 `ehunter-dev-loader.user.js` 原样保留（`@match` 已含 `https://nhentai.net/*`）。
5. 改 `SKILL.md` frontmatter：`name: reader-test`，description 覆盖 EH 与 NH。
6. 改"在 pi 中调用"：新增 `platform: eh|nh`（缺省 `eh`），给出四类示例，写明非法 `platform` 直接报错。
7. 插入平台差异表（见 [design.md](design.md#结构)），正文其余段的"EH"改为"EH 或 NH"。
8. `### 2. 准备 EH source` 改为平台无关标题，并给两份 `source` 代码块：
   - `kind: 'eh'`：保留 `loggedIn`、`/s/` 默认页、登录与静态脚本停用检查。
   - `kind: 'nh'`：`kind: 'nh'`，`installation` 只写 `dynamicLoaderEnabled`/`staticScriptDisabled`/`evidence`，明确"不要写 `loggedIn`"；页面要求 `/g/<id>/<page>/`；默认页 `https://nhentai.net/g/688467/1/`，不可访问时换可访问 gallery 并记录实际地址。
9. 功能清单按平台分支：NH 的原图/换源标 N/A（`isSupportOriginImg()`/`isSupportImgChangeSource()` 为 `false`），缩略图与页数/标题/当前页照常验证。
10. 准备段补 NH 专属约束：单次加载会话内完成、重试前冷却、429 与 Cloudflare 属准备阻塞或准备失败分类、第三方 `Uncaught (in promise)` 按来源归因。
11. 报告节改为 `.tmp/test-reports/reader-test-<platform>-<timestamp>.md`；更新 `${root}/.pi/skills/reader-test/ehunter-dev-loader.user.js` 路径。
12. `browser-acceptance.md#2-准备-eh-source` 等技能内锚点改为新标题。

## 3. 引用同步（单写者：文档引用）

13. 按 [design.md](design.md#引用更新清单) 逐文件改：`AGENTS.md`、`.trellis/spec/frontend/index.md`、`browser-acceptance.md`（`:5` `:9` `:29` `:110` `:246`）、`quality-guidelines.md:117`、`features/index.md:10`、三个 `quickstart.md`、`scripts/serve-bundle.mjs:2`、`scripts/cleanup_browser.py:4`。
14. 不触碰 `.trellis/tasks/archive/**` 与 `.tmp/` 历史证据；不做全库盲替换。

## 4. 静态验证

15. `grep -rn "skills/eh-test" . --include=*.md --include=*.json --include=*.mjs --include=*.py --include=*.ts | grep -v node_modules | grep -v "^./.tmp" | grep -v "/tasks/archive/"` 必须零输出，且 `test ! -d .pi/skills/eh-test`。
16. `npm run check:docs` 退出码 0（零断链、零坏锚点）。
17. 人工核对技能内相对链接（`../notify-complete/SKILL.md`、`ehunter-dev-loader.user.js`、`../../../.trellis/spec/frontend/browser-acceptance.md` 及其 `#fragment`）存在。
18. `npm run check`（type-check + 全部测试 + 生产构建）退出码 0，确认技能/文档改动没有意外影响；文档层改动不因此获得功能通过结论。

## 5. 浏览器真实验收（按改后的技能自身执行）

19. 按 [notify-complete](../../../.pi/skills/notify-complete/SKILL.md) 发短通知；读 `ego-browser` 技能与 `browser-acceptance.md`。
20. 执行改后技能的步骤 1（`npm run build-prod`）、bundle server 启动与核实、loader 安装副本核对。
21. `platform: nh`：用默认页 `https://nhentai.net/g/688467/1/`（不可访问时换其他真实 gallery 并记录实际地址）跑准备门（单一生产候选 + 指纹 + coverage + 严格环境）与首屏断言（标题、总页数、当前页），desktop profile 一次；记录实际 URL、gallery id 与时间。
22. `platform: eh`：一条既有 EH `/s/` 页进入准备门并完成打开/关闭，证明改名后 EH 路径未退化。
23. 受阻（Cloudflare/地区/登录/429）如实记 blocked，写清未执行范围；不以构建成功或 fixture 替代。

## 6. 报告、回填与收尾

24. 写 `.tmp/test-reports/reader-test-<platform>-<timestamp>.md`：时间、实际 URL、平台与范围、前提依据、逐项 passed/failed/blocked/unrun、截图路径、未验证项。
25. 主会话回填 `acceptance.json` 每条 check 的 `observed`/`execution`/`evidence`/`note`；`python3 scripts/acceptance.py summarize .trellis/tasks/10-17-merge-eh-test-into-reader-test` 核对。
26. 清理本轮 bundle server（PID 文件与端口释放核实），`acceptance.py cleanup-browser` 生成资源报告，保留交付证据。
27. 发长通知，提交（`docs(skill)` 或 `chore(skill)` 作用域），完成后归档。

## 7. 风险与回滚点

- 技能正文改动集中在单一文件：任一步中断都停留在可用状态（旧名称目录已移走、正文未改完时，先把 SKILL.md 补齐再停）。
- 锚点改名后立即跑 `check-docs`；断链则回退该小节标题与引用，不散着留半套命名。
- 真实 NH 页不可达：停在 AC5 blocked，不为了绿而删断言；回滚点仍是这次提交本身。
