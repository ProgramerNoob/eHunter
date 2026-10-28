# 实现计划：门禁回归门

## 步骤

### 1. SDK 定位（对应 R2 / AC2）

改 `scripts/test-trellis-extension.mjs:16-24`：

1. 抽出 `managedModulesBase()`：环境变量 `PI_MANAGED_INSTALL_ROOT` 缺失时回落到 `join(homedir(), '.pi/agent/install')`（该变量只由 `/Users/warwick/.pi/agent/bin/pi:41-43` 导出，普通终端提交时没有），`resolve()` 后读 `current-version`，返回 `join(root, 'releases', version, 'node_modules')`；任一步失败返回 `undefined`。
2. `sdkRoot` 候选数组改为 `[join(repo, 'node_modules'), globalModules, managedModulesBase()].filter(Boolean)`，仍用 `existsSync(join(base, '@earendil-works/pi-coding-agent/dist/core/tools/tool-definition-wrapper.js'))` 判定。
3. `pi-ai` / `pi-agent-core` 的解析加回落：先 `join(sdkRoot, 'node_modules/@earendil-works/<pkg>/<rest>')`，不存在则 `resolve(dirname(sdkRoot), '..', '@earendil-works/<pkg>/<rest>')`（`sdkRoot` 是 `.../node_modules/@earendil-works/pi-coding-agent`，其父的父是 `node_modules`）。
4. `assert.ok(sdkRoot, 'Install Pi before running the extension contract tests')` 保持原样。

验证：`env -u PI_MANAGED_INSTALL_ROOT node --test …` 14/14（走 `~/.pi` 回落）；`PI_MANAGED_INSTALL_ROOT=/tmp/definitely-not-here` 时断言失败（显式配置错应红，不被回落掩盖）。

### 2. 挂进 check 链（对应 R1 / AC1、AC3）

`package.json`：

- 新增 `"test:trellis-extension": "node --test scripts/test-trellis-extension.mjs"`。
- `test` 聚合脚本末尾追加 `&& npm run test:trellis-extension`。

验证：`env -u PI_MANAGED_INSTALL_ROOT npm run check` exit 0，输出里出现扩展测试的 14 条断言。

### 3. 变异验证回归门（对应 AC3）

临时把 `isMainSessionWritable` 的放行表改成恒 `true`（`return true;` 置顶），跑 `npm run check`，确认在 `test:trellis-extension` 处失败且失败用例指向 `src/` 放行；恢复后重跑通过。改动用私有备份恢复，不用 `git checkout`。

### 4. CI（对应 R3 / AC4）

`.github/workflows/check.yml`：

- `actions/checkout@v7` 的 `with` 加 `fetch-depth: 0`。
- `npm ci --include=dev` 之后插入一步 `Install Pi SDK for the extension contract tests`：`npm install --global @earendil-works/pi-coding-agent@1.4.0`。

验证：`git clone --depth 1 file://$PWD /tmp/shallow` → 在该副本里 `git rev-list --count HEAD` 为 1、`git show e7e5f28:.pi/extensions/trellis/index.ts` 报 `致命错误：无效的对象名 'e7e5f28'`、`node --test scripts/test-trellis-extension.mjs` 为 `ℹ fail 1`（证明基线必需），`git fetch --unshallow` 后转 14/14；并确认 workflow YAML 可被 `python3 -c "import yaml,sys;yaml.safe_load(open('.github/workflows/check.yml'))"` 解析。

### 5. 归档透传（对应 R4 / AC5）

`scripts/acceptance.py`：

- `main()` 的 `archive` 子命令加 `command.add_argument("--skip-branch-validation", action="store_true", ...)`（只给 `archive`，不给 `summarize`/`validate`/`run`）。
- `archive(root, task, result)` 加 `skip_branch_validation=False` 参数，argv 末尾按需追加。
- `scripts/test_acceptance.py:621` 的精确 argv 断言同步：默认不带 flag；新增一条带 flag 的断言。

验证：`python3 -m unittest discover -s scripts -p 'test_acceptance.py'` 通过；对 `10-28-fix-write-guard` 实跑 `python3 scripts/acceptance.py archive .trellis/tasks/10-28-fix-write-guard --skip-branch-validation`。

### 6. 文档（对应 R5 / AC6）

- `.trellis/spec/tooling/pi-context.md` 第 9 节补硬链接边界一段。
- `.trellis/spec/tooling/index.md:37` 改成两条命令各自的实际行为：`task.py archive` 认 `--skip-branch-validation`；`acceptance.py archive` 同样接受该 flag 并透传。

验证：`npm run check:docs`。

## 验证命令

```bash
node --test scripts/test-trellis-extension.mjs
python3 -m unittest discover -s scripts -p 'test_acceptance.py'
npm run check
npm run check:docs
```

## 回滚点

- 步骤 2 之后任何一步失败，先从 `test` 链摘下 `test:trellis-extension`，避免门禁在环境不满足时红。
- 步骤 4 的 CI 改动可单独 revert，不影响本地门禁。
- 步骤 5 的 flag 是纯增量，revert 后回到上一行为。
