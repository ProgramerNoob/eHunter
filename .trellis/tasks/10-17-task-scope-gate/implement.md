# 实施计划：任务改动范围门禁

## 1. 现状与契约

1. 复核 `.trellis/scripts/common/task_store.py` 的 native archive mutation 顺序、`.trellis/scripts/task.py` start/finish 生命周期和 `scripts/acceptance.py archive` 委托路径；确认 start 快照在 session/status 激活前生成，archive gate 在任何副作用前运行。
2. 固定顶层 `scopePolicyVersion` rollout marker、`meta.scope` 的 version/mode/categories、task-evidence 必需规则、精确/`/**` matching 和 JSON CLI 形式；allowlist 仍只来自 `task.json.meta.scope`。

## 2. 实现与测试

3. 在 `task.py create` 为新 task JSON 写 `scopePolicyVersion: 1` 并 seed 默认版本化 scope，只包含自身 task-evidence 目录；`--meta scope=<JSON>` 和 `set-meta` 支持校验/存储嵌套 scope object。
4. 对新版本下首次启动的旧 planning task，在 `task.py start` 迁移 marker/scope；已在 rollout 前 active 的无 marker task保留 legacy 诊断。
5. 在 `task.py start` 捕获 HEAD/index/worktree/untracked 基线，生成 task-local `scope-start.json`，将文件 SHA-256 与 scope digest 写入 `task.json.meta.scope.snapshot`；写入失败不激活任务，重复 start 校验并复用快照。
6. 实现 scope validator、路径规则、legacy/坏字段诊断，输出 category/rule 命中结果；禁止快照后的 scope policy 被静默改写。
7. 实现基于 snapshot 的变化收集，区分启动前已有和启动后新增/变化的 tracked、staged、unstaged、untracked、deleted、mode/type 与 rename 两端路径；git 无法可靠判定时 fail closed。
8. 在 native archive 最早安全位置接入 gate，确保 acceptance archive 复用该路径；保留 finish 纯清 pointer。
9. 增加合法/越界/legacy/坏快照 fixture，验证旧越界改动保持不阻断、同路径启动后修改阻断、两条 archive 前置无副作用和 `/**` 边界；运行已有 archive evidence/autocommit 测试。

## 3. 收口

10. 核对未修改 product/platform 文件，向父任务交付 rollout marker、快照 schema、错误 JSON/退出状态和接线说明。
11. 固定实现与测试版本后执行 review-only；任何跨 child dispatcher 冲突由父任务统一处理。

## 4. 验证命令

- `npm run test:acceptance`
- scope gate 专项测试
- `npm test`
- `npm run type-check`
