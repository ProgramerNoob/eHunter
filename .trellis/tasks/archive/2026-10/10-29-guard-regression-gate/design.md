# 设计：门禁回归门

## 1. 边界

本任务只补「门禁自己没有回归覆盖」这件事，不改门禁的判定逻辑。

| 范围 | 内容 |
| --- | --- |
| 改 | `package.json`（脚本链）、`scripts/test-trellis-extension.mjs`（SDK 定位）、`.github/workflows/check.yml`（CI 环境）、`scripts/acceptance.py`（归档透传）、两个 tooling spec |
| 不改 | `.pi/extensions/trellis/index.ts` 的任何判定逻辑；放行表、`repoWriteTarget`、`isMainSessionWritable` 保持 `0fec79b` 的状态 |

## 2. SDK 定位

`scripts/test-trellis-extension.mjs:16-20` 现在是两候选：

```js
const sdkRoot = [join(repo, 'node_modules'), globalModules]
  .map(base => join(base, '@earendil-works/pi-coding-agent'))
  .find(base => existsSync(join(base, 'dist/core/tools/tool-definition-wrapper.js')));
```

改为按顺序尝试三类来源，第一类命中即用：

1. `join(repo, 'node_modules')`（有人装了 devDependency 时）
2. `globalModules`（`npm root -g`）
3. `$PI_MANAGED_INSTALL_ROOT/releases/<current-version>/node_modules`（托管安装）

第三类的版本从 `$PI_MANAGED_INSTALL_ROOT/current-version` 读，不写死 `1.4.0`。`PI_MANAGED_INSTALL_ROOT` 在 Pi 进程里可能带 `..`（本机是 `/Users/warwick/.local/bin/../../.pi/agent/install`），定位前 `resolve()` 一次。变量缺失、`current-version` 不可读、目录不存在都只是「该候选不成立」，继续下一个，不抛异常。

关键约束：托管安装的 `pi-coding-agent` **没有** `node_modules/@earendil-works/pi-ai`。现在 `:23-24` 用的是 `join(sdkRoot, 'node_modules/@earendil-works/pi-ai/...')`，只在项目本地安装（npm 嵌套布局）时成立；托管安装是 pnpm 风格的平铺，`pi-ai` 与 `pi-coding-agent` 在同一级。所以两个嵌套路径都要先试 `join(sdkRoot, 'node_modules')`，再回落到 `join(dirname(sdkRoot), '..')`（即 `@earendil-works/` 的父目录）去找 `@earendil-works/pi-ai`。

已实测三种布局下这三个文件的存在性（本机托管安装）：

```text
OK  @earendil-works/pi-ai/dist/utils/validation.js
OK  @earendil-works/pi-agent-core/dist/agent-loop.js
OK  @earendil-works/pi-coding-agent/dist/core/tools/tool-definition-wrapper.js
```

`assert.ok(sdkRoot, 'Install Pi before running the extension contract tests')` 保留：缺 SDK 时硬失败，不静默跳过——跳过会让 CI 绿灯失去意义。

## 3. CI

`.github/workflows/check.yml`：

- `actions/checkout@v7` 加 `with: { fetch-depth: 0 }`。测试用 `git show e7e5f28:.pi/extensions/trellis/index.ts` 取基线源码（`:26`），基线提交不在浅克隆历史里必然失败。
- `npm ci --include=dev` 之后加一步全局安装 SDK，版本与 `package.json`/本机一致（`@earendil-works/pi-coding-agent@1.4.0`）。这一步落在 `npm run check` 之前，使扩展测试在 CI 上有 SDK 可寻。

SDK 版本在 workflow 里写死是刻意的：升级 Pi 时要同时改 workflow 与测试里的 SDK 契约断言（`sdkVersion` 会进入测试名），漏改会红。

## 4. 归档透传

`scripts/acceptance.py:365` 现在固定：

```python
[sys.executable, str(root / ".trellis/scripts/task.py"), "archive", str(task)]
```

改为 `main()` 的 `archive` 子命令接受 `--skip-branch-validation`，透传到上面的 argv。未传时行为不变——自指分支仍报 `branch and base_branch are both 'master'`。这样 `task.py archive` 的语义（只有显式 flag 才放行）不被稀释，`acceptance.py` 只是多一条通道。

`scripts/test_acceptance.py:621` 有一条断言精确比对 delegate 的 argv，加 flag 后要同步：默认调用不得带 flag，带 flag 时 argv 末尾追加。

## 5. 硬链接边界（文档）

`.trellis/spec/tooling/pi-context.md` 第 9 节补一段：硬链接不在覆盖范围。`realpathSync.native` 解析的是路径而非 inode，`ln src/main.ts notes.md` 后 `notes.md` 仍按字面名判定并放行；且建链本身需要 `bash`，属该节已声明的已知绕过。不做 `nlink > 1` 拦截，因为它只能覆盖「先建链再 write」这一种用法，而 bash 侧仍不受控。

## 6. 风险

| 风险 | 处理 |
| --- | --- |
| CI 全局安装 SDK 变慢（25 MB + 21 依赖） | 只加在 check job，缓存由 `actions/setup-node` 的 npm cache 覆盖不到全局安装；接受该成本，换取门禁在 CI 真实执行 |
| 托管安装布局随 Pi 版本变化 | 三个嵌套路径先试后回落；SDK 缺失仍是明确失败，不会假绿 |
| `fetch-depth: 0` 拉全历史 | 本仓库历史规模小，拉取成本可忽略 |
| 透传 flag 被习惯性使用 | spec 写明只在「任务从未走 PR」时用 |

## 7. 回滚

六处改动彼此独立，除 `package.json` 的 `test` 链外都可单独 revert。若 CI 全局安装不可用（例如镜像限制），回退顺序：先把 `test:trellis-extension` 从 `test` 链摘除并保留脚本，再修 CI。
