# 建议 02：现有检查与窄存储生命周期回归门禁设计

调查日期：2026-10-11。状态：只读研究，交主会话定方案；未实施、未运行产品测试。活动任务由 `python3 ./.trellis/scripts/task.py current --source` 确认为 `.trellis/tasks/10-11-project-session-retrospective`。本轮仅新增本文件。

## 结论

推荐 **Node 内置 `node:test` + `node:assert/strict` + 已有 TypeScript 转译 + 真实 Vue/存储模块 VM**，把有区分力的历史用例提取到受版本管理的测试目录，再以一个 `npm run check` 串联现有类型检查、窄回归和生产构建。静态核对支持 **零产品代码改动、零新依赖框架**；不需要新增产品导出、依赖注入接口或改写存储策略。此结论仍须通过新夹具实际运行确认。

不要直接搬 230 条断言：最终七组中有重叠、部分使用平台替身，另有历史版本执行和临时产物包装。先保留本文场景矩阵的差异覆盖，断言数量不是接受标准。

## 1. 依据与已核实边界

- 原建议与原始会话证据：`research/report.md` 第 02 项；S28（`01a0b7f0-5175-757e-b5aa-62c5f84f6dd9`）L875 的 230 条结果及 L957–L960 的源码提交；S48 L49 的观察型失败不产生工具错误。本轮按委派限制没有重读原会话，以上沿用报告证据，不称为本轮独立重验。
- 最终入口 `.tmp/fix-review-last8/round3-quick-shortcut-main.cjs:4–11` 指向 quick、field、review、identity、core、platform、integrated 七组。对应历史总结 `.tmp/fix-review-last8/round3-final-review-report.md:33–38` 明确 23+31+21+44+74+27+10、当时类型检查失败、未做真实跨站 GM 故障注入。不能把这份旧总结当当前产品测试结果。
- 现行契约 `.trellis/spec/frontend/decisions/2026-09-18-reader-behavior.md:44–57`：合法共享优先、逐字段补缺、origin 隔离、GM 恢复、重置防旧副本复活。现行设置 quickstart `.trellis/spec/frontend/features/002-more-settings-modal/quickstart.md:27–43` 已有迁移矩阵；`:15` 明确 localhost/localStorage 不是 GM 跨站证据。
- 翻页 quickstart `.trellis/spec/frontend/features/001-add-pageflip-toggle/quickstart.md:26–29,39–45` 要求持久化与默认初始化保持；放大镜 quickstart `.trellis/spec/frontend/features/001-add-pageview-magnifier/quickstart.md:70–88` 区分长期尺寸/倍率、会话开关及跨站真实验收。首批 VM 覆盖其中存储子集，不宣称整份 quickstart 通过。
- 本轮只读取最终 runner、七个直接入口及必要源码/spec/config，没有遍历旧截图、日志、所有历史探针或全部会话。

## 2. 最终 VM 夹具依赖与复用边界

