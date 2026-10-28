#!/bin/bash
# 在私有副本树里重放 10-27 的守卫往返断言，不触碰仓库内的任何文档或脚本。
set -u
cd "$(git rev-parse --show-toplevel)" || exit 2

WORK=.tmp/rerun-10-27/work-followups
DOC=.trellis/spec/frontend/decisions/2026-10-26-jump-scroll-lock.md
rm -rf "$WORK"
mkdir -p "$WORK/tests" "$WORK/.trellis/spec/frontend/decisions"
cp tests/check-decision-doc-durations.sh "$WORK/tests/"
cp "$DOC" "$WORK/$DOC"
cp "$WORK/$DOC" "$WORK/doc.orig"

fail=0
run() { bash "$WORK/tests/check-decision-doc-durations.sh"; }

if run; then
  echo "ok baseline: current documents exit 0"
else
  echo "FAIL baseline: current documents should exit 0"
  fail=1
fi

printf '\n锁定期约 1s。\n' >>"$WORK/$DOC"
out=$(run 2>&1)
rc=$?
if [ "$rc" -eq 1 ] && printf '%s' "$out" | grep -q '锁定期约 1s'; then
  echo "ok violation: exit 1 and the offending line is reported"
  printf '%s\n' "$out" | sed 's/^/    /'
else
  echo "FAIL violation: rc=$rc out=$out"
  fail=1
fi

cp "$WORK/doc.orig" "$WORK/$DOC"
if run; then
  echo "ok restored: exit 0 after reverting the document"
else
  echo "FAIL restored: reverting should return to exit 0"
  fail=1
fi

rm -rf "$WORK"
[ "$fail" -eq 0 ] && echo "RESULT: PASS" || echo "RESULT: FAIL"
exit "$fail"
