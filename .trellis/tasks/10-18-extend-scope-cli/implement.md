# 实现清单

## 1. 快照 schema 放行扩展记录

- `_load_task_snapshot` / 快照校验里允许可选 `scopeExtensions`（数组，条目为 category/rules/at 字符串），非法条目报定位错误。
- 不把它纳入 `normalize_scope`。

## 2. scope_gate 纯函数

- `extend_scope_rules(scope, category, rules) -> (new_scope, added)`：复制 categories、去重、返回新增项。
- `resign_snapshot(repo_root, task_dir, task_rel, scope, added, category) -> dict | None`：验证 hash 与 digest、写快照、返回新的 `meta.scope`（含新 sha256 与 categories）。失败返回 `None` 并让调用方打印定位错误。
- 保持「先验证后写入」，写失败时恢复快照原文件。

## 3. CLI

- `task_store.cmd_extend_scope(args)`：定位任务 → 读 task.json → 取 meta.scope（缺失时报错）→ 调 2 → 写 task.json → 打印新增/最终规则。
- `task.py` 注册 `extend-scope` 子命令（dir、category、rules nargs='+'），补 help 文本顶部用法。

## 4. 测试（`scripts/test_scope_gate.py`）

- 已启动任务：start 后修改一个未声明路径 → extend-scope 加入类别 → archive/检查返回 allowed；断言快照的 HEAD/index/dirty 字段与扩展前完全一致，`scopeExtensions` 恰有一条。
- 幂等：重复添加同一规则不追加条目。
- 失败路径：快照文件被篡改（hash 不符，含规则已声明时）、快照缺失、快照 digest 漂移、非法规则（含空规则定位）、非数组/null category、不可读 task.json、缺 meta.scope、task.json 写失败回滚、未知任务 → 返回 1 且文件字节不变。
- planning 任务：只写 meta.scope，不产生 scope-start.json。
- 归档后任务：显式拒绝，报「is archived」，不改任何文件。

## 5. 文档

- `.trellis/spec/tooling/task-scope-gate.md`：声明段补 `extend-scope` 为进行中扩展入口；快照段补 `scopeExtensions`；验证段补新用例说明。

## 6. 验证命令

```bash
python3 -m unittest discover -s scripts -p 'test_scope_gate.py'
npm run test:acceptance
python3 .trellis/scripts/task.py --help
```

## 7. 收尾

- `python3 scripts/acceptance.py summarize .trellis/tasks/10-18-extend-scope-cli` 通过后归档并提交；提交信息用 `feat(tooling): 新增 task.py extend-scope`。
