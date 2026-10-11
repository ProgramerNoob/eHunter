# Quality Guidelines

## Choose checks from the changed behavior

[AGENTS.md](../../../AGENTS.md) defines acceptance requirements. Read the relevant
feature specification/contracts and quickstart before changing behavior. The
[2026-09-18 decision](./decisions/2026-09-18-reader-behavior.md) supersedes
older conflicting requirements for download metadata, preferences, page-turn defaults,
and magnifier behavior; old task checkmarks are not evidence for a new change.

## Delivery boundaries

Keep each user story independently implementable and testable, with its own acceptance
scenarios and validation criteria. Plan the required runtime checks explicitly for
functional changes. Review parser/cache/queue/reader changes for asynchronous loading,
page limits and rapid repeated input in both reading modes. Changes to
`src/platform/base/` need recorded EH and NH impact conclusions. Define invalid-value
fallback for persisted preferences; the state guide and confirmed decisions own the
specific migration rules.

At handoff, record the actual acceptance results and mode/platform scope, including
unmet constraints with their rationale. Unjustified violations of the project boundaries
must be resolved before reporting completion. Historical checkmarks do not satisfy a
new change's acceptance criteria. Current workflow gates come from
[Trellis workflow](../../workflow.md).

## Available commands

Run from the repository root. [package.json](../../../package.json) is authoritative.

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts Vite for local TEST-platform UI work |
| `npm run type-check` | Runs `vue-tsc --noEmit` |
| `npm run build` | Runs normal `vite build` |
| `npm run build-only` / `npm run build-dev` | Same normal Vite build; neither adds type-checking |
| `npm run build-prod` | Builds the IIFE userscript with the production config |
| `npm run preview` | Runs Vite preview for the built app |
| `npm run serve:bundle` | Serves the production bundle for userscript acceptance |

The [production config](../../../vite.config.prod.ts) emits `dist/ehunter.iife.js`,
injects CSS through JavaScript and adds the userscript banner. Normal build success
does not validate this packaging. [serve-bundle.mjs](../../../scripts/serve-bundle.mjs)
serves that file from `127.0.0.1:8787` by default, rereads it per request and sends
`cache-control: no-store`; `PORT` changes the port.

There is no current root lint script, ESLint configuration/dependency, automated test
script, or configured product unit/E2E runner. A root `.eslintignore`, historical configs under
`old/`, and test-config include globs do not provide working lint/test tooling.
Do not report lint or automated-test results without real configured tooling.
Use available type/build checks for relevant source changes, then functional acceptance.

## Acceptance routing

| Change | Required route |
| --- | --- |
| Pure documentation | Verify links, structure, examples and command/config claims; product checks are unnecessary solely for prose |
| Project acceptance CLI / workflow | Run `python3 -m unittest discover -s scripts -p 'test_acceptance.py'` and verify affected links/commands; no product browser/build checks unless product behavior also changes |
| Non-platform behavior | [Local browser procedure](./browser-acceptance.md), using the available `ego-browser` skill |
| Platform adapters, injection, parsing or requests | [EH production-bundle procedure](../../../.pi/skills/eh-test/SKILL.md) |
| Shared `TextReq`, `ReqQueue`, `MultiAsyncReq` or storage behavior | Assess both EH and NH; preference sharing also covers EH/EX/NH |
| UI/layout | Desktop and mobile critical interactions, screenshots and visual review; add affected breakpoint boundaries |

Read the linked procedure before browser work. It owns server attribution, background
startup, task-space reuse, viewport setup, console capture, reload and cleanup. Follow
[notify-complete](../../../.pi/skills/notify-complete/SKILL.md) for test-start/completion
notifications unless the user requests otherwise.

EH acceptance uses the built bundle plus its HTTP server and Tampermonkey development
loader. It requires the logged-in browser environment. Keep loader `@connect`/`@grant`
capabilities aligned with production banner changes and avoid double injection with a
second enabled script. A local TEST page cannot establish GM sandbox or live parser
compatibility.

## What to exercise

- Confirm the current code actually loaded: no Vite error overlay, initialized reader
  DOM, and the fresh bundle/navigation where applicable. Check console logs and
  uncaught errors, separating host-site failures from reader failures.
- For parsing/cache changes, verify title, total/current page, thumbnails and location,
  book/scroll switching, image loading, and supported original/change-source actions.
  Check Normal/Large thumbnails, cache migration and queue/retry behavior if touching
  the legacy EH cache/parser path called out in `AGENTS.md`. NH gallery markup is rewritten during page/repository construction (`src=`→`x-src=`, and `data-src=`→`data-x-src=` through the same substring match); attribute reads must accept the rewritten name and stay compatible with legacy `data-src` markup.
