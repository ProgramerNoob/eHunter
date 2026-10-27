#!/usr/bin/env bash
# 守卫 scripts/archive-fallback.sh 的两条提交范围规则：
#   1. task.py archive 用 mv 移走源目录后，源侧删除必须进 pathspec（否则半提交）；
#   2. scope 规则里尚未 git add 的新文件也要进 pathspec。
# 脚本靠 dirname/.. 回仓库根，所以副本必须放在仓库的一级子目录里跑。
set -u

# pre-commit hook 会导出 GIT_INDEX_FILE 指向本次提交的临时索引（`git commit -- <pathspec>`
# 时为绝对路径）。fixture 仓库必须用自己的索引，否则 `git add -A` 会写进外层提交正在构建的
# 树，留下指向不存在 blob 的记录并让 `git write-tree` 崩掉。整个 GIT_* 家族一律丢弃，
# 与 scripts/test_scope_gate.py 的 ScopeGateFixture.setUp() 保持同一口径。
# 用 env|sed 而不靠 bash 内建 compgen：dash 下 compgen 不存在，命令替换为空会让整个
# 循环静默跳过，变量原封不动而脚本仍然 exit 0。
for _git_env in $(env | sed -n 's/^\(GIT_[A-Za-z0-9_]*\)=.*/\1/p'); do unset "$_git_env"; done
if env | grep -q '^GIT_'; then
  echo "FAIL: GIT_* 环境未能清理，fixture 可能写进调用方索引" >&2
  env | sed -n 's/^\(GIT_[A-Za-z0-9_]*\)=.*/  \1/p' >&2
  exit 1
fi

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
source_script="$repo_root/scripts/archive-fallback.sh"
workdir="$(mktemp -d "${TMPDIR:-/tmp}/archive-fallback.XXXXXX")"
trap 'rm -rf "$workdir"' EXIT

fail=0
pass() { echo "ok: $1"; }
bad() { echo "FAIL: $1" >&2; fail=1; }

init_repo() {
  local dir="$1"
  mkdir -p "$dir/scripts" "$dir/work"
  cp "$source_script" "$dir/scripts/archive-fallback.sh"
  (
    cd "$dir" || exit 1
    git init -q .
    git config user.email test@example.com
    git config user.name test
    git config commit.gpgsign false
  )
}

# 场景 1：源目录已被 mv 到归档目录，源侧文件在索引里但工作树已消失。
scenario_rename() {
  local dir="$workdir/rename"
  init_repo "$dir" || { bad "rename: 初始化仓库失败"; return; }
  mkdir -p "$dir/.trellis/tasks/demo"
  cat > "$dir/.trellis/tasks/demo/task.json" <<'JSON'
{"meta":{"scope":{"categories":{"task-evidence":[".trellis/tasks/demo/**"],"work":["work/**"]}}}}
JSON
  echo prd > "$dir/.trellis/tasks/demo/prd.md"
  echo a > "$dir/work/a.txt"
  (
    cd "$dir" || exit 1
    git add -A && git commit -qm init || exit 1
    mkdir -p .trellis/tasks/archive/2026-10
    mv .trellis/tasks/demo .trellis/tasks/archive/2026-10/demo
    bash scripts/archive-fallback.sh demo >/dev/null 2>&1
  ) || { bad "rename: 脚本执行失败"; return; }

  local status
  status="$(cd "$dir" && git status --short)"
  if [ -z "$status" ]; then
    pass "rename: 源目录移走后提交干净，没有遗留删除"
  else
    bad "rename: 提交后仍有未记录变更 -> ${status//$'\n'/ | }"
  fi

  local diff
  diff="$(cd "$dir" && git show --name-status --format= HEAD)"
  if printf '%s\n' "$diff" | grep -q '^R100'; then
    pass "rename: 归档记录为 rename"
  else
    bad "rename: 提交里没有 rename 记录 -> ${diff//$'\n'/ | }"
  fi
}

# 场景 2：scope 规则内有尚未 git add 的新文件。
scenario_untracked() {
  local dir="$workdir/untracked"
  init_repo "$dir" || { bad "untracked: 初始化仓库失败"; return; }
  mkdir -p "$dir/.trellis/tasks/demo"
  cat > "$dir/.trellis/tasks/demo/task.json" <<'JSON'
{"meta":{"scope":{"categories":{"task-evidence":[".trellis/tasks/demo/**"],"work":["work/**"],"scripts":["scripts/*.mjs"]}}}}
JSON
  echo p > "$dir/.trellis/tasks/demo/prd.md"
  echo a > "$dir/work/a.txt"
  (
    cd "$dir" || exit 1
    git add -A && git commit -qm init || exit 1
    mkdir -p .trellis/tasks/archive/2026-10
    mv .trellis/tasks/demo .trellis/tasks/archive/2026-10/demo
    echo '// new' > scripts/brand-new.mjs
    bash scripts/archive-fallback.sh demo >/dev/null 2>&1
  ) || { bad "untracked: 脚本执行失败"; return; }

  if (cd "$dir" && git ls-files --error-unmatch scripts/brand-new.mjs >/dev/null 2>&1); then
    pass "untracked: scope 规则内的新文件已入库"
  else
    bad "untracked: scope 规则内的新文件被漏掉"
  fi

  local status
  status="$(cd "$dir" && git status --short)"
  if [ -z "$status" ]; then
    pass "untracked: 提交后工作树干净"
  else
    bad "untracked: 提交后仍有未记录变更 -> ${status//$'\n'/ | }"
  fi
}

# 场景 3：重复执行要安全退出。
scenario_idempotent() {
  local dir="$workdir/idempotent"
  init_repo "$dir" || { bad "idempotent: 初始化仓库失败"; return; }
  mkdir -p "$dir/.trellis/tasks/demo"
  echo '{"meta":{"scope":{"categories":{"work":["work/**"]}}}}' > "$dir/.trellis/tasks/demo/task.json"
  echo p > "$dir/.trellis/tasks/demo/prd.md"
  (
    cd "$dir" || exit 1
    git add -A && git commit -qm init || exit 1
    mkdir -p .trellis/tasks/archive/2026-10
    mv .trellis/tasks/demo .trellis/tasks/archive/2026-10/demo
    bash scripts/archive-fallback.sh demo >/dev/null 2>&1 || exit 1
  ) || { bad "idempotent: 首次执行失败"; return; }

  local out rc
  out="$(cd "$dir" && bash scripts/archive-fallback.sh demo 2>&1)"
  rc=$?
  if [ "$rc" -eq 0 ] && printf '%s' "$out" | grep -q 'nothing to commit'; then
    pass "idempotent: 重复执行报 nothing to commit 并退出 0"
  else
    bad "idempotent: 重复执行 rc=${rc} 输出 ${out//$'\n'/ | }"
  fi
}

scenario_rename
scenario_untracked
scenario_idempotent

if [ "$fail" -eq 0 ]; then
  echo "RESULT: archive-fallback contract holds"
else
  echo "RESULT: archive-fallback contract broken" >&2
fi
exit "$fail"
