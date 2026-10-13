# 复盘：trellis × billion-context 的两个上下文问题

日期：2026-10-13
状态：两个问题均**已核实属实**（代码机制 + 运行日志双向验证）；修复**未开始**
用途：给新会话做修复的交接文档。第 6 节是修复前的第一个验证动作。

---

## 1. 结论

| # | 问题 | 真伪 | 严重度 | 根因位置 |
|---|---|---|---|---|
| 1 | trellis 子代理不能调用 billion-context（ACP）插件 | ✅ 属实（机制级确定） | 高 | `.pi/extensions/trellis/index.ts:700-716`（`--tools` 白名单）+ `.pi/agents/trellis-*.md` frontmatter |
| 2 | 提示词注入 + ACP 压缩 → agent 反复读同一文件再压缩 | ✅ 属实（有量化证据） | 高（烧钱 + 降质 + 卡死） | ACP nudge / 75% 强制阈值 × trellis 每轮要求精确现状 × 摘要丢字段 |

---

## 2. 素材与背景

**被复盘的会话**
- S1：`~/.pi/agent/sessions/--Users-warwick-claude-eHunter--/2026-10-12T14-27-25-891Z_01a13082-e043-70ab-bb85-4a31d67b7015.jsonl`（14:27–18:43）
- S2：`~/.pi/agent/sessions/--Users-warwick-claude-eHunter--/2026-10-12T19-01-03-173Z_01a1317d-6244-73b8-a26e-8279ab16c9de.jsonl`（19:01–次日 00:59，主题为 `.trellis/tasks/10-12-browser-acceptance-preflight`）

**关键日志**：`~/.local/state/billion-context/bili.log`
（`[acp-usage] input=… cached=… (cache hit N%) fold=…` 行可统计缓存命中与折页；`[sess=<id>]` 可定位到具体会话）

**相关子会话**（都是 trellis spawn 出来的子 pi 进程，均被代理接管）
| 子会话 id | 时间 | 对应 |
|---|---|---|
| `01a1319c-6323-71c1-b779-6e3b6579129e` | 19:34:56 → 20:33:06 | S2 消息 [187] 并行派的 `trellis-check`（19:34:54 派发，20:35:06 返回，≈60 分钟） |
| `01a1319c-6310-7056-bc2e-03218f1d1194` | 19:34:56 → 19:42:12 | 同批另一个 trellis 子代理 |
| `01a131dd-e072-7334-8353-ff62523c2a15` | 20:46:27 → 20:58:20 | `trellis-implement`，只回了一份"定位说明"，没交付代码 |
| `01a131eb-20b5-75a9-8684-29cd8ad09f06` | 21:00:56 → 21:09:23 | 第二个 `trellis-implement`（96/96） |

**版本**：`billion-context` 0.1.196（`/Users/warwick/.pi/agent/npm/node_modules/billion-context`），pi-native harness
**pi**：`/Users/warwick/.nvm/versions/node/v24.18.0/lib/node_modules/@earendil-works/pi-coding-agent`

**当前 ACP 配置**：`~/.config/billion-context/billion-context.json`（2026-10-12 22:11 修改）
```json
{ "providers": {}, "pi": { "subagents": false }, "compress": { "promptPack": "lean" } }
```
→ `compress` 段只设了 `promptPack`，`maxContextLimit` / `nudgeGrowthTokens` / `injectNudge` 全是默认值。
→ 注意：`pi.subagents` 控制的是 **ACP 自己的 `acp_delegate`**（`resolveDelegate()` / `state.policy.enabled`，见 pi-native.js 约 offset 2617159 起），**不管第三方 spawner**。把它改成 `true` 不会修好 trellis，别走这条弯路。

---

## 3. 问题一：trellis 子代理确实拿不到 ACP 工具

### 3.1 机制链（每环都在代码/日志里核过）

**① 子进程由 trellis 自己 spawn，带 `--tools` 白名单**
`.pi/extensions/trellis/index.ts:700-716`
```js
function buildPiArgs(cfg: PiRunConfig): string[] {
  const args = ["--mode", "json", "-p", "--no-session"];
  if (cfg.model) args.push("--model", …);
  else if (cfg.thinking && cfg.thinking !== "off") args.push("--thinking", cfg.thinking);
  if (cfg.tools && cfg.tools.length > 0)
    args.push("--tools", cfg.tools.join(","));   // ← :715
  return args;
}
```
`cfg.tools` 来自 `resolveRunCfg()`（同文件 `:671-698`），源头是 agent frontmatter。

