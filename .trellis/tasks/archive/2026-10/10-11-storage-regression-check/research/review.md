# 02 正式只读 Standards / Spec 审查

结论：**Standards 无剩余问题；Spec 无剩余问题，建议 `formal-review: passed`。** 已完整检查五个冻结文件、十二场景族、01 接线及执行证据，未发现需要修改源码、测试或规范的问题。本轮修复受审文件数为 0。

当前真实验收记录仍为 **partial / exit 1**：11 passed，1 unrun（`formal-review`）。这描述已保存的记录，不是本轮审查未完成。仅主会话可合并建议条目并重新 summarize；本轮不提交、不归档、不写 acceptance.json。

## 审查范围与冻结

- 活动任务：`.trellis/tasks/10-11-storage-regression-check`；HEAD：`24f0b80ab115752b6b3797ab21277a96f2df2748`。
- 已加载 check.jsonl 全部七份资料及 PRD、design、implement，采用最终设计与研究第 4 节十二场景族；相关 quickstart 的完整浏览器矩阵不扩大为本次 VM 接受标准。
- 已通读 `tests/helpers/storage-fixture.cjs`、`tests/storage-lifecycle.test.cjs`、`.github/workflows/check.yml`，检查 `package.json` 的完整增量及 `.trellis/spec/frontend/quality-guidelines.md` 的 02 增量与 01 协议保留情况；按需要读取真实 app、layout、PlatformService 的存储/身份/reset/init 路径。
- 显式检查暂存区、工作区、未跟踪文件：暂存区为空；新增 tests/CI 与 01 脚本未因不在 diff 中而漏审。已有父任务/01 文档及 `scripts/__pycache__/acceptance.cpython-313.pyc` 保持原样；后者不是交付文件。
- [冻结前 SHA256](../../../../../../.tmp/storage-regression-check/review-freeze-before.json) 与 [冻结后 SHA256](../../../../../../.tmp/storage-regression-check/review-freeze-after.json) 覆盖五个受审文件、01 两个脚本及根锁。前后均一致。314 个副本输入也逐个与当前工作区/快照核对；其中 308 个非 overlay 输入与当前 HEAD 内容一致。
- 本轮唯一写入为本报告及 `.tmp/storage-regression-check/review-*` 证据；没有另派编码/检查子代理，没有未结束编码任务。

## Standards 独立结论

**通过，无剩余问题。**

| 核查点 | 证据与结论 |
| --- | --- |
| 最小范围、依赖与公开入口 | `package.json:12–15` 只增加四条脚本，无新增依赖；core/src/根锁/tsconfig 与 HEAD 无差异。测试调用公开 init、storeAction 和 PlatformService，不导出私有函数、不改产品算法。 |
| 真实模块与受控替身 | `tests/helpers/storage-fixture.cjs:12–20,74–89,98–129` 明确列出当前模块图与 i18n/event/album/download 边界。真实 Vue、app、layoutPreference、PlatformService 均执行；未知 import/转译 error 抛出，不用 Proxy 或源码 replace 绕过实现。 |
| 页面隔离与清理 | `tests/helpers/storage-fixture.cjs:32–35,131–145` 每页新 scope/cache/VM；重复 init 被拒绝。`tests/storage-lifecycle.test.cjs:25–29` 注册异步 dispose；需要刷新的场景先停止旧页再创建新页。清理中的 nextTick 异常不吞，finally 停止 scope。`:394–405` 用真实 watcher 证明保存及 dispose 后停止写入。 |
| 存储与时钟模型 | `tests/helpers/storage-fixture.cjs:38–69` 独立故障计数/开关，GM 缺 API 与抛错区分；GM get/set structuredClone，local set 保字符串。Date 同时控制 now、无参构造和 ISO；crypto 原生/缺失两分支，未固定相同 UUID。 |
| 失败传播 | `package.json:14–15` 串行 `&&`，Python 回归先于 Node 回归，再生产构建。实际负向退出码及后续阶段未运行见下表，不以外层探针 exit 0 替换被测命令原始失败。 |
| 路径、平台与编码 | helper 从自身目录定位当前源码；日常 runner 不读取 `.tmp`、历史 Git 对象或用户路径，不访问浏览器/网络。副本无 `.git`，真实安装使用根锁。基线为 macOS 本地及 Ubuntu CI 配置；Windows 未执行，也没有作 Windows 通过声明。 |
| 01 成果保留 | 两个脚本、`.pi/agents/trellis-check.md`、`.trellis/workflow.md`、`.pi/prompts/trellis-finish-work.md` 的 SHA256 与 01 正式 R1 冻结值一致。内存中撤去仅 02 文档增量后，quality SHA256 恢复为 `84a11b9f73f91f1f89f49297b3aa0bb3fb060d9ea80e73c46fee01204108b555`，证明 01 协议和接线未被破坏。 |

