# 归档提交兜底

`task.py archive` 移动任务目录后会用内部 git 自动提交归档改动。某些仓库状态下这一步会失败，典型报错是：

```
错误：invalid object 100644 d8f8d46921aa81abc4c0d27703a8908333ae38c3 for 'docs/readme.md'
错误：无法创建树对象
```

对象从未存在于仓库、`git ls-files` 里也没有该路径时，这属于索引与工作树之外的历史残留，不要为了"修好"去重建 `.git/index`。`task.py` 会打印红色提示并返回非零，此时归档目录已经就位，只差一次提交。

## 用法

```bash
bash scripts/archive-fallback.sh <task-slug> --dry-run   # 看清将提交哪些路径
bash scripts/archive-fallback.sh <task-slug>             # 真正提交
```

可选参数：`--dir <archive-dir>` 显式指定归档目录（默认 `.trellis/tasks/archive/<YYYY-MM>/<slug>`），`--message <msg>` 覆盖提交信息（默认 `chore(task): archive <slug>`）。

## 提交范围

脚本只用显式 pathspec，绝不 `git add -A`：

- 归档目录（`.trellis/tasks/archive/<YYYY-MM>/<slug>`）；
- 源目录 `.trellis/tasks/<slug>` 若因移动失败仍存在；
- 任务 `task.json` 里 `meta.scope.categories` 声明的路径。

路径无变更时报告 `nothing to commit` 并退出 0，可安全重复执行。`--dry-run` 只打印 `git status --short` 与将要执行的两条命令。

## 与 scope 门禁的关系

归档前仍需按 [任务改动范围门禁](task-scope-gate.md) 用 `task.py extend-scope` 声明实际改动的范围类别；兜底脚本只负责提交，不替代 scope 检查。提交信息沿用 `chore(task): archive <slug>`，与 `task.py archive` 一致。
