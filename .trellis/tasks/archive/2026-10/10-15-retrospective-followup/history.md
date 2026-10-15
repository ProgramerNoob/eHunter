# 提交历史收拢记录

本任务完成后，master 尾部区段（收拢前 9 个提交）被合并为更少的提交，
`acceptance.json` 中引用的原始 hash 已不在 master 历史中。本文件保留
收拢前后映射，供验收证据追溯。

## 收拢范围

基点 `9695923`（`merge: 整合 trellis-lean-tool-descriptions 到 master`）
之后的 9 个线性提交收拢为 2 个，尾部区段无 merge 提交。
自真正基点 `526822b`（`origin/master` 推送前位置）计，提交总数 61 → 54；
随后的引用修复提交 `d8af284` 使总数变为 55。

## 映射

| 收拢前 | 收拢后 | 内容 |
| --- | --- | --- |
| `491e335` `4ef6d5f` `3b65097` `4174f7a` `32712fe` `494c3bd` | `6f5499b` | `fix(tooling): 收口复盘遗留 03-06 项与归档提交链路` |
| `1437eec` `14a2434` `35ded04` | `19e49fb` | `chore(task): 归档 10-15-retrospective-followup 验收与日志` |

各原始提交对应的改动：

- `491e335` — trellis-check 双模式（自检 / review-only）与 pi-context 契约
- `4ef6d5f` — 归档临时任务 `10-15-tmp-archive-verify`
- `3b65097` — `_archive_commit_paths` 修复未跟踪任务归档提交失败；新增 `scripts/test_archive_autocommit.py`
- `4174f7a` — 新增 `scripts/check-docs.mjs` 并接入 `npm run check`
- `32712fe` — `browser-acceptance.md` 4.5 节预检断言覆盖清单
- `494c3bd` — 重生成 measure token 报告（review-only F1 修复）
- `1437eec` — acceptance.json 与 PRD 接受标准编号对齐
- `14a2434` — 归档任务目录至 `archive/2026-10/`
- `35ded04` — 记录会话日志

## 无损失验证

收拢通过 `git commit-tree` 复用两端树对象完成，未经 rebase：

- 收拢前末端树 `518af4d65717852e6edca1efb5a5dcaa8e9868a5` =
  收拢后末端树（逐字节一致）
- `git diff` 收拢前后末端仅差 `acceptance.json` 三处 hash 引用括注
- 收拢后 `npm run check` 退出码 0（type-check、acceptance 37+10 例、
  node 测试 46+96+50 全 pass、check-docs、build-prod）

## 后续提交

- `d8af284` — `acceptance.json` 三处 note 的 hash 引用改指 `6f5499b`
  并括注原 hash；本文件即为该追溯需求的落地
- 推送至 `origin/master`：`526822b..d8af284`

## 原始提交的可达性

安全网分支 `backup/pre-squash-20261015` 与标签 `pre-squash-20261015`
在推送确认后已删除。原始提交目前仅经 reflog 可达，将在 reflog 过期
（默认 90 天）且执行 `git gc` 后彻底不可恢复。
