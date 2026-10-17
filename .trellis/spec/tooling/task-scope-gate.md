# 任务改动范围门禁

任务范围门禁在归档前比较 `task.py start` 记录的工作区快照与当前状态，阻断启动后发生的越界改动。它约束本仓库的检查、提交和归档流程，不是针对恶意本地用户的安全边界，也不覆盖 `task.py finish`。

## 声明

`task.json` 顶层的 `scopePolicyVersion: 1` 表示门禁适用版本；唯一 allowlist 是 `meta.scope`：

```json
{
  "version": 1,
  "mode": "enforce",
  "categories": {
    "task-evidence": [".trellis/tasks/10-17-example/**"],
    "tests": ["scripts/test_scope_gate.py"]
  }
}
```

- 路径是仓库相对 POSIX 精确路径，或末尾 `/**` 的目录前缀（匹配目录本身与全部后代）。拒绝绝对路径、`..`、空路径段和空 category。
- `task-evidence` 类别必需，且规则必须覆盖本任务目录内的文件（通常写 `<task_rel>/**`）；只匹配目录本身的精确规则不算覆盖，因为 `start` 在快照之后还会写 `task.json`。
- `task.py create` 默认写入 `scopePolicyVersion: 1` 和只覆盖自身任务目录的 enforce scope；`--meta scope=<JSON>` 与 `task.py set-meta <task> scope '<JSON>'` 用于显式扩展，写入前统一校验。
- `meta.scope.snapshot` 由 `task.py start` 维护，不接受调用方传入；`set-meta` 替换 scope 时清除旧引用，需要重新 `start` 记录基线。

首次在新版本下启动的旧 planning 任务会补写 marker；缺少 `task-evidence` 时补默认规则；已有合法 scope 保留原样。`task.py start` 之前已在执行的旧任务保持 legacy，不追加快照。

## 启动快照

`task.py start` 在激活 session、改写 status 之前调用 `prepare_scope_start`，在当前任务目录写 `scope-start.json`，并在 `meta.scope.snapshot` 记录 `{ "path": "scope-start.json", "sha256": "<hex>" }`。快照包含 schema 版本、任务路径、branch、HEAD、index tree、捕获时间、scope 摘要 digest，以及启动时 tracked dirty 和 untracked 文件的类型/权限/内容摘要。

- 快照写入失败或回读失败时，`start` 返回非零，任务不激活、status 不变。
- 重复 `start` 复用同一有效快照，不静默重置基线；scope digest 不匹配、快照缺失/损坏/hash 不符时拒绝启动。
- 快照是起始状态证据，不是第二份 allowlist。

## 变化收集

归档时只比较相对快照新出现或状态/内容变化的内容：

- HEAD tree、index tree、tracked worktree 与 untracked 文件分别比较；启动前已有且未变化的改动被忽略。
- 启动后新增、删除、修改、stage、commit、权限/类型变化均纳入；rename 以源路径缺失和目标路径新增表达，两端分别匹配规则。
- 含 intent-to-add（`git add -N`）的未提交新文件按 worktree 变化纳入。
- git 状态或对象无法可靠计算时 fail closed，不退化为比较整个 base branch。
- `.trellis/.runtime/` 与 `.trellis/.current-task` 是工具自身状态，不计入任务改动。

## 归档检查

直接 `task.py archive` 在修改 status、清理 active pointer、移动任务目录、更新 evidence、自动 commit 或运行 hooks 之前调用检查；`python3 scripts/acceptance.py archive` 在汇总通过后委托同一 native archive，因此两条入口共用检查契约。

检查结果包含 changed/allowed/violations：每个变化路径列出命中的 category/rule；没有规则匹配的路径进入 violations。输出同时打印 JSON 报告到 stderr。被阻断时命令返回非零，任务目录、status、pointer 和 HEAD 均保持不变。

- `scopePolicyVersion` 缺失的历史任务输出 legacy 诊断并继续旧归档流程；任务本身不可读时同样按 legacy 恢复。
- marker 为新版本但 scope 缺失/非法、快照缺失/损坏/hash 不符、scope 在 start 后被改动时一律阻断。
- `task.py finish` 不运行检查，只清当前任务指针。

## 验证

修改门禁或归档接线后运行：

```bash
python3 -m unittest discover -s scripts -p 'test_scope_gate.py'
npm run test:acceptance
```

`test_scope_gate.py` 覆盖默认 scope、旧 planning 迁移、JSON 扩展、快照前后脏状态、新增/删除/rename/stage/commit/intent-to-add、坏快照、legacy、两条归档入口与 `finish` 不触发检查。
