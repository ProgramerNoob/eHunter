# 收窄决策文档守卫的适用范围说明

## Goal

`tests/check-decision-doc-durations.sh` 的头注释宣称「断言决策文档……不写死时长与像素字面量」，读起来像覆盖整个 `decisions/` 目录，但 `DOCS` 只登记了一篇。同目录下的 `2026-09-18-reader-behavior.md:39` 有「含小于 20px 的边界」，一旦登记就会 FAIL。结果是「一条通用规则只对一份文档生效，另一份同类文档违规却没被拦住」。本任务把措辞收窄为「已登记的决策文档」，并写明登记是逐篇手工的。

## Requirements

- R1 脚本头注释把约束范围限定为「已登记的决策文档」，不再宣称覆盖整个目录。
- R2 `DOCS` 上方说明新文档需手工加入、未加入的不受保护。
- R3 说明登记取舍：以当前实现为准的决策文档登记；记录已确认产品边界的文档（`2026-09-18-reader-behavior.md` 的放大镜下界）保留具体数值、不登记。
- R4 处理 macOS 自带 bash 3.2 下空数组在 `set -u` 里展开 `"${DOCS[@]}"` 报 `unbound variable` 的隐患。
- R5 不改检查逻辑：命中或文件缺失仍然 exit 1，通过仍 exit 0。

## Constraints

- 只改 `tests/check-decision-doc-durations.sh`。
- 不动 `2026-09-18-reader-behavior.md` 的任何内容（那处的 20px 是已确认的产品边界）。
- 不改 `package.json` 的测试链。

## Acceptance Criteria

- [AC1] 脚本头注释不再出现可被理解为「全目录覆盖」的表述，改为「已登记的决策文档」。
- [AC2] `DOCS` 上方有说明：清单逐篇手工登记，未登记的文档不受检查，并写明不登记 reader-behavior 的原因。
- [AC3] `DOCS=()` 空清单时脚本不报 `unbound variable`，输出提示并 exit 0。
- [AC4] 对当前清单仍 exit 0；模拟把 `2026-09-18-reader-behavior.md` 登记进去时 exit 1 并指出该文件的命中行。
- [AC5] `npm run test:decision-docs` 与 `npm run check` 均 exit 0。

## Notes

- 来源：用户对 `484704f` 的复核（2026-10-27），用户倾向方案 2（收窄说明）而非改写 reader-behavior。
