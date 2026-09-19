# Spec Kit → Trellis 迁移实施报告

状态：实施、文档检查、主会话核验和固定版本独立审查完成，PRD 六项验收均通过。内容提交 `fb8f136`，任务已归档至 `.trellis/tasks/archive/2026-09/09-19-migrate-speckit-to-trellis`，Session 2 已记录。基线 `647ff26`。本轮只修改文档和开发工作流入口，产品行为未改动。

## 来源覆盖与实际去向

[原始清单](source-inventory.json)保持规划时内容不变；[实际处理清单](source-disposition.json)逐一记录全部 115 个来源的路径、原 SHA-256、处理、目标、完成状态和理由。所有旧来源在删除前均与基线及清单哈希相等，没有覆盖用户修改。

| 来源 | 数量 | 实际处理 |
| --- | --- | --- |
| 七组功能资料 | 56 | 全文迁入 `.trellis/spec/frontend/features/<原功能目录>/`，包含需求、模型、契约、研究、计划、tasks、requirements 和 quickstart |
| 行为决策 | 1 | 全文迁入 `.trellis/spec/frontend/decisions/2026-09-18-reader-behavior.md` |
| 根产品目标 | 1 | 全文迁入 `.trellis/spec/frontend/product-goals.md` |
| 通用浏览器流程 | 1 | 全文迁入 `.trellis/spec/frontend/browser-acceptance.md` |
| constitution | 1 | 稳定原则映射到现有指南，专用治理退役，见下表 |
| maintenance | 1 | 人工上下文维护边界并入 AGENTS；专用工具流程退役，历史取舍见下节 |
| 其他 `.specify/` 资产 | 39 | 模板、脚本、安装清单、git 扩展与 hooks 退役 |
| `.pi/prompts/speckit.*.md` | 15 | 退役全部旧命令，保留 3 个 Trellis prompts |
| **合计** | **115** | **59 个全文迁入，2 个规则合并，54 个专用工具文件退役** |

用户指定目录中的 `specs/.DS_Store`、`.specify/.DS_Store`、`.specify/feature.json` 亦已删除。检查目录内没有额外未知文件后才移除目录。根 `specs/`、`design.md`、`.specify/`、两份旧 `.pi/` 指南均已不存在。

## 保全方法与状态

先把 59 份资料逐字节复制到目标并比对，原文件保持存在；再重算链接、更新仓库相对路径和 TS 契约 import，增加带标记的迁移/历史前言，最后通过保全检查后删除源文件。前言以外的正文经路径规范化与行尾空白/Markdown hard break 等价处理后逐行相等，不以文件数代替内容核对。六份 YAML 以系统 Ruby Psych 3.1.0 解析后比较完整对象，70 个 `$ref` 均解析到存在的 schema；TS 契约仅改变 import 深度及行尾空白，接口与注释正文保全。

新增[功能索引](../../../../../spec/frontend/features/index.md)与[待办入口](../../../../../spec/frontend/features/pending-work.md)，可从 frontend 索引、AGENTS 和双语 README 到达。待办入口列出所有 114 个未勾任务的原编号与条目文本，保持各组顺序；不创建新的历史任务。

| 功能 | tasks 总数 | 已勾 | 未勾 |
| --- | ---: | ---: | ---: |
| 翻页动效 | 36 | 32 | 4 |
| 放大镜 | 39 | 39 | 0 |
| 可停靠面板 | 35 | 35 | 0 |
| 下载打包 | 37 | 27 | 10 |
| 平台注入 | 149 | 51 | 98 |
| 缩略图展开 | 26 | 26 | 0 |
| 更多设置 | 44 | 42 | 2 |
| **合计** | **366** | **252** | **114** |

requirements 保留 124 条、12 未勾；quickstart 保留 24 条、24 未勾。每个清单都比较了条目文本、顺序及 `x`/`X`/空格原状态，三类状态分别呈现。

明确保留以下差异：

