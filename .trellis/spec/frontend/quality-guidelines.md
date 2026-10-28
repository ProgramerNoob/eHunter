# Quality Guidelines

## Choose checks from the changed behavior

[AGENTS.md](../../../AGENTS.md) defines acceptance requirements. Read the relevant
feature specification/contracts and quickstart before changing behavior. The
[2026-09-18 decision](./decisions/2026-09-18-reader-behavior.md) supersedes
older conflicting requirements for download metadata, preferences, page-turn defaults,
and magnifier behavior; old task checkmarks are not evidence for a new change.

## Tests must fail when the production path changes

A unit test that reads its expected value from the same source the production code reads
proves nothing: hardcoding the production string leaves both sides equal and the test
stays green. Assert against a value the fixture injects, not against the shipped table.
Load the real i18n module to keep the key names honest, then overwrite the asserted
entries with sentinels (`__sentinel_<key>__`) and require them in the output; entries no
assertion observes can keep their real values. When a sentinel starts covering a branch,
mutate that production line once and confirm the suite turns red before restoring it.

Cross-realm fixtures need the same care as same-source expectations. A stub that throws
the host realm's `Error` never satisfies an `instanceof Error` check running inside the
fixture's `vm` context, so the branch under test is skipped silently and the assertions
pass for the wrong reason. `tests/helpers/runtime-fixture.cjs` injects the host
`Error`/`TypeError`/`RangeError` constructors by default and rejects any of them passed
through `globals`; pass host objects and functions instead of shadowing the constructors.
Re-check that the failure path actually ran and turns red when the fixture stops
injecting them.

Count protecting tests by mutation, not by reading assertions. Which cases guard a
branch is only visible when you replace that branch with `if (false)` and read the failing
list; one assertion can be guarded by several cases and a case claiming a branch can turn
out not to depend on it at all. Never report "only this test protects it" without that run.

## Documentation boundaries

Documentation and code comments describe the current state only. Do not record AI
history, superseded decisions or stage plans; when updating a current-state description,
do not promote an unconfirmed implementation difference into a new rule. Code is the sole
evidence: keep comments out of `src/` and `core/` and put the explanation in the spec,
except for `/// <reference types="...">` directives, SCSS section comments inside a
`.vue` `<style>` block, and runtime gesture/timing constraints that the code cannot
express. Current-state facts belong in the specs, not in comments; unclosed differences
between spec and implementation are listed in [pending work](./features/pending-work.md).

The comment ban covers `src/` and `core/` only. `scripts/`, `tests/` and the Vite
configs keep file-header contracts and inline notes about non-obvious control flow;
nothing checks them, so a comment there is a maintenance decision rather than a rule
violation. Do not extend the ban to those directories without adding the check that
enforces it, and do not cite this section as the reason to strip them.

Cite code by symbol, not by line number. Link the file (`[core/store/app.ts](../../../core/store/app.ts)`)
and name the symbol in the sentence; `check-docs` only proves the file and anchor exist, so a
line number silently rots into the neighbouring field after the next insertion.

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
must be resolved before reporting completion. A recorded checkmark from an earlier pass
does not satisfy a new change's acceptance criteria. Current workflow gates come from
[Trellis workflow](../../workflow.md).

## Available commands

Run from the repository root. [package.json](../../../package.json) is authoritative.

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts Vite for local TEST-platform UI work |
| `npm run type-check` | Runs `vue-tsc --noEmit` |
| `npm run test:acceptance` | Runs the Python `unittest` suites for acceptance, archive evidence/autocommit, browser-artifact verification, resource cleanup and the task scope gate |
| `npm run test:storage` | Runs Node's built-in test runner against the real storage modules in isolated VMs |
| `npm run test:browser-preflight` | Runs Node's built-in test runner against controlled browser-preflight fixtures |
| `npm run test:reader-lifecycle` | Runs Node regressions for optional update notices and entry viewport restoration |
| `npm run test:initializer-timeout` | Runs Node regressions for platform-initialization timeouts |
| `npm run test:settings-reading-mode-row` | Runs the Node regression that loads the real store and setting-field runtime, mounts the real `DropOption.vue`, and asserts the reading-mode row's category, dropdown options, i18n labels and store-action routing |
| `npm run test:tmp-report` | Runs the Node regressions over the `.tmp` budget and orphan-round reporting logic, against temporary repository roots |
| `npm run check:docs` | Checks `check-docs.mjs` link targets, anchors and `$ref` paths under `.trellis/spec/` |
| `npm run check:syntax` | Runs `node --check` over every `.mjs`/`.cjs` in `scripts/` and `tests/` |
| `npm run tmp:report` | Reports `.tmp/` size and unreferenced browser-preflight rounds; exits 1 over the 3 GiB / 2 GiB budgets |
| `npm test` | Runs the acceptance Python suites plus every `test:*` Node regression, in `package.json` order |
| `npm run check` | Runs the `.tmp` budget report and the syntax check first (both under a second, before any other cost), then type-check, `npm test`, the production build and the documentation check; stops at the first failure |
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