| 资产 | 已核实实现与证据 | 处理建议 |
| --- | --- | --- |
| 真实模块整合夹具 | `.tmp/fix-review-last8/integrated-run.cjs:1–59`：Node fs/path/vm/child_process、TypeScript、Vue；加载当前 `app.ts` 及相对依赖，实际加载 `PlatformService.js` | 以此夹具的加载机制为基础提取，不复制其历史 runner |
| 模块加载 | 同文件 `:35–53`：每个 fixture 独立 cache，`transpileModule` 输出 CommonJS / ES2022 / esModuleInterop，VM 执行包装函数 | 保留。`.js` 也由已有 TS 转译；明确只支持当前相对依赖，不建通用模块加载框架 |
| 环境替身 | 同文件 `:13–30,42–46`：Map localStorage/GM、window/navigator、reload 计数；真实 Vue；i18n/event/AlbumService/GalleryDownloadService 替身 | 保留存储环境模型与最小外部边界。event 改显式列出所需空函数，未知导入直接失败，避免 Proxy 把新增副作用悄悄吞掉 |
| 独立平台夹具 | `.tmp/fix-review-last8/round2-platform.cjs:34–129`：独立 GM get/set/list/delete 与 local get/set/remove 故障开关、调用计数、同存储重载新模块 | 将必要开关并入一个共享测试 helper；测试真实平台模块，不复制其分流算法 |
| core 单元夹具 | `.tmp/fix-review-last8/round2-core.cjs:40–92,129` 替身化 `PlatformService` | 仅复用输入和契约断言。其 74 条不是完整真实存储链证据；例如 `:352` 期待严格写成功后无 local marker，与真实平台严格写镜像行为不能混用 |
| 文本截取与 source replace | `.tmp/fix-review-last8/round3-quick-shortcut-spec-probe.cjs:7–9` 截取 runner 前缀；`.tmp/fix-review-last8/round3-field-recovery-merge.cjs:7–19`、`.tmp/fix-review-last8/round3-identity-probe.cjs:7–11` 用 replace 增加时钟/故障开关 | 全部移除，以正常 `require('./helpers/...')` 和 fixture 参数替代。这里修改的是夹具源码，不是产品源码；两者均不应靠字符串 patch 进入稳定门禁 |
| 历史版本/影子根 | `.tmp/fix-review-last8/integrated-run.cjs:38,71,83` 用 `git show 7e92e3c`；field `:8–19` 支持根目录/revision 环境变量 | 常规入口仅测 checkout 当前源码，不依赖 Git 深历史或私有影子目录。历史红测用于一次性验证，不进入每次 CI |
| 输出包装 | `.tmp/fix-review-last8/round3-quick-shortcut-main.cjs:16–35` 改写全局 `fs.writeFileSync`，子进程输出 `.json/.log`；quick `:158`、field `:154` 用 `wx` | 删除 monkey patch 与固定临时文件依赖；内置测试报告 stdout，失败由 assert/runner 传递。固定 wx 文件会令第二次执行因已有证据而失败 |

**路径核查结论：** 已读最终 runner 及七个直接入口未发现硬编码 `/Users/...`；实际根路径为 `path.resolve(__dirname, '../..')`（integrated `:7`、core `:11`、platform `:23`）。问题是依赖 `.tmp/fix-review-last8` 目录深度、同目录脚本和产物，以及可注入的外部 root，不能无证据声称最终夹具含绝对用户路径。新 helper 放 `tests/helpers/` 时从自身位置计算仓库根，不依赖调用者 cwd、用户目录、`.tmp` 或旧 JSON。历史 raw 日志里的绝对路径不搬入测试。

**已发现的命名陷阱：** `.tmp/fix-review-last8/round3-quick-shortcut-spec-probe.cjs:116–132` 名为 GM 写失败，实际传 `gmThrows:true`，在 integrated `:28–29` 同时让读写失败。因此单写坏、单读坏必须独立建参数，不能沿用标题就算覆盖。

**现行受测模块：** graft 定位 `core/store/app.ts` 初始化/保存/重置链、`src/platform/base/service/PlatformService.js` 存储分流、`core/store/layoutPreference.ts` 逐模式合并、`core/model/layout.ts` 合法范围与默认值。app `:1–23` 还导入 bookSpread、thumbExpand、runtimeEnv：允许通过现有相对加载器真实加载，不需要逐个 mock。不加载平台抓取、真实网络、下载服务或浏览器事件。

## 3. 最小实现边界（规划，非已实现）

1. 新建一个 CommonJS helper，导出创建页面 fixture 的函数即可。参数涵盖共享 GM Map、单站 local Map、GM API 是否存在、独立 get/set/list/delete 故障、必要 local set/remove 故障、当前时间、crypto 可用性；不建立 provider/registry/通用 mock 框架。
2. A/B 两个站点共享一个 GM 存储，分别保留自己的 local 存储。刷新保留这些存储，重建 VM、模块缓存和 Vue 状态；同一模块重复 `init()` 不算刷新：`core/store/app.ts:2185–2188` 有 `isInited` 短路，平台 `src/platform/base/service/PlatformService.js:9–12` 的降级状态也属于页面实例。
3. 故障仅在环境 API 抛错，不替身化 `PlatformService`，不直接调用未导出的 merge/migrate/identity 函数。通过 `init(albumService)`、导出的 `storeAction`、`store` 与平台默认导出测试。reset 前后存储与 reload 计数作为断言观测点。
4. 使用现有 `typescript.transpileModule`，检查转译 diagnostics 中的 error 并抛出。它不是语义类型检查，所以必须另跑已有 `vue-tsc --noEmit`。测试文件采用 `.cjs`，无需修改 tsconfig 或新增 ts-node/tsx/Vitest/Jest/Playwright。
5. Vue 使用当前依赖。fixture 为每页独立 lang ref；建议用 Vue `effectScope` 包住模块加载与初始化，清理时 stop；如触发 watcher，等待 `nextTick` 再断言和关作用域。只调用当前范围的 setter，不引入真实计时/键盘/版本检查。
6. Date 替身应同时控制 `Date.now()`、无参数构造和 `toISOString()`，否则“时钟回拨”只控制了一半。默认注入 `node:crypto.webcrypto`；另有无 crypto 分支测试现行 fallback。同毫秒测试固定时间但不把 UUID 随机数固定为同一个值。
7. GM 读写值用结构化复制隔离引用；localStorage 保持浏览器字符串语义。预置非法值不要先 JSON stringify 清洗成另一个值（如 NaN→null）；坏 JSON 直接用字符串。只在需要跨 VM 比较数组时投影到宿主普通数组/标量，避免不同 realm 原型导致 `deepStrictEqual` 假失败；不要继续以整个对象 JSON 字符串相等代替严格断言。
8. `node:test` 内直接断言，不 catch 后只打印 `pass:false`。加载异常、转译异常、fixture 清理失败均使 runner 失败；无需另造 JSON 结果汇总器。常规测试不写持久产物；如实施时需诊断日志，仍放仓库 `.tmp/`，绝不作为输入。

