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
script, or configured unit/E2E runner. A root `.eslintignore`, historical configs under
`old/`, and test-config include globs do not provide working lint/test tooling.
Do not report lint or automated-test results without real configured tooling.
Use available type/build checks for relevant source changes, then functional acceptance.

## Acceptance routing

| Change | Required route |
| --- | --- |
| Pure documentation | Verify links, structure, examples and command/config claims; product checks are unnecessary solely for prose |
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

Report each check as passed, failed, blocked or unrun, with the relevant scope and
artifact paths. A build is not functional acceptance, and source inspection alone
cannot establish runtime behavior. Documentation-only work should explicitly say
when build, type-check and browser checks were not run.
