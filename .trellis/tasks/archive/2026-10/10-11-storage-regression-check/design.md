# 存储回归及CI设计

## 现有基础

[研究](../10-11-project-session-retrospective/research/storage-gate-design.md)逐项定位最终历史夹具与现行公开入口；产品依据为 [设置迁移决策](../../../../spec/frontend/decisions/2026-09-18-reader-behavior.md)及相关quickstart。历史夹具的git show、字符串替换加载、固定wx产物和fs monkey patch不带入新测试；部分“单写坏”标题实际控制双坏，必须拆开。

## 最小文件范围

- tests/helpers/storage-fixture.cjs：唯一共享VM夹具，正常导出创建页面的方法。
- tests/storage-lifecycle.test.cjs：node:test + node:assert/strict 场景。
- package.json：test:acceptance、test:storage、test、check。
- .github/workflows/check.yml：单job自动检查。
- .trellis/spec/frontend/quality-guidelines.md：更新真实可用命令与VM范围。
- package-lock.json：仅在npm ci或根元数据同步确有需要时最小修改；当前package=3.1.0、lock根版本=3.0.0，不能仅据此认定安装失败，不升级依赖或锁格式。

不改core/src、tsconfig、产品导出或全局hook。

## 夹具边界与场景

复用TypeScript transpileModule转CJS/ES2022，真实Vue、app.ts、layoutPreference.ts及PlatformService.js。仅隔离i18n/event/album/download边界；替身显式列出所需方法，未知import报错，不用全吞Proxy。每页独立vm/module cache和effectScope，结束stop，watcher场景await nextTick。转译error抛出，语义类型检查另跑vue-tsc。

共享GM Map + 每origin独立local Map；刷新重建VM/cache/state并保留Map。GM独立get/set/list/delete故障，缺API与API抛错区分；复制GM值防引用共享，localStorage保字符串语义。可控Date覆盖now/构造/ISO，crypto有/无分支覆盖身份生成；不用固定同一个UUID充当同毫秒测试。

首批覆盖研究第4节的12个场景族及公共入口/期望，包括健康共享优先、故障降级连续读写、新页面恢复、reset不伪绿、A reset→B先观察→B保存→两次刷新、旧未观察站点不可预知远端reset的边界、单字段/单模式、身份接受/拒绝、旧独立翻页项、非法/显式空值、混合schema重复迁移、同毫秒与回拨、身份vs时间戳对照。期望来自契约，历史core平台stub的期望不可当真实平台行为直接复制。

夹具仅支持当前模块图，不做通用loader。assert失败、导入异常、清理失败直接传播runner；常规测试不写固定证据文件、不读取.tmp。不增加真实网络/定时器/浏览器。

## 命令与CI

package脚本拟定：

- test:acceptance = python3 -m unittest discover -s scripts -p 'test_acceptance.py'
- test:storage = node --test tests/storage-lifecycle.test.cjs
- test = npm run test:acceptance && npm run test:storage
- check = npm run type-check && npm test && npm run build-prod

这是串行fail-fast，不是并行调度器。未执行到的阶段记unrun；build-prod不会替代type-check。

GitHub Actions单Ubuntu job，push/pull_request，permissions contents:read，checkout → setup-node 22（npm下载缓存/根lock）→ setup-python 3.12 → 输出版本 → npm ci --include=dev → npm run check。action使用实施时核实仍维护的官方major，固定在YAML；该选择不改变MVP。无continue-on-error/吞错/密钥。Node固定major，记录实际patch；不宣称补丁级完全可复现。本机当前24.18.0/npm12.2.0不算Node22验证，实施须在隔离环境实际验证22。

## 兼容、验收与回退

正常入口仅依赖当前checkout及根锁，不需要旧提交/旧.tmp。单次历史故障mutation只用于隔离副本验证测试有区分力，不进入日常runner或产品代码。

未推送时Actions尚未触发；required checks不在本任务设置。VM不能证明油猴grant/沙箱/序列化/真实跨站共享、浏览器调度、UI/下载行为。若保持产品与依赖不变，验收测试入口和CI命令即可，不将无关浏览器场景记passed。

回退本任务文件与脚本差异；01的独立Python命令仍可用。共享quality文档按本任务diff回退，不覆盖01成果或其他改动。