**零产品改动的依据：** `core/store/app.ts:2185–2211` 已公开初始化；`:1758–1786` 的模式/布局 setter、`:1871–1889` 的尺寸/快捷键 setter、`:1948–1977` 的重置入口均可调用。`core/store/layoutPreference.ts:175–229` 已公开读写，但主生命周期测试应走 app 公共入口；平台默认导出已暴露所需方法。无需为了测试导出私有 resetId 或增加产品 flag。

## 4. 首批有区分力的场景矩阵

下列用“场景族”规划，不承诺固定测试数。每个家族保留最小正反对照；实现时用 `test`/`t.test` 参数化，名称写出故障状态和预期。历史入口均在 `.tmp/fix-review-last8/`，这里保留完整路径以便复核。

| 场景族 | 公共入口与关键断言 | 历史夹具对应 |
| --- | --- | --- |
| 健康、单读坏、单写坏、双坏、恢复 | `PlatformService.storageSetShared/storageGetShared`；给 GM=277、local=137，写 211。健康仅写 GM；读坏先写也应探测失败落 local，不能出现写 GM/读旧 local；写坏后同页连续读写一致；双坏同样降级；同页恢复不自动解除普通通道降级，新 VM 恢复后合法共享优先。另断言 `storageGetShared(key, null, false)` 不误读 local | `.tmp/fix-review-last8/round2-platform.cjs:149–277`；当前 `src/platform/base/service/PlatformService.js:51–139` |
| 无 GM 的 origin 隔离 | 相同 key 在 A/B local 分别为 137/211；公共读写仅影响本站；A local reset 后保存 166 再刷新仍在，B 不变 | `.tmp/fix-review-last8/round2-platform.cjs:279–320`、`.tmp/fix-review-last8/round3-identity-probe.cjs:133–142`；两站独立 Map 的对照是对历史单站用例的明确补充 |
| reset 成败不能伪绿 | `storeAction.runFactoryReset()`；成功写 blocked/resetId 与本站 observation、reload=1；GM set 抛错或清理失败时 status=failed、reload=0；部分 GM 能力缺失不可假报共享写成功；只清 eHunter/AlbumCache 前缀，保留站点无关键 | `.tmp/fix-review-last8/round2-core.cjs:327–410` 的输入（舍弃平台 stub）、`.tmp/fix-review-last8/round2-platform.cjs:336–446`；当前 `core/store/app.ts:1948–1977`、平台 `:198–251` |
| A reset → B 观察 → B 保存 → 连续两次刷新 | A 用真实 reset，B 保留旧尺寸137/布局300，GM 可读时先 init 观察 marker、拒绝旧副本；B 仅写坏后 setter 保存211/bottom260，两次新 VM 均保持且 payload 身份匹配；再测 B 已观察后双坏保存、两次刷新、恢复。B 从未观察且 GM 仅读坏不能预知别站 reset，不设置这种不可能的预期 | `.tmp/fix-review-last8/round2-core.cjs:383–394`、`.tmp/fix-review-last8/round3-identity-probe.cjs:24–55,115–124`；原脚本主要以快照传递模拟，升级为明确 A/B 独立 local |
| 只保存单字段，其他记录不复活 | init 拒绝旧统一/布局记录后，只 `setMagnifierAreaSize(211)`；刷新尺寸211，布局仍 left150，其他合法共享字段不变。单字段指用户动作，不要求统一 writer 只写一个字段 | `.tmp/fix-review-last8/round3-identity-probe.cjs:96–102`；当前 `core/store/app.ts:1162–1198` 明确统一 writer 会写完整当前设置 |
| 只保存单模式 | 旧 scroll/book 均非默认；只调用 scroll 的 `setThumbDockSlot('bottom')/setThumbPanelSize(260)`；刷新 scroll 保持，`setReadingMode(1)` 后 book 为 left150，未操作 book 不被盖上当前 resetId | `.tmp/fix-review-last8/round3-identity-probe.cjs:104–113`、`.tmp/fix-review-last8/round3-field-recovery-merge.cjs:35–41`；当前 `core/store/app.ts:1426–1438`、`core/store/layoutPreference.ts:124–136` |
| 同代补缺、异代/无身份拒绝 | `init()`；GM 合法尺寸277胜过同代local137；GM 缺失/非法尺寸999由同代137补、合法倍率4不变；无 resetId 或其他 resetId 的local不能补（尺寸80、倍率4）。整条坏 JSON 单列；至少覆盖共享写成功和写失败后再刷新 | `.tmp/fix-review-last8/round3-field-recovery-merge.cjs:43–91,116–129`；当前 `core/store/app.ts:880–886,920–946` |
| 旧独立翻页项 | `init()`；统一字段缺失、共享独立项非法、同代local独立项none应补入；无身份副本被拒绝，桌面无减少动态效果默认为realistic。不能只测统一记录而遗漏这个入口 | `.tmp/fix-review-last8/round3-field-recovery-merge.cjs:94–113` |
| 非法字段、显式空值 | `init()`；quickSelection/order 全未知应让合法local列表补缺；混合有效/无效共享数组保留合法共享成员优先；`goNext:''` 为合法显式清空，不能当缺失；数字非法（尺寸999或小数）只补该项、不覆盖合法倍率4 | `.tmp/fix-review-last8/round3-quick-shortcut-spec-probe.cjs:27–67,89–101`、`.tmp/fix-review-last8/round2-core.cjs:218–227` |
| 混合 schema 防二次迁移 | `init()`；共享schema2 `toggleTopBar:'Escape'`→q，本地schema3 `toggleThumbView:'~'`仍~，不能全部按共享旧schema转成q/t；反向对照共享schema2旧Escape/~仍迁成q/t。至少在未blocked和blocked同代各测一次，再用实际持久化数据新建VM刷新两次稳定 | `.tmp/fix-review-last8/round3-quick-shortcut-spec-probe.cjs:39–46,69–86,103–113,135–142` |
| 同毫秒重置与时钟回拨 | 通过真实 `runFactoryReset()` 两次固定同毫秒生成不同resetId；第二代拒绝第一代local；墙钟回拨时仍拒旧且新setter写入233/right180后刷新可恢复。不能只断言两ID不同而漏掉恢复结果 | `.tmp/fix-review-last8/round3-identity-probe.cjs:57–94`、`.tmp/fix-review-last8/round3-field-recovery-merge.cjs:132–149`；当前 `core/store/app.ts:780–803` |
| 身份与时间戳对照 | 相同resetId只改migratedAt仍保留137；无resetId旧标记依migratedAt变化使旧副本失效。原生crypto和无crypto至少各覆盖一次同毫秒重置；不锁死UUID字面值 | `.tmp/fix-review-last8/round3-field-recovery-merge.cjs:132–149`（有webcrypto）、`.tmp/fix-review-last8/round3-identity-probe.cjs:7–11,57–77`（无crypto） |

