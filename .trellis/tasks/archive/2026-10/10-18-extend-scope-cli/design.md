# 设计：extend-scope

## 边界

只触碰三处实现：

- `.trellis/scripts/common/scope_gate.py`：新增「并入规则 + 重签快照」的纯函数，负责校验与快照改写。
- `.trellis/scripts/common/task_store.py`：新增 `cmd_extend_scope`，负责定位任务、读写 `task.json`、打印结果。
- `.trellis/scripts/task.py`：注册子命令与 help 文本。

归档检查（`check_scope_at_archive`）、变化收集和 `summarize` 不动。

## 契约

```text
task.py extend-scope <dir> <category> <rule> [<rule> ...]
```

- 成功退出 0，打印新增规则、最终 category 规则列表；幂等时打印「already declared」。
- 失败退出 1，不改任何文件；错误信息写明任务、category 或规则位置。

快照改写顺序（先验证、后写入）：

1. 读取 `meta.scope`，若含 `snapshot` 引用则加载文件并比对 `sha256` 与快照内 `scopeDigest`；任一不符返回错误。
2. 在内存里把规则并入 categories，`validate_scope` 校验整体。
3. 计算新 `scopeDigest`，追加 `scopeExtensions` 条目 `{ "category": ..., "rules": [...], "at": "<ISO>" }`，写回快照文件。
4. 重新计算文件 sha256，写回 `meta.scope.snapshot.sha256` 与新的 categories。
5. 写 `task.json` 失败时用备份恢复快照文件，保持两侧一致。

`scopeExtensions` 只做审计记录，不参与 `normalize_scope` 与 digest 计算。

## 取舍

- 不做「整体替换 scope」的扩展入口：替换会引入收缩与规则删除语义，超出当前需求。
- 不在 `set-meta scope` 上自动保留快照：整体替换时基线与新策略的对应关系不明确，保留一个显式命令更容易审计。
- 复用 `validate_scope` 而不是新写规则校验，保证两条入口一致。

## 兼容与回退

- 旧任务、无快照任务：只写 `meta.scope`，与 `set-meta scope` 等价。
- 回退方式：删除子命令即可；已写出的 `scopeExtensions` 字段对门禁是未知键，需要确认 `validate_scope` 的白名单是否允许快照内附加字段（快照 schema 校验在 `_load_task_snapshot`，需放行新键）。