There is no current root lint script, ESLint configuration/dependency, or automated
browser E2E runner. A root `.eslintignore`, the configs under `old/`, and test-config
include globs do not provide those tools. Do not report lint results.

### Repeatable local and CI checks

Use Node 22 and Python 3.12, then run `npm ci --include=dev` and `npm run check`.
The root `package-lock.json` is the installation input; no new test framework is
required. [`check.yml`](../../../.github/workflows/check.yml) runs the same commands
on pushes and pull requests with read-only repository permissions. It uses npm's
download cache, not a saved `node_modules`. Runtime majors are selected in the
workflow and actual versions are printed; patch-level reproducibility is not promised.
The workflow file alone does not establish a remote run or required branch check.

The serial `&&` chain propagates type-check, assertion and build failures as nonzero
exit codes. Later stages after a failure are **unrun**, not passed. Production build
success never replaces `vue-tsc`; JS with `checkJs: false` and the CJS tests are not
fully covered by that semantic check. The helper checks transpilation diagnostics,
and Node loads and executes the CJS tests. `check:syntax` covers the files no
`tsconfig` includes.

`tmp:report` runs first in the chain, so an over-budget local `.tmp/` stops `npm run
check` before type-check, tests and build. That is deliberate: the budget is a gate on
local disk state, and the remedy is to clean `.tmp/`, not to bypass it. The gate only
bites locally — CI has no `.tmp/`, where the report exits 0. Budgets depend on the
machine, so a checkout that is otherwise healthy can fail the chain until the
unreferenced rounds are removed; keep that distinction in mind before reading a
failure on the first chain element as a code problem.

The syntax check runs second for the same reason: `node --check` over `scripts/` and
`tests/` costs about half a second and depends on nothing but the checked-in files, so a
stray comma in a `.mjs` file reports before type-check and the test suite rather than
after the production build. It reads files only — it cannot fail because of local
`.tmp/` state.

[`storage-lifecycle.test.cjs`](../../../tests/storage-lifecycle.test.cjs) exercises
current `app.ts`, `layoutPreference.ts`, `PlatformService.js` and real Vue through
public initialization/actions/storage APIs. Its
[fixture](../../../tests/helpers/storage-fixture.cjs) keeps shared GM values and
per-origin local strings in isolated Maps, copies GM values on reads/writes, gives
GM operations independent fault switches, and creates a new VM/module cache/Vue
scope for each page. Refreshes retain only the storage Maps; scopes are stopped.
Unknown imports fail. Tests read current checkout files, not `.tmp`, other Git
versions or fixed result files, and may be run repeatedly with `npm test`.

The suite covers GM read/write failures and recovery, origin fallback, reset success
and failure, reset observation followed by local saves and repeated refreshes,
single-field and single-mode saves, same/different/missing reset identities, legacy
animation records, invalid fields and explicit empty shortcuts, mixed-schema
migration, same-millisecond resets, clock rollback and identity/timestamp controls.
Legal shared values stay preferred. An unobserved origin with failed GM reads cannot
know about a remote reset; healthy shared writes do not promise a local mirror.

These are synchronous storage simulations. Event/timer, i18n and album/download
boundaries are explicit substitutes. Passing VMs do **not** prove userscript grants,
sandbox/serialization behavior, actual EH/EX/NH sharing, browser scheduling, desktop
or mobile UI, parsing, image loading or downloads. Product/storage changes still
need the applicable real-platform acceptance below.

## Widget rendering tests without a DOM library

`package.json` ships no `jsdom`, `happy-dom` or `@vue/test-utils`, and this section keeps it
that way. [`settings-reading-mode-row.test.cjs`](../../../tests/settings-reading-mode-row.test.cjs)
shows the supported shape for proving rendered text:

- compile the real `.vue` file with `@vue/compiler-sfc` (`parse`, then
  `compileScript(descriptor, { id, inlineTemplate: true })`) and transpile it with the
  `typescript` package, instead of hand-copying template strings;
- mount through `vue.createRenderer` with a host that implements `patchProp`,
  `insert`/`remove`, `createElement`/`createText`, `setElementText`, `parentNode`,
  `nextSibling`, `querySelector` and `insertStaticContent`. Element props land on the
  node's `props`, so a raw `onClick` handler is reached as `node.onClick`;
- resolve every relative import through an explicit module table, so a new import in the
  component fails loudly rather than silently stubbing the change under test;
- build child-component stubs with a `render` function, not a `template` string: there is
  no compiler wired into the runtime, and a `template` stub renders nothing;
- inject the i18n module as `vue.computed(() => dict)`, mirroring
  [`core/store/i18n.ts`](../../../core/store/i18n.ts); a plain `{ value }` object breaks
  reactivity and empty strings slip into the assertions.

These tests prove rendered text and emitted events only. They do **not** prove CSS,
layout, focus order, touch behavior or the real popover placement; UI changes still need
the browser routes below.

## Acceptance routing

