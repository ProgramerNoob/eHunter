#!/bin/bash
# 断言已登记的决策文档描述当前实现时不写死会随代码变化的时长与像素字面量。
# 文档只按符号或定性关系表述，具体数值归代码。
#
# DOCS 是逐篇手工登记的清单，不宣称覆盖整个 decisions/ 目录：
# 新文档要受本脚本保护，必须在这里加一行；未加入的文档不受检查。
# 登记范围只含「以当前实现为准」的决策文档；记录已确认产品边界的文档
# （如 2026-09-18-reader-behavior.md 里的放大镜下界）保留具体数值，不登记。
set -u
cd "$(dirname "$0")/.." || exit 2

DOCS=(
  .trellis/spec/frontend/decisions/2026-10-26-jump-scroll-lock.md
)

status=0

# macOS 自带 bash 3.2 下，空数组展开 "${DOCS[@]}" 会因 set -u 报 unbound variable；
# 先用 ${#DOCS[@]} 判空可避开。
if [ "${#DOCS[@]}" -eq 0 ]; then
  echo "OK: no registered decision documents"
  exit 0
fi

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
  echo "OK: registered decision documents carry no literal durations"
fi
exit "$status"