**不新增无依据保证：** 健康共享写并不普通镜像 local；后续 GM 双坏时不能承诺恢复共享里所有刚写值，应验证旧无身份 local 不复活。历史 `.tmp/fix-review-last8/round3-identity-probe.cjs:125–131` 已明确这一对照。真实多站同时并发写、事务原子性、跨设备同步不在本门禁范围。

## 5. Node、锁文件与统一检查入口

### 当前配置

- `package.json:4–12` 已有 `type-check: vue-tsc --noEmit`、`build-prod: vite build --config vite.config.prod.ts`，没有 test/check/lint。无需以新增建议包装现有命令，也无需凭空加 lint 工具。
- `package.json:21–32` 已声明 Node22 tsconfig/types、TypeScript ^5.9.3、Vite ^6.4.1、vue-tsc ^3.2.4；`tsconfig.config.json:2` extends Node22，`tsconfig.json:3–8` 只覆盖现役源码并允许 JS、不检查 JS 类型。测试不得以此声称平台 JS 已做完整静态类型检查。
- 根 `package-lock.json:4` 为 lockfileVersion 2，`:3094–3105` 锁定 TS5.9.3，`:3145–3162` 锁定 Vite6.4.1，支持 Node `^18.0.0 || ^20.0.0 || >=22.0.0`，`:3269–3283` 锁定 vue-tsc3.2.4。
- `package.json:3` 为3.1.0，`package-lock.json:3,9` 仍3.0.0；顶层依赖声明静态对照一致。版本元数据漂移不应直接判为 npm ci 必然失败。实施时干净 checkout 用选定 Node/npm 实跑 ci 验证；若只同步根版本元数据，单独审查最小 lock diff，避免无目的重解依赖或升级 lock 格式。
- `git ls-files` 返回根 npm lock 和 old 目录旧锁文件，没有返回 `.github/*`、`.nvmrc`、`.node-version` 或 `.npmrc`。只使用根 npm lock，旧目录锁不参与。远端托管是否已有外部检查/分支保护没有验证。
- 本机只读版本查询为 Node **v24.18.0**、npm **12.2.0**；不是拟选 Node22 环境，也没有在本机运行 npm ci/type-check/build/test，不能把本机版本当验证过的 CI 组合。

