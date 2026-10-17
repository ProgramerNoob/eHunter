# 设计：任务改动范围门禁

## 1. 边界与依赖

本子任务只负责 scope 声明解析、task-start 工作区快照、变化路径收集、native archive 前置检查和回归测试；不改 acceptance 结果语义，不接触 reader/platform 产品行为。`scripts/acceptance.py archive` 最终委托 native archive，因此两条入口复用同一 checker。

## 2. 唯一 scope 声明

`task.json.meta.scope` 是唯一 allowlist 来源：

```json
{
  "version": 1,
  "mode": "enforce",
  "categories": {
    "acceptance-tooling": ["scripts/acceptance.py"],
    "test": ["tests/**"],
    "task-evidence": [".trellis/tasks/10-17-example/**"]
  }
}
```

`task.py create` 为每个新任务写顶层 `scopePolicyVersion: 1`，并预置 enforce scope 与自身 task-evidence 路径；`task-evidence` 类别及任务目录覆盖为必需项。自动激活 session 的 create 在所有 task.json 写入完成后捕获初始快照；`--no-start` 或无 session identity 时由后续 `start` 捕获。既有 planning task 在新版本首次 `start` 时保留已有有效 scope，缺少 task-evidence 时补默认规则，再写 marker；已在 rollout 前 active 的旧任务不被伪造为新任务。调用方通过 `--meta scope=<JSON>` 或 `set-meta` 扩展，统一校验 JSON 并将 scope 保存为对象；`set-meta` 替换 scope 时清除旧 `snapshot` 引用，需重新 `start` 记录基线。其它 meta 键维持字符串兼容。路径为仓库相对 POSIX 精确路径或末尾 `/**` 的目录前缀（匹配目录本身与子路径）；拒绝绝对路径、`..`、空 category、未知 version/mode。`task-evidence` 规则必须覆盖任务目录下的文件（例如 `task_rel/**`），只匹配目录本身的精确规则不算覆盖，因为 start 会在快照之后写入 `task.json`。

`scopePolicyVersion` 仅表示 gate 适用版本，`meta.scope.snapshot` 仅指向起始状态证据；二者都不是 allowlist，不复制 categories。

## 3. Task-start snapshot

新版本 `task.py start` 在激活 session/status 前捕获工作区状态，写入当前任务目录的 `scope-start.json`，并把 `{ path: "scope-start.json", sha256: ... }` 记录在 `task.json.meta.scope.snapshot`。快照至少含：schema version、task id、branch、HEAD、index tree、捕获时间、启动时 tracked worktree dirty paths 的类型/权限/hash、untracked non-ignored paths 的类型/权限/hash，以及 `version/mode/categories` 的规范化 digest。写文件失败时不得激活任务或改变 task status；重复 start 应验证并复用同一有效快照，不能悄悄重置基线。

Scope 政策只由 `meta.scope.categories` 声明；快照是运行证据，不是第二份 allowlist。归档先验证 task marker、snapshot path 在本 task directory、文件 SHA-256 和 scope digest；策略被改写、快照缺失/损坏或无法读取时，marker=1 task fail closed。任务自身 `task.json`、`scope-start.json` 和其它证据文件由必需 task-evidence 类别覆盖。

## 4. 只收集 snapshot 之后的变化

检查器把快照的 HEAD/index tree 作为起始 Git 状态，并保存起始 worktree dirty/untracked 内容摘要。归档时求当前 HEAD/index/worktree/untracked 状态，与快照逐路径比较：

- index tree 相对快照变化覆盖启动后 stage/commit；worktree 相对快照内容变化覆盖启动后 unstaged 修改；
- 快照前已有 tracked dirty 与 untracked 文件若状态/内容不变则过滤；其后变化、删除或 stage/commit 则重新纳入；
- 新增 untracked、intent-to-add（`git add -N`）、删除、类型/权限变化均纳入；rename 用源路径缺失和目标路径新增表达，两端分别匹配规则；忽略 git ignored 路径。
- `git` 状态或对象无法可靠计算时 fail closed，不能退化为检查全量 `base_branch` 差异，因为那会把启动前用户改动算给当前 task。

输出 changed/allowed/violations/diagnostics，逐文件列出 category/rule；规则支持精确路径及 `/**` 目录规则。

## 5. Archive gate、兼容与测试

native archive 在修改 status、清 pointer、移动目录、修改 evidence、自动 commit 或运行 hook 前调用 gate。acceptance archive 保留现有汇总语义并委托 native archive。`task.py finish` 不调用 checker，仍只清 active pointer。

没有 marker 且没有 scope 的 rollout 前历史 task 输出 legacy/需回填并继续原归档流程；`task.json` 本身不可读时无法判定版本，沿用原归档恢复路径并显式报告 legacy；marker=1 task 缺 scope、scope 存在但 start 时未生成快照、snapshot hash/digest 不符或 scope 被变更均不能静默通过。已 active 且没有 marker/snapshot 的旧任务只按显式 legacy 诊断处理，禁止把 marker=1 的新 task 伪装为旧 task。

fixture 覆盖默认 scope、旧 planning task migration、JSON meta 扩展、快照前既有脏状态、同一路径快照后修改、新增/删除/rename、staged/unstaged/commit/untracked、坏快照、scope digest 不符、legacy 和两条归档入口；gate 失败时验证 task 状态、目录、active pointer、evidence path、commit 均未改变。