- For UI changes, cover open/close, keyboard and pointer/touch behavior, disabled states,
  loading/error paths, and mode changes. Check accessible names, visible focus and
  keyboard operation; current widgets are not a complete accessibility baseline.
- For persisted settings, check valid existing records, missing/corrupt/out-of-range
  fields, origin fallback, reload, repeated migration and reset without stale revival.
  Use the feature quickstart for the specific behavioral matrix.

## Evidence and completion

Keep logs, screenshots, traces and temporary exports in repository `.tmp/`.
The linked browser procedures define desktop **1200×900** and mobile **390×844**
viewports and their device/touch settings; use the complete configuration there.
Clean up only services/resources created for the task and no longer needed, confirming
process exit and port release. Preserve user-owned resources and deliverable evidence.

Record each check in the task's `acceptance.json` using the protocol below. A build
is not functional acceptance, and source inspection alone cannot establish runtime
behavior. Documentation-only work should explicitly say when build, type-check and
browser checks were not run.

### Acceptance record (schemaVersion 1)

This section owns the project protocol implemented by
[`scripts/acceptance.py`](../../../scripts/acceptance.py). The main session is the
single writer of `<task-dir>/acceptance.json`, including `run` updates; sub-agents
return proposed check entries and evidence for it to merge. Invalidate affected
results and rerun checks when code, tests or claims change. No automatic dependency
tracking or source hashes are maintained.

During planning, define PRD standards in exactly one `## 接受标准` or
`## Acceptance Criteria` section as top-level `- [AC1] text`, `- [AC2] text`, etc.
Identifiers are unique positive integers prefixed by `AC`. Indented continuation
lines belong to the preceding criterion; fenced code is ignored. Unlabelled
top-level list items, repeated sections/IDs and empty sections are errors.
`criteria` stores each ID's original text without the list marker/ID; whitespace
is normalized for comparison with the PRD. Both identifier sets must match exactly,
and every AC must have at least one check.

The JSON contains exactly `schemaVersion` (integer `1`), `criteria` (object), and
`checks` (nonempty array). Each check has all of these fields:

| Field | Contract |
| --- | --- |
| `id`, `ac` | Unique nonempty check ID; nonempty array of distinct, existing AC IDs |
| `claim`, `scope` | Nonempty statements of what was checked and where; split structure/content, static/runtime and distinct required platform/mode scenarios |
| `method` | `command`, `runtime`, or `inspection` — how evidence was obtained |
| `dimension` | `structure`, `content`, or `behavior` — what the check proves |
| `observed` | `passed`, `failed`, `partial`, `blocked`, or `unrun` — the original observation |
| `execution` | `null`, or exactly `argv`, `cwd`, `exitCode`, `startedAt`, `endedAt`, `log` as described below |
| `evidence` | Array of repository-relative readable file paths; at least one for passed checks |
| `note` | String; runtime/inspection passes describe actual actions/observations; every non-pass describes the unmet scope |
| `waiver` | `null`, or exactly nonempty `reason` and `authority` strings pointing to an existing user decision or specification |

Every listed check is required. Unknown fields (including handwritten `overall`,
`status` or `required:false`), duplicate JSON keys, incorrect types and inconsistent
observations are errors. Omit inapplicable generic checks when planning, while
preserving every PRD criterion. Reviewers still assess whether the chosen checks
cover each criterion's scenarios; a script cannot infer that from free text.

Execution records use a nonempty string array `argv`, a repository-relative existing
`cwd` directory, ISO timestamps with timezone, and a readable `log` file under `.tmp/`.
`startedAt` is required; `endedAt` and `exitCode` may be null while unfinished or when
no return code was obtained. An integer return code requires `endedAt`, which cannot
precede `startedAt`. `unrun` cannot have a return code. Any passed check with an
execution record requires a strictly integer `exitCode: 0` (not `true`, `"0"` or
`null`). A command pass must have the complete execution record and link its log in
`evidence`. Runtime/inspection passes also require evidence and a descriptive note.
Paths must remain inside the repository; evidence may be a durable task document,
while logs, screenshots, traces and temporary exports belong under `.tmp/`.

`waived` is derived only from a non-passed observation plus a waiver. It preserves the
original observation, exit code, reason and authority. The main session verifies the
authority against existing context; nonempty text alone does not prove authorization.
A waiver cannot repair invalid input or cancel another check's unmet result. A narrowed
scope accepted by an existing decision remains waived unless the full original claim
has actually been verified. File readability proves availability, not evidence truth
or semantic equivalence. There is no evidence-signing or approval subsystem.

Minimal planning record for a PRD containing `- [AC1] Required behavior`:

