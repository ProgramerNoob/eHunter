# 验收记录：收窄决策文档守卫的适用范围说明

## 结论

脚本头注释不再宣称覆盖整个 `decisions/` 目录，改为「已登记的决策文档」；`DOCS` 上方写明逐篇手工登记、未登记不受保护，并记录不登记 `2026-09-18-reader-behavior.md` 的原因。同时修掉 macOS bash 3.2 下空清单会报 `unbound variable` 的隐患。检查逻辑一行未改。

## 1. 措辞收窄（AC1、AC2）

改前头注释：「断言决策文档描述当前实现时不写死会随代码变化的时长与像素字面量。」——读起来像覆盖整个目录，但 `DOCS` 只有一篇。

改后：

- 首句改为「断言**已登记的**决策文档描述当前实现时……」
- 通过文案改为 `OK: registered decision documents carry no literal durations`
- `DOCS` 上方四行说明：清单逐篇手工登记、不宣称覆盖整个 `decisions/` 目录、新文档要加一行才受保护、未加入的不受检查
- 并写明登记取舍：只登记「以当前实现为准」的决策文档；记录已确认产品边界的文档（`2026-09-18-reader-behavior.md` 里的放大镜下界）保留具体数值、不登记

校验 `.tmp/guard-scope-ac1.sh`（exit 0，日志 `.tmp/guard-scope-ac1.log`）逐条断言这五处措辞存在、旧的全目录措辞已消失。

## 2. 空清单安全（AC3）

新增守卫：

```bash
if [ "${#DOCS[@]}" -eq 0 ]; then
  echo "OK: no registered decision documents"
  exit 0
fi
```

`bash --version` 实测为 `GNU bash, version 3.2.57(1)-release (arm64-apple-darwin26)`。清空 `DOCS` 的副本执行后输出 `OK: no registered decision documents`，rc=0，无 `unbound variable`。

## 3. 行为未变（AC4）

`.tmp/guard-scope-ac3-ac4.sh`（exit 0，日志 `.tmp/guard-scope-ac3-ac4.log`）三档：

| 场景 | rc | 输出 |
| --- | --- | --- |
| 空清单 | 0 | `OK: no registered decision documents` |
| 当前清单 | 0 | `OK: registered decision documents carry no literal durations` |
| 登记 reader-behavior | 1 | `39:…含小于 20px 的边界…` + `FAIL: literal durations or pixel sizes in .trellis/spec/frontend/decisions/2026-09-18-reader-behavior.md` |

第三档证明收窄说明确有必要：那份文档的 `20px` 是已经确认过的产品边界，不是会随代码漂移的实现细节。

## 4. 全量校验（AC5）

- `npm run test:decision-docs` → exit 0（`.tmp/guard-narrow-test.log`）
- `npm run check`（type-check + test + build-prod + check:docs）→ exit 0（`.tmp/guard-narrow-check.log`），含 `OK: registered decision documents carry no literal durations` 与 `check-docs: OK`

## 范围说明

- 只改 `tests/check-decision-doc-durations.sh`，未动 `2026-09-18-reader-behavior.md`，未改 `package.json` 测试链。
- 检查逻辑（缺文件 exit 1、命中 exit 1、通过 exit 0）保持原样。
- `set -u` 无 `set -e` 是刻意的：要多篇文档都报错而非第一篇就退出；现在注释里也点明了空数组的原因。

## 补充：2026-10-29 重跑

原始 `.tmp` 日志已随 `.tmp` 清理删除，`acceptance.json` 里这几条一度被改成 inspection。按 `quality-guidelines.md` 的「inspection 不能证明运行时行为」，behavior 类改为重跑取证：

| check | argv | 结果 |
| --- | --- | --- |
| `empty-list-safe` | `bash .trellis/tasks/archive/2026-10/10-27-narrow-doc-guard-scope/rerun/guard-narrow.sh empty` | exit 0 |
| `guard-behavior-unchanged` | `bash .trellis/tasks/archive/2026-10/10-27-narrow-doc-guard-scope/rerun/guard-narrow.sh widened` | exit 0 |
| `check-suite` | `npm run check` | exit 0 |

`rerun/guard-narrow.sh` 支持 `all|current|widened|empty` 四种模式，在 `.tmp` 下建私有副本树重放，不触碰仓库内文档，跑完删除副本。脚本随任务归档保存，可随时重跑。
