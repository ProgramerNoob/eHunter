# 设计：验收资源清理检查

## 1. 边界与依赖

本子任务实现 `cleanup-browser` 的声明解析、资源身份检查、JSON 输出和 fixture；不关闭页面、不 kill 进程、不 unlink PID 文件。它可与 scope gate 独立验证，但共享 `scripts/acceptance.py` dispatcher 时必须串行修改；父任务负责把输出接入共同 browser acceptance 文档。

## 2. 命令与输入

命令固定为：

```text
python3 scripts/acceptance.py cleanup-browser <task-space> --pages <json> --servers <json> --output <path>
```

pages 输入为 `{schemaVersion:1, taskSpace, pages:[...]}`，servers 输入为 `{schemaVersion:1, taskSpace, servers:[...]}`；两份 wrapper `taskSpace` 与命令参数都表示 Trellis 任务，必须相等。页面项 `spaceId` 是 Ego 返回的数字 spaceId（正整数），`createdByTask` 才是 Trellis 任务标识，两者不得互相替代，`spaceId` 不要求等于命令参数。owner=agent 时页面项还须包含 `label`、`pageId`、`state`（`open|closed|unknown`）、RFC3339 `observedAt`（必须带时区）和 evidence；owner=user 的项在归属判定前返回 `preserved`，不校验这些字段。owner/createdByTask 缺失、非法或不匹配时逐项判 `unknown` 而非推定 ownership。服务项至少包含 label/pid/pidFile/port/expectedCwd/expectedCommand/processStartToken，token 形如 `<pid>@<ps -o lstart=>` 且启动时间非空；owner/createdByTask/启动或核实 evidence 缺失、非法或不匹配时逐项判 `unknown`。evidence 的每条引用必须解析到可读文件（相对路径按仓库根目录），否则该项为 `unknown`。输入显式列出本任务需检查的资源，不从全量 browser pages 或系统进程推断 ownership；页面 observation 由调用方/验收载具提供，命令不冒充浏览器实时查询。

## 3. 只读检查与分类

页面命令开始时固定 UTC `checkedAt`，`observedAt` 必须是显式时区 RFC3339；年龄 `checkedAt - observedAt` 为 0–300 秒（含边界）才有效。owner=agent 时，createdByTask 必须与命令的 task space 相符、evidence 可读且 spaceId/pageId 合法；有效观察下 closed 为 `clean`、open 为 `residual`，state=unknown、身份不符、pageId 非法或缺失/无效/未来/过期观察为 `unknown`。owner=user 一律 `preserved`，不校验逐项字段、不因仍开或观察过期失败；owner 缺失/非法/unknown 则 `unknown`。服务按 pid 检查存活、cwd/command/processStartToken、监听 port 和 pidFile。匹配的 agent-owned process 仍活/仍监听/PID 文件残留为 `residual`；PID 复用、live identity 不匹配或 PID 文件内容与声明 pid 矛盾为 `unknown`。进程已退出且端口释放、PID 文件由调用方清理，仅当 owner/task 及记录的启动 identity/evidence 可信一致时才 `clean`；无法将退出进程关联到本任务则 `unknown`。user owner 一律 `preserved`，不得因检查流程触碰资源。

输出 JSON 固定 `schemaVersion: 1`，包含 `taskSpace`、UTC `checkedAt`、逐项 pages/servers 分类和 diagnostics/evidence 引用；每项记录 `classification` 与原因。写入仓库 `.tmp/`，以 `O_EXCL` 创建并拒绝覆盖已有交付物；写入失败时删除自身刚创建的文件。aggregate.status：全项 clean/preserved（空资源列表也成立）时为 clean；存在 residual 时为 residual；否则存在 unknown 时为 unknown。退出码依次为 0、1（residual/unknown）、2（输入无法读取/解析、声明结构错误如非对象/缺 label/重复 label/agent 项未知字段、顶层 schema/taskSpace 不匹配或输出失败）。禁止对调用方/用户资源执行 close/kill/unlink；只允许删除自身创建的临时输出文件。

## 4. 兼容与测试

fixture 覆盖 clean、residual、preserved、unknown、页面观察年龄 0/300/301 秒、缺失/无效/未来观察时间、过期 user-owned 页面保留、Ego `spaceId` 与 Trellis 任务标识分离、user-owned 缺 pageId/spaceId 仍 preserved、PID 复用、PID 文件内容矛盾、启动标识/cwd/port 不匹配、缺失归属、缺失或不可读 evidence、空启动时间 token、错误退出码、输出拒绝覆盖和输出失败；既有 `task.py finish`、preflight、EH/NH/Vite 流程保持不变。