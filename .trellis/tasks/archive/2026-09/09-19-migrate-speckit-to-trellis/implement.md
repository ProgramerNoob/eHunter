# 执行计划

状态：迁移实施与独立审查完成，PRD 六项验收均通过。内容提交：`fb8f136`。归档目录：`.trellis/tasks/archive/2026-09/09-19-migrate-speckit-to-trellis`；以下 start 命令保留原执行记录。

## 进入实施的条件

- [x] PRD、design、本文及 research 清单齐全，两个 JSONL 清单各含 3 个真实上下文；规划路径、115 个源哈希、格式和任务状态检查通过。
- [x] 用户审阅最终规划摘要并明确同意实施；已执行 `python3 ./.trellis/scripts/task.py start .trellis/tasks/09-19-migrate-speckit-to-trellis`。
- [x] 已读取 Phase 2.1 详情；Git 基线仍为 `647ff26`，仅本任务规划文件未提交，无新增用户修改。

## 顺序与交付

1. **产品知识迁入**
   - [x] 由一个 `trellis-implement` 写入者迁入 56 份功能资料、行为决策和根产品目标，按 design 位置保全；不修改任务勾选/编号或契约语义。
   - [x] 创建 features 索引与 pending-work 导航，显式保留 114 个未勾任务及独立验收清单状态、已知冲突。
   - [x] 原始内容保全比对和相对链接核对完成后才删除对应旧文件。
2. **流程与有效入口迁移**
   - [x] 完整迁入 browser-acceptance；将 constitution 稳定条款补齐到现有指南；更新 AGENTS 非托管区、frontend 指南、eh-test、README、README_CN、.npmignore。
   - [x] `.pi/settings.json` 只清理 15 个旧 prompt 禁用项，验证其他值不变且仍被忽略。
   - [x] 按源清单移除 `.specify/`、15 个 `.pi/prompts/speckit.*.md`、旧专项指南和用户要求清理的剩余目录内容。
   - [x] 确认 `src/`、`core/`、依赖/构建配置、Trellis 托管资产和 EH loader 无改动（198 个 Git 文件及 AGENTS 托管区逐字节对照；被忽略的 template-hashes 未写入，交接哈希见报告）。
3. **检查与固定版本审查**
   - [x] 测试开始前执行 notify-complete 短通知；执行下方文档和工具检查，记录命令与结果。
   - [x] 实施代理结束，主会话已核验实际 diff 和 195 项交接哈希；只读 `trellis-check` 已独立审查全部迁移，审查前后哈希一致。
   - [x] 独立审查无阻塞项或待修复问题，无需修复轮次；实施与审查代理均已结束，未修改固定版本。
4. **交付与归档**
   - [x] `research/migration-report.md` 记录每类来源的实际处理、constitution 条款映射、状态保全、验证范围与遗留项。
   - [x] PRD 六项验收已回填；内容提交为 `fb8f136`，任务已归档，Session 2 已写入日志；归档记录与日志按 Finish 顺序分批提交。
   - [x] 28 个本任务临时检查文件及回读上下文副本已清理；测试通知进程已退出。本任务未启动服务/浏览器或占用端口，交付报告已列明未运行的产品验收范围。

## 验证命令与通过标准

所有命令从仓库根目录执行。检查脚本如需临时生成，放在 `.tmp/`，最终报告保留结果。不要为本次迁移引入测试框架或修改业务测试。

```bash
git diff --check
python3 ./.trellis/scripts/task.py validate .trellis/tasks/archive/2026-09/09-19-migrate-speckit-to-trellis
python3 ./.trellis/scripts/get_context.py --mode packages
python3 ./.trellis/scripts/get_context.py --mode phase
npm pack --dry-run --json --ignore-scripts
```

- 以 `research/source-inventory.json` 对照 `git show 647ff26:<source>`：115 个来源均有处理记录；迁入的 59 个完整文档（57 个 specs + 产品目标 + 浏览器流程）全部存在。constitution/maintenance 的实质规则另以条款映射验证。
- 比较 7 份 tasks 的 ID、顺序、勾选和值：总数 366、已勾 252、未勾 114；requirements 为 124/12 未勾，quickstart 为 24/24 未勾。计数仅是必要条件，还需比较条目文本、正文与契约。
- 扫描所有修改/迁入 Markdown 的有效本地链接及标题锚点，检查契约 `$ref`；历史 `.tmp/` 证据、模板示例和未产出占位符单独列明。
- 用 `rg --hidden` 扫描 `specs/`、`.specify`、`speckit`、旧 browser-testing/speckit-maintenance 路径及根 design 引用，逐条区分历史记录和仍需修复的有效依赖；Trellis 任务设计名 `design.md` 保留。
- 确认用户指定的旧路径全部不存在，15 个旧 prompts 消失，3 个 Trellis prompts 与托管区哈希不变。
- npm dry-run 清单中没有 `.trellis/`、退役 Spec Kit 文件及临时调试文件；使用 `--ignore-scripts` 避免运行打包生命周期脚本。
- `.pi/settings.json` 可解析、仅移除约定项，并由 `git check-ignore .pi/settings.json` 确认不被提交。
- `git diff --name-status` 及未跟踪文件清单仅覆盖授权的文档/工作流与任务记录。

## 回退点

先复制到目标并核对，再移除旧入口。遇到正文丢失、规范冲突未记录或有效依赖缺失时停在本步骤修正；基线 `647ff26` 与逐文件哈希用于恢复来源，不执行破坏性 Git 操作。独立审查启动后停止修改，反馈统一在下一轮处理。

## 未运行范围

本次不运行产品 build、type-check、单元/浏览器功能验收；无产品源码变更。文档命令示例做路径、参数及现有技能/配置静态核对，不把示例当作已经执行成功的验收。
