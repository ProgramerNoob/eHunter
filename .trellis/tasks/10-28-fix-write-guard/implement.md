# 实现记录：修主会话写入门禁的五处缺陷

## 步骤

### 1. `.tmp/` 放行（对应 R1 / AC1）

在 `.pi/extensions/trellis/index.ts` 的 `isMainSessionWritable` 中增加 `.tmp/` 前缀放行，与既有 `.trellis/**` 分支并列。注意要同时覆盖 `.tmp` 本身与 `.tmp/...` 子路径，写法与 `.trellis` 分支保持一致。

同步给 `pi-context.md` 第 9 节的放行范围补 `.tmp/`，说明依据是 `browser-acceptance.md:30`。

### 2. 测试断言（对应 R2 / AC2）

`scripts/test-trellis-extension.mjs` 现有第 12 个用例里，把 `assert.equal(call('bash', 'src/main.ts'), undefined)` 换成真实形状的输入 `{ path: undefined, command: 'cat > src/main.ts <<EOF' }`，断言仍为 `undefined`，并在断言上方用注释写明：这是已知绕过路径，此断言记录现状而非保护。

新增断言：`.tmp/browser-preflight/x/shot.png` 与 `.tmp/scenario-inputs/reader.json` 在 `in_progress` 下放行；`src/main.ts` 与 `core/TestApp.vue` 仍被拦截。

新增两条软链绕过断言（对应 AC4b）：
- 悬空软链 `ghost.md -> src/new.ts`（目标不存在）→ 必须 block。
- 把 `.tmp` 换成指向 `src` 的软链后写 `.tmp/new-child.ts` → 必须 block。

两条都要用变异测试确认会变红：临时短路祖先回溯分支，跑测试确认对应断言失败，再恢复。

第三条（对应 AC8）：构造 `link-out` → 仓库外目录且在仓库外建 `.tmp/`，断言 `link-out/../.tmp/evil.png` 与 `link-out/../.tmp/evil.md` 均被 block。变异两种：`realpathSync.native` 换回 `realpathSync`；字面拼接换回 `resolve`。两种都要让该断言变红。

### 3. 子进程判断去重（对应 R3 / AC3）

删掉 `mainSessionWriteBlock` 里 `:1160` 的 `if (process.env.TRELLIS_SUBAGENT_CHILD) return undefined;`，保留扩展入口 `:1878` 的判断。删前确认测试用例不需要它：现有用例通过 `process.env.TRELLIS_SUBAGENT_CHILD = '1'` 直接调 `call()`，绕过扩展入口，所以删掉后该用例会失败，需要同步调整——把该用例改为断言「扩展入口在子进程环境不注册」，或在测试里改为验证 `register` 未被调用。

### 4. realpath 判定（对应 R4 / AC4）

`repoRelativePath` 分两步：先按字符串算 `rel`；再把 `abs` 拆成「最近的已存在祖先 + 剩余未创建段」，对祖先做 `realpathSync` 后拼回剩余段，重新算 `rel`。这样悬空软链（`lstatSync` 成功但 `realpathSync` 抛 ENOENT）与「软链目录 + 不存在的子文件」都会按真实落点判定，而不是按字面名称。

三个分支：
- 自身或最近祖先 realpath 成功 → 用解析后的路径判定；越界标记 `escapes`。
- 悬空软链（`lstatSync` 成功、`realpathSync` 抛 ENOENT）→ `escapes: true`，不放行。
- 祖先回溯到仓库根仍无已存在目录（全新路径）→ 保持字符串判定。
- 其它解析错误（权限等）→ `escapes: true`，fail closed。
- 相对路径拼成字面绝对路径后用 `realpathSync.native` 解析：`resolve(cwd, raw)` 会在 realpath 之前把 `..` 归一，丢掉「先解析软链、再退父目录」的内核语义，使 `link-out/../.tmp/evil.png`（`link-out` 指向仓库外）落到 `.tmp` 放行表。改为 `` `${cwd}/${raw}` `` 保留字面 `..`，并把 `realWritePath`/`repoWriteTarget` 的 `realpathSync` 换成 `realpathSync.native`。实测两种改法单独都不够：只换拼接（保留 `..` 但用 `realpathSync`）仍放行，只换 `native`（路径已被 `resolve` 归一）也仍放行，必须同时改。

实现前先读 `containInRoot`（`:1087`）及其注释的取舍：成功时返回原始 candidate 而非 realpath，因为调用方会对 `root` 做 `relative`。


### 5. 换行噪音（对应 R5 / AC5）

- `.trellis/spec/tooling/pi-context.md` 补回文件末尾单个换行。
- `AGENTS.md` 去掉末尾多余空行。

## 验证命令

```bash
node --test scripts/test-trellis-extension.mjs
npm run check
```

`node --test` 需要 Pi SDK 可解析。本机 `npm root -g` 不含 `@earendil-works`，若断言失败，用临时 shim 指向 `/Users/warwick/.pi/agent/install/releases/1.4.0/node_modules/@earendil-works/`，跑完删除。

## 回滚点

改动集中在 4 个文件，无数据迁移、无脚本产物变化。任一 AC 无法达成时按文件 revert 并回报，不要扩大改动面。