### 推荐落地

选 **Node22 单一 CI 基线**，与现有配置一致；无需首批多版本矩阵。最小方案在 setup-node 使用 `node-version: '22'`、`cache: npm`、`cache-dependency-path: package-lock.json`。这固定主版本，不是补丁级完全可复现；记录每次 `node --version`/`npm --version`。若主会话要求补丁级复现，实施时选择并实测一个可用22.x.y写入 `.node-version`，workflow 用 version-file；当前没有证据支持随意指定某个已验证补丁号。无需为了此门禁改全局 Node、Git hook 或新增 npm 依赖。

建议 `package.json` 仅增加：

```json
{
  "test:storage": "node --test tests/storage-lifecycle.test.cjs",
  "test": "npm run test:storage",
  "check": "npm run type-check && npm test && npm run build-prod"
}
```

测试入口显式文件名，避免 shell glob/空匹配和 helper 被当测试。以后确有第二类测试再扩展，不先做插件式 runner。串行 fail-fast 足够；某阶段失败后后续阶段记未运行，不能汇总为全绿。

可规划新增本地 `.github/workflows/check.yml`：push/pull_request 触发，`permissions: contents: read`，单 Ubuntu job，checkout→setup-node22→输出版本→`npm ci --include=dev`→`npm run check`。使用届时官方支持的固定 action major 并核实兼容；不使用 `continue-on-error`、`|| true` 或仅解析日志里的“pass”。npm 缓存是下载缓存，不复用 node_modules；不要 `npm install` 重解锁文件，不省略 devDependencies（TS/vue-tsc/Vite 必需）。本轮不创建 YAML、不配置远端 required checks、不推送。仓库 YAML 运行检查与远端强制合并门禁是两个状态，后者不能凭本地文件宣称已启用。

## 6. 失败非零验证与接受标准

以下全部是实施阶段验收计划，本轮未执行。运行前按项目通知规则发短通知。