| Change | Required route |
| --- | --- |
| Pure documentation | Verify links, structure, examples and command/config claims; product checks are unnecessary solely for prose |
| Project acceptance CLI / workflow | Run `python3 -m unittest discover -s scripts -p 'test_acceptance.py'` and verify affected links/commands; no product browser/build checks unless product behavior also changes |
| Browser-preflight helper / its entry procedures | Run `npm run test:browser-preflight` and `npm run check` for helper changes, then exercise local Vite and real EH, desktop and mobile, using the [shared preflight procedure](./browser-acceptance.md); controlled fixtures do not prove browser capabilities. Prose-only entry changes use the documentation route |
| Storage test harness / check scripts / CI only | Run `npm run check`; for gate changes also verify clean locked installation, repeated tests and failure propagation in an isolated copy; no browser acceptance claim |
| Non-platform behavior | [Local browser procedure](./browser-acceptance.md), using the available `ego-browser` skill |
| Platform adapters, injection, parsing or requests | [EH/NH production-bundle procedure](../../../.pi/skills/reader-test/SKILL.md) |
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
  Check Normal/Large thumbnails, cache migration and queue/retry behavior when touching
  the EH parser path. The NH intro parser rewrites only a whitespace-preceded `src=` to `x-src=`,
  so `data-src` keeps its native name; it reads `data-src` first, then `x-src`. The NH image-page
  parser uses the same rewrite but reads `x-src` only.
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
python3 scripts/acceptance.py validate <task-dir>
python3 scripts/acceptance.py archive <task-dir>
```

`run` executes only the supplied argv with `shell=False`, never a command from an old
record. The command must assert its claim and return nonzero on failure; a service
startup or an observation script that prints `pass:false` but exits zero is not a
functional assertion. Before log preparation/launch, `run` atomically saves `unrun`
and clears the old execution, evidence and waiver. It then records stdout/stderr in
`.tmp/acceptance/<task-name>/` and saves the actual subprocess return code. Zero becomes
passed, normal nonzero becomes failed and returns that original code. Because `run`
rewrites `evidence`, `note` and `waiver` with the fresh log and the generic
`Command completed with exitCode N; …` note, any hand-written note or durable evidence
must be restored afterwards. Re-running also clears an effective `waiver`, so any
accepted-but-unverified scope must be re-registered with its original authority.
Launch failure
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

#### Name-pattern subsets must reject zero matches

A check that selects tests with `--test-name-pattern` still exits `0` when nothing
matches: Node counts the unmatched file itself as one passing test (`ℹ pass 1`), so
`run` records passed. Put the guard in the command. Use TAP and require all three:
exit `0`, at least one `^ok \d+ - ` line, and no `^1\.\.0$` line (the file's TAP plan
when no name matched). Do not filter by test-file path or by `ok` indentation:
file-level and subtest lines are both unindented in current Node, and path forms vary.

```bash
python3 -c "import re,subprocess,sys; p=r'''<pattern>'''; c=subprocess.run(['node','--test','--test-reporter=tap','--test-name-pattern='+p,'<test-file>'],text=True,capture_output=True); sys.stdout.write(c.stdout); sys.stderr.write(c.stderr); zero=re.search(r'(?m)^1\.\.0$',c.stdout); ok=re.search(r'(?m)^ok \d+ - ',c.stdout); sys.exit(0 if c.returncode==0 and ok and not zero else 1)"
```

Whole-file and whole-suite commands do not need the guard. A check may chain several
guarded subsets, but each subset keeps its own guard so its log shows the matched TAP
output and the guard decision.

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

`validate` prints the same JSON shape (`valid`, `task`, `checks`, `criteria`, `counts`,
`observedStatus`) and only differs in exit codes: `0` for a record that loads and
validates, `2` for one that does not. It never writes the record, executes a check or
touches the task directory; diagnostics for the invalid case land on stderr in the same
`errors` field shape that `summarize` uses, so a failing run can be read the same way.

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
`task.py archive` still enforces the task scope gate for tasks that declare
`scopePolicyVersion` (legacy tasks get a diagnostic only), but it does not check
this acceptance record: `acceptance.py archive` is the only entry point that both
verifies the record and moves the task. `acceptance.py validate` runs the same
verification without writing, delegating or moving anything, so it is the cheap
pre-flight before an archive attempt. `task.py validate`
checks context manifests only. `task.py finish` clears the active pointer without
either check and does not imply completed acceptance.

### Existing tasks and template updates

New tasks create the record during planning, initially unrun. Unarchived older tasks
must backfill identifiers from their original PRD and record actual current results;
missing evidence or an earlier checkmark never implies passed. Missing protocol files
stop standard archival with a backfill diagnostic. Archived tasks are not rewritten
or given invented results. Documentation/research tasks record relevant document
checks without adding unrelated product checks.

The Pi check agent, workflow and finish-work prompt contain local wiring to this
protocol. Keep `.trellis/.template-hashes.json` unchanged; when Trellis updates flag
these files as customized, preserve/merge the wiring and check the active workflow
blocks plus final-check, pre-commit and archive entry points.