```json
{
  "schemaVersion": 1,
  "criteria": {"AC1": "Required behavior"},
  "checks": [{
    "id": "behavior-check",
    "ac": ["AC1"],
    "claim": "Required behavior is satisfied",
    "scope": "State the exact scenario here",
    "method": "command",
    "dimension": "behavior",
    "observed": "unrun",
    "execution": null,
    "evidence": [],
    "note": "Planned; not executed yet",
    "waiver": null
  }]
}
```

### Execute, summarize and close

Run from the repository root with an explicit task directory; no command guesses the
active task. Replace the placeholders below with the task/check and applicable assertion
command. Use existing type/build commands for product checks where appropriate.

```bash
python3 scripts/acceptance.py run <task-dir> <check-id> -- <argv...>
python3 scripts/acceptance.py summarize <task-dir>
python3 scripts/acceptance.py archive <task-dir>
```

`run` executes only the supplied argv with `shell=False`, never a command from an old
record. The command must assert its claim and return nonzero on failure; a service
startup or an observation script that prints `pass:false` but exits zero is not a
functional assertion. Before log preparation/launch, `run` atomically saves `unrun`
and clears the old execution, evidence and waiver. It then records stdout/stderr in
`.tmp/acceptance/<task-name>/` and saves the actual subprocess return code. Zero becomes
passed, normal nonzero becomes failed and returns that original code. Launch failure
becomes blocked with `exitCode:null` and CLI exit `127`. Signal termination preserves
the negative subprocess return code and returns `128 + signal`. Interrupting the runner
with SIGINT/SIGTERM forwards the signal to its command group and allows its direct
child up to 3 seconds to exit. It then sends SIGKILL to remaining group members,
even when the direct child exited early. It reaps only that child and records
partial, preserving its return code even if zero.
This runner uses POSIX process groups (macOS/Linux); descendants that leave the
group are outside this cleanup.
A hard kill may leave unrun and an orphan command;
inspect and clean up that command before retrying. A record/file error returns `2`.
These run exit codes are distinct from summarize's codes. Fix invalid records before
running again; run validates the entire inventory first.

`summarize` outputs one JSON object on stdout; diagnostics go to stderr. It calculates
both original `observedStatus` and effective `status` for each AC and the whole task,
with all check details, evidence, six-state `counts`/`observedCounts`, and `waivedChecks`.
The same aggregation applies at both levels: failed first, then blocked, then partial;
all unrun stays unrun, unrun mixed with passed/waived becomes partial; otherwise any
waived yields waived and all passed yields passed. Lower-priority observations remain
visible in the counts and details.

| summarize exit | Meaning | Next action |
| --- | --- | --- |
| `0` | Valid, passed | Continue the existing completion workflow |
| `1` | Valid, failed/partial/blocked/unrun | Resolve unmet checks; stop completion/archival |
| `2` | Invalid input, missing files or inconsistent record | Repair/backfill the record; stop completion/archival |
| `3` | Valid, waived | Disclose every waiver and original observation; continue only with existing authority verified |

Render conclusions from the JSON; do not replace them with a handwritten total or
mask nonzero codes using `|| true`. A successful agent process does not establish AC
success. In particular, summarize exit `3` means waived, never all passed.

`archive` reloads and recalculates the record. For failed/partial/blocked/unrun it
returns `1`; invalid input returns `2`. Both paths have `archiveDelegated:false` and
leave task files, directory and active pointers untouched. Only passed/waived delegate
once to the current Python interpreter running `.trellis/scripts/task.py archive`.
A successful delegate returns `0` for both, with `acceptanceStatus` retaining the
distinction. Native failure returns `4` with `archiveExitCode`, `archiveStdout` and
`archiveStderr`; launch failure uses `archiveExitCode:null`. Preserve that JSON as
evidence. Native failure may occur after a move or pointer change: inspect state,
never automatically rerun an archive. The wrapper does not fix native archive bugs.

This gates the project's standard check/commit/finish-work path. Direct native
`task.py archive` can still bypass it; it is not a global lock. `task.py validate`
checks context manifests only. `task.py finish` still only clears the active pointer
for pausing and does not imply completed acceptance.

### Existing tasks and template updates

New tasks create the record during planning, initially unrun. Unarchived older tasks
must backfill identifiers from their original PRD and record actual current results;
missing evidence or historical checkmarks never imply passed. Missing protocol files
stop standard archival with a backfill diagnostic. Archived tasks are not rewritten
or given invented results. Documentation/research tasks record relevant document
checks without adding unrelated product checks.

The Pi check agent, workflow and finish-work prompt contain local wiring to this
protocol. Keep `.trellis/.template-hashes.json` unchanged; when Trellis updates flag
these files as customized, preserve/merge the wiring and check the active workflow
blocks plus final-check, pre-commit and archive entry points.
