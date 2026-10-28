# 临时产物体积报告

`.tmp/` 存放浏览器轮次产物、构建日志和一次性探路脚本，不受版本控制，也没有自动清理。跑过多轮验收后它会累积到 GB 级，其中大部分轮次已不被任何 `acceptance.json` 引用。`scripts/tmp-report.mjs` 只读统计这些数字，既是 `npm run check` 的首道门禁，也是人工清理范围的依据；它不删除任何文件。

## 用法

```bash
npm run tmp:report                # 人类可读摘要，超预算退出码 1
npm run tmp:report -- --json      # 机器可读
npm run tmp:report -- --max-bytes 4294967296 --max-orphan-bytes 2147483648
```

`npm run check` 的首步即 `npm run tmp:report`，超预算会让整条检查链在 `check:syntax` 与 `type-check` 之前失败——那时问题在本地磁盘而不是代码。全新 clone 或 CI 没有 `.tmp/`，报告按 0 字节处理并退出 0。

默认预算为总占用 3 GiB、未引用轮次 2 GiB，两者都可覆盖。两个预算分开的意义不同：总量把构建日志、探路脚本一起算进去，`--max-orphan-bytes` 只针对 `browser-preflight` 轮次目录，用来把「总量还在预算内、但这批轮次已经没人引用」单独暴露出来。

退出码 0 表示在预算内，1 表示超出预算；命令本身不修改 `.tmp/`。

读取失败（权限不足、文件在列举与 `stat` 之间消失、`acceptance.json` 解析失败）不改变退出码，只在报告里计数并按 `reason` 聚合，`--json` 下对应 `readFailures.count`、`readFailures.reasons` 与最多 5 条 `sample`。报告是估算：让一个不可读子目录把结论翻成「超预算」同样会误导，但读不到的部分必须看得见，否则体积会被低估而影响删除决策。

## 引用口径

脚本遍历 `.trellis/**/acceptance.json`，收集每个 check 的 `evidence` 与 `execution.log` 里的 `.tmp/` 路径，把它们视为「仍被引用」。`.tmp/browser-preflight/<round-dir>` 按目录聚合体积，目录下没有任何被引用文件的即为**未引用轮次**。非 `browser-preflight` 的路径只计入总量，不参与轮次判定。

已被清理的归档任务会在 `acceptance.json` 里留下指向已删除文件的引用，脚本把它们照样算作被引用；这不会让统计失真过多，但清理时不必为了这些历史引用保留文件。反过来，仍被引用的文件即使体积很大也要保留——那是验收证据。

## 清理方式

先跑报告确认范围，再按目录逐个删除。删除前确认该轮次确实不被任何 `acceptance.json` 引用，并保留仍是失败反证的轮次——按验收指南，失败的 `check.assert` 轮次是断言确实会变红的证据。

清理完成后重跑报告，确认总量下降且没有新出现的悬空引用超出预期。