1. 干净临时 checkout（实施阶段位于仓库 `.tmp/`）中仅用已跟踪文件和根锁执行 `npm ci --include=dev`、`npm run check`；不复制旧 `.tmp/fix-review-last8`，不依赖历史 Git对象、不接用户浏览器。再执行一次 `npm test` 确认不存在 wx/遗留结果依赖。记录版本、源码提交/差异及各阶段退出码。
2. 把新测试中一条关键 expected 故意改错，只在隔离 checkout 操作；`npm test` 和总 `npm run check` 均必须非零。名称与失败 actual/expected 可定位；不能只是日志出现 pass:false。
3. 在隔离 checkout 的已覆盖 TS 文件引入明确语义类型错误（例如 `const gateProbe: number = 'bad'`），现有 type-check 与总 check 非零；恢复后确认正确版本。不要把“构建成功”当类型检查成功。
4. 在隔离 checkout 还原一个已识别的历史故障，例如 `core/store/app.ts:886` 将同代判断退化为允许任意非空身份、或撤去混合schema逐源归一化；对应反例必须失败。只在临时副本做可审阅 mutation，不改用户工作区、不在正常夹具使用 source replace。无需恢复完整历史版本，避免历史依赖和新测试 API 不兼容。
5. 检查脚本传播链：单独让 type-check、test、build-prod 的脚本在隔离副本中各返回固定非零码（如7），逐项确认 check 非零且不执行后续阶段。这只验证 orchestration，不能替代三个真实阶段成功；修改完全部恢复并审查diff。采集退出码必须紧跟子进程，不能先 echo 再读 `$?`；用 Node `spawnSync` 时 error、signal、status=null 也按失败。
6. 正确版本所有阶段通过；若受环境/现有缺陷阻断，逐项记 failed/blocked/unrun，不借用230条历史结果补齐。至少记录上表每个场景族对应 test 名、真实入口、预期、执行结果。

## 7. 最小文件列表与命令

| 文件 | 用途 | 是否必要 |
| --- | --- | --- |
| `tests/helpers/storage-fixture.cjs` | 真实模块VM加载、隔离存储、故障与时钟控制，正常导出helper | 必要；唯一共享夹具 |
| `tests/storage-lifecycle.test.cjs` | 本文首批场景、assert、内置测试runner | 必要；初期一个文件即可 |
| `package.json` | 三个脚本入口，复用既有type-check/build-prod | 必要 |
| `.github/workflows/check.yml` | 本地可审阅CI配置 | 选定GitHub Actions自动执行时必要 |
| `package-lock.json` | 若决定同步3.1.0根元数据，仅最小diff | 条件项；不新增依赖，无需重解全部锁 |
| `.node-version` | 精确Node22补丁版本共用入口 | 条件项；只锁major的最小方案可省 |

无需改 `core/**`、`src/**`、tsconfig、全局hook、平台配置或常驻AGENTS。不为研究创建上述实现文件。

计划使用的命令（尚未运行）：

```bash
node --version
npm --version
npm ci --include=dev
npm run test:storage
npm run check
```

CI只需一次ci和check；单独test:storage用于开发定位，不要求每次额外重复整套测试。新增CJS不在当前tsconfig覆盖内，靠内置runner加载/执行验证；不宣称它们已被vue-tsc检查。

## 8. 浏览器范围、风险与交付状态

- 本轮为只读研究，明确不运行产品测试或浏览器，未创建服务器/浏览器资源；也没有执行 npm ci 或任何模拟故障。源码、配置、入口与契约已静态核对，计划尚未验证可运行。
- 若后续只有测试文件、package脚本、CI YAML变更且产品/依赖/注入产物逻辑不变，对应功能验收是新测试入口和门禁非零传播；不应为了提取Node夹具声称或补跑整套UI/平台故障验收。若提取时发现产品缺陷，另立修复范围，并依项目规则做真实平台验收。
- VM保证的只是现役模块在受控同步GM/localStorage环境下的契约行为。它没有验证油猴脚本grant、GM实际序列化/异常语义、脚本隔离作用域、EH/EX/NH真实共享、浏览器调度和UI反馈；未来改变平台存储/产品链路时，按eh-test验证EH并补NH/跨站相应场景。移动与桌面UI、缩略图渲染、下载、原图/换源均不在本窄门禁声明内。
- 真实Vue保留部分响应式行为，但event/i18n/download替身明确缩小边界；未知导入失败、独立VM与scope清理用于减少假绿和跨例污染。无需把这些替身推广到其他产品测试。
- 历史 `.tmp` 输入只作为本次研究证据；新测试将关键输入内联并引用稳定spec，不依赖这些文件永久存在。230是历史断言总数，不是230次独立故障或首批迁移目标。
- graft本轮定位总计5次（1次ask、4次skeleton），报告估算节省43,942 tokens；首次宽检索命中历史目录，随后用现役文件skeleton精确限定，未把旧实现作为设计依据。

两分钟下一步：主会话核对第4节场景边界和第7节最小文件列表，决定采用Node22主版本基线还是补丁级固定，即可将本设计转成实施任务。
