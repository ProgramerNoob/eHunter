# 验收资源清理检查

## Goal

核实本任务创建的浏览器页、服务进程、监听端口和 PID 文件收尾状态，保留可复核 JSON 证据，并在无法证明资源归属时安全地报告 unknown。

## Background and constraints

- 浏览器验收可能复用已有 Ego task space/page，也可能启动 Vite 或 EH bundle server；PID 文件、端口和页面标签单独存在都不足以证明资源属于本任务。
- `.trellis/spec/frontend/browser-acceptance.md` 要求只清理本任务创建且不再需要的服务/资源，确认进程退出和端口释放，保留 user-owned 资源和交付证据。
- `eh-test` 要求核实 bundle server 的 PID、父进程、cwd、监听端口和 URL；构建成功或 HTTP 可达不等于功能通过。
- 本子任务选择只检查和报告，不调用浏览器关闭接口、不发送 kill、不删除 PID 文件；清理动作由验收者在确认归属后按现有指南执行。

## Requirements

- R1 提供 `python3 scripts/acceptance.py cleanup-browser <task-space> --pages <json> --servers <json> --output <path>`，显式读取页面和服务声明，输出结构化 JSON；命令不能依赖 acceptance 文本中的手写 passed。
- R2 页面输入必须能够表达 label、spaceId/pageId、owner（`agent|user|unknown`）、createdByTask、`open|closed|unknown` 观察、RFC3339 `observedAt`（显式时区）和 evidence。命令只校验调用方观察，不冒充浏览器实时查询。agent-owned 页面只使用 5 分钟（300 秒）内的有效观察；缺失、无效、未来或过期时标为 unknown，有效 open 观察标为 residual，有效 closed 观察且身份相符才可 clean。user-owned 始终 preserved；owner/createdByTask 缺失或非法、agent 归属证据缺失或记录矛盾时逐项标为 unknown。
- R3 服务输入必须能够表达 label、pid、pidFile、port、expected cwd/command、`processStartToken`、owner（`agent|user|unknown`）、createdByTask 和启动/核实 evidence；命令检查 PID 存活、cwd/命令/启动标识、监听端口和 PID 文件状态。user-owned 始终 preserved；owner/createdByTask 缺失或非法、agent 归属证据缺失、启动证据不符或记录矛盾时逐项标为 unknown，而非将其当作命令级 parse 错误或 clean。
- R4 输出包含 `schemaVersion: 1`、task space、逐项分类、检查时间、未决问题和 evidence 引用；agent-owned page 只有 0–300 秒内的有效观察、身份相符且 state 为 closed 才 clean。agent-owned server 只有进程已退出、端口释放、PID 文件已由调用方清理，且 task ownership/启动身份由 evidence 证明时才 clean。
- R5 非 clean 的 agent-owned residual 或 unknown 返回非零并建议人工处理；preserved 不作为失败，也不触碰 user-owned 页面、进程、端口、PID 文件或已有证据。
- R6 输入、输出和错误均可被单元/fixture 测试复核；输出路径必须在仓库 `.tmp/` 下且拒绝覆盖；所有逐项均为 clean/preserved（空资源列表视为 clean）时退出码 0，含 residual/unknown 退出码 1，输入/输出错误退出码 2。

## Acceptance Criteria

- [AC1] owner 取 `agent|user|unknown`，页面观察使用显式时区 RFC3339 时间；agent-owned 页面观察年龄 0–300 秒（含边界）且身份相符时，open 判 residual、closed 判 clean，缺失/无效/未来/过期观察判 unknown；user-owned 始终 preserved，命令不关闭页面。
- [AC2] agent-owned server 的 PID、cwd、command、processStartToken、监听端口和 PID 文件状态与 task-owned 启动 evidence 一致且已清理时输出 clean；匹配进程仍存活/仍监听/PID 文件残留时输出 residual；user-owned 始终 preserved。
- [AC3] PID 被复用、`processStartToken`/cwd/command/port 不匹配、owner 或 createdByTask 缺失时输出 unknown，不杀进程、不删除文件、不把未知资源当 clean。
- [AC4] 命令写出 schemaVersion 1 的 `.tmp/` JSON，包含 task space、pages、servers、aggregate/逐项分类、证据和检查时间；所有项为 clean/preserved（包括空列表）时退出 0，unknown/residual 时退出 1，输入/输出错误时退出 2。
- [AC5] 既有 `task.py finish`、`withBrowserPreflight` 和 EH/NH/Vite 验收行为无回归；cleanup fixture 覆盖 clean、residual、preserved、unknown 四种结果。

## Out of scope

- 不自动关闭 Ego 页面，不发送 `kill`/`killpg`，不删除 PID 文件或用户已有日志/截图/trace。
- 不实现 browser artifact provenance、页面 bootstrap、任务范围门禁或真实站点压力测试。
- 不把服务启动成功、端口可达或清理命令成功等同于产品功能通过。
