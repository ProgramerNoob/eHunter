# 02 实现与验证交付记录

状态：实现及本地验证完成，等待主会话正式 Standards/Spec 只读审查与验收记录合入。未提交、推送、归档或切换活动任务，未写本任务 `acceptance.json`。

## 实现范围

| 文件 | 结果 |
| --- | --- |
| `tests/helpers/storage-fixture.cjs` | 唯一共享夹具；真实 Vue、app/layout/PlatformService，独立 VM/cache/effectScope，GM 值复制、local 字符串语义、独立故障开关及可控时钟；未知 import 拒绝 |
| `tests/storage-lifecycle.test.cjs` | 46 个 Node 内置 runner 用例，通过公开 init/storeAction/PlatformService 测试十二场景族及夹具生命周期 |
| `package.json` | 新增 test:acceptance、test:storage、test、check 四条脚本；串行 fail-fast |
| `.github/workflows/check.yml` | push/pull_request，contents:read，Node22/Python3.12，根锁安装和统一 check；官方 action v7 |
| `.trellis/spec/frontend/quality-guidelines.md` | 命令、CI、VM 范围及限制；保留 01 的验收协议 |

`core/`、`src/`、TypeScript 配置、依赖声明及根 `package-lock.json` 均无改动。01 的 `scripts/acceptance.py`、`scripts/test_acceptance.py` 只使用，其哈希与干净副本一致。暂存区为空；其他任务的已有未提交改动保留。

## 环境与干净副本

最终基线为 **Node v22.23.3 / npm 10.9.9 / Python 3.12.14 / Darwin arm64**，见 `.tmp/storage-regression-check/versions.log`。初次开发迭代使用现有 Node24；工作区和干净副本的完整 check 均使用选定 Node22/Python3.12。通过本任务 `.tmp/storage-regression-check/toolchain/` 的进程级 PATH 使用环境，未改全局默认。

Node 来自 `https://nodejs.org/dist/v22.23.3/node-v22.23.3-darwin-arm64.tar.gz`，下载校验 SHA256 为 `23b25245dcfb9af7262f8ff142e9e2e0af025368117329e7a7458a51e5922f53`。Python 通过 `uv python install 3.12 --install-dir .tmp/storage-regression-check/toolchain/python --no-bin --cache-dir .tmp/storage-regression-check/toolchain/uv-cache` 安装，实际解析版本 3.12.14。

完整仓库归档提取曾被工具的受保护路径检查拦截，没有执行；随后改为显式文件清单。副本 `.tmp/storage-regression-check/clean/` 包含当前 Git 跟踪的产品源码/资源/构建配置及本次明确交付的测试、脚本、CI，合计 **314 文件**，创建时无 `.git`、旧 `.tmp` 和 `node_modules`。产品输入已核对相对 HEAD 无差异；仅覆盖本任务 package/tests/CI 和 01 的两个验收脚本。代理配置、其他任务工作区改动不进入副本。精确 HEAD、文件清单及 SHA256 在 `snapshot.json`。日常测试无需 Git、历史对象、旧探针、私有绝对路径或浏览器。

副本只从根锁运行 `npm ci --include=dev`。package 3.1.0 与 lock 根元数据 3.0.0 的漂移未阻止安装，所以未改锁或重解依赖。Python 验收脚本自身在副本新建临时测试资料；这些资料不是旧 `.tmp` 输入。存储测试不创建固定证据文件。

## 场景映射（全部实际通过）

以下名称对应 `clean-repeat-test.log` / `restored-check.log` 的 Node TAP 测试名，46个参数化名称的完整展开保存在 `.tmp/storage-regression-check/test-inventory.json`。