**② 白名单内容就是 6 个内建工具**
```
.pi/agents/trellis-check.md:5      tools: read, write, edit, bash, find, grep
.pi/agents/trellis-implement.md:5  tools: read, write, edit, bash, find, grep
.pi/agents/trellis-research.md:5   tools: read, write, bash, find, grep
```

**③ pi 的 `--tools`（纯名字形式）是"替换式白名单"，且覆盖 extension 工具**
- 文档：`…/pi-coding-agent/docs/cli.md:119-128` — "Replaces the default selection with a comma-separated allowlist of built-in, **extension**, or custom tools"。
- 实现：`dist/core/sdk.js` 把 `options.tools` 赋给 `allowedToolNames`；`dist/core/agent-session.js:1122` 的 `_isAllowedTool(name)` 用它判断，注册与激活处都过滤：
  `:2853` `[ … ].filter((tool) => this._isAllowedTool(tool.definition.name))`（另有 `:1379`、`:2855`、`:2885`、`:2897` 同类过滤）。
- 结论：不在白名单里的 **extension 工具会被直接踢出 registry**（不是"声明了但调用被拒"）。

**④ ACP 四个工具正是 extension 工具**
`…/billion-context/dist/agent/pi-native.js`
```js
var ACP_TOOLS=["compress","decompress","search_context","acp_status"];
```
由 `registerTools()` 从 `GET /__bili/plugin/manifest` 拉取后 `pi.registerTool(manifestToTool(proxyBase, t, agent))`（在 `before_provider_request` / `before_provider_headers` 阶段注册）。
→ 本会话（cwd 不在 eHunter）实际可见 5 个：`compress`、`decompress`、`search_context`、`acp_status`、`acp_cache`。

**⇒ 子进程白名单里没有这些名字 ⇒ 子代理的工具表里根本没有 compress。**

### 3.2 ACP 自己的兼容处理覆盖不到 trellis
- **自有 delegate 路径**：pi-native.js `buildChildArgs()` 里对 restricted agent 才显式合并：
  ```js
  const merged=[...new Set([...agentDef.tools.split(",").map(s=>s.trim()),...ACP_TOOLS])];
  cliArgs.push("--tools",merged.join(","))
  ```
  而 `AGENTS` 里 restricted 的只有套餐内角色（`RESTRICTED_TOOLS="read,bash,grep,find,ls"`，如 reviewer）。trellis 的 spawner 完全不走这条。
- **pi-subagents 路径**：老包 `billion-context-pi` 的 `ensureSubagentAcpTools()`（是 `/acp-subagents` 命令背后的实现）只往 **pi-subagents 的 agent override** 注入这四个工具；探测路径仅 `<agentDir>/npm/node_modules/pi-subagents`、`<cwd>/.pi/npm/node_modules/pi-subagents`、以及对应 extension 目录 —— **完全不看项目级 `.pi/agents/*.md`**。而且该包现在没装（`~/.pi/agent/settings.json.bili-bak` 里还有 `npm:billion-context-pi`，现装的是 `npm:billion-context`）。
- 上游自己也承认这个缺口，pi-native.js 里有现成提示文案：
  `"pi-subagents' agents do NOT get ACP context compression by default. Run /acp-subagents (billion-context-pi) to inject compress/decompress/search_context/acp_status into its agent overrides."`
  —— 即便如此也只覆盖 pi-subagents，不覆盖 trellis。

### 3.3 运行期实锤（子会话被代理接管、疯狂 nudge，但一次压缩都没发生）

`bili.log`，`sess=01a1319c-6323-…`：
```
[19:35:50] nudge INJECT T1: … pendingT1=56581/50000
[19:36:25] [self-heal] nudge idle for 5 rounds (injected but nothing ever compressed)
           — nudge suppressed for this session until compression resumes
[19:36:25] context 214266.28 tokens reached preflight target 204000 (model window 204000,
           model=gpt-6-astra; usage-baseline=163305 local-est=214266 raw=101798 k̂=2.10);
           preflight compressing before forward
[19:37:25] [preflight] summary attempt 1 got summary request failed (TypeError, code=UND_ERR_SOCKET; 1 attempt); retrying in 1500ms
[19:38:27] [preflight] summary attempt 2 got summary request failed (TypeError, code=UND_ERR_SOCKET; 2 attempts); retrying in 3000ms
[19:39:31] [preflight] summarization failed: summary request failed (TypeError, code=UND_ERR_SOCKET; 3 attempts)
[19:39:31] preflight made no progress but the payload fits; forwarding as-is
[19:40:04] output budget clamped 28537 -> 1974 (input~257166.91, window=272000); prevents input+output
           overflow (#453); input already exceeds the headroom-adjusted target ~243463 that
           nudge/preflight enforce — only compression can recover it, this clamp guarantees
           native-window fit only (#2096)
[19:40:04] context 260778.81 tokens reached preflight target 243463 …
```
另一个子会话 `01a1319c-6310-…` 同样命中 `[self-heal] nudge idle for 5 rounds`；`01a131dd-e072-…` 在 20:47:03 / 20:50:37 也出现 `reached preflight target` + `preflight compressing`。

