# verifier 契约（交付父任务更新规范）

## preflight 产物

`withBrowserPreflight` 新增两个调用参数：

- `scenarioInputs`（必填）：仓库相对路径数组，至少一项，不得重复、不得越界、必须是普通文件；本轮结束时复核 hash，变化即失败。
- `taskSpace`（可选）：非空字符串，写进 provenance。

manifest、source、result 都带 `artifactVersion: 1`。

manifest 保持 `state: 'incomplete'`，只固定本轮身份：`runId`、`roundId`、`artifactDir`、`artifactVersion`、`provenance`、`expected`、`source`。

`provenance` 字段（manifest 写初始事实，result.json 写最终事实）：

`artifactVersion`、`runId`、`roundId`、`artifactDir`、`result: 'result.json'`、`sourceKind`（`eh`/`nh`/`vite`）、`url`、`profile`、`viewport`、`page{label,spaceId}`、`taskSpace`、`scenarioInputs[{path,sha256,bytes,length}]`、`scenarioInputsSha256`、`source`、`startedAt`。

`provenance.source` 按 kind 取值：

- `eh`/`nh`：`{kind, bundle:{path, sha256}, loader:{path, sha256}}`
- `vite`：`{kind: 'vite', fingerprint, files:[{path, sha256, bytes, length}]}`

`scenarioInputsSha256` 是 `scenarioInputs` 按紧凑 JSON（`separators=(",", ":")`、UTF-8）计算的 SHA-256；Vite 的 `source.fingerprint` 同理覆盖 `source.files`。verifier 会重算两者，不信任写入值。

`source.json` 为 `{artifactVersion: 1, source, initialFingerprint}`，只用于核对 build 身份，不作为最终结论。

## `verify-browser`

```bash
python3 scripts/acceptance.py verify-browser <artifact-dir>
```

只读：不写 artifact，不改 `acceptance.json`，可重复执行。`<artifact-dir>` 必须在仓库内且为目录；不要求位于 `.tmp/` 下，缺少 provenance 的目录判 `legacy`。verifier 只做结构与 hash 对照，不验证产物的因果链或来源真实性——三份 JSON 字段齐全且 hash 与当前文件一致就能得到 `passed`，防伪造依赖 artifact 生成链路本身，不在本命令的职责内。

输出：

```json
{"valid": true, "status": "passed", "errors": [], "artifact": {"artifactDir": ".tmp/...", "artifactVersion": 1, "runId": "...", "roundId": "...", "observed": "passed", "sourceKind": "eh"}}
```

| status | 触发条件 | 退出码 |
| --- | --- | --- |
| `passed` | 关联、语义、identity 全部满足且所有被跟踪输入 hash 未变 | 0 |
| `stale` | build/loader/fingerprint 输入或 scenarioInputs 在 artifact 之后变化、删除、不可读 | 1 |
| `blocked` | 未写 result.json（incomplete 轮次），或 observed/preparation/checks 未完，或 errors/unsaved/eventCollection 非空，或 identity 不满足 | 1 |
| `invalid` | 输入目录不合法、manifest.json/source.json 缺失、任一 JSON 不是对象或不可解析、runId/roundId 缺失或非字符串、run/round/artifactDir/sourceKind 关联不一致、artifactDir 不指向所校验目录（含复制产物）、聚合 hash 与条目不符、scenarioInputs 为空或重复（按解析后路径判重）、路径越界 | 2 |
| `legacy` | manifest 无 `artifactVersion: 1` 或 provenance，需要回填新鲜度事实 | 3 |

参与判定的 provenance 字段：关联（非空 `runId`/`roundId`、`artifactDir`、`result`、`sourceKind`、`scenarioInputsSha256`）、新鲜度（`source` 与 `scenarioInputs` 的 `path`/`sha256`/`bytes`）、identity。`url`、`profile`、`viewport`、`page`、`taskSpace`、`startedAt` 只随 artifact 记录，供人工审阅，不参与判定。

`invalid` 时 `valid: false`；其他 status `valid: true`。`errors` 每条都带定位前缀（`manifest.json:`、`result.json:`、`source.json:`、`provenance.source.<name>.path:` 等），可直接引用。

identity 复核按 kind：

- `eh`/`nh`：`permissions.verified`、唯一 `fullBundleCandidate` 且 `verified`、执行 hash 等于 provenance bundle hash、installation 必需标志（eh 含 `loggedIn`）。
- `vite`：每个 identity 行 `verified`，`inventory.missingRequired` 为空。

## 失败分类示例

```
result.json: missing from the artifact
The round never wrote result.json; the artifact is incomplete, not passing evidence.
observed is 'failed'; only a passed round can satisfy this gate
errors records 1 failure(s); first: 'reader stayed closed'
eventCollection.unresolved is not empty; the round did not settle its event consumer
manifest.json: provenance runId differs from the artifact runId
source.json: initial fingerprint differs from the recorded provenance
bundle source changed since this round: /repo/.tmp/.../bundle.js
scenario input changed since this round: .tmp/scenario.json
result.json: cannot read JSON: Expecting property name enclosed in double quotes
manifest.json: provenance artifactDir does not name this artifact directory
manifest.json: scenarioInputsSha256 does not match the recorded inputs
result.json: provenance source.fingerprint does not match its files
identity: no recorded execution hash
manifest.json: no artifactVersion 1 provenance; re-run browser acceptance and backfill freshness facts
```

## 已知成本

每轮每个 checkpoint 的 `unchanged()` 都会重读全部 source 输入与 `scenarioInputs`（通常是个位数量的小文件），并追加 `fingerprints.jsonl`。这是轮次内篡改检测的必要成本：缓存 hash 或只比对 mtime 都会放弃对内容变化的检测，因此不做优化。真实验收一轮的 checkpoint 数量有限，读放大不影响时效。