| 研究场景族 | 用例名称/范围 | 公开入口及关键对照 |
| --- | --- | --- |
| 健康、单读坏、单写坏、双坏、恢复 | `GM channel: …, continuous writes and new-page recovery` ×4 | storageSetShared/GetShared；GM277/local137，写211/233；先写时探测读失败、同页不解除降级、新页恢复共享优先、严格读不偷读本地 |
| 无 GM origin 隔离 | `No GM: origin-local reset/save/reload leaves the other origin unchanged` | A137/B211，A reset 后保存166刷新仍166、B保持211；独立 local Map |
| reset 成功/失败 | `Factory reset: …` ×7；`No GM and local write failure: reset cannot report success` | runFactoryReset；成功 marker/observation/reload=1；set/list/delete/localRemove 故障与缺API失败/reload=0；无关站点键保留 |
| A reset→B观察→保存→两次刷新 | `A reset -> B observes -> … failure -> save -> two reloads -> recovery` ×2 | 真实 A reset 与 B init；B 单写坏/双坏保存211、bottom260，身份一致，连续新VM恢复；GM恢复后补共享缺值 |
| 单字段保存 | `Single-field save after reset never revives stale layout or overwrites legal shared zoom` | 仅 setMagnifierAreaSize(211)，刷新仍211，zoom4保留，旧right300不能复活 |
| 单模式保存 | `Single-mode save after reset keeps untouched book layout at defaults without current identity` | 仅 scroll bottom260；book 未打当代身份，切换后left150 |
| 同代/异代/无身份 | `Identity merge: …; GM set …` ×10；`Unparseable shared JSON admits only same-generation local data` | 同代137补缺/坏999，合法共享277/zoom4优先；异代/无身份回80，GM写成功/失败及刷新对照，整条坏JSON单列 |
| 旧独立翻页项 | `Legacy independent animation: …` ×2 | init：共享独立项非法，本站同代none补入；无身份拒绝为桌面默认realistic，刷新保持 |
| 非法字段/显式空值 | `Field normalization: …` ×4 | 未blocked/同代blocked；全未知quick列表由local补，混合有效列表共享优先；999/80.5仅补尺寸137且zoom4保留，goNext空串保留 |
| 混合 schema | `Shortcut schema migration: …; two reloads` ×4 | 共享schema2 Escape→q；本站schema3 ~保留；反例共享schema2 ~→t；未blocked/同代blocked各两次新VM刷新稳定 |
| 同毫秒重置/回拨 | `Reset identity: same millisecond, rollback, stale rejection and save recovery (…)` ×2 | 两次真实 reset 同migratedAt、不同ID；原生crypto/无crypto；墙钟回拨一天仍拒旧，新写233/right180刷新恢复 |
| 身份与时间戳 | `Marker timestamp changes: …` ×2 | 相同resetId仅改migratedAt保留137；旧无resetId标记时间变更拒绝旧值 |

额外的明确边界/模型控制：`Unobserved origin with broken GM reads cannot infer another origin reset`（不能预知远端重置）、`Healthy shared save is not a local mirror; later total GM failure rejects old local data`（健康写不承诺镜像）、`GM values are copied on get/set; local fallback retains string semantics`、`Real Vue language watcher persists and disposed pages stop writing`。

每次页面刷新均创建新的 VM、模块缓存、store 和 effectScope，保留存储 Map。watcher 场景等待真实 nextTick，清理停止 scope；没有全吞 Proxy 或产品源码文本 patch。受测 app 真实导入 layoutPreference、layout、bookSpread、thumbExpand、runtimeEnv、PlatformService，仅 i18n/event/album/download 边界替身化；未调用私有 merge/identity 函数。

## 实际执行与退出码

全部原始日志和每条执行的 argv/cwd/开始结束时间/实际 exitCode 位于 `.tmp/storage-regression-check/`，聚合清单为 `execution-metadata.json`。每轮测试开始前已触发短通知。

