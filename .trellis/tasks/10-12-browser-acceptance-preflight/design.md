# 技术设计：浏览器验收前置检查

## 决策与范围

新增 `scripts/browser-preflight.mjs`，供现有 `ego-browser nodejs` 流程导入；接入 `.trellis/spec/frontend/browser-acceptance.md` 和 `.pi/skills/eh-test/SKILL.md`。用 Node 标准库和现有 CDP 能力，保持服务、任务空间、登录、扩展配置及资源清理归现有外层流程管理。

选择研究建议的 CDP 路径：读取浏览器实际脚本全文，比较 SHA-256，并取得该脚本的执行证据。该路径可复用于生产 eval 和开发 ESM，当前计划不修改产品入口、生产配置或测试 loader。研究中的 loader 摘要是未采用的候选，能力不足时先保存阻塞证据并返回规划，不同时维护自动 fallback。

研究中关于 EH 移动打开前严格阻塞的建议由本设计收敛：正常打开阅读器属于准备动作，允许在身份、模拟配置和日志条件通过后执行；阅读器功能验收从打开后的严格 CSS 检查通过开始。这符合当前 UI 的 viewport 生命周期，没有更改产品行为或绕过配置错误。

## 接口与责任

设计入口：`withBrowserPreflight({ page, artifactDir, profile, source, navigate, prepareReader }, runChecks)`。名字可随实现微调，职责与失败传播保持本节契约。

- `page` 为现有空间的 Page；`artifactDir` 必须是本仓库 `.tmp/` 内的绝对目录。
- `profile` 只选择独立固定桌面/移动预期。桌面为 1200×900、DPR1、mobile false、touch false；移动为 390×844、DPR3、mobile true、touch true/maxTouchPoints 5。
- `source` 为 EH 产物/loader/实际 bundle URL，或已核实归属的 Vite origin/项目输入及本场景应加载模块；保存来源、范围和身份。
- `navigate` 执行本轮导航或刷新；`prepareReader` 只允许以正常 UI 打开阅读器，并保存打开前后状态，不在此回调进行功能检查。
- `runChecks` 仅在准备通过后调用，使用提供的阶段执行与截图方法。事件由 helper 单一收集，回调不另调 `page.events()`。
- helper 生成证据及检查建议，主会话是 `acceptance.json` 的唯一写入者。

## 执行顺序与证据

1. 写初始 manifest，记录 runId、roundId、page、URL、固定预期、源码模式与服务/构建记录；状态为 incomplete。首次写入失败即停止，尚不导航。
2. 启用 Runtime、Log、Page、Network、Debugger、Profiler，并启动 precise coverage；保存各命令回执。当前页旧事件先落盘，与后续文档分开。重新发送视口与触摸配置，保存完整参数和成功/失败回执。
3. 导航或刷新，确认主 frame 新文档提交；保存 navigation/frame/loaderId 与 executionContext 关联，排除旧文档、导航前补发的脚本和日志。所有等待有超时上限，阶段之间及时收集事件。
4. 验证代码身份和执行，再检查 Vite overlay、当前挂载 DOM及 eHunter 错误。代码身份不等于异步平台初始化成功。来源归因为原站或第三方的错误保留记录及影响，不能统一判为产品失败。
5. 保存原站 viewport 和模拟能力；若阅读器关闭，通过正常 UI 打开并保存此准备阶段。打开后严格检查实际阅读器 viewport、DPR、触摸能力和本轮配置回执，才进入功能回调。
6. 关键交互前后保存阶段事件；新增模块、导航或 HMR 使相关身份检查重新执行。截图前重新检查环境及身份，记录截图 scale，保存后按指南读取图片。关闭检查原站 viewport 恢复，下一阅读器操作重新准备。
7. finally 尝试保存剩余事件、原始异常、采集/写入错误及结果；停用本轮取证能力。全部必要保存完成后才形成成功结果。外层按现有规则处理用户接管、空间结束及所属服务清理。

## 代码身份的两个模式

