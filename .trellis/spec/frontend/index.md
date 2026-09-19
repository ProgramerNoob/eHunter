# Frontend Development Guidelines

Operational guidance for eHunter's current Vue reader and browser-side platform adapters.
Engineering guides are in English; migrated product and feature records retain their original language. Read only the rows relevant to the change, plus
[AGENTS.md](../../../AGENTS.md) for project-wide boundaries and acceptance requirements.

## Choose by change

| When changing… | Read |
| --- | --- |
| File placement, entry point, platform detection, imports, or migration boundaries | [Directory structure](./directory-structure.md) |
| Vue templates, props/events, dialogs, layout, styling, or translations | [Components](./component-guidelines.md) |
| `use*` composables, image loading, gestures, DOM listeners, or cleanup | [Composables](./hook-guidelines.md) |
| Shared reader state, service injection, settings, persistence, reset, or caching | [State management](./state-management.md) |
| TypeScript contracts, external data, error unions, globals, or compiler settings | [Type safety](./type-safety.md) |
| Selecting checks, functional acceptance, browser evidence, or completion reporting | [Quality](./quality-guidelines.md) |

## Quality Check

Use this list as the pre-commit entrypoint of the last quality pass; routing and detail live in
[Quality](./quality-guidelines.md), [browser acceptance](./browser-acceptance.md) and the
[EH testing skill](../../../.pi/skills/eh-test/SKILL.md).

1. **Code actually loaded**: the fresh build/bundle is what the browser ran — no Vite error overlay, initialized reader DOM, host-site failures separated from reader failures.
2. **Route matches the change**: pure documentation, local browser, EH production bundle, or shared EH+NH request/storage assessment, per the acceptance routing table.
3. **Behavior exercised**: parsing/cache/queue changes cover title, total/current page, thumbnails and location, both reading modes and supported original/change-source actions; UI covers desktop **1200×900** and mobile **390×844**; persisted settings cover the quickstart matrix.
4. **Evidence recorded**: logs, screenshots and statistics under repository `.tmp/`, with each item reported passed, failed, blocked or unrun.
5. **Completion stated**: unverified scope and unmet constraints listed; services created for the task stopped with process exit and port release confirmed.

## Read the feature contract too

- Product direction: [product goals](./product-goals.md).
- Feature requirements, models, contracts and acceptance: [feature index](./features/index.md).
- Historical unfinished work and independent checklist states: [pending work](./features/pending-work.md).
- Startup/platform changes: [platform specification](./features/001-platform-injection/spec.md).
- Settings, download metadata, page-turn defaults, and magnifier behavior:
  [reader behavior decisions](./decisions/2026-09-18-reader-behavior.md),
  then the affected feature's specification, contracts, and quickstart from the feature index.
- Local UI acceptance: [browser acceptance](./browser-acceptance.md).
- Platform/injection acceptance: [EH testing](../../../.pi/skills/eh-test/SKILL.md).

These guides describe inspected implementation, not proof of functional acceptance.
Historical plans can differ from current code; resolve user-visible conflicts before
changing behavior. Keep versions and commands in configuration, detailed acceptance
procedures in their linked guides, and feature requirements in `features/`.
The feature index distinguishes historical plans, current implementation and actual
acceptance; follow [Trellis workflow](../../workflow.md) when starting new work.
