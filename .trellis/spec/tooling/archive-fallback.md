# 归档提交兜底

`task.py archive` 移动任务目录后会用内部 git 自动提交归档改动。提交失败时典型报错是：

```
错误：invalid object 100644 d8f8d46921aa81abc4c0d27703a8908333ae38c3 for 'docs/readme.md'
错误：无法创建树对象
```

## 真因

`.githooks/pre-commit` 执行 `npm run check`，子进程继承 hook 导出的 `GIT_INDEX_FILE`。fixture 仓库若直接用环境里的 `GIT_*` 做 `git add -A`，就会把 fixture 的文件写进**外层**仓库的 index：fixture 里 `docs/readme.md` 的 blob 只存在于 fixture 的 object 库，外层 index 多出一条没有对应对象的条目，之后每次 `git commit` 都在写树时失败。

导出的值取决于提交形式：普通提交是相对路径 `.git/index`（fixture `cd` 之后会解析成它自己的索引，碰巧没事）；`git commit -- <pathspec>` 是**绝对路径的临时索引**，fixture 无论 `cd` 到哪里都写进调用方正在构建的那棵树。`task.py archive` 与 `scripts/archive-fallback.sh` 都走后者，所以归档一定会撞上。

修复位置：

- `scripts/test_scope_gate.py` 的 `ScopeGateFixture.setUp()`——把全部 `GIT_*` 变量临时弹出环境并在 `addCleanup` 里复原；
- `tests/archive-fallback.test.sh`——开头用 POSIX 写法（`env | sed`）清掉 `GIT_*`，并在清理后断言环境里不再有 `GIT_*`，fixture 因此只操作自己的索引。

别用 bash 内建 `compgen -e` 枚举变量：它只在 bash 下存在，`dash` 里会报 `compgen: not found`，命令替换为空使整个循环静默跳过，变量原封不动而脚本仍以 0 退出——这类失效不会让任何断言变红。

同类 fixture 也要遵循同一规则，别让子进程继承 hook 的索引变量。`scripts/test_scope_gate.py` 的 `InheritedGitEnvironmentTests` 同时守这两条。
已经出现幽灵条目时，先确认路径确实不该被跟踪，再单独移除：

```bash
git ls-files -s | grep <path>          # 确认条目仍存在
git update-index --force-remove <path>
```

不需要、也不应该为此重建 `.git/index`。

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
- 任务 `task.json` 里 `meta.scope.categories` 声明的路径，逐条用 `git ls-files -z -co --exclude-standard` 展开（`core/**`、`scripts/*.py` 这类规则都支持）。

展开用 `-co`（cached + others）而不是默认的 cached：`task.py archive` 用 `mv` 移走源目录后，源路径在索引里还是已跟踪、在工作树里已经消失，默认的 cached 列表会把它当作有效条目返回，但任何「路径存在吗」的过滤都会把它判假。展开结果因此又包含两种状态——已删除的源文件和尚未 `git add` 的新文件——两者都必须原样进 pathspec，交给 `git add` 与 `git commit` 记录，不需要额外调 `git rm --cached`：`git add <已删路径>` 返回 0（只在 stderr 提一句目录打不开），`git commit -- <pathspec>` 能正常记下 deletion。

某条规则展开为空时：规则的固定前缀目录已经不存在（源目录被 `task.py archive` 正常移走）属于预期，静默跳过；前缀仍在却查不到任何条目则打印 `warning: scope rule matched no path: <rule>`，提示 scope 声明与实际仓库不一致，避免兜底脚本漏文件而不出声。

路径无变更时报告 `nothing to commit` 并退出 0，可安全重复执行。`--dry-run` 只打印 `git status --short` 与将要执行的两条命令。

## 与 scope 门禁的关系

归档前仍需按 [任务改动范围门禁](task-scope-gate.md) 用 `task.py extend-scope` 声明实际改动的范围类别；兜底脚本只负责提交，不替代 scope 检查。提交信息沿用 `chore(task): archive <slug>`，与 `task.py archive` 一致。

## 回归守卫

`tests/archive-fallback.test.sh`（`npm run test:archive-fallback`）在临时仓库里复现三个场景并断言提交结果：

- 源目录被 `mv` 到归档目录后，源侧删除必须在同一次提交里记下（检查 `git status --short` 为空且提交里有 `R100` rename）；
- scope 规则里尚未 `git add` 的新文件必须入库；
- 重复执行安全退出 0 并报 `nothing to commit`。

第一条是这条脚本最容易回归的地方：`git ls-files` 默认只看索引，展开出来的源路径在 `-e` 测试下会一律判假，源侧删除就永远进不了 pathspec，结果是归档目录被提交、源目录的删除留在工作区外——看起来成功、实际半提交。`task.py archive` 自己的提交路径靠额外的 `git rm --cached` 规避了这点，兜底脚本不需要那一步，但要保留 `-co` 展开与「不做存在性过滤」两条。
