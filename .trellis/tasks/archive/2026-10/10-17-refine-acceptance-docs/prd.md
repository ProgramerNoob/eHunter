# 精简验收文档与技能：AGENTS.md、reader-test、notify-complete

## Goal

去除 AGENTS.md、`.pi/skills/reader-test/SKILL.md`、`.pi/skills/notify-complete/SKILL.md` 中与 `.trellis/spec/frontend/browser-acceptance.md`、`.trellis/workflow.md` 及彼此重复的内容，只保留各自唯一的真相来源；同时修复 reader-test 的两处执行缺陷。

## Requirements

- **R1（缺陷）**：reader-test 解析出的 `platform` 必须作为 `PLATFORM` 传给准备/构建两段 bash 命令。当前两处只写 `${PLATFORM:-eh}`，无赋值来源，`platform: nh` 运行会静默使用 `eh`，产物与日志落进 `.tmp/reader-test-eh/`，违反同文件「不混用其他平台的目录」。
- **R2（缺陷）**：reader-test 内部交叉引用改为按小节名（"构建生产包"、"bundle server"），移除「下文步骤1」「准备第4步」这类序号引用，避免插入条目后错位。
- **R3（去重）**：reader-test 的两份 `source` 模板（EH/NH 各一份，仅差 `kind` 与 `loggedIn`）合并为一份，平台差异由「平台差异」表承载；删除为重复而生的警告句。
- **R4（去重）**：reader-test 不再复述 `acceptance.py cleanup-browser` 的 pages/servers 字段表、退出码与 clean/residual/unknown 分类，改为指向 browser-acceptance.md 的收尾流程，只保留本技能特有的事实（报告路径、按平台分目录）。
- **R5（去重）**：reader-test「通过准备门」压缩为「helper 未 blocked 即通过；blocked 按其具体差异处理」，不再复述 helper 内部的身份算法（`Debugger.getScriptSource`、UTF-16 code unit 偏移、同长度不同内容拒绝）。
- **R6（去重）**：reader-test 的 pi 调用示例由 6 条压到 2–3 条；429/Cloudflare/地区封锁只在「平台差异」表出现一次，删除正文重复表述。
- **R7（notify-complete）**：两段只差播放次数的命令合并为一条带次数参数的命令；`afplay` 与 `Ping.aiff` 的可用性检查并入该命令，失败时输出可见原因（不再 `2>&1` 全丢弃），成功路径保持后台不阻塞。
- **R8（AGENTS.md，激进精简）**：保留项目边界、技术与 UI 约束、稳定的提交约定；验收细则、技能分工细节、调试产物位置下移到已有归属文档，改为指针。目标：非 Trellis 托管区从约 70 行降到约 30 行。不得删除其他文档未承载的约束、不得引入尚未核实的规则。

## Acceptance Criteria

- [x] R1：reader-test 明确 `PLATFORM` 来自解析参数，并说明默认值；两处 bash 命令使用同一来源。
- [x] R2：`grep -n "下文步骤\|准备第.步" .pi/skills/reader-test/SKILL.md` 无输出。
- [x] R3：`grep -c "const source = {" .pi/skills/reader-test/SKILL.md` 结果为 1；合并后的模板与平台差异表一致（EH 有 `loggedIn`，NH 无）。
- [x] R4/R5：reader-test 中不再出现 cleanup-browser 的字段名清单与退出码表，链接指向 browser-acceptance.md 对应锚点且锚点存在。
- [x] R6：pi 调用示例 ≤3 条；429 相关表述在技能正文出现 1 次。
- [x] R7：notify-complete 命令块数量为 1；包含 `command -v afplay` 检查；不再有 `>/dev/null 2>&1` 全量丢弃；实际执行一次短通知与一次长通知，均返回 0 且听感与改动前一致。
- [x] R8：`wc -l AGENTS.md` 中 TRELLIS 托管区之前的内容约 30 行；逐条核对被删除的约束均在保留或指向的文档中有对应条目，列出对照表。
- [x] 所有新增/修改的相对链接文件存在（`test -f` 逐个校验）；`grep -c '```'` 为偶数，代码围栏闭合。
- [x] 未运行的功能验收明确标注为未验证（本次为纯文档改动）。

## Out of Scope

- `.trellis/spec/frontend/browser-acceptance.md` 的正文重写（仅在被引用锚点缺失时补锚点）。
- `scripts/browser-preflight.mjs`、`scripts/acceptance.py` 的行为改动。
- `ehunter-dev-loader.user.js` 的 loader 逻辑。
- AGENTS.md 的 TRELLIS 托管区。

## Notes

- AGENTS.md 非托管区由人工审阅维护，删除项须逐条给出新归属。
- 本次为文档改动，验收方式是引用/格式/所述命令的真实执行，不涉及浏览器功能验收。

## AGENTS.md 删除项归属对照（R8）

| 原条目（删除/合并前） | 现归属 |
| --- | --- |
| 非平台改动的后台服务启动、任务空间、视口、控制台日志、刷新、截图流程细节 | `.trellis/spec/frontend/browser-acceptance.md`（AGENTS.md 只留指针） |
| 「浏览器验收须确认代码已加载、无 Vite 编译错误、控制台与未捕获异常」 | `browser-acceptance.md` §2/§4.5 预检断言覆盖清单 |
| 「UI 改动桌面与移动两种视口关键交互、截图与视觉检查，断点补测」 | `browser-acceptance.md` §3；reader-test §6 末尾断点句 |
| 「抓取/解析/缓存验证首屏、切换、缩略图、原图换源」 | reader-test §6 功能清单（`first-screen`/`thumbnail`/`mode-switch`/`paging`/`cache`/`origin-img`） |
| 「基准请求层改动回归 EH/NH 两条链路」 | AGENTS.md 保留（合并进验收条目）；`TextReq`/`ReqQueue` 细节在 reader-test §1 与 §6 |
| 「用户故事须可独立实现、包含接受场景」 | `.trellis/workflow.md`（父/子任务树与独立可验收定义） |
| 审查依据（Trellis 任务产物、`.trellis/spec/`、未提交改动检查暂存区） | `.agents/skills/trellis-check`、`code-review` 技能正文 |

## 验证记录

- `grep -n "下文步骤\|准备第.步" .pi/skills/reader-test/SKILL.md` → 无输出（exit 1）。
- `grep -c "const source = {" .pi/skills/reader-test/SKILL.md` → 1。
- `grep -c "429" .pi/skills/reader-test/SKILL.md` → 1。
- reader-test 使用的 5 个锚点（`#一轮调用`、`#3-功能阶段与观察`、`#4-证据、截图和失败回填`、`#45-预检断言覆盖清单`、`#5-收尾或交还用户`）均存在于 `browser-acceptance.md`。
- notify-complete：代码围栏 2（闭合），`>/dev/null 2>&1` 计数 0；实跑 `COUNT=5`、`COUNT=10` 均 exit 0；`SOUND=/nope.aiff` 失败路径输出可见原因并 exit 0。
- AGENTS.md TRELLIS 托管区前 42 行、非空内容 30 行；`grep -c '```' AGENTS.md` → 0。
- 纯文档改动，未涉及浏览器功能验收；功能行为未验证项为「无」（未改动运行时代码）。