### EH 生产包

成功构建后对最终 `dist/ehunter.iife.js` 完整 UTF-8 字节计算 SHA-256及字节数，包含 banner 和 CSS 注入代码。读取当前主文档所有活动脚本的实际全文，再按 metadata 块内与当前产物相同的名称或全文相等识别生产候选；生产和 loader 名称必须非空且不同。必须恰好一个生产候选具有原样全文及其自身执行证据。URL、长度或正文 loader 标记不能豁免旧包；普通 host/loader 仅记录为已检查。任何新增脚本使清单失效，交互、截图和收尾都复查；停止 coverage 后新生产脚本缺少自身执行证据时仍 blocked。

`scriptParsed` 只能证明解析。需要同一 scriptId 的 precise coverage 顶层/IIFE执行范围非零计数及文档关联，才通过执行检查。能力探针必须核实覆盖率结构与该范围的对应关系。另检查 loader 的执行错误和异步初始化错误，不从 coverage 推导功能成功。

默认要求文本原样相等，不 trim、不只比版本/长度/局部 banner，不把协议自带 hash 当作文件 SHA-256。脚本包装、源码传输或执行证据不符合预期时保留差异并 blocked。阶段结束复算产物，变化使本轮失效。

### Vite 开发服务

记录新服务的 cwd、监听 PID、实际 origin与输入指纹。输入包括 `src/`、`core/`、入口、Vite 配置、package.json 和锁文件；验收期间固定这些输入，变化或 HMR 使当前分支失效。

对本轮已加载项目模块保存 exact URL（含 query）、scriptId、当前文档/context、实际源码 SHA-256及执行证据。Node 从已确认归属的 Vite 服务取同一 URL 的转换文本，作为 expected；actual 来自浏览器源码。入口、深层 Vue 组件、style 虚拟模块均纳入，声明本场景应出现的模块，缺失即阻断该场景。

懒加载模块在触发其用例后扩充清单，再检查才记该功能通过。第三方预构建模块单列来源和锁文件关联；独立 CSS/图片保存本轮响应与页面应用/视觉证据，清楚标明 JS 身份检查覆盖范围。结果不声称整个工作树或尚未加载分支已执行。若须通过脆弱的源码归一化才能比较，返回规划。

## 环境与权限契约

CSS 主断言为 `innerWidth`/`innerHeight` 等于固定预期；保留 client 尺寸、visualViewport/scale、meta及 layout metrics 作诊断。DPR 用实际 `devicePixelRatio` 比较，固定浮点容差 1e-6；桌面实际 touchPoints 为0、coarse false，移动为5、coarse true，首轮探针验证当前 Chromium 表现。

mobile 没有文档化的直接回读接口：记录并验证本轮 helper 发出的 mobile 参数与 CDP 成功回执，明确证据性质；不将窄屏、UA或触摸信号称为 mobile 开关实测。其他调用改变模拟配置后，必须重做准备。

EH 打开前只声明原站实际 CSS 观察，不将其判作阅读器尺寸通过；正常打开后的严格尺寸检查才覆盖 AC1。关闭场景比较保存的原站 viewport meta及恢复状态，不要求关闭后原站布局始终390 px。

权限比较使用最终产物与仓库 loader 的 metadata 集合：`grant(loader) == grant(bundle)`；`connect(loader) ⊇ connect(bundle)`，并包含实际 bundle URL 的本地 host。顺序/重复不改变集合；缺 metadata/权限输出精确差异并阻断。静态检查仅证明仓库声明；真实 EH 另记录登录、启用动态 loader、停用静态脚本和 `/s/` 页面前提，缺失或无法确认的前提如实 blocked，不从磁盘文件推导安装副本已更新。

## 产物与失败传播

每轮在 `.tmp/browser-preflight/<runId>/` 保存 manifest、追加的 events.jsonl、身份/环境摘要、result及必要截图。事件批次含 runId、roundId、page、phase、sequence、recordedAt 和完整原始 events；先保存后分析，各消费者共享同一批，不重复 drain。

