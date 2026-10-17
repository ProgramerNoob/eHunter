# 设计：验收资源清理检查

## 1. 边界与依赖

本子任务实现 `cleanup-browser` 的声明解析、资源身份检查、JSON 输出和 fixture；不关闭页面、不 kill 进程、不 unlink PID 文件。它可与 scope gate 独立验证，但共享 `scripts/acceptance.py` dispatcher 时必须串行修改；父任务负责把输出接入共同 browser acceptance 文档。

## 2. 命令与输入

命令固定为：

```text
python3 scripts/acceptance.py cleanup-browser <task-space> --pages <json> --servers <json> --output <path>
```

pages 输入为 `{schemaVersion:1, taskSpace, pages:[...]}`，servers 输入为 `{schemaVersion:1, taskSpace, servers:[...]}`；两份 taskSpace 必须等于命令参数，页面项 `spaceId` 必须相符。页面项至少包含 `label`、`spaceId`、`pageId`、`state`（`open|closed|unknown`）、RFC3339 `observedAt`（必须带时区）和 evidence；owner/createdByTask 缺失、非法或不匹配时逐项判 `unknown` 而非推定 ownership。服务项至少包含 label/pid/pidFile/port/expectedCwd/expectedCommand/processStartToken；owner/createdByTask/启动或核实 evidence 缺失、非法或不匹配时逐项判 `unknown`。输入显式列出本任务需检查的资源，不从全量 browser pages 或系统进程推断 ownership；页面 observation 由调用方/验收载具提供，命令不冒充浏览器实时查询。

## 3. 只读检查与分类

页面命令开始时固定 UTC `checkedAt`，`observedAt` 必须是显式时区 RFC3339；年龄 `checkedAt - observedAt` 为 0–300 秒（含边界）才有效。owner=agent 时，createdByTask 必须与 task space 声明的任务相符且 evidence 存在；有效观察下 closed 为 `clean`、open 为 `residual`，state=unknown、身份不符或缺失/无效/未来/过期观察为 `unknown`。owner=user 一律 `preserved`，不因仍开或观察过期失败；owner 缺失/非法/unknown 则 `unknown`。服务按 pid 检查存活、cwd/command/processStartToken、监听 port 和 pidFile。匹配的 agent-owned process 仍活/仍监听/PID 文件残留为 `residual`；PID 复用或 live identity 不匹配为 `unknown`。进程已退出且端口释放、PID 文件由调用方清理，仅当 owner/task 及记录的启动 identity/evidence 可信一致时才 `clean`；无法将退出进程关联到本任务则 `unknown`。user owner 一律 `preserved`，不得因检查流程触碰资源。

输出 JSON 固定 `schemaVersion: 1`，包含 `taskSpace`、UTC `checkedAt`、逐项 pages/servers 分类和 diagnostics/evidence 引用；每项记录 `classification` 与原因。写入仓库 `.tmp/`，拒绝覆盖已有交付物。aggregate.status：全项 clean/preserved（空资源列表也成立）时为 clean；存在 residual 时为 residual；否则存在 unknown 时为 unknown。退出码依次为 0、1（residual/unknown）、2（输入无法读取/解析、顶层 schema/taskSpace 不匹配或输出失败）。所有路径禁止 close/kill/unlink。

## 4. 兼容与测试

fixture 覆盖 clean、residual、preserved、unknown、页面观察年龄 0/300/301 秒、缺失/无效/未来观察时间、过期 user-owned 页面保留、PID 复用、启动标识/cwd/port 不匹配、缺失归属、错误退出码、输出拒绝覆盖和输出失败；既有 `task.py finish`、preflight、EH/NH/Vite 流程保持不变。