**折页统计对比**（bili.log `[acp-usage]` 聚合）：
| 会话 | 请求 | input tokens | cache hit | zero-hit | folds |
|---|---|---|---|---|---|
| S1 `01a13082` | 167 | 21,140,310 | 81.5% | 13 | `{'new': 21}` |
| S2 `01a1317d` | 139 | 20,099,357 | 55.4% | 23 | `{'new': 24}` |
| 子会话 `01a1319c-6323` | 24 | 4,509,585 | 64.8% | 3 | `{'new': 1}`（代理侧 preflight 的，不是模型主动） |
| 子会话 `01a131dd-e072` | 8 | 1,180,544 | 61.5% | 1 | `{}` |
| 对照 `01a13570`（无折叠） | 60 | 4,670,869 | **97.6%** | 1 | `{}` |

### 3.4 影响
- 子代理上下文只能单向涨：204K → 257K → 260K，**输出预算被 clamp 到 1974 tokens**（几乎无法产出有效回复）。
- 代理侧自愈把 nudge 关掉（`nudge suppressed … until compression resumes`）→ 会话进入"裸奔撞窗口"状态。
- 直接后果：那次并行 `trellis-check` 跑了 ≈60 分钟；`trellis-implement` 20:46–20:58 只回了一份"定位说明"（无代码交付）。
- 归纳：**trellis 子代理在长任务里 = 无压缩能力 + 无 nudge 自愈 → 早早撞墙。**

### 3.5 修复选项（第 6 节是动手前的第一步验证）

**A. 改 agent frontmatter 的 `tools`（最小改动，未验证）**
` .pi/agents/trellis-check.md:5` / `trellis-implement.md:5`（视情况 `trellis-research.md:5`）追加：
```
tools: read, write, edit, bash, find, grep, compress, acp_status
```
先只加这两个，验证通过后再补 `decompress, search_context, acp_cache`。
⚠ 两个前提必须同时成立，否则白改：
1) 子进程确实加载了 bili 扩展（否则工具根本不存在，白名单里有名字也没用）；
2) `--tools` 白名单里带上名字后，注册阶段不再被 `_isAllowedTool` 过滤掉。
另有一个未验证环节：子进程是 `--no-session`，ACP 在那个进程里有没有"可压缩范围"（无 session 记录时 compress 可能直接报 `no compressible ranges`）。

**B. patch trellis 扩展的 `buildPiArgs`，照 ACP 自家做法合并 ACP_TOOLS**
`.pi/extensions/trellis/index.ts:715`
```js
args.push("--tools", [...cfg.tools, ...ACP_TOOLS].join(","));   // ACP_TOOLS 需自行内联常量
```
该文件在仓库内（本地 vendored，2124 行），一次改动覆盖所有 trellis 子代理（含未来新增的 `*.md`）。代价：改的是 vendored 扩展，trellis 升级时会冲突。

**C. 上游 issue（治本）**
要么让 `ensureSubagentAcpTools` / `/acp-subagents` 覆盖项目级 `.pi/agents/*.md`；要么给 bili 加一条"任何带 `--tools` 的子进程自动追加 ACP 工具"的策略（类似 pi-subagents 的 `required-child-extensions` 注册表：pi-native.js 里有 `REGISTRY_KEY=Symbol.for("pi-subagents.required-child-extensions.v1")`、`SUBAGENT_EXTENSION_ID="bili"`）。trellis spawner 不走这个注册表。

**D. 不推荐的兜底**
只把子会话的 nudge 静音（避免"5 轮后自愈抑制"的假象），或调高 preflight 容忍度 —— 不解决根因，子代理仍会在 200K 处撞墙。

---

## 4. 问题二：提示词注入 + 压缩 → 反复读同一文件（属实、可量化）

### 4.1 数量级