准备条件或必要采集/写盘失败为 blocked；进入功能后确认的产品断言为 failed；后续未进入的功能为 unrun。保留原始错误和 finally 错误，失败返回非零。不得把准备 blocked 直接套入 `acceptance.py run` 后宣称它会自动映射：该 CLI 将一般非零命令记为 failed。浏览器项由主会话以 runtime/blocked 和真实执行信息回填；工具自测、静态断言可用 command 项。

不提前输出 passed。drain 后写盘失败时保留本批内存并输出结构化诊断；最终保存仍失败则禁止成功。硬终止无法保证 finally，初始 incomplete manifest和已保存批次表明中断。CDP 缓冲容量未知，交付不声称事件绝对无丢失。

## 验证门与回退

首步用当前 Ego 做能力探针：真实 EH eval源码/coverage可见性与文档关联，Vite入口/深层Vue/style源码及执行证据，桌面/移动能力和正常打开后的CSS。探针是运行验证，静态研究不算已通过。缺必需能力立即停止对应分支，保存日志，回填方案与计划后再推进。

正常/异常工具测试以受控夹具验证身份不符、历史证据、环境独立错误、权限集合、超时、事件保存失败及回调不执行。真实浏览器按两入口、两视口验收开关、模式切换和截图。故障注入不改用户存储、真实扩展权限或原站 meta。

改动风险集中在新增 helper、两个接入文档和测试；没有数据迁移。回退方式是撤回本任务 helper 与接入改动，恢复现有操作入口，保留失败证据和未验证声明。不要覆盖用户同期修改。

## 2026-10-14 扩展：解除两个真实阻塞

用户已选择纳入阻塞修复；本节替代前文的“零产品改动”边界，原预检契约不放宽。根因研究见 [更新错误](research/update-error-root-cause.md)，移动A/B诊断见 `.tmp/browser-preflight/blocker-fix/layout-experiment.json`（仅诊断，不作验收通过）。

- 通知修复落在 `core/store/event.ts`：复用现有 `PlatformService.fetch`，相同URL去重，每个唯一源一次请求，整个fetch及正文处理使用15秒总期限，结束清理计时器。保持当前first-settled竞争、GET、原生credentials omit、时间戳、防重复安排、远端后本地的顺序与成功通知门槛。网络/HTTP/正文/JSON/结构不可用返回null并以warning保存URL及原因；catch只覆盖获取解析，不吞弹窗/存储异常。该策略把既有可选降级完成得更快，不新建请求框架；GM底层请求不能保证被取消，但晚到结果不再触发通知或写入。通用TextReq、PlatformService、业务更新源和预检不改。
- 布局修复落在 `src/main.ts` 既有EH移动viewport生命周期：首次打开保存html内联overflow-x/y值和priority，然后设置根节点overflow约束；关闭与初始化错误关闭恢复本次管理的属性和原viewport。重复打开不覆盖原快照，不覆盖其他内联样式，不修改原站图片和DOM，不向验收脚本添加meta修补。桌面和NH/TEST保持现有行为。
- 移动复现：同轮mobile true下，原站图片右缘1232px、页脚最小740px；等待后inner仍1232×2666，html overflow hidden时390×844，恢复后再现；body overflow clip无效。故修复root溢出生命周期，不更换inner断言或扩大等待。
- 自动回归真实通知调用链（原生/GM、网络/HTTP/正文/超时/无效JSON/成功通知/时间门槛/晚到结果/真正产品异常）及入口样式恢复生命周期；样式布局由真实EH移动A/B和最终浏览器确认。
- 改动后重建生产包，重新取得Vite/EH双视口身份；观察更新检查到结束，再完成模式、缩略图、关闭/重开与截图。NH共享通知逻辑以双传输自动检查评估，是否真实访问据改动层级判定，未验证范围明确列出。
- 回退仅撤回这两个产品文件及对应测试/测试命令增量，保留原预检工具和历史阻塞证据。
