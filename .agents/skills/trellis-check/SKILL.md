---
name: trellis-check
description: "Verify code against specs, lint, types, tests, cross-layer flow, reuse, and consistency after changes, before commits, or when context drifts."
---

# Code Quality Check

## 1. Identify changes

```bash
git diff --name-only HEAD
git status
```

## 2. Load requirements and specs

Read the task's `prd.md`, then `design.md` and `implement.md` if present.

```bash
python3 ./.trellis/scripts/get_context.py --mode packages
cat .trellis/spec/<package>/<layer>/index.md
```

For each changed package/layer, follow the index's **Quality Check** section and read its applicable guideline files; the index alone is insufficient.

## 3. Run checks and review

Run the project's lint, type-check, and tests; fix failures before proceeding. Verify:

- Code quality: checks pass, with no leftover debug logging, suppressed warnings, or type-safety bypasses.
- Coverage: new functions have unit tests, bug fixes have regressions, and changed behavior has updated tests.
- Spec sync: document new patterns, conventions, bug lessons, and non-obvious findings in the relevant `.trellis/spec/` docs.
- Scope: no unrelated tidying, speculative abstractions/config/extension points, impossible-state fallbacks, files outside acceptance criteria, or caller workarounds for behavior owned elsewhere.

## 4. Cross-layer dimensions

Skip this section for changes confined to one layer. Otherwise check applicable dimensions:

| Trigger | Check |
| --- | --- |
| Data flow across 3+ layers | Trace Storage → Service → API → UI reads and reverse writes; verify types/schemas and error propagation |
| Constants or utilities | Search existing code before adding; extract repeated values only when they represent one stable concept whose callers change together; verify all occurrences after batch edits |
| New files | Correct relative/absolute imports; no circular dependencies |
| Shared concepts | Consistent use elsewhere in the same layer |

Reuse search:

```bash
grep -r "pattern" src/
```

Matching literals alone do not justify extraction.

## 5. Report and fix

Report every violation. Fix mechanical, local issues (lint, types, imports, dead branches, failing assertions) in place and rerun project checks. For design/judgment changes (shared naming, module boundaries, public interfaces, behavior ownership), record evidence and a recommendation, then stop. If a fix needs files outside task scope, report that and stop rather than silently widening the work.
