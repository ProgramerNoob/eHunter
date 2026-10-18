# 任务进行中扩展 scope 的 CLI 入口

## 背景

`meta.scope` 是归档前的唯一 allowlist，由 `task.py start` 拍下 `scope-start.json` 基线并把 `scopeDigest` 写进快照。当前在任务进行中合法扩展范围只有两条路：`set-meta scope '<JSON>'` 整体替换会丢失快照引用，随后 `start` 以当前 HEAD 重新拍基线，等于把启动后已发生的改动从检查范围里抹掉；手工改 `task.json` 与快照摘要则绕过校验。10-18-nh-mobile-acceptance 归档时因为任务中途改了 `.trellis/spec/frontend/browser-acceptance.md`，就落在无 CLI 可用的夹缝里。

## 目标

提供 `task.py extend-scope`：把路径规则并入现有 `meta.scope.categories`，保留启动基线内容不变，只重签快照的 policy 摘要，并在快照里留一条扩展记录。

## 需求

1. 命令形态 `task.py extend-scope <dir> <category> <rule>...`，一次可加多条规则；category 不存在时创建，规则已存在时幂等成功。
2. 规则与整体 scope 沿用 `scope_gate.validate_scope` 的校验，错误信息带定位。
3. 任务已记录快照时：
   - 先校验快照文件自身 sha256 与 `meta.scope.snapshot.sha256` 一致、快照 `scopeDigest` 与当前 scope 一致，任一不符即拒绝，不写入任何内容；
   - 通过后重算 `scopeDigest`，在快照追加 `scopeExtensions` 记录（category、新增规则、时间），重写文件并更新 `meta.scope.snapshot.sha256`；
   - 快照里的 HEAD、index tree、dirty/untracked 基线内容保持不变。
4. 任务处于 planning（无快照）时只写 `meta.scope`，行为等同声明，`start` 再拍基线。
5. 拒绝逻辑与既有命令一致：任务不存在、task.json 不可读、scope 缺失或非法时返回非零且不改文件。
6. 更新 `.trellis/spec/tooling/task-scope-gate.md`：说明进行中扩展的受支持入口，删除「只能替换并重新 start」的描述。

## 非目标

- 不改变归档检查契约本身（变化收集、violations 输出、legacy 处理）。
- 不做 scope 收缩、规则删除或 category 重命名。
- 不覆盖 `task.py finish` 不检查的门禁语义。

## 接受标准

- [AC1] `task.py extend-scope` 在已启动任务上新增规则后，归档检查把该路径判为 allowed，且快照的 HEAD/index/dirty 基线与扩展前逐字节一致。
- [AC2] 快照缺失、文件 hash 不符或 `scopeDigest` 漂移时命令返回非零，`task.json` 与快照文件均未被修改。
- [AC3] 非法规则、未知任务、planning 任务三种情况下行为分别符合需求 2、5、4。
- [AC4] `python3 -m unittest discover -s scripts -p 'test_scope_gate.py'` 与 `npm run test:acceptance` 通过。
- [AC5] `.trellis/spec/tooling/task-scope-gate.md` 描述与实际行为一致，`task.py --help` 中可见新命令。
