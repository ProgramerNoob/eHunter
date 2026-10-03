# 父任务交付说明：NH 缩略图修复 + type-check 基线（2026-10-03）

## 验收结论

| 父任务 AC | 状态 | 证据 |
| --- | --- | --- |
| C1 与 C2 各自验收标准全部通过 | 通过 | C1：`.trellis/tasks/archive/2026-09/09-20-nh-thumb-src-parser/`（含 NH 验收记录）；C2：`.tmp/typecheck-dead-code-cleanup/acceptance-report.md`、`check-round2-verification.md` |
| 父任务级集成检查：`npm run type-check` 退出码 0 且真机 NH 缩略图仍可见 | 通过 | `.tmp/typecheck-dead-code-cleanup/integration/acceptance-nh-integration-2026-10-03.md` |
| `pending-work.md` 与相关历史 tasks 状态按实际结果回填 | 通过 | `pending-work.md` 新增 2026-10-03 状态说明；翻页 T033、下载 T033、更多设置 T037 已勾选并写入结果 |
| 交付说明区分已验证/未验证范围并记录证据路径 | 通过 | 本文件 |

集成检查在被测版本上的实测（两次提交 `3299da9` + `655e054` 合并后的 HEAD）：

- `npm run type-check` 退出码 0、0 错误；`npm run build-prod` 退出码 0，`dist/ehunter.iife.js` 445526 字节（sha256 `3ea2726bfbb57d6f0c66bd74ee861eb4693f514ff1d404abb62a88f7c4c276a3`）。
- NH 图集 `https://nhentai.net/g/631366/2/`（45 页）：45 张缩略图全部 `complete && naturalWidth > 0`、空 src 0；点击第 20 张跳页（当前页 2 → 20，scrollTop 1407 → 25340）；书页/卷轴双向切换正常（45 ⇄ 14 个 `section.page-view`）；桌面 1200×900 与移动 390×844 截图与控制台记录齐全。

## 已验证范围

- NH 链路：缩略图地址解析（C1）、缩略图加载与点击定位、阅读模式切换、桌面/移动双视口（C2 集成轮）。
- EH 链路：本任务的改动（删除无引用文件、TopBar 类型注解）不触及 `src/platform/eh/` 现役代码；EH 行为未在本轮回归。
- 静态检查：`npm run type-check`、`npm run build-prod`。
- TopBar（`core/components/TopBar.vue`）显隐与重叠隐藏行为在桌面/移动下的实测。

## 未验证范围

- **EH 未回归**：删除的 6 个文件中 `src/platform/eh/index.ts`、`src/platform/eh/service/AlbumCacheService.ts`、`AlbumServiceImpl.old.ts` 均无 import 引用，EH 现役链路走 `src/platform/eh/service/AlbumServiceImpl.ts`；本轮未在 EH 阅读页实机复测。
- NH 移动端为 CDP 设备模拟（`mobile:false` + 触摸 + DPR3），非真机。
- NH 验收期间遭遇站点 429 限流（重复重载触发），集成轮为限流恢复后的单次加载会话，未做多轮重载压力验证。
- 未做修复前后像素比对（TopBar 改动为纯类型注解，产物中无 `CSSProperties` 运行期代码）。

## 遗留观察（不阻断交付）

- nhentai 图集 HTML 自带双后缀缩略图地址（站点内实测 49 处 `.webp.webp`），非 eHunter 解析缺陷；已记入 `.trellis/spec/frontend/browser-acceptance.md` 的计数与来源判定小节。
- `core/App.vue:75` 的 `ThumbScrollView` 为未使用 import（实际渲染在 `core/components/ReaderView.vue:12`），既有代码，未在本次改动。
- Tampermonkey 现状：`eHunter (dev loader) 1.0.2` 启用、静态 `eHunter 3.1.0` 禁用，按用户决定保留，便于后续本地迭代。

## 证据位置

- `.tmp/typecheck-dead-code-cleanup/`：C2 静态检查日志、TopBar diff、文档 diff、浏览器验收截图与 `browser-events.jsonl`。
- `.tmp/typecheck-dead-code-cleanup/integration/`：父任务集成轮记录、`serve-bundle.log`、桌面与移动截图、`browser-events.jsonl`。
- `.tmp/nh-thumb-src-parser/`：C1 NH 验收记录。

注意：`.tmp/` 在 `.gitignore` 中（`.gitignore:44`），上述证据只存在于本地工作区，不随提交分发。
