<!--
Sync Impact Report
- Version change: 1.0.0 -> 1.0.1 (2026-09-18)
- Change request: user-approved migration of project browser verification to ego-browser.
- Modified principles: III. Validation Before Completion — browser tooling updated;
  required end-to-end verification and acceptance criteria are preserved.
- Added/removed principles or sections: None
- Propagation:
  - updated: AGENTS.md, .pi/skills/eh-test/SKILL.md
  - added: .pi/browser-testing.md (shared browser operations)
  - updated: 30 specs documents; completed checks and historical results retain their
    dates, status, and outcomes using tool-neutral browser-verification wording.
  - reviewed: .specify/templates/*.md and .pi/prompts/*.md; no old browser-tool references
    requiring updates.
- Follow-up TODOs: None
-->

# eHunter Constitution

## Core Principles

### I. Refactor-First Boundaries

All feature work MUST be implemented in `core/` and `src/` unless a change in
`core_old/` or `old/` is explicitly justified as migration reference or historical bug fix.
New changes MUST preserve the ongoing refactor structure and MUST NOT reintroduce old
architecture patterns into refactor directories.

Rationale: The repository is in a mixed old/new state, so clear directory boundaries
prevent regression and reduce migration rework.

### II. Behavior-Preserving Changes

Changes to parser, cache, request queue, or reader interaction MUST preserve existing
book mode and scroll mode correctness, with explicit boundary handling for async loading,
page limits, and rapid user input.

Rationale: The product value depends on stable parsing and reading continuity across
multiple platform paths.

### III. Validation Before Completion (NON-NEGOTIABLE)

After each development completion cycle, contributors MUST verify the changed behavior
end-to-end using `ego-browser`, following [the browser testing guide](../../.pi/browser-testing.md)
and the scope-specific requirements in AGENTS.md: run `npm run dev` for local UI changes;
use the `eh-test` skill and the production build on EH for platform changes.
A task is NOT complete until this manual verification is performed and the result is
documented in the feature notes, task output, or PR description.

Rationale: This project is a userscript UI with DOM-dependent runtime behavior that
cannot be fully validated by static checks alone.

### IV. Story-Independent Delivery

Specifications and tasks MUST keep user stories independently implementable and testable.
Each story MUST include acceptance scenarios and independent validation criteria so an MVP
slice can be delivered without coupling to lower-priority stories.

Rationale: Independent slices reduce risk during refactor and make regressions easier
to isolate.

### V. Built-in UI and Mode Consistency

All UI components MUST be self-built within this repository; third-party UI component
libraries MUST NOT be introduced. Reader-facing settings and interactions MUST remain
consistent between book mode and scroll mode unless the spec explicitly limits scope.

Rationale: Custom UI ensures control in userscript injection contexts and avoids design
and dependency drift.

## Additional Constraints

- EH path correctness is prioritized over NH when scope conflict exists.
- Changes in `src/platform/base/` MUST include cross-platform impact review notes.
- Preference persistence MUST define invalid-value fallback behavior.
- Destructive git operations (`reset --hard`, force push) are prohibited unless explicitly
  requested by a human owner.

## Development Workflow & Quality Gates

1. Specification flow MUST run in order: `/speckit.specify` -> `/speckit.clarify`
   (when needed) -> `/speckit.plan` -> `/speckit.tasks`.
2. Every implementation plan MUST include a Constitution Check section mapping the feature
   to all five core principles.
3. Task lists MUST include explicit validation tasks for:
   - `npm run dev` for local UI changes, or the `eh-test` production-build flow for platform changes
   - browser verification via `ego-browser`
4. Before handoff, contributors MUST confirm:
   - acceptance scenarios pass
   - required manual runtime checks pass
   - scope boundaries (book vs scroll, EH vs NH) were respected.

## Governance

This constitution is authoritative for feature specification, planning, and execution in
this repository. All reviews and implementation outputs MUST include an explicit compliance
check against these principles.

Amendment procedure:
- Amendments MUST be made through a documented change request.
- Every amendment MUST include a Sync Impact Report and required template/runtime doc
  propagation.
- Versioning policy MUST use semantic versioning:
  - MAJOR: incompatible principle removals or redefinitions
  - MINOR: new principle or materially expanded governance requirement
  - PATCH: wording clarity and non-semantic refinements

Compliance expectations:
- Plan, tasks, and delivery notes MUST identify any principle violations and include
  explicit justification.
- Unjustified violations MUST block progression to implementation completion.

**Version**: 1.0.1 | **Ratified**: 2026-02-18 | **Last Amended**: 2026-09-18
