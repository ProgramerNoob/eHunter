# 硬化下载通知栈的标题换行与列表高度

## 背景

T024 的实机复核（`.trellis/tasks/archive/2026-10/10-03-cleanup-pageflip-i18n-notification/research.md:147-148`）在两处记下「风险低但存在」的布局缺口，当时按「无需求支撑」未做，作为遗留记入 `pending-work.md:24`：

- `core/components/status/StatusNotificationItem.vue:62-67`（`> header > strong`）未设 `overflow-wrap`/`word-break`：超长无空格标题理论上会撑破 320px 卡片。
- `core/components/status/StatusNotificationStack.vue:32-45`（`.list`）未设 `max-height` + `overflow-y`：通知很多时列表会向上顶出视口。

触发条件都偏极端（`plan.md:29` 限定 3 并发、每项 90-120px；EH 标题通常含空格或 CJK），但两处修法都是纯声明式 CSS，不引入新状态、不影响既有布局路径，故本任务收口。

## 需求

### R1 标题不撑破卡片

`StatusNotificationItem.vue` 的 `> header > strong` 增加：

- `min-width: 0`：作为 flex 子项允许收缩到内容宽度以下，保证右侧关闭按钮不被挤出。
- `overflow-wrap: anywhere`：超长无空格标题在卡片内换行，而不是横向溢出。

卡片 `width: 320px`（移动端 `min(88vw, 320px)`）与既有字号/行高（13px/16px）不变。

### R2 列表不出视口

`StatusNotificationStack.vue` 的 `> .list` 增加：

- `max-height: calc(100vh - 48px)`：桌面锚点 `bottom: 28px`、移动 `bottom: 32px`，留出顶部间隙。
- `overflow-y: auto`：超出时列表内部滚动，而不是顶出视口。

`position: fixed` 的 `right`/`bottom`、`z-index: 10020`、`gap: 8px`、`pointer-events` 与过渡名称不变。

## 非目标

- 不改通知的生成、生命周期、并发上限与 `store` 数据（`downloadNotifications`、`DownloadStatusNotification`）。
- 不改卡片配色、圆角、阴影、进度条、按钮与动画。
- 不为通知消息段落 `> p` 增加同类硬化（本轮只收口 research 点名的两处；`> p` 的同类暴露在其交付说明中记录，不在本任务范围）。
- 不引入滚动条美化、`overscroll-behavior`、`scrollbar-gutter` 等附加声明。
- 不新增依赖、测试基建或 CI 改动。

## 验收标准

| 编号 | 验收点 | 判定方式 |
| --- | --- | --- |
| AC1 | 标题可换行 | 真实 EH 页面中取已渲染的通知项克隆一份，把标题替换为超长无空格字符串：修复前 `strong.scrollWidth > strong.clientWidth`（或卡片横向溢出），修复后两者相等且卡片高度增加、关闭按钮仍在视口内 |
| AC2 | 列表可滚动 | 向真实 `.list` 克隆注入足够多的通知项使总高超过视口：修复后 `list.clientHeight < list.scrollHeight`，且 `.list` 顶部仍在视口内（`top >= 0`）；修复前可复现顶出视口 |
| AC3 | 既有布局无回归 | 桌面 1200×900 与移动 390×844 下：通知仍在右下角、在 `.status-pannel` 上方、垂直堆叠不重叠，卡片宽度与间距与修复前一致（320px / `min(88vw, 320px)`、`gap: 8px`） |
| AC4 | 静态检查通过 | `npm run type-check` 退出码 0；`npm run build-prod` 退出码 0 |
| AC5 | 无新增运行期错误 | 浏览器控制台与 `Runtime.exceptionThrown` 无本次相关新增错误 |
| AC6 | 证据留档 | 修复前后截图与 DOM 测量值存于 `.tmp/harden-notification-stack/`（`.gitignore:44` 已忽略 `.tmp/`） |

## 约束

- 只动 `core/components/status/StatusNotificationItem.vue`、`core/components/status/StatusNotificationStack.vue` 两个文件。
- 克隆注入仅用于验证：不得写入仓库代码，不得留在交付物中。
- 浏览器验收按 `.trellis/spec/frontend/browser-acceptance.md` 与 `.pi/skills/eh-test/SKILL.md`；测试前后执行 notify-complete 通知；证据放 `.tmp/harden-notification-stack/`。
- 交付说明区分已验证与未验证范围（真实并发上限下无法自然堆出超视口列表，AC2 的触发方式需如实说明）。
