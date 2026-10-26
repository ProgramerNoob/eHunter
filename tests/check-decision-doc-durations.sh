#!/bin/bash
# 断言决策文档描述当前实现时不写死会随代码变化的时长与像素字面量。
# 文档只按符号或定性关系表述，具体数值归代码。
set -u
cd "$(dirname "$0")/.." || exit 2

DOCS=(
  .trellis/spec/frontend/decisions/2026-10-26-jump-scroll-lock.md
)

status=0
for doc in "${DOCS[@]}"; do
  if [ ! -f "$doc" ]; then
    echo "FAIL: missing document $doc"
    status=1
    continue
  fi
  if grep -nE "[0-9]+ ?(ms|px|s)\b|约 [0-9]" "$doc"; then
    echo "FAIL: literal durations or pixel sizes in $doc"
    status=1
  fi
done

if [ "$status" -eq 0 ]; then
  echo "OK: decision documents carry no literal durations"
fi
exit "$status"
