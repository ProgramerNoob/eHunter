# Implement: 复盘遗留改进收口

执行顺序：04 → 05 → 06 → 03。每项独立 commit。开始实现前确认 PRD/design 已获用户批准并 `task.py start`。

## 前置

- [ ] 确认 `.tmp/` 中无 S19 文档检查脚本残留可复用（`find .tmp -name '*.py' -o -name '*.mjs' | xargs grep -l 'spec' 2>/dev/null` 粗筛）
- [ ] 新分支 `feat/retrospective-followup`，基线 master

## 04 · 审查职责冲突

改动文件：

- [ ] `.pi/agents/trellis-check.md`：frontmatter description 与 L23 段落改为双模式表述（默认自检；派发方声明 `review-only` 时只读返回 findings，不修改受审文件、不更新 acceptance.json）
- [ ] `.agents/skills/trellis-check/SKILL.md` 第 5 节：补两种模式的触发条件与行为差异
- [ ] `AGENTS.md` 技能分工段：补正式审查派发方式一句
- [ ] `.trellis/spec/tooling/pi-context.md`：记录双模式契约与 `trellis update` 后复查点

验证：

```bash
node --test scripts/test-trellis-extension.mjs
python3 -m unittest discover -s scripts -p 'test_trellis_lean_context.py'
node scripts/measure-trellis-context.mjs --check
python3 -m unittest discover -s scripts -p 'test_acceptance.py'
```

- [ ] 四条命令退出码均 0
- [ ] 派发一次真实 trellis-check（review-only 声明）子代理，核对未写受审文件（可用本任务 05 的 diff 做受审对象）

commit：`fix(tooling): 区分 trellis-check 自检与正式审查模式`

## 05 · 归档未跟踪路径提交错误

改动文件：

- [ ] `.trellis/scripts/common/task_store.py`：抽出 `_archive_commit_paths(paths, source_rel, source_was_tracked)`；commit 与 `diff --cached --quiet` 统一使用该结果；`git rm --cached --ignore-unmatch` 保持不变
- [ ] 新增 `tests/archive-autocommit.test.mjs`（node:test，stub git 经 PATH 注入）：
  - 未跟踪任务：commit pathspec 不含 source_rel，无 Auto-commit failed
  - 已跟踪任务：pathspec 含 source_rel，提交正常
  - 含 modified_children：子任务路径保留
  - 无关已暂存文件不被夹带（pathspec 显式即可，断言参数不含其他路径）
- [ ] `package.json`：测试接入（并入 `test` 链或独立 script 后并入）

验证：

```bash
node --test tests/archive-autocommit.test.mjs
python3 -m unittest discover -s scripts -p 'test_acceptance.py'
npm run test
```

- [ ] 全部退出码 0
- [ ] 在本仓库做一次真实归档 dry-run 核对：建临时未跟踪任务→归档→无 WARN→`git status` 干净（随后丢弃该临时提交或保留为真实交付证据）

commit：`fix(tooling): 归档未跟踪任务不再提交失败`

## 06 · 待办同步与文档检查

06A：

- [ ] 修改 `.trellis/spec/frontend/features/pending-work.md:24` 末尾遗留句，注明两处硬化已实现（`StatusNotificationItem.vue:69`、`StatusNotificationStack.vue:44-45`），历史计数口径不动

06B：

- [ ] 新增 `scripts/check-docs.mjs`（Node 标准库，零依赖）：
  - 扫描 `.trellis/spec/` 的 `.md` 相对链接目标存在性
  - `#fragment` 锚点对照目标文件标题（GitHub slug 规则）
  - `.yaml/.yml` 中本地 `$ref` 文件存在性
  - 外链只记录不校验；断链/坏锚点/坏 `$ref` 非零退出
- [ ] 先在当前树上运行，处理真实命中（修链接或加最小允许清单并在注释说明来源）
- [ ] 跑绿后接入 `npm run check` 链尾

验证：

```bash
node scripts/check-docs.mjs
npm run check
```

- [ ] 退出码 0；故意制造一个断链接口验证非零（随后还原）

commit：`feat(tooling): 文档链接与引用检查接入门禁；同步待办入口`

## 03 · 浏览器准备断言评估

- [ ] 通读 `scripts/browser-preflight.mjs` 断言点，与 `tests/browser-preflight.test.mjs` 覆盖对照
- [ ] 在 `.trellis/spec/frontend/browser-acceptance.md` 增补"预检断言覆盖"一节：已覆盖清单（指向源码函数）、未覆盖项（真实下载冒烟、物理设备、Node22/Python3.12 本机矩阵）及归属场景/后续任务候选
- [ ] 若发现断言存在但未阻断的低成本缺陷：修复并回归（单独评估改动量，超范围则记录为后续任务）

验证：

```bash
npm run test:browser-preflight
```

- [ ] 退出码 0；文档清单与源码一致（抽查 3 个断言点）

commit：`docs(frontend): 浏览器预检断言覆盖清单`

## 收尾（trellis-check 后）

- [ ] 四项验收标准逐条对照 PRD 勾选，证据写入 acceptance.json（主会话合并）
- [ ] `npm run check` 全绿
- [ ] spec 更新：`pi-context.md`（04）、`browser-acceptance.md`（03）已含在对应步骤；确认无其他需要沉淀的契约
- [ ] journal 记录；归档任务

## 回滚点

每个 commit 独立 revert；06B 若误报先摘出 `npm run check`。