**S1（`01a13082`，14:27–18:43）**
- 22 次 `compress`；`scripts/browser-preflight.mjs` 共读 **30 次**（`.pi/skills/notify-complete/SKILL.md` 22 次、`~/.agents/skills/ego-browser/SKILL.md` 20 次 —— 均来自当时的会话解析）。
- **15/22** 次 compress 之后，24 条消息内又重读了刚被折叠的文件。

**S2（`01a1317d`，19:01–次日 00:59）**
- 25 次 `compress`；direct `read` 104 次，`scripts/browser-preflight.mjs` 读 **51 次**、`tests/browser-preflight.test.mjs` 22 次。
- read 工具结果合计约 **152K tokens**，其中约 **135K tokens（≈89%）是重复读**（同一文件的第 2 份及以后）：`scripts/browser-preflight.mjs` 223KB、`tests/browser-preflight.test.mjs` 118KB、`.trellis/tasks/10-12-browser-acceptance-preflight/acceptance.json` 78KB……
- **22/25** 次 compress 之后就重读了刚折叠的文件。

### 4.2 最干净的实证：00:43–00:59 那 16 分钟

程序化统计 S2 消息 `[385,531]`（用户 [385] 00:43:42 只说了一句"继续"）：

- 对任何文件的 **写入 = 0 次**（write/replace/insert/undo 全为 0）。
- **14 个 read 批次**；其中同一组 5 个任务文件被**完整重读 8 次**：
  `.trellis/tasks/10-12-browser-acceptance-preflight/` 下的 `implement.md`、`research/final-runtime.md`、`task.json`、`check.jsonl`、`acceptance.json`
  → 批次落在消息 `[442] [450] [460] [473] [482] [491] [513] [523]`
- 同一窗口内 **12 次 compress**：`[394] [408] [411] [421] [430] [439] [457] [470] [488] [498] [520] [530]`
- 期间助手文字几乎是同一句话反复出现，例如 `[433] 00:50:09`：
  > "当前版本的 SHA-256 与交付记录一致，96/96 受控测试也已确认通过；验收记录仍引用修复前的测试证据。现在先把当前版本的测试结果重新写入逐项协议，再同步任务报告中的旧数字，避免把历史 70 项结果当成最终结果。"
- 即：**计划早已定死，它唯一缺的是"未压缩的当前状态"，而每次 compress 恰好把这份状态折掉 → 下一轮只能重读。**

（注意区分：S2 前半段 `browser-preflight.mjs` 被反复读有一部分是合法重读——该文件被 replace 过 31 次；但收尾窗口 0 写入 + 8 轮同组重读是纯空转。）

### 4.3 缓存代价（同一份日志的 `[acp-usage]` 统计）
- S2：139 请求 / 20.10M input tokens / **55.4%** 命中 / **23 次零命中**；对照无折叠会话 97.6%。
- 日志里两次 `upstream prompt-cache collapse: 5 consecutive large requests at ~0% hit (last: input=153903, cached=0)`（S2 的 20:45:32 与 00:50:09）。
- 机制：折叠会在历史中段断掉前缀 → 之后所有轮次近全价重发。20.1M input / 139 请求 = 平均每请求 144K input。

### 4.4 机制：为什么必然成环（三方叠加，不是单一 bug）

1. **ACP 侧是"推动力"**：`compress.maxContextLimit` 默认 `"75%"` —— 历史一过窗口 75% 就无视增长门槛立即 nudge；`compress.nudgeGrowthTokens` 默认 `50000` 是增长门槛；`compress.injectNudge` 默认 `true`（env `ACP_COMPRESS_NUDGE`）。nudge 文本本身还要求"把要保留的范围在**一次**调用里全 fold"，compress 结果又回传 `Current compressible ranges … fold every range you keep in ONE call`。→ 每次读文件后紧跟一次 compress。
2. **摘要必然丢字段**：trellis 的验收门要逐字段依据（`acceptance.json` 的 check id / 时间戳 / 命令输出、`implement.md` 的勾选状态、`check.jsonl` 的条目列表），`TASK AS OF THIS BLOCK` 式摘要装不下这些。
3. **trellis 侧是"需求方"**：`.pi/extensions/trellis/index.ts` 每轮注入 `<workflow-state>` / `<session-overview>`（S1 中观测到 1.4KB / 53KB / 55KB 三次注入），workflow-state 明确要求按 `acceptance.py summarize` 校验收口门；trellis-check / before-dev 又要求先读 `check.jsonl` 再顺其列出的 spec。→ "每轮必须拿到精确现状"是硬需求。

