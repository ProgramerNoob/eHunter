# 任务改动范围门禁

## Goal

为任务声明允许的改动范围，并在归档前阻断任务启动后发生的越界变更；保持 `task.py finish` 作为清除当前任务指针的轻量操作。

## Background and constraints

- 归档有直接 `.trellis/scripts/task.py archive` 与 `scripts/acceptance.py archive` 两条路径；两者必须使用同一 scope gate。
- `task.py finish` 只清 active task pointer，不代表验收完成；本子任务不在该命令上增加阻断。
- 用户确认以 `task.py start` 时的工作区为基线。快照前已有且启动后未变化的用户改动不应误阻断；快照后新增或变化的内容按 scope 检查。
- `task.json.meta.scope` 是唯一 allowlist 来源；单独的 policy marker/snapshot 只判定适用版本和记录起始状态，不保存第二份 allowlist。
- 只改任务/工具层；不改 reader/platform 产品行为或 acceptance result 语义。

## Requirements

- R1 新 task 在顶层 `scopePolicyVersion: 1` 标记适用的 scope gate 版本，`task.json.meta.scope` 声明允许的改动类别与路径集合；task 创建时预置只覆盖自身 task-evidence 目录的 `version: 1` / `mode: "enforce"` scope，所有 enforce scope 必须包含本任务 task-evidence 路径。已有 planning task 第一次在新版本下启动时，若 marker 缺失则保留有效 scope 或补默认 task-evidence scope，再写入 marker。其他路径通过 `--meta scope=<JSON>` 或 set-meta 明确加入；路径使用仓库相对 POSIX 精确路径或 `/**` 目录规则。
- R2 `task.py start` 在 task-local `scope-start.json` 保存 HEAD、index tree、tracked dirty path 状态与 hash、untracked path 内容摘要，并在 `task.json.meta.scope.snapshot` 写入相对路径与 SHA-256；快照包含 scope 声明摘要。归档只收集相对快照新出现或状态/内容变化的 committed/index/worktree/untracked 路径，rename 的新旧路径均纳入；相对快照未变化的既有用户改动忽略。
- R3 归档输出变化路径、命中的 category/rule 与越界路径；越界时在归档状态、pointer、证据引用、目录移动、commit 或 hooks 之前阻断。marker=1 的 task 缺 scope、快照缺失/损坏/hash 不匹配或 scope 声明在 start 后被改动时 fail closed。
- R4 直接 `task.py archive` 与 `scripts/acceptance.py archive` 最终使用同一 native 检查契约；合法的验收 tooling、测试、规范和任务证据改动可通过。
- R5 没有 marker 且没有 scope 的既有历史 task 输出 legacy/需回填诊断并继续旧 archive 流程；已有 scope 但缺 marker 且仍为 planning 的 task 在首次新版本 start 时迁移，已在 rollout 前 active 且缺 snapshot 的 task 显式报告 legacy，不能把 marker=1 的新 task 当历史任务放过。
- R6 `task.py finish` 不运行 scope gate，仍只清当前任务指针；scope gate 不自动修改 allowlist、拆分任务或覆盖用户改动。

## Acceptance Criteria

- [AC1] 默认新建任务包含 `scopePolicyVersion: 1`、可解析的 enforce scope 和自身 task-evidence 路径；旧 planning task 首次 start 时被迁移并创建快照；显式 JSON scope 可合法扩展其他路径，非法规则被定位拒绝。
- [AC2] 启动快照之前已有且未变化的 staged/unstaged/tracked/untracked 越界路径不会阻断；启动后新增文件、删除、修改、stage/commit、rename 或变化的 untracked 文件会被正确纳入匹配。
- [AC3] 允许范围内的变更在 direct native archive 与 acceptance archive 均通过；任一越界变化在两条路径均阻断，任务目录/status/pointer/自动提交均未被改变。
- [AC4] marker=1 task 的 snapshot 缺失/损坏/hash不符、scope 声明变更或 scope 缺失均 fail closed；无 marker 的旧 task 显示 legacy/需回填。
- [AC5] 有越界改动的任务运行 `task.py finish` 仍只清当前任务指针，不触发 scope gate。
- [AC6] tracked/index/worktree/untracked、精确/`/**` 匹配、rename 两端、既有脏状态和同路径启动后修改均有 fixture；已有 branch validation/archive evidence/autocommit 测试不回归。

## Out of scope

- 不修改 `src/platform/**`、reader UI、解析器、请求层或图集产品行为。
- 不实现 browser artifact provenance、页面 bootstrap 或资源清理。
- 不自动修改范围声明、不自动拆分任务、不覆盖用户改动；不把 scope gate 当作对恶意本地用户的安全边界。