- 七组 spec 均为 Draft；勾选不代表当前 HEAD 或规格整体完成。
- 翻页和设置旧勾选免责声明、新决策及其后续带日期验收记录原样保留。
- 放大镜 tasks 39/39，requirements 5 未勾、quickstart 5 未勾；下载 T036/T037 有完成证据，requirements 仍 3 未勾。
- 平台 T043–T082/T098 实现已存在，旧计划未按清单验收；仍未勾，不要求从零重写。T149 的 NH `src`→`x-src`、parser 只读 `data-x-src`、45 页空缩略图仍未修复/未验收，只有历史内存对照。
- 原平台契约/目标 60 秒与 `src/platform/initializer.ts` 的 `TIMEOUT_MS = 120000` 并存，入口及平台文档前言标明冲突。平台旧 `/g/` 直达、`src/main.ts` 手工 switch 示例及旧本地 dev 验收说明属于历史教学；当前 service factory 和 EH `/s/` 生产包路线另有明确入口。
- 2026-09-18 决策第 5 节的待办是当时快照，后续状态以各组 tasks 的带日期记录为准；不据此把已完成项重新标成未完成。

## Constitution 条款映射

下表的原条款标识来自基线 `.specify/memory/constitution.md`（版本 1.0.1，2026-09-18）。旧文件路径仅作追溯标识，不是执行依赖。

