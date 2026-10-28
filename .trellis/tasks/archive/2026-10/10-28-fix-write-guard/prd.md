# 修主会话写入门禁的五处缺陷

## 背景

`3f794c1` 交付的主会话实现写入门禁在真实使用前暴露了五处问题：一处会挡住规范要求的正常操作，一处测试断言是重言式，两处实现细节与既有约定不一致，一处是提交噪音。本任务只修这些缺陷，不改变门禁的整体语义。

## 需求

### R1 `.tmp/` 必须放行（阻断级）

`.trellis/spec/frontend/browser-acceptance.md:30` 要求「日志、截图、下载和报告保存到仓库 `.tmp/`」，`:132-140` 的示例在主会话里向 `.tmp/scenario-inputs/` 与 `.tmp/browser-preflight/` 写文件；`AGENTS.md` 同样要求调试产物放 `.tmp/`。当前 `isMainSessionWritable`（`.pi/extensions/trellis/index.ts:1148`）只放行 `.trellis/**` 与 `*.md`，任务 `in_progress` 时主会话跑验收会直接撞墙，第一反应会变成用 `bash` heredoc 绕过，正好抵消门禁目的。

### R2 测试断言不能是重言式

`scripts/test-trellis-extension.mjs:433` 的 `assert.equal(call('bash', 'src/main.ts'), undefined)` 恒真：`MAIN_SESSION_WRITE_TOOLS` 不含 `bash`，任何 bash 调用都返回 `undefined`。这条断言无论门禁怎么写都会绿，读者会误以为 bash 路径受保护。要改成能说明「已知绕过路径」的断言。

### R3 子进程判断有死代码

`.pi/extensions/trellis/index.ts:1878` 已在 `process.env.TRELLIS_SUBAGENT_CHILD === "1"` 时直接返回、整个扩展不注册，因此 `:1160` 的同类判断在生产路径不可达；测试能走到它，只是因为测试先在 `register()` 之后才设 env。

### R4 路径判定未做 realpath

`repoRelativePath`（`:1141`）用 `relative` 做字符串比较，而同一文件的 `containInRoot`（`:1086` 附近）专门处理了 symlink 指向仓库外的情况并写了注释说明取舍。仓库内软链会让写操作按「仓库内路径」放行，实际落到仓库外。

### R5 换行噪音

`.trellis/spec/tooling/pi-context.md` 文件末尾丢了一个换行；`AGENTS.md` 末尾多了一个空行。两处都与本次改动无关。

## 约束

- 不改变门禁的核心语义：`in_progress` + 主会话 + 实现路径仍然拦截。
- 不扩大拦截范围到 `bash`。known-bypass 是有意保留的，R2 只要求测试如实反映它。
- 路径判定不得因收紧而误拦非软链的常规写入：全新路径（目标与其祖先全部不存在）与 `node_modules/` 下的普通写入行为不变。
- 修改面限于 `.pi/extensions/trellis/index.ts`、`scripts/test-trellis-extension.mjs`、`.trellis/spec/tooling/pi-context.md`、`AGENTS.md`。

## 接受标准

- [AC1] 任务 `in_progress` 时，主会话对 `.tmp/` 下任意路径的 `write`/`edit` 不被拦截；`src/`、`core/`、`scripts/`、`tests/` 仍被拦截。测试用例覆盖 `.tmp/` 放行与 `src/` 拦截两侧。
- [AC2] `scripts/test-trellis-extension.mjs` 中不再存在恒真的 bash 断言；改为断言「带 `command` 的 `bash` 调用不被拦截」并显式标注它是已知绕过路径而非保护。
- [AC3] `TRELLIS_SUBAGENT_CHILD` 在 `mainSessionWriteBlock` 与扩展入口两处只剩一处判断；若保留，附注释说明它防的是什么场景。
- [AC4] 路径判定按真实落点而非字面名称：目标已存在时 realpath 后判定；目标不存在时回溯到最近存在的祖先目录 realpath，再拼回剩余段判定。仓库内指向仓库外的软链（含悬空链、指向实现目录的链目录及其下新建文件）一律拦截。
- [AC8] 含 `..` 的相对路径保留内核「先解析软链、再退父目录」语义：仓库内指向仓库外的软链目录后接 `..`（如 `link-out/../.tmp/evil.png`、`link-out/../.tmp/evil.md`）按其真实落点判定并被拦截，不能因提前做词法归一而落到放行表。
- [AC7] 上述两条残留绕过在扩展测试中有对应断言：悬空软链（如 `ghost.md -> src/new.ts`）与链目录下新建子文件（`.tmp` 链到 `src` 后的 `.tmp/new-child.ts`）均被拦截，且各有一次变异测试证明断言会失败。
- [AC5] `.trellis/spec/tooling/pi-context.md` 以单个换行结尾，`AGENTS.md` 末尾不残留多余空行；`npm run check:docs` 通过。
- [AC6] `node --test scripts/test-trellis-extension.mjs` 全部通过，`npm run check` 通过。
