# 实施计划：验收资源清理检查

## 1. 现状与契约

1. 复核 browser-acceptance 与 `eh-test` 的 task space、PID/cwd/port、user-owned 资源和证据保留规则；确认命令只检查显式输入。
2. 为本 child 声明 cleanup helper、dispatcher、fixture/测试和任务证据路径；与 scope gate 不同时编辑 `scripts/acceptance.py`。

## 2. 实现与测试

3. 实现 pages/servers JSON wrapper/schemaVersion/taskSpace 校验和字段解析；owner 为 `agent|user|unknown`。页面读取 `state`（`open|closed|unknown`）和必须带时区的 RFC3339 observedAt，命令开始时固定 UTC checkedAt，年龄 0–300 秒（含边界）有效；缺失/无效/未来/过期观察、agent 归属/evidence 不符或 unknown owner 判 unknown，user owner 仍 preserved。服务读取 expectedCwd/Command 和 processStartToken；进程退出时仅以与 createdByTask 相符的启动 evidence 证明所有权，缺少身份/归属证明或输入矛盾返回 unknown，不猜测归属。
4. 实现只读 PID 存活、cwd/命令、启动标识、监听端口和 PID 文件观察；实现 clean/residual/preserved/unknown 分类和 aggregate 退出状态（0/1/2）。
5. 实现 `.tmp/` JSON 原子输出、evidence 引用、checkedAt、诊断和输出失败处理；代码审查确认没有 close/kill/unlink。
6. 增加四类分类、时间戳时区/无效/未来/0/300/301 秒观察、过期 user-owned 保留、task-space mismatch、PID 复用、启动标识/cwd/command/port 不匹配、缺失归属、空资源列表、错误退出码、拒绝覆盖和输出失败 fixture；验证 acceptance 可回填 blocked 而不伪造产品 passed。

## 3. 收口

7. 运行 cleanup 专项测试与既有 acceptance/browser-preflight 测试，核对 `task.py finish` 未改变。
8. 将命令、输入示例和人工处置边界交给父任务更新规范；固定版本后执行 review-only。

## 4. 验证命令

- `npm run test:acceptance`
- cleanup 专项 Python/fixture 测试
- `npm test`
- `npm run type-check`
