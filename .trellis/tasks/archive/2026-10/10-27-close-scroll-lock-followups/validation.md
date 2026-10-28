# 验收记录：收口跳转锁余量常量与决策文档守卫入仓

## 结论

两处遗留都收拾完。锁定期余量有了名字，文档守卫进了版本控制并挂进 `npm test`，且已证实能在违规时失败。

## 1. 余量提成常量（AC1）

`core/components/AlbumScrollView.vue`：

```js
const animationTime = 800
const scrollLockMarginMs = 200
```

```js
scrollLockUntil = Date.now() + animationTime + scrollLockMarginMs
```

常量值与原先的裸 `200` 相同，运行时行为不变。

校验 `.tmp/followups-ac1.sh`（exit 0，日志 `.tmp/followups-ac1.log`）：
- `OK: scrollLockMarginMs declared`
- `OK: lock computation uses the constant`
- 无 `scrollLockUntil = Date.now()[^;]*+ 200` 匹配。

## 2. 守卫脚本入仓（AC2）

`.tmp/scroll-lock-doc-drift-grep.sh` 被重写为 `tests/check-decision-doc-durations.sh`：

- 相对自身路径 `cd` 到仓库根，可从任意目录调用。
- 文档清单以数组维护，便于后续新增受约束的决策文档。
- 缺文件或命中字面量都 exit 1，并把命中行号打印出来。
- `git ls-files tests/ | grep decision-doc` 确认已纳入版本控制。

`package.json` 新增 `test:decision-docs`，并串入 `test` 链尾部（`... && npm run test:layout-model && npm run test:decision-docs`）。

## 3. 守卫可失败性（AC3）

在决策文档末尾临时追加「测试：锁定期约 1s。」：

- 脚本输出 `36:测试：锁定期约 1s。` + `FAIL: literal durations or pixel sizes in .trellis/spec/frontend/decisions/2026-10-26-jump-scroll-lock.md`，exit 1（`.tmp/followups-guard-violation.log`）。
- 还原后 `OK: decision documents carry no literal durations`，exit 0（`.tmp/followups-guard-restored.log`）。
- `git diff` 对该文档只剩第 23 行的符号表述改动，无测试残留。

## 4. 全量校验（AC4）

- `npm run test:decision-docs` → exit 0（`.tmp/followups-test-decision-docs.log`）。
- `npm run check`（type-check + test + build-prod + check:docs）→ exit 0（`.tmp/followups-check.log`，含 `OK: decision documents carry no literal durations` 与 `check-docs: OK`）。

## 范围说明

用户复核的第 3 点（「重钳制不跳过」不补反向守卫）已确认按现状接受，本任务不动。该约束仍只由 `10-26-fix-spec-reclamp-gaps` 的浏览器轮证据支撑。

## 补充：2026-10-29 重跑

原始 `.tmp` 日志已随 `.tmp` 清理删除，`acceptance.json` 里这几条一度被改成 inspection。按 `quality-guidelines.md` 的「inspection 不能证明运行时行为」，behavior 类改为重跑取证：

| check | argv | 结果 |
| --- | --- | --- |
| `doc-guard-script-tracked` | `npm run test:decision-docs` | exit 0 |
| `doc-guard-detects-violation` | `bash .trellis/tasks/archive/2026-10/10-27-close-scroll-lock-followups/rerun/guard-followups.sh` | exit 0 |
| `check-suite` | `npm run check` | exit 0 |

`rerun/guard-followups.sh` 在 `.tmp` 下建私有副本树重放三态（当前清单 exit 0 → 追加「锁定期约 1s。」exit 1 并报第 36 行 → 还原 exit 0），不触碰仓库内文档，跑完删除副本。脚本随任务归档保存，可随时重跑。
