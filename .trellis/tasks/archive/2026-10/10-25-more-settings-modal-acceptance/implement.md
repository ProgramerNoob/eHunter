# 执行计划：验收 002-more-settings-modal

## 范围

只验收，不改 `core/`、`src/` 代码。所有产物落 `.tmp/`。发现缺陷只记录，不在本轮修复。

## 依赖

- 本地轮：`npm run dev`（按[浏览器验收指南](../../../.trellis/spec/frontend/browser-acceptance.md)核实归属、后台启动、收尾停止）+ `ego-browser` 的 `desktop` / `mobile` 固定 profile。
- 平台轮：按 [reader-test](../../../.pi/skills/reader-test/SKILL.md) 构建生产包并注入，需 GM 可用的 EH/EX/NH 登录态（本会话已确认可用）。
- GM 不可用轮：双 Vite origin（`127.0.0.1:5173` 与 `localhost:5174`）验证 origin 隔离；ego-browser 只有单一 profile，不再依赖「第二个干净 profile」。
- 翻页专项：沿用 `.trellis/tasks/archive/2026-10/10-25-pageflip-toggle-acceptance/` 已通过的首次初始化矩阵与稳定性结论，新轮只补本任务需要的字段核对。
- 放大镜专项：按 [001-add-pageview-magnifier quickstart](../../../.trellis/spec/frontend/features/001-add-pageview-magnifier/quickstart.md) 执行，复用 `.tmp/round-book-geometry.mjs` 与 `.tmp/round-geometry-limits.mjs` 的场景结构。

## 步骤

1. **准备**：按 notify-complete 发短通知；读 `ego-browser` 技能与 browser-acceptance；核实 5173 / 5174 服务归属并保存服务证据。
2. **弹窗开关与阅读回归（AC1）**：桌面与移动分别从顶栏 `.more-button-wrapper` 打开更多设置，`×` 与点击遮罩关闭；确认旧二层「更多设置」入口已不存在（`MoreMenuPopover` 只剩更多设置/快捷预览/下载三项，无嵌套设置区）；关闭后阅读页码不变。
3. **分类跳转（AC1）**：六个分类按钮点击后 `.ehunter-content` 平滑滚动到对应 `[data-category]` 分组、`ehunter-active` 高亮正确；窄屏 390×844 下左右两列仍可读可操作。
4. **配置项覆盖（AC2）**：逐分类读取 `.ehunter-row` 的标签与控件，与 `settingFieldDefinitions` 中 `showInDialog` 的字段集合比对无缺失；修改语言、加载页数、页面比例、同屏页数、翻页动效等字段后立即生效，重开弹窗显示正确；切换 cn/en/jp 三种语言核对文案可见。
5. **快捷项约束（AC2）**：阅读模式固定第一位、无拖拽把手、不可取消；其余项可勾选/取消与拖拽排序，顶部快捷栏按全局顺序过滤当前模式可用项。
6. **链接与重置（AC3）**：GitHub 链接 href 与版本号文本正确；重置先弹确认，取消无变化，确认后按既有范围重置并给出成功/失败反馈。
7. **共享与迁移九行矩阵（AC4）**：走 reader-test 生产包，在 EH/EX/NH 间执行 002 quickstart 第 3 节九行场景，字段取翻页动效、语言、快捷项顺序、放大镜尺寸/倍率；每行记录迁移前后各来源值。
8. **GM 不可用隔离（AC4）**：双 Vite origin 各改值并刷新，确认仅本 origin 生效。
9. **GM 权限审计（AC4）**：核对生产 bundle 与 loader 的 `@grant` 覆盖 GM 读写/重置所需能力，坏值修复不影响其余合法值。
10. **翻页专项（AC5）**：无合法迁移值时按系统减少动态效果与设备取默认；三种合法值保留；初始化后切换系统偏好或保存其他设置不改动效。
11. **放大镜专项（AC6）**：桌面设置与快捷菜单范围一致、20–300 任意整数、快捷 ±10 与边界钳制；尺寸倍率长期保存、开关仅当页会话、临时尺寸不写回、移动端保留桌面限制。
12. **校验（AC7）**：每轮 `python3 scripts/acceptance.py verify-browser <artifact-dir>`，非 `passed` 不记通过；`npm run type-check` 记录实际退出码与日志。
13. **回填**：按 `result` 与截图逐项更新 `acceptance.json` 的 `observed`/`note`/`evidence`/`execution`。
14. **收尾**：停服务并确认进程退出与端口释放 → `cleanup-browser` 生成资源报告 → `acceptance.py summarize` → 长通知。

## 验证命令

```bash
python3 scripts/acceptance.py verify-browser <artifact-dir>
python3 scripts/acceptance.py summarize .trellis/tasks/10-25-more-settings-modal-acceptance
npm run type-check
```

## 回滚点

- 无代码改动，回滚即丢弃 `.tmp/` 本轮产物。
- 生产包构建失败或 GM 环境不可用：保留 blocked 证据，该项记 blocked 并回到用户确认，不伪造通过。
- 本地服务启动失败或预检 blocked：保留 blocked 证据，不进入功能断言。
