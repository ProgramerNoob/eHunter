# 实施计划：验收证据与浏览器收口护栏

## 1. 规划完成门槛

1. 完成父与四 child 的 PRD/design/implement，补全真实 `implement.jsonl`/`check.jsonl`，核对每个 `task.json.meta.scope` 与文件边界一致。
2. 静态核验全部 task JSON、manifest JSONL、parent-child links 和文档链接；本计划本身不启动任务、不运行功能测试。
3. 本轮最终摘要后须用户明确批准要启动的下一个 child；父任务继续保持 planning，不能先启动父任务。

## 2. 子任务实施顺序

4. 首先启动 `.trellis/tasks/10-17-browser-artifact-verification/`：固定 artifactVersion/provenance/result关联；扩展 preflight 事实；实现只读 `verify-browser <artifact-dir>` freshness/语义校验；补 EH/NH/Vite、stale/blocked/unresolved/identity/legacy fixture。
5. 完成后检查实际改动和测试，再启动 `.trellis/tasks/10-17-page-bootstrap/`：实现真实页面观察、normal UI hooks、persisted book/scroll、`.awesome-scroll-view` 指标、相对页 baseline 和 `.tmp/` prep facts；不改产品 UI。
6. 再启动 `.trellis/tasks/10-17-task-scope-gate/`：实现 `meta.scope` schema/create 默认 scope/JSON meta 更新；`task.py start` 保存 task-local scope-start snapshot；归档按快照之后变化收集路径并在 native archive 前置 gate；验证 acceptance archive 共用路径、启动前既有改动不误阻断且 finish 不变。
7. 最后启动 `.trellis/tasks/10-17-resource-cleanup-check/`：实现显式 pages/servers JSON、PID/cwd/port/PID 文件核对与分类输出；它与 scope child 不同时编辑 `scripts/acceptance.py`。
8. 每个 child 完成开发/单元测试和自检后固定该 child 版本，再进行独立 review；发现问题在当轮按 workflow 处理，不能把未完成 child 报告为集成完成。

## 3. 父任务集成与验收

9. 四 child 全部交付并核对后，父任务更新 `.trellis/spec/frontend/browser-acceptance.md`、`.trellis/spec/frontend/quality-guidelines.md`、`.trellis/spec/tooling/index.md`、`.pi/skills/eh-test/SKILL.md` 与相关 workflow，写共同 schema、失败分类、legacy 兼容和最小命令示例。
10. 跑新增专项测试、`npm test`、`npm run type-check`、`npm run build-prod`、`npm run check:docs`；用临时 task fixture 演练 direct native archive/acceptance archive、范围越界无副作用、verifier 新鲜度与 cleanup 分类。真实 browser/platform 功能验收按项目指南另外执行，不以构建通过冒充。
11. 固定父实现与测试版本，运行 review-only 最终检查；完成跨子任务 AC5/AC6 集成验收后再进入归档。

## 4. 子任务交付检查点

- Artifact：通过仅限 result passed/checks complete/no errors/no unresolved、identity 相符且当前源 fingerprint 相符；legacy 明确 legacy；输入只读。
- Page：实际模式、scroll container 与相对页基线有事实证据；异常 prep blocked/unknown；两个 persisted mode 和 desktop/mobile fixtures 覆盖。
- Scope：合法路径两条 archive 入口通过；越界在状态/目录/pointer/evidence/commit 前阻断；旧任务 legacy；finish 不触发 gate。
- Cleanup：clean/residual/preserved/unknown 区分稳定；user-owned preserved；无 close/kill/unlink；输出写 `.tmp/`。

## 5. 风险与回滚点

- Provenance 与 preflight schema：只增字段、保留原 result；verifier 误报时保留 artifact 并停止新 verifier 调用。
- Scope gate 与历史任务：新建任务自动有 scope，旧无字段任务只诊断；archive 拒绝时不允许发生状态、目录、pointer 或 commit 变化。
- Cleanup ownership：不处置未知资源；输入不足标 unknown，报告人工核验，不删除/关闭任何对象。
- 共享 `scripts/acceptance.py` 冲突：artifact、scope、cleanup 按序集成；同一文件同一时间只有一个写入者。
- Page selectors/status：selector 只用于读真实 reader DOM；若 DOM 变化导致误报，回滚 helper/fixture，不改产品 DOM。

## 6. 验证命令

- 各 child 专项 fixture/unit test（具体命令在 child `implement.md` 固定）
- `npm test`
- `npm run type-check`
- `npm run build-prod`
- `npm run check:docs`
- `python3 ./.trellis/scripts/task.py validate <task-dir>`
- `python3 scripts/acceptance.py summarize <task-dir>`
- 临时 task lifecycle 练习 direct/acceptance archive 和 cleanup/verifier；临时目录及输出放 `.tmp/`
