# 门禁回归门：扩展测试进 check 链与 SDK 定位

## 背景

`0fec79b` 修好了主会话写入门禁的五处缺陷，但门禁本身没有回归覆盖：`package.json:28` 的 `check` 链串的 16 个测试脚本里没有 `test-trellis-extension`，`.githooks/pre-commit` 也只跑 `npm run check`，所以 `scripts/test-trellis-extension.mjs` 的 14 条断言在提交门禁上完全不执行。任何人改动 `repoWriteTarget` 或 `isMainSessionWritable` 后 `npm run check` 一样全绿，软链绕过会悄悄回来。

即使想手动跑，本机也跑不起来：`scripts/test-trellis-extension.mjs:16-20` 只在 `node_modules` 与 `npm root -g` 里找 `@earendil-works/pi-coding-agent`，而 Pi 托管安装的真实位置是 `$PI_MANAGED_INSTALL_ROOT/releases/<current-version>/node_modules`。上一个任务把「临时 shim、跑完删除」写进了流程，第 1 条与第 2 条叠加就是「反正也跑不起来、反正也不自动跑」。

## 需求

### R1 扩展测试进入 check 链

`package.json` 新增 `test:trellis-extension`，并拼进 `test` 聚合脚本，使 `npm run check` 与 `.githooks/pre-commit` 自动执行它。

### R2 SDK 定位认 `PI_MANAGED_INSTALL_ROOT`

`scripts/test-trellis-extension.mjs` 的候选目录除了 `node_modules` 与 `npm root -g`，还要包含 `$PI_MANAGED_INSTALL_ROOT/releases/<current-version>/node_modules`（版本号从同目录的 `current-version` 读，不写死）。找不到时保持现有 `Install Pi before running the extension contract tests` 硬失败，不静默跳过。

### R3 CI 可运行

`.github/workflows/check.yml` 的 `checkout` 加 `fetch-depth: 0`，并在 `npm ci` 之后全局安装扩展测试所需的 Pi SDK。理由：测试用 `git show e7e5f28:.pi/extensions/trellis/index.ts` 取基线源码，浅克隆下必然失败；SDK 不入 devDependency（25 MB / 1279 文件的包及其 21 个依赖，只为测试三个导出函数）。

### R4 归档不再被自指分支卡住

`scripts/acceptance.py archive` 调用 `task.py archive` 时不透传 `--skip-branch-validation`，导致 `branch == base_branch == master` 的任务在验收全 passed 后仍无法归档（`0fec79b` 就是如此）。要求归档路径在自指分支时可用，并把 `.trellis/spec/tooling/index.md` 的说明补成两条命令各自的实际行为。

### R5 文档补硬链接边界

`.trellis/spec/tooling/pi-context.md` 第 9 节的路径判定说明补一句：硬链接（`ln src/main.ts notes.md`）不在覆盖范围，`realpath` 不展开硬链接，判定按字面名，建链本身需要 `bash`，属已知绕过。

## 约束

- 不改变门禁的核心语义与放行范围（`in_progress` + 主会话 + 实现路径仍拦截，`.tmp/`、`.trellis/`、Markdown 仍放行）。
- 不扩大拦截范围到 `bash`；不把硬链接做成 `nlink > 1` 拦截。
- 不把 Pi SDK 加进 `devDependencies`。
- 修改面限于 `package.json`、`scripts/test-trellis-extension.mjs`、`.github/workflows/check.yml`、`scripts/acceptance.py`、`scripts/test_acceptance.py`、`.trellis/spec/tooling/pi-context.md`、`.trellis/spec/tooling/index.md`。

## 接受标准

- [AC1] `npm run check` 的链路中包含扩展测试；在只有托管安装（无 `node_modules`、无全局 SDK）的机器上 `npm run check` 通过，且扩展测试确实执行了 14 条断言而非跳过。
- [AC2] `scripts/test-trellis-extension.mjs` 能通过 `PI_MANAGED_INSTALL_ROOT` 定位 SDK，版本号动态读取；SDK 完全缺失时仍以 `Install Pi before running the extension contract tests` 失败。
- [AC3] 故意改坏 `isMainSessionWritable` 的放行表（让 `src/` 被放行）后，`npm run check` 在扩展测试处失败；恢复后重新通过。该变异证明 R1 的回归门真实生效。
- [AC4] `.github/workflows/check.yml` 含 `fetch-depth: 0` 与 SDK 安装步骤；`git clone --depth 1` 的副本中扩展测试因取不到基线提交 `e7e5f28` 而失败，`git fetch --unshallow` 后取到基线并通过 14/14。
- [AC5] `python3 scripts/acceptance.py archive <task-dir>` 对 `branch == base_branch` 的任务不再因自指元数据失败；对 `branch != base_branch` 的既有行为不变。
- [AC6] `.trellis/spec/tooling/pi-context.md` 第 9 节写明硬链接边界；`.trellis/spec/tooling/index.md` 写明 `task.py archive` 与 `acceptance.py archive` 两条命令的参数差异。
- [AC7] `npm run check`、`node --test scripts/test-trellis-extension.mjs`、`python3 -m unittest discover -s scripts -p 'test_acceptance.py'` 全部通过，`npm run check:docs` 通过。