### 4.5 修复选项（配置级，落点 `~/.config/billion-context/billion-context.json`）
- `compress.injectNudge: false`（或 env `ACP_COMPRESS_NUDGE=0`）——去掉被动推动，保留模型自主 compress。**性价比最高的一项。**
- `compress.nudgeModelDecided: true`（#2228，默认 off）：nudge 前先发一个小的 side call 问模型"现在压是否净收益"，可答 `{"compress": false}`；EMERGENCY 与 tier≥2 不受影响。
- 抬高 `compress.maxContextLimit`（默认 `"75%"`）与 `compress.nudgeGrowthTokens`（默认 `50000`），让收口阶段少触发。
- trellis 侧：收口阶段把 5 个状态文件合成一份"当前验收快照"，之后只读快照；或该阶段临时关 nudge。
- ⚠ 改这些设置需要确认 provider/model 层级覆盖关系（配置支持 global → provider → model 逐层合并）。

---

## 5. 未决 / 待验证

- [ ] **子进程（`--no-session`）加上 ACP 工具后 compress 是否真能生效** —— 问题一唯一的未验证环节，见第 6 节。
- [ ] 上面 4.5 的三项配置**一个都没改**（当前文件里只有 `compress.promptPack: "lean"`）。
- [ ] `preflight` 的 `UND_ERR_SOCKET` 是偶发还是必然（子会话里连续 3 次失败、两个不同子会话都出现；同一时段主会话的折叠是成功的）。
- [ ] 项目 `.pi/settings.json` 对 `npm:billion-context` 写的是 `autoload:false` + `extensions:["-dist/agent/pi-native.js"]`，但 eHunter 会话里 ACP 工具明显是**加载了**（有 47 次 compress 调用 + 日志 `[plugin] [acp-usage]`），说明全局那条 `"+dist/agent/pi-native.js"` 实际赢了。动 settings 之前先确认这个合并语义，别把插件整没了。

## 6. 修复前先做这一步（≈2 分钟）

直接复现"子进程工具表"，验证"加白名单是否就能让 compress 出现"：

```bash
cd /Users/warwick/claude/eHunter

# ① 现状：按 trellis 的 spawn 形状跑一个子进程，看它有哪些工具
pi --mode json -p --no-session \
   --tools read,bash \
   "只列出你当前可用的工具名，每行一个，不要任何解释"

# ② 试验：白名单里带上 ACP 工具
pi --mode json -p --no-session \
   --tools read,bash,compress,acp_status \
   "只列出你当前可用的工具名，每行一个，不要任何解释"
```
- ②里出现 `compress` / `acp_status` → 走修复选项 A（改 frontmatter），然后小范围跑一次 `trellis-check` 复核：
  ```bash
  grep "[sess=<子会话id>]" ~/.local/state/billion-context/bili.log | grep -E "fold=|acp-usage"
  ```
  出现 `fold=` 即子代理压缩已通。
- ②里没出现 → 说明子进程压根没加载 bili 扩展（问题 A 的前提 1 不成立），改 frontmatter 无用；转修复选项 B（patch `buildPiArgs`）+ 让子进程带上插件。

## 7. 素材索引

**会话**：见第 2 节两行路径（`~/.pi/agent/sessions/--Users-warwick-claude-eHunter--/`）
**日志**：`~/.local/state/billion-context/bili.log`
**配置**：`~/.config/billion-context/billion-context.json`（ACP）；`~/.pi/agent/settings.json`（全局包）+ `/Users/warwick/claude/eHunter/.pi/settings.json`（项目）
**代码**
- `/Users/warwick/claude/eHunter/.pi/extensions/trellis/index.ts:671-698`（`resolveRunCfg`）、`:700-716`（`buildPiArgs`，`:715` 是 `--tools`）
- `/Users/warwick/claude/eHunter/.pi/agents/trellis-check.md:5`、`trellis-implement.md:5`、`trellis-research.md:5`
- `/Users/warwick/.pi/agent/npm/node_modules/billion-context/dist/agent/pi-native.js`（`ACP_TOOLS`、`registerTools`、`buildChildArgs`、delegate stand-down 文案）
- `…/pi-coding-agent/docs/cli.md:119-128`；`dist/core/sdk.js`（`allowedToolNames`）；`dist/core/agent-session.js:1122`、`:1379`、`:2853`、`:2855`、`:2885`、`:2897`
**取证脚本**（一次性 python，未落盘）：解析 jsonl 的 `type=message` 行 → 统计 assistant `toolCall` 的 `compress` / `read` 频率与批次消息下标；解析 bili.log 的 `[acp-usage]`/`[self-heal]`/`preflight` 行。
