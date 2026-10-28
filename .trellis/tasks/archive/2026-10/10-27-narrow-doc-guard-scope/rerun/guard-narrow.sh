#!/bin/bash
# 在私有副本树里重放 10-27 的守卫范围断言，不触碰仓库内的任何文档或脚本。
# 用法：guard-narrow.sh [all|current|widened|empty]（默认 all）
set -u
cd "$(git rev-parse --show-toplevel)" || exit 2

MODE=${1:-all}
WORK=.tmp/rerun-10-27/work-narrow
DOC=.trellis/spec/frontend/decisions/2026-10-26-jump-scroll-lock.md
REG=.trellis/spec/frontend/decisions/2026-09-18-reader-behavior.md
SCRIPT=tests/check-decision-doc-durations.sh
rm -rf "$WORK"
mkdir -p "$WORK/tests" "$WORK/.trellis/spec/frontend/decisions"
cp "$SCRIPT" "$WORK/$SCRIPT"
cp "$DOC" "$WORK/$DOC"
cp "$REG" "$WORK/$REG"
cp "$WORK/$SCRIPT" "$WORK/script.orig"

fail=0
run() { bash "$WORK/$SCRIPT"; }
reset_script() { cp "$WORK/script.orig" "$WORK/$SCRIPT"; }

if [ "$MODE" = all ] || [ "$MODE" = current ]; then
  if run; then
    echo "ok current list: exit 0"
  else
    echo "FAIL current list: should exit 0"
    fail=1
  fi
fi

if [ "$MODE" = all ] || [ "$MODE" = widened ]; then
  reset_script
  python3 - "$WORK/$SCRIPT" "$REG" <<'PY'
import sys
path, doc = sys.argv[1], sys.argv[2]
src = open(path, encoding='utf-8').read()
needle = '  .trellis/spec/frontend/decisions/2026-10-26-jump-scroll-lock.md\n'
if needle not in src:
    sys.exit('registration line not found: ' + repr(needle))
open(path, 'w', encoding='utf-8').write(src.replace(needle, needle + f'  {doc}\n', 1))
PY
  if [ $? -ne 0 ]; then
    echo "FAIL widened: DOCS 里找不到登记行（缩进或路径被改过），重放脚本需要同步更新"
    fail=1
  fi
  out=$(run 2>&1)
  rc=$?
  if [ "$rc" -eq 1 ] && printf '%s' "$out" | grep -q '小于 20px' && printf '%s' "$out" | grep -q 'FAIL: literal durations or pixel sizes in'; then
    echo "ok widened list: exit 1 and reader-behavior is named"
    printf '%s\n' "$out" | sed 's/^/    /'
  else
    echo "FAIL widened list: rc=$rc out=$out"
    fail=1
  fi
fi

if [ "$MODE" = all ] || [ "$MODE" = empty ]; then
  reset_script
  python3 - "$WORK/$SCRIPT" <<'PY'
import re, sys
path = sys.argv[1]
src = open(path, encoding='utf-8').read()
replaced, count = re.subn(r'DOCS=\(\n(?:  .*\n)*\)', 'DOCS=()', src, count=1)
if count != 1:
    sys.exit('DOCS array block not found')
open(path, 'w', encoding='utf-8').write(replaced)
PY
  if [ $? -ne 0 ]; then
    echo "FAIL empty: DOCS 数组块匹配不上（格式被改过），重放脚本需要同步更新"
    fail=1
  fi
  out=$(run 2>&1)
  rc=$?
  if [ "$rc" -eq 0 ] && [ "$out" = 'OK: no registered decision documents' ]; then
    echo "ok empty list: exit 0 with the empty-list notice (no unbound variable)"
  else
    echo "FAIL empty list: rc=$rc out=$out"
    fail=1
  fi
fi

rm -rf "$WORK"
[ "$fail" -eq 0 ] && echo "RESULT: PASS" || echo "RESULT: FAIL"
exit "$fail"