没有 root lint 配置，未报告 lint 通过。CJS/JS 转译不冒充完整语义类型检查；`vue-tsc` 证据单独核对。

## Spec 独立结论

**通过，无遗漏的首批场景族。** 下表为本轮独立审阅测试代码、契约及真实日志所得；测试名完整展开见 [审计结果](../../../../../../.tmp/storage-regression-check/review-audit.json) 的 `positiveStorageTests`。

| 场景族 | 受审位置（tests/storage-lifecycle.test.cjs） | 区分力与实际覆盖 |
| --- | --- | --- |
| 健康/单读坏/单写坏/双坏/恢复 | 42–72 | GM277/local137，先写211再写233；验证读失败先探测、单写失败调用、同页保持降级、新页恢复共享，以及严格读取不偷用 local。 |
| 无 GM origin 隔离 | 90–111 | A137/B211 使用独立 local Map；A reset、保存166、刷新后仍166，B刷新仍211。 |
| reset 成功/失败 | 113–154 | 成功检查清理前缀、marker/observation 同身份、reload=1；set/list/delete/localRemove 故障、缺 set/list API 及无GM local写失败均 failed/reload=0；无关站点键保留。 |
| A reset→B观察→保存→两次刷新 | 156–192 | 真实 A reset；B先拒旧、记录身份，之后分别仅写坏/双坏，保存211/bottom260；两次新VM保持，GM恢复后填入共享。194–202 明确保留从未观察且读坏的不可预知边界。 |
| 单字段保存 | 204–217 | 只改尺寸211；刷新保留合法共享倍率4，旧布局right300仍保留在local但不可复活。 |
| 单模式保存 | 219–234 | 仅改scroll bottom260；持久化book未冒领当前身份，刷新切到book仍left150。 |
| 同代/异代/无身份 | 236–265 | 合法共享277胜过137；同代补缺/坏999；异代及无身份拒绝为80，倍率4不变；GM写成功/失败均刷新验证，坏JSON有独立正反对照。 |
| 旧独立翻页项 | 267–278 | 统一项缺失、共享独立项非法；同代local none补入，无身份拒绝为桌面realistic，写坏刷新后仍一致。 |
| 非法字段/显式空值 | 280–305 | 未blocked及同代blocked；全未知列表补local、混合有效列表共享优先；999/80.5补137且倍率4保持；显式空goNext保留，非法goPrev补z。 |
| 混合schema | 307–326 | schema2 Escape→q，local schema3 ~保留；共享schema2 ~→t正对照；blocked/unblocked均首次加载加两次新VM，实际持久化schema3稳定。 |
| 同毫秒与回拨 | 328–365 | 原生crypto/无crypto均两次真实reset，同ISO时间、不同身份；回拨一天拒绝第一代137/right300，再保存233/right180并刷新恢复。 |
| 身份与时间戳 | 367–379 | 同resetId仅变migratedAt保留137；无resetId旧标记依时间身份变化拒绝为80。 |

附加控制：`:74–88` 检查 GM 值复制与 local 字符串，`:381–392` 保留健康共享写不保证 local 镜像的约束，`:394–405` 检查 watcher 与作用域清理。没有把平台真实行为替换成历史 core stub 的预期。

| PRD 标准 | 独立核对结论 |
| --- | --- |
| AC1 | 十二场景族均有可区分的契约断言，模块/故障/刷新边界正确；46 个当前测试名在工作区、干净副本、恢复后日志一致。 |
| AC2 | 314 明确输入、六项 overlay；无旧结果/深 Git 输入，无浏览器存储；根锁安装与独立重复 npm test 有成功证据，副本全部恢复原哈希。 |
| AC3 | 工作区及 Node22/Python3.12 干净副本的完整 check 联通 type-check、37 Python、46 Node、生产构建；三种真实负向与逐阶段 exit7 证据成立。 |
| AC4 | push/pull_request、contents:read、Node22/Python3.12、根锁缓存/安装、统一命令及无吞错均符合。官方 action v7 原文有证据；只静态验 CI，没有远端通过声明。 |
| AC5 | quality 文档命令与脚本一致、引用有效，VM及未验范围准确。主记录逐项保留，formal-review 尚待合并；无 waiver 或伪造全绿。 |

## 执行证据与负向验证

本轮遵守“不因已有绿重复全套”：读取原始日志、执行元数据、负向 diff 和真实副本；仅运行只读证据审计及真实 summarize。测试/验证前已触发短通知。

基线：**Node v22.23.3 / npm 10.9.9 / Python 3.12.14 / Darwin arm64**。`run_evidence.py` 使用任务内 Node/Python 的进程级 PATH，直接保存 subprocess.returncode；没有将本机 Node24 当 Node22。根锁未修改；安装日志为新增185包。

