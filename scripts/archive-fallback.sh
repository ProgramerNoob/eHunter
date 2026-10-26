#!/usr/bin/env bash
# 归档提交兜底：task.py archive 之后内部 git 自动提交失败时，用显式 pathspec 手工补齐。
#
# 典型失败输出：
#   错误：invalid object 100644 d8f8d46... for 'docs/readme.md'
#   错误：无法创建树对象
#
# 用法：
#   bash scripts/archive-fallback.sh <task-slug> [--dir <archive-dir>] [--message <msg>] [--dry-run]
set -u

usage() {
  cat <<'USAGE'
用法: bash scripts/archive-fallback.sh <task-slug> [选项]

选项:
  --dir <archive-dir>   归档目录（默认 .trellis/tasks/archive/<YYYY-MM>/<slug>）
  --message <msg>       提交信息（默认 "chore(task): archive <slug>"）
  --dry-run             只打印将提交的路径与命令，不执行
  -h, --help            显示本帮助
USAGE
}

slug=''
archive_dir=''
message=''
dry_run=0

while [ "$#" -gt 0 ]; do
  case "$1" in
    --dir)
      archive_dir="${2:-}"
      shift 2 || exit 1
      ;;
    --message)
      message="${2:-}"
      shift 2 || exit 1
      ;;
    --dry-run)
      dry_run=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    -*)
      echo "未知选项: $1" >&2
      usage >&2
      exit 2
      ;;
    *)
      if [ -n "$slug" ]; then
        echo "重复的任务 slug: $1（已有 $slug）" >&2
        exit 2
      fi
      slug="$1"
      shift
      ;;
  esac
done

if [ -z "$slug" ]; then
  usage >&2
  exit 2
fi

cd "$(dirname "$0")/.." || exit 1
repo_root="$(pwd)"

if [ -z "$archive_dir" ]; then
  archive_dir=".trellis/tasks/archive/$(date +%Y-%m)/$slug"
fi
if [ -z "$message" ]; then
  message="chore(task): archive $slug"
fi

paths=()
[ -d "$archive_dir" ] && paths+=("$archive_dir")
[ -d ".trellis/tasks/$slug" ] && paths+=(".trellis/tasks/$slug")

task_json=""
for candidate in "$archive_dir/task.json" ".trellis/tasks/$slug/task.json"; do
  if [ -f "$candidate" ]; then
    task_json="$candidate"
    break
  fi
done

if [ -n "$task_json" ]; then
  while IFS= read -r declared; do
    [ -n "$declared" ] || continue
    [ -e "$declared" ] && paths+=("$declared")
  done < <(python3 - "$task_json" <<'PY'
import json
import sys

try:
    with open(sys.argv[1], encoding='utf-8') as handle:
        data = json.load(handle)
except Exception:
    raise SystemExit(0)

scope = (data.get('meta') or {}).get('scope') or {}
categories = scope.get('categories') or {}
groups = categories.values() if isinstance(categories, dict) else categories
for rules in groups:
    if isinstance(rules, str):
        rules = [rules]
    if not isinstance(rules, list):
        continue
    for rule in rules:
        if not isinstance(rule, str):
            continue
        print(rule[:-3] if rule.endswith('/**') else rule)
PY
)
fi

if [ "${#paths[@]}" -eq 0 ]; then
  echo "找不到归档目录 $archive_dir 或源目录 .trellis/tasks/$slug，也没有声明路径" >&2
  exit 1
fi

echo "仓库根: $repo_root"
echo "归档目录: $archive_dir"
echo "提交信息: $message"
echo "提交路径:"
for path in "${paths[@]}"; do
  echo "  - $path"
done

status="$(git status --short -- "${paths[@]}")"
if [ -z "$status" ]; then
  echo "nothing to commit"
  exit 0
fi

echo
echo "git status --short:"
printf '%s\n' "$status"

if [ "$dry_run" -eq 1 ]; then
  echo
  echo "[dry-run] git add -- ${paths[*]}"
  echo "[dry-run] git commit -m \"$message\" -- ${paths[*]}"
  exit 0
fi

echo
git add -- "${paths[@]}" || {
  echo "git add 失败" >&2
  exit 1
}
git commit -m "$message" -- "${paths[@]}"
rc=$?
if [ "$rc" -ne 0 ]; then
  echo "git commit 失败（exit $rc）" >&2
  exit "$rc"
fi
echo "归档提交完成: $message"
