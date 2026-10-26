# 资源清理检查

收尾时用显式声明核对本任务创建的页面、服务、端口和 PID 文件。命令只读检查并写报告，不关闭页面、不发送 `kill`、不删除 PID 文件或已有证据；实际清理由验收者确认归属后执行。

```bash
python3 scripts/acceptance.py cleanup-browser <task-space> --pages <pages.json> --servers <servers.json> --output <repo>/.tmp/cleanup-browser.json
```

- `<task-space>` 是本轮 Trellis 任务标识（任务名），两份输入的 `taskSpace` 必须与它相同。页面 `spaceId` 是 Ego 数字 space id，与任务名无关；agent-owned 项的 `createdByTask` 必须等于 `<task-space>`。
- pages 输入：`{schemaVersion:1, taskSpace, pages:[{label, spaceId, pageId, owner, createdByTask, state, observedAt, evidence}]}`。agent-owned 页面要求 0–300 秒内、带显式时区的 RFC3339 `observedAt`；有效 `closed` 为 clean、`open` 为 residual。`owner:user` 始终 preserved，不校验其逐项字段。
- servers 输入：`{schemaVersion:1, taskSpace, servers:[{label, pid, pidFile, port, expectedCwd, expectedCommand, processStartToken, owner, createdByTask, evidence}]}`；`processStartToken` 形如 `<pid>@<ps -o lstart=>`，`evidence` 每条都要能解析到可读文件。
- 分类：agent-owned 且进程已退出、端口释放、PID 文件已由调用方清理、启动身份与 evidence 相符为 clean；进程仍存活/监听或 PID 文件残留为 residual；PID 复用、cwd/命令/启动标识/端口不符、owner 或 createdByTask 缺失、evidence 缺失或不可读为 unknown。user-owned 为 preserved；逐项未知不是命令级输入错误。
- 退出码：`0` 全为 clean/preserved（空列表也是 clean），`1` 含 residual/unknown，`2` 输入或输出错误。输出固定 `schemaVersion:1`，含 `checkedAt`、`aggregate`、逐项 `classification`/`reasons`/`evidence`；只写仓库 `.tmp/`，拒绝覆盖已有文件。
- 报告只描述声明资源的收尾状态，不证明功能通过。residual/unknown 需人工核对归属并保留证据，不得把分类当作清理动作或功能结论。


