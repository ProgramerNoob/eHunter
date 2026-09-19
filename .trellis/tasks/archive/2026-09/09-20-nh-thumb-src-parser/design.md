# 技术设计：NH 缩略图地址解析

## 根因

`src/platform/nh/parser/IntroHtmlParser.ts` 的两行形成自相矛盾的配对：

| 位置 | 代码 | 效果 |
| --- | --- | --- |
| `IntroHtmlParser.ts:13` | `this.html.innerHTML = html.replace(/src=/g, 'x-src=')` | 把 HTML 里每一处 `src=` 文本改写成 `x-src=`，避免解析时触发资源加载 |
| `IntroHtmlParser.ts:23` | `i.children[0].getAttribute('data-x-src')` | 只读 `data-x-src` |

关键机制：正则匹配的是**子串** `src=`，因此旧格式属性 `data-src="url"` 中的 `src=` 也被命中，被改写成 `data-x-src="url"`。也就是说 `getAttribute('data-x-src')` 原本读取的是**旧 NH 页面 `data-src` 的值**。

当前 NH 页面已改为直接使用原生 `src`（无 `data-src`，懒加载交给 `loading="lazy"`），于是 `src=` 被改写成 `x-src=`，而 `data-x-src` 不存在，`getAttribute` 返回 `null`。45 项 `ThumbInfo.src` 全为 `null`，`<img>` 无有效地址。

## 修复方案

在 `IntroHtmlParser.ts:23` 增加单属性回退，保留旧格式读取优先级：

```ts
const img = i.children[0]
const thumbSrc = img.getAttribute('data-x-src') || img.getAttribute('x-src')
```

- 旧格式页面：`data-x-src` 命中，行为与修复前完全一致。
- 当前页面：`data-x-src` 为 `null`，回退到 `x-src`（即改写后的原生 `src`），取到真实缩略图地址。
- 顺序不可颠倒：两种属性同时存在时应取 `data-src`（真实地址），而非 `src`（可能的占位图）。

不改动第 13 行的 `replace`：它同时承担“阻止解析期加载资源”与“把真实地址搬进安全的 `x-src` 属性”两个职责，去掉会引入副作用。

## 数据流与影响面

`IntroHtmlParser.getThumbInfos()` → `src/platform/nh/service/AlbumServiceImpl.ts:133` → `core/store/app.ts:2216,2218` 写入 `store.thumbInfos` → 四个消费点同时恢复：

| 消费点 | 位置 | 表现 |
| --- | --- | --- |
| 侧栏缩略图 | `core/components/ThumbView.vue:8` | 缩略图空白 |
| 缩略图滚动视图 | `core/components/ThumbScrollView.vue:89` | 同上 |
| 缩略图展开面板 | `core/components/dialog/ThumbExpandDialog.vue:52` | 与 T113 相关 |
| 页面预览 | `core/components/PageView.vue:13` | 同上 |

因为 `store.thumbInfos` 是唯一数据源，单点修复即可覆盖四处；无需改组件。

## 兼容性与风险

- **旧格式兼容**：回退顺序保证旧页行为不变，可用构造 HTML 离线验证，无需真实旧站点。
- **地址形态**：NH 缩略图地址为协议相对形式（`//t.nhentai.net/...`）。渲染发生在页面文档内，按文档 base URI 解析；证据显示临时回填后 `naturalWidth=400`，加载正常，因此不做 `https:` 归一化（YAGNI）。若验收发现加载失败再评估。
- **回退顺序错误的风险**：若某页面同时存在 `data-src` 与 `src` 且前者为占位、后者为真实地址，回退顺序会导致取到占位图——由 R1 的双输入验证覆盖（构造成对属性输入断言取值）。
- **共享代码**：`IntroHtmlParser.ts` 与 `ImgHtmlParser.ts` 均为 NH 专有，`src/platform/base/` 不受影响，故 EH 侧无需回归，但交付须声明未回归。

## R4 待决事项：`ImgHtmlParser.ts:38`

`getImgUrl()` 仅读 `x-src`（`ImgHtmlParser.ts:38`），与 `IntroHtmlParser.ts:23` 是同构写法，但方向相反：若 NH 图片页用 `data-src` 保存真实大图，则该处同样失效。

判定原则：**以证据决定是否改动**。NH 图片页大图当前可用，说明该路径的 `x-src` 能取到值；但仍需取一张真实 NH 图片页 HTML 确认属性形态（是否存在 `data-src`、`src` 是否占位）。确认无缺陷则记录证据、保持不动；确认缺陷则按同一回退模式修复，并补双属性验证。

## 备注

- 同目录 `implement.md` 为执行清单；父任务见 `.trellis/tasks/09-20-backlog-nh-thumb-and-typecheck`。