| 日志（同名前缀 `.json` 为执行记录） | 实际结果 |
| --- | --- |
| `storage-initial.log` | 初次46例45过1失败：测试误写语言码ja；当前合法码为cn/en/jp。纠正测试输入为jp，没有减弱断言或改产品 |
| `storage-fixed.log` | 46/46，exit0 |
| `working-check.log` | type-check0 → Python37/37 → storage46/46 → build-prod0；整体0 |
| `clean-install.log` | npm ci --include=dev，exit0；新增185包来自根锁 |
| `clean-check.log` | Node22/Python3.12干净副本完整check，exit0；37 Python +46存储 |
| `clean-repeat-test.log` | 独立第二次npm test，exit0；37+46，没有固定证据文件/遗留状态依赖 |
| `wrong-assertion-test.log` / `wrong-assertion-check.log` | 故意把GM复制断言137改成138，均exit1；actual137/expected138，build未执行 |
| `typescript-error-type-check.log` / `typescript-error-check.log` | 加入 `const gateProbe: number = 'bad'`，均exit2；TS2322；check后续test/build未执行 |
| `historical-identity-storage.log` / `historical-identity-check.log` | 允许任意非空resetId补缺，均exit1，6例失败actual137/expected80；check的build未执行 |
| `propagation-type-check.log` | type-check固定exit7；总check7，test/build未执行 |
| `propagation-test.log` | test固定exit7；总check7，build未执行 |
| `propagation-build-prod.log` | build-prod固定exit7；总check7 |
| `negative-controls.log` | 对上述实际非零与执行顺序作断言的外层验证命令exit0；没有把原始失败改记passed |
| `restored-check.log` | 每次mutation都finally恢复后，完整check再次exit0；37+46 |
| `static-checks.log` | YAML解析、配置约束、无产品/依赖/锁变更、314文件哈希恢复、质量文档链接/命令/空白检查，exit0 |
| `acceptance-before-handoff.log` | 只读summarize exit1：主会话的6个计划项仍unrun，未由子代理改写；不能称任务验收已通过 |

负向改动全部仅在副本。对应 `wrong-assertion.diff`、`typescript-error.diff`、`historical-identity.diff`、`propagation-*.diff` 已保留。历史身份故障准确使以下6例失败：两个 different identity rejected、坏JSON异代、两个同毫秒/回拨crypto分支、旧时间戳身份变更。314输入文件及当前工作区均确认无 mutation 残留。

## CI 与证据范围

官方 GitHub API latest 请求因限额返回403，改用官方仓库 README 与 `v7/action.yml` tag 直接核实。精确 URL/运行时在 `actions-versions.json`；原文保存在 `checkout-README.md`、`setup-node-README.md`、`setup-python-README.md` 和三个 `*-v7-action.yml`。三者官方示例均为v7，action自身运行时均为Node24，文档要求 Actions Runner 至少v2.327.1。项目测试运行时由setup-node单独选择Node22；两者不混淆。使用GitHub托管ubuntu-latest单job，无密钥、无continue-on-error、无吞错，checkout不保留凭证。

本地已用Ruby标准YAML解析器核验语法及字段（其YAML1.1将on键解析为true，检查脚本显式处理），并检查权限、触发器、版本、根锁、命令。**没有推送，远端Actions、Ubuntu实际运行、required checks/分支保护均未验证或配置。** macOS干净副本通过不是远端CI通过。

npm ci报告现有锁依赖20项审计问题（3 moderate/16 high/1 critical），本轮未审计定位或升级依赖。构建成功但仍有Sass弃用与markdown-it/punycode浏览器外部化提示，原始日志保留；本任务未改产品消除这些既有提示。

VM通过仅证明当前模块在受控同步存储环境下的行为。未验证真实油猴grant、沙箱/序列化、EH/EX/NH真实共享、移动/桌面UI、浏览器调度、抓取、图片缓存/缩略图/原图、下载。无浏览器操作，无网络产品请求，无UI服务；没有需停止或释放端口的服务进程。测试型改动按已批准设计不启动无关浏览器验收。

## 主会话接续与资源

建议条目位于 `.tmp/storage-regression-check/proposed-acceptance-checks.json`，分别列存储、Python脚本回归、类型、生产构建、干净安装、重复执行、负向门禁、CI静态及文档检查。正式审查保持unrun，等待主会话另行派发；建议条目不替代当前acceptance.json。

隔离副本和选定工具链保留供正式审查复跑（合计约438MB）；均在本任务目录内，不包含用户已有 `.tmp` 资源。复审结束后可仅移除本任务的toolchain和clean/node_modules、clean/dist，保留日志、diff、元数据及clean源文件以使执行cwd仍存在。未修改或清理用户原有资源。未启动子代理，无未结束编码任务。

两分钟下一步：主会话读取建议条目和负向diff，合入验收记录后对当前固定文件派发正式Standards/Spec审查。