| 原条款 | 保留位置 / 处理 | 理由 |
| --- | --- | --- |
| I Refactor-First Boundaries | [AGENTS 项目边界](../../../../../../AGENTS.md#项目与实现边界)、[directory structure](../../../../../spec/frontend/directory-structure.md#current-versus-historical-paths) | 保留 core/src 优先、历史目录改动须说明目的、避免回拷旧架构 |
| II Behavior-Preserving Changes | AGENTS 修改前按需读取；[quality delivery boundaries](../../../../../spec/frontend/quality-guidelines.md#delivery-boundaries) | 补齐异步加载、页码边界、快速连续输入；保留书页/卷轴一致性 |
| III Validation Before Completion | AGENTS 强制验收；[quality acceptance routing](../../../../../spec/frontend/quality-guidelines.md#acceptance-routing)；[browser acceptance](../../../../../spec/frontend/browser-acceptance.md)；[eh-test](../../../../../../.pi/skills/eh-test/SKILL.md) | 功能改动仍需实际浏览器验收并记录；纯文档按现有规则检查引用/命令，不误报产品验收 |
| IV Story-Independent Delivery | AGENTS 文档维护与提交；quality delivery boundaries | 补齐独立实现/独立测试、接受场景与验证标准，保留可独立交付原则 |
| V Built-in UI and Mode Consistency | AGENTS 技术与 UI 约束 | 自建 UI、无第三方 UI 库；书页/卷轴一致，明确限定模式的功能除外 |
| Additional: EH priority | AGENTS 项目边界 | 保留 EH 优先 |
| Additional: base 双端影响 | AGENTS 项目边界；quality delivery boundaries | 明确记录 EH/NH 评审结论 |
| Additional: preference fallback | [state management](../../../../../spec/frontend/state-management.md#persistence-migration-and-reset)；quality delivery boundaries | 非法值回退及逐项迁移已有更具体规则，继续复用 |
| Additional: destructive Git | AGENTS 文档维护与提交 | 明确保留用户未要求时禁止 `reset --hard` / 强制推送 |
| Workflow 1: Spec Kit 命令顺序 | 退役；当前入口为 `.trellis/workflow.md` | 已移除工具，不保留无效执行门禁 |
| Workflow 2: Constitution Check 模板义务 | 退役；旧 plan 的该节标为历史 | 稳定原则已进入项目指南，不继续维护专用模板 |
| Workflow 3: 显式验证任务 | quality delivery boundaries 和 acceptance routing | 功能计划需明确 runtime checks，保留 dev/生产包路线及浏览器要求 |
| Workflow 4: handoff gate | AGENTS 交付要求；quality evidence/completion | 记录实际通过/失败/未验收、模式和平台边界 |
| Governance: 权威、修订、版本、Sync Impact Report | 专用流程退役；历史版本/同步证据可从基线追溯 | Trellis 管当前流程，AGENTS/工程指南管稳定边界，已确认行为决策管覆盖到的冲突 |
| Governance: compliance / violation justification | quality delivery boundaries | 保留未满足约束与理由必须披露、无理由违规不能报告完成；取消每份文档重复 constitution 映射义务 |

## Maintenance 条款映射及工具历史

旧 `.pi/speckit-maintenance.md` 的稳定边界已进入 AGENTS“文档维护与提交”：非 Trellis 托管区由人工审阅维护，只合入当前实现核实的稳定约束，具体功能/验收留在功能资料或任务，保留托管标记。

其余条款依附已退役的 Spec Kit 1.0.8，不转为当前操作。为保全取舍，记录原背景：

| 原节 | 历史内容与处理 |
| --- | --- |
| 安装基线 | `integration.json` / `pi.manifest.json` 记录原安装版本与哈希，未用本地修正覆盖；现随工具退役，完整文件及哈希仍可从本次源清单与基线追溯 |
| hooks 取舍（2026-09-18） | 十个入口各自保持完整前后 hooks；当时没有共享协议包，接受有意重复以保持入口独立。1.0.8 resolver 支持 override/preset 及 replace/prepend/append/wrap，不等于共享 Markdown 自动成为依赖；当时未新增 preset/helper/安装逻辑。D12 hooks 研究项已关闭，checklist 模板来源及 clarify 零问题分支由 `f3cd8a4` 修正 |
| 修改与升级核对 | 当时要求保留 analyze 只读/hook 边界、taskstoissues feature＋task 去重、checklist 已解析模板来源、clarify 零问题结束；核对十个入口 key/顺序、无配置/注册项、坏 YAML、disabled、condition 和 optional/mandatory，mandatory 实际调用并等待。随入口删除而退役，无当前升级义务 |
| 共享协议抽取条件 | 当时要求协议能受支持安装/更新/恢复、全部入口分支及缺失/不兼容失败路径通过，并保留 `$ARGUMENTS`、Pi 调用及原权限/只读语义；这是退役工具的历史设计条件，不新增 Trellis hook 子系统 |
| agent-context 维护 | 旧 update-agent-context 脚本及模板早已移除，不在 1.0.8 清单也无核心调用。启用 Spec Kit 扩展、`after_specify`/`after_plan` 可选 hooks 的步骤随工具退役；人工维护和审阅差异的稳定边界保留 |

## 入口、配置与范围检查

- AGENTS 非托管区、4 份 frontend 指南、EH 技能两处链接、双语 README 和 `.npmignore` 已更新。EH 技能 frontmatter、流程、loader 未改。
- `.npmignore` 用 `.trellis/` 代替旧 `specs/`，并排除 `.tmp/`、`.pi/` 开发资料；npm dry-run 清单共 251 个文件，没有这些目录或退役资产，未执行生命周期脚本、未发布包。
- `.pi/settings.json` 仅删除 15 个已失效的 `-prompts/speckit.*.md` 项；其余 JSON 值及顺序不变，只修正 prompts 最后保留项的逗号。JSON 可读、仍被忽略且未跟踪。修改前私有备份 `.tmp/migrate-speckit-to-trellis/settings-before.json` 已删除，日志未打印设置内容。
- 198 个版本控制内的显式保护文件与基线逐字节相等，涵盖 core/src、依赖/构建文件、通用 Trellis 脚本/技能/配置/工作流、Pi agents/extensions/3 个 prompts 和 EH loader；AGENTS 托管区单独逐字节相等。另以实际 diff 范围验证所有已跟踪变更均在授权集合，未跟踪项仅迁入资料/导航/任务记录。
- `.trellis/.template-hashes.json` 被 Git 忽略，本轮没有写入；交接 SHA-256 为 `7995de766fc66bb48fbf2a6a43d42bc9406f9d5bf4a46ae4fcbbe1b7c5117841`，mtime 为本机 `2026-09-19T21:11:04.600110`。它不在上述 198 个 Git 基线对照内，不声称存在受版本控制的迁移前哈希。

## 实际验证

测试开始前已执行 notify-complete 短通知。以下结果属于文档/工具检查，不是产品验收。

| 命令或检查 | 结果 |
| --- | --- |
| `git diff --check` | 通过；另对全部新增文件执行 `git diff --no-index --check /dev/null <file>`，补齐未跟踪文档格式检查 |
| `python3 ./.trellis/scripts/task.py validate .trellis/tasks/09-19-migrate-speckit-to-trellis` | 通过，implement/check JSONL 各 3 个真实入口，均存在 |
| `python3 ./.trellis/scripts/get_context.py --mode packages` | 通过，single-repo / frontend 正常发现 |
| `python3 ./.trellis/scripts/get_context.py --mode phase` | 通过，现有阶段与上下文读取正常 |
| `npm pack --dry-run --json --ignore-scripts` | 通过，未打包 Trellis、临时资料、Pi 或退役目录；未构建产品 |
| `.tmp/migrate-speckit-to-trellis/verify.py --retired` | 通过：115 来源/处理记录、59 正文、所有清单文本顺序状态、114 待办、有效本地链接与标题锚点、198 保护文件、托管区、退役路径和 diff 范围 |
| `ruby .tmp/migrate-speckit-to-trellis/contracts.rb` | 通过：6 份 YAML 完整解析对象语义相等、70 个 `$ref` 存在 |
| markdown-it 代码块解析对照 | 通过：使用临时 `code-blocks.cjs` 检查 76 个代码块，内容在仓库路径与行尾空白规范化后相等，防止 hard break 重写影响代码示例 |
| `rg --hidden` 旧入口扫描 | 有效入口已更新；残留只在迁移来源前言、历史计划/记录、原 checklist 编号背景、本任务证据及旧归档任务 |
| 设置差异与 `git check-ignore .pi/settings.json` | 通过：仅移除约定 15 项，其他值不变，保持忽略 |

检查器有两次已解决的问题：本机设置预写入检查捕获数组尾逗号，写入前停止并修正；npm dry-run 结果按包名索引，最初按数组读取失败，改为读取实际结构后检查通过。这两次失败没有修改产品或跳过验收。

临时证据曾统一保留在 `.tmp/migrate-speckit-to-trellis/`，供主会话和独立审查读取，包含 `verify.py`、`contracts.rb`、`code-blocks.cjs`、正文与集成 diff、设置验证结果、引用扫描、打包清单、交接哈希及各检查日志。全部审查完成后，28 个本任务临时文件和回读上下文副本已清理，版本控制内的本报告、原始清单与实际处理清单保留。上表临时命令记录的是本轮执行证据，不承诺清理后仍可直接复跑。

## 独立审查与完成依据

主会话读取实施结果并核对实际 diff，确认 195 项交接哈希一致后，派发只读 `trellis-check` 审查。审查期间所有迁移文件固定；审查前后 195 项均未变化。审查已结束，未发现阻塞项或待修复问题，未修改受版本控制文件或任务记录。

审查独立核对 115 个来源及处理记录、59 份资料正文、全部清单条目与顺序、114 条待办导航、六份 YAML 语义和 TS 契约。52 份 Markdown 经路径归一后渲染一致；解析 70 份 Markdown 的 557 个本地链接没有错误，59 份迁入资料均可从 AGENTS 到达。198 个保护文件、AGENTS 托管区及 template-hashes 保持不变；文档格式、任务上下文、Trellis 发现和 251 文件的 npm dry-run 排除检查通过。

独立审查确认当前本机 settings 可解析、无旧 prompt 项且仍被忽略；由于修改前私有备份已在实施阶段按设计清理，“仅删除 15 项且其他值不变”的前后差异依据实施阶段的验证记录，本轮未独立重现。该限制不隐藏为独立验证通过。

规范同步已随迁移进入 frontend 索引、待办导航、quality/state/directory 指南及各资料的历史前言，无需另写重复规则。本次没有产品缺陷修复；历史 T149 及未完成验收保持原状态。

## 豁免、未验证范围与交接

- 历史 `.tmp/**`、下载 UUID 产物、截图和日志保留原文字及证据日期；不作为有效当前链接检查，不承诺这些本机文件仍存在。示例代码、平台/图集占位符、计划中的源文件名同样保持历史/示例性质。
- 平台 `validation-us1.md`、`validation-us2.md`、`validation-us3.md`、`final-validation.md` 从未作为源清单文件存在，现明确标为未产出；没有制造空文档。
- 未运行产品 build、type-check、单元测试或浏览器功能验收；本轮未启动服务、占用端口、创建浏览器空间，也未访问 EH/NH。本仓库没有配置的 root lint/test runner，不声称 lint 通过。
- 浏览器流程命令仅做路径、参数及现有技能/配置静态核对；历史运行结果保留历史时态，不能算作本轮验收。
- 主会话和独立审查均已结束，PRD 验收已回填。归档后已重算本报告的相对链接，归档资料 11 个本地链接/锚点及任务 JSONL、格式和 completed 状态复查通过；已提交的迁移内容未再改变。测试通知进程已退出，无需清理服务或端口。长期功能导航按任务名查找迁移记录，不依赖原活动任务路径。
