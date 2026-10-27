# 执行计划：验收 001-add-pageflip-toggle

## 范围

只验收，不改 `core/`、`src/` 代码。所有产物落 `.tmp/`。发现缺陷只记录，不在本轮修复。

## 依赖

- 本地轮：`npm run dev`（按 [browser-acceptance.md](../../../spec/frontend/browser-acceptance.md) 归属核实、后台启动、收尾停止）+ `ego-browser` 的 `desktop` / `mobile` 两个固定 profile
- 平台轮：按 [reader-test](../../../.pi/skills/reader-test/SKILL.md) 构建生产包并注入，需 GM 可用的 EH/EX/NH 登录态
- GM 不可用轮：另一个不带油猴脚本的干净 `ego-browser` profile
- reduced-motion 模拟：CDP `Emulation.setEmulatedMedia({features:[{name:'prefers-reduced-motion', value:'reduce'}]})`，在轮次记录里写明手段，不看 `matchMedia` 结果充数

## 步骤

1. **准备**：按 notify-complete 发短通知；读 `ego-browser` 技能与 browser-acceptance；启动 Vite 并保存服务证据（origin、cwd、pid、证据文件）。
2. **本地初始化矩阵（AC1）**：`desktop 1200×900` 与 `mobile 390×844` × reduced-motion 关/开共四种环境，每组先清掉共享与本站旧偏好再初始化，记录实际动效、UI 显示与持久化值，断言为「桌面关/拟真、移动关/平移、两者开/无动效」。
3. **初始化后稳定性（AC2）**：切换系统偏好后当前动效不变；保存语言等其他设置后刷新与重开画集仍用已保存结果；预置三种合法偏好（含恰等于旧默认拟真的旧记录）均保留。
4. **旧值与坏值补齐（AC2）**：预置缺失/坏值，确认先由本站合法旧值补齐，全部来源无合法值才走矩阵。
5. **重置防复活（AC2）**：执行明确重置后重新初始化，确认不重导被重置的旧值。
6. **三档动效与输入一致性（AC3）**：书页模式依次选拟真/平移/无动效，每次翻页使用所选动效；点击、滚轮、键盘、自动翻页均使用同一有效设置。
7. **边界与快速输入（AC3）**：首页向前、末页向后不越界；加载未完成与快速连续输入不产生页码错乱、明显积压或长时间空白。
8. **卷轴模式（AC3）**：切卷轴模式确认原滚动行为保持，返回书页仍用已确定偏好。
9. **共享/迁移矩阵（AC4）**：走 reader-test 生产包，在 GM 可用的 EH/EX/NH 间执行 002 quickstart 第 3 节矩阵，动效为被测字段并覆盖其他字段：合法共享优先、统一旧值优先于独立旧值、空共享首次迁入、后续站点只补缺、坏值修复、重复迁移、重置防复活。
10. **GM 不可用（AC4）**：第二个不带油猴脚本的干净 profile 访问 EH/EX/NH，确认 origin 隔离行为。
11. **校验（AC5）**：每轮 `python3 scripts/acceptance.py verify-browser <artifact-dir>`，非 `passed` 不记通过；记录 bundle/loader 证据。
12. **回填**：主会话按 `result` 与截图逐项更新 `acceptance.json` 的 `observed`/`note`/`evidence`/`execution`。
13. **收尾**：停服务并确认进程退出与端口释放 → `cleanup-browser` 生成资源报告 → `acceptance.py summarize` → 长通知。

## 验证命令

```bash
python3 scripts/acceptance.py verify-browser <artifact-dir>
python3 scripts/acceptance.py summarize .trellis/tasks/10-25-pageflip-toggle-acceptance
npm run type-check
```

## 回滚点

- 无代码改动，回滚即丢弃 `.tmp/` 本轮产物。
- 生产包构建失败或 GM 环境不可用：保留 blocked 证据，该项记 blocked 并回到用户确认，不伪造通过。
- 本地服务启动失败或预检 blocked：保留 blocked 证据，不进入功能断言。
