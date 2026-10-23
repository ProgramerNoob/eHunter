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
- `task.py create` 默认写入 `scopePolicyVersion: 1` 和只覆盖自身任务目录的 enforce scope；`--meta scope=<JSON>`、`task.py set-meta <task> scope '<JSON>'` 或 `task.py extend-scope <task> <category> <rule>...` 可在 `start` 前声明范围，写入前统一校验。
- 写目录时必须用末尾 `/**` 的目录前缀。只写目录名（例如 `docs`）是一条精确规则，而精确规则只与文件路径做相等比较，不会覆盖目录内的文件。
- 命令行传规则时必须给参数加引号，例如 `extend-scope <task> spec 'docs/**'`。不加引号时由 shell 先展开：`bash` 未开启 `globstar` 时 `**` 等同于 `*`，一个目录规则会被拆成若干精确路径，其中目录项因此失效。命令本身不读文件系统，写入的就是它收到的字符串。
- `meta.scope.snapshot` 由 `task.py start` 维护，不接受调用方传入；`set-meta` 替换 scope 时清除旧引用，需要重新 `start` 记录基线。任务已经 `start` 后需要扩大范围时用 `extend-scope`：它保留原基线，只重签快照摘要。`extend-scope` 只接受 active 任务，已归档任务、没有 `scopePolicyVersion: 1` 整型 marker 的 legacy 任务会被拒绝；规则已全部声明时只打印现状，不重签快照也不写 `task.json`。

首次在新版本下启动的旧 planning 任务会补写 marker；缺少 `task-evidence` 时补默认规则；已有合法 scope 保留原样。`task.py start` 之前已在执行的旧任务保持 legacy，不追加快照。

## 启动快照

`task.py start` 在激活 session、改写 status 之前调用 `prepare_scope_start`，在当前任务目录写 `scope-start.json`，并在 `meta.scope.snapshot` 记录 `{ "path": "scope-start.json", "sha256": "<hex>" }`。快照包含 schema 版本、任务路径、branch、HEAD、index tree、捕获时间、scope 摘要 digest，以及启动时 tracked dirty 和 untracked 文件的类型/权限/内容摘要。`task.py extend-scope` 在快照已存在时校验文件 hash 与 `scopeDigest`，通过后重算 digest、向 `scopeExtensions` 追加 `{ category, rules, at }` 记录并更新 `meta.scope.snapshot.sha256`；HEAD、index tree、dirty/untracked 基线保持不变，hash 或 digest 不符、快照缺失时拒绝写入（规则已声明时同样先校验）。`scopeExtensions` 只作审计记录，不参与 `scopeDigest`，因此重签不会放宽任何门禁。若快照已重签而写 `task.json` 失败，命令会原子还原快照；进程在两次写入之间中断时快照 digest 已更新、`task.json` 仍是旧 sha256，归档按 hash 不符 fail closed，恢复快照原文或重新执行 `start` 即可。

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

`test_scope_gate.py` 覆盖默认 scope、旧 planning 迁移、JSON 扩展、`extend-scope`（保留基线、幂等、多规则去重、hash/digest 不符与快照缺失拒绝、已声明规则时仍校验、写失败回滚、已归档任务、非数组/null category、不可读 task.json、缺 meta.scope、planning 任务）、快照前后脏状态、新增/删除/rename/stage/commit/intent-to-add、坏快照、legacy、两条归档入口与 `finish` 不触发检查。
