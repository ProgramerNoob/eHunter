# 执行清单：NH 缩略图解析修复

> 顺序执行；每步留下可核对的实际输出。方案与根因见同目录 `design.md`。
> 状态：2026-09-20 完成；证据见 `.tmp/nh-thumb-src-parser/acceptance-20260920-0155.md` 与本组 `tasks.md` 的 T149/T113 记录。

## 1. 修复解析器

- [x] `src/platform/nh/parser/IntroHtmlParser.ts`：提取 `img = i.children[0]`，`thumbSrc = img.getAttribute('data-x-src') || img.getAttribute('x-src')`。
- [x] 构造函数中的 `replace(/src=/g, 'x-src=')` 保持不变。
- [x] 改动前后片段已记录（本次 diff `+6 −3`，仅此一处逻辑变更）。

## 2. 离线双输入验证（无需网络）

- [x] 真实 NH 页面 HTML：45/45 非空（实时 DOM 与原始抓取 HTML 各一遍），数量等于 `.gallerythumb` 数量。
- [x] 构造旧格式（`data-src`）HTML：3/3 取到 `data-src` 地址。
- [x] 同时含 `data-src` 与占位 `src`：3/3 取到 `data-src`，回退顺序正确。
- [x] 输入形态与输出记录于报告 §2；载具 `.tmp/nh-thumb-src-parser/harness.ts` 的 `real-page-html` 谓词已由写死 `t.nhentai.net` 改为 `.nhentai.net/` 匹配。

## 3. R4 证据核对（`ImgHtmlParser.ts:38`）

- [x] 真实图片页原始 HTML（`https://nhentai.net/g/631366/1/`，25622 字节，另存 `.tmp/nh-thumb-src-parser/nhentai-imagepage-631366-1.html`）：`#image-container img` 为 `src="https://i3.nhentai.net/galleries/3799533/1.webp"`，全页 `data-src=` 出现 0 次。
- [x] 结论：无同类缺陷 → 保持 `ImgHtmlParser.ts:38` 不动（`x-src` 改写路径取到上述地址；实时 DOM 的 `data-src` 为 null）。

## 4. 构建验证

- [x] `npm run type-check`：22 条既有错误，`src/platform/nh/parser/**` 0 条（整体清零由父任务 C2 负责）。
- [x] `npm run build-prod`：退出码 0，`dist/ehunter.iife.js` 445524 字节，sha256 `4adcb2735b9d8d1b9717a1b36e259ba8a3da97bb3202c66f3a07c3c81a52ab17`。
- [x] `dist/ehunter.iife.js` mtime `2026-09-20 01:48:34` 为本次构建，验收页面 loader 日志（433869 字符）与该产物一致。

## 5. 真实 NH 验收（T113，按 `.pi/skills/eh-test/SKILL.md`）

- [x] 测试开始前执行 notify-complete 短通知。
- [x] 打开真实 NH 图集（`nhentai.net/g/631366/1/`，45 页），注入本次构建产物，无初始化报错。
- [x] 侧栏缩略图：45/45 `img.complete && img.naturalWidth > 0`；截图。
- [x] 缩略图展开面板 45/45、页面预览 45/45；截图。
- [x] 书页模式 ↔ 卷轴模式切换：缩略图与阅读区均正常；截图。
- [x] 点击缩略图跳页并定位当前页：书页模式桌面 12/45、移动 15/45；滚动模式桌面 25/45。
- [x] 桌面 1200×900 与移动 390×844 关键交互完成；控制台无本次引入的报错与未捕获异常。
- [x] 未验证范围已记录（EH 侧、真实旧格式 NH 页面、其他 NH URL 形态、移动顶栏切换模式、429 长期行为）。

## 6. 收口

- [x] 回填 `001-platform-injection/tasks.md` 的 T149/T113 验收结果、各状态前言、`features/index.md` 差异表与 `pending-work.md` 当前状态注记。
- [x] 两处非阻塞观察已记录供 T148/导航范围使用（窄视口滚动模式跳页差 1 页；连续切换视口后滚动位置漂移）。
- [x] 资源清理：本轮未新建服务；bundle 服务（PID 71700，`127.0.0.1:8787`）为既有资源保持运行，证据保留在 `.tmp/nh-thumb-src-parser/`。
- [ ] 任务完成后执行 notify-complete 长通知。

## 回退点

- 修复仅一处属性回退，回退方式为还原 `IntroHtmlParser.ts` 中的 `thumbSrc` 单行；无数据迁移，无不可逆操作。
- 删除的临时文件仅限本次 `.tmp/` 产物，保留 `.tmp/nh-thumb-diagnosis.md` 证据。