| 原始日志（均在 .tmp/storage-regression-check/） | 实际结果 |
| --- | --- |
| working-check.log、clean-check.log、restored-check.log | 整体 exit0；类型阶段完成、Python37/37、Node46/46、生产构建236模块成功。 |
| clean-install.log、clean-repeat-test.log | 根锁 npm ci exit0；独立第二次 npm test exit0，37+46均通过。 |
| wrong-assertion-test.log、wrong-assertion-check.log | 均 exit1；实际137/期望138，定位“GM values are copied…”测试；check未运行构建。 |
| typescript-error-type-check.log、typescript-error-check.log | 均 exit2；`core/store/app.ts(2217,7): error TS2322: Type 'string' is not assignable to type 'number'.`；后续test/build未运行。 |
| historical-identity-storage.log、historical-identity-check.log | 均 exit1；40过6失败，均实际137/期望80；失败为两个异代merge、坏JSON异代、两个crypto重置/回拨分支、旧时间戳身份对照。check未运行构建。 |
| propagation-type-check.log、propagation-test.log、propagation-build-prod.log | 均 exit7；GATE_STAGE严格只到失败阶段。 |
| negative-controls.log | 外层断言真实失败与执行顺序后exit0；各mutation在finally恢复，非零原始记录仍保存。 |

历史故障 diff 只将 `core/store/app.ts:886` 的 `raw.resetId === currentId` 改为接受任意非空身份，测试断言未改；因此6个失败是当前用例捕获旧值复活的证据。最终副本及工作区314文件逐个等于快照，无 mutation 残留。初次开发日志的语言码 ja/en 失败也保留；当前用例使用合法jp且仍严格检查保存、停止写入和刷新值，没有以移除断言换取通过。

CI核验读取 `actions-versions.json`、三个 `*-v7-action.yml` 和官方 README 存档：checkout/setup-node/setup-python 使用v7，action自身运行时Node24、runner最低v2.327.1；项目执行Node22由setup-node单独选择。YAML经解析与字段检查，无混淆两种运行时。没有再次访问远端或推送。

[本轮最终证据审计](../../../../../../.tmp/storage-regression-check/review-audit-final-command.json) **exit0**，[日志](../../../../../../.tmp/storage-regression-check/review-audit-final.log)、[完整结果](../../../../../../.tmp/storage-regression-check/review-audit.json) 包含314输入哈希、01保留检查、原执行记录及证据文件哈希。首次审计 exit1 的[记录](../../../../../../.tmp/storage-regression-check/review-audit-command.json)与 stderr 也保留：审计脚本从HEAD取旧段落，漏掉01已加入的 `product` 一词；改用01保存副本重建基线后通过。此为审计脚本基线错误，受审文件无变化。

## 当前保存的验收与待合并条目

真实记录：[.trellis/tasks/10-11-storage-regression-check/acceptance.json](../acceptance.json)。本轮未写入。

实际执行：

```bash
python3 scripts/acceptance.py summarize .trellis/tasks/10-11-storage-regression-check
```

**exit 1，stderr为空。** [完整原始 JSON](../../../../../../.tmp/storage-regression-check/review-summary.json) 是原始stdout字节，未手工重算或重新序列化；[命令、时间及真实退出码](../../../../../../.tmp/storage-regression-check/review-summary-command.json)一并交付。

原始JSON结果为 `valid=true`、`observedStatus=partial`、`status=partial`；counts/observedCounts均为 `passed:11, failed:0, partial:0, blocked:0, unrun:1, waived:0`，`waivedChecks=[]`。AC1–AC5均因共同的formal-review unrun而保持partial。脚本成功校验记录不等于任务通过；exit1仍阻止完成/归档。

[建议条目](../../../../../../.tmp/storage-regression-check/review-proposed-checks.json)仅更新 `formal-review`：method=inspection、dimension=content、observed=passed、execution=null、waiver=null，证据含本报告/冻结/审计/真实summarize。待主会话合并后再计算总状态，不预测或代写passed。

## 未验证范围与资源

未执行远端Actions/Ubuntu实机、required checks/分支保护、Windows、真实油猴grant/沙箱/序列化、EH/EX/NH真实共享、浏览器调度、桌面/移动UI、抓取/图片/下载。本任务接受的是受控同步存储回归和检查入口，未将上述范围标passed。

原安装日志的20项依赖审计提示及构建Sass/punycode提示保留，未在本轮审计升级依赖或修产品。未创建浏览器、UI服务或常驻进程；审查期间保留实现轮副本/工具链供主会话收口，未清理用户资源。完成通知已触发。

两分钟下一步：主会话将建议的formal-review条目按ID合入真实acceptance.json，再运行上面的summarize；按实际JSON与退出码决定收口，并保留原始失败/负向证据。
