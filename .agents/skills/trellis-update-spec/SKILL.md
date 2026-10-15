---
name: trellis-update-spec
description: "Preserve executable contracts and coding conventions learned during debugging, implementation, or discussion in .trellis/spec/."
---

# Update Code-Spec

Use this skill after implementing a feature, fixing a bug, making a design decision, discovering a pattern or gotcha, establishing a convention, or finding a thinking checklist trigger that future work needs.

## Code-spec boundary

For implementation work, a spec records executable contracts: signatures, payload fields, environment keys, boundary behavior, and testable validation. This depth is required for a changed command/API signature, cross-layer request/response contract, database schema or migration, or infrastructure integration (storage, queue, cache, secrets, environment wiring).

Use `<layer>/*.md` for how to write code and `guides/*.md` for what to consider. Guides are short pointers; they do not duplicate detailed rules.

For any of the triggers above, include:

1. Scope / trigger
2. Signatures (command/API/DB)
3. Contracts (request, response, environment)
4. Validation and error matrix
5. Good/base/bad cases
6. Required tests with assertion points
7. Wrong vs correct example

## Update process

1. Record what was learned, why it prevents a problem, and the target spec file.
2. Classify it as a design decision, convention, pattern, forbidden pattern, common mistake, or gotcha.
3. Read the target spec before editing to avoid duplication and fit its structure: `cat .trellis/spec/<category>/<file>.md`.
4. Write concrete contracts, code examples, and reasons; keep one concept per section.
5. Update the category `index.md` when adding a section/file or changing spec status.
6. Check that the result is specific, actionable, in the right spec layer, and free of duplicate content.

Use the relevant target under:

```text
.trellis/spec/
├── <layer>/       # coding specs and index.md
└── guides/        # thinking checklists and index.md
```

## Templates

Place design decisions in “Design Decisions”, patterns in “Patterns”, forbidden patterns in “Anti-patterns”/“Don't”, mistakes in “Common Mistakes”, conventions in the relevant section (agreed standards in quality guidelines), and gotchas in warning callouts. Add thinking triggers as checklist items in `guides/*.md`.

A design decision records context, options, decision rationale, example, and future extension. A convention records what, why, a code example, and related specs. A pattern records problem, solution, good/bad code examples, and why. A forbidden pattern records bad code, why it fails, and the replacement. A common mistake records symptom, cause, fix, and prevention. A gotcha records the non-obvious behavior, when it occurs, and how to handle it.

Keep the mandatory structure for any of the triggers above:

```markdown
## Scenario: <name>
### 1. Scope / Trigger
- Trigger: <why code-spec depth applies>
### 2. Signatures
- <command/API/DB signatures>
### 3. Contracts
- <request/response fields: name, type, constraints>
- <environment keys: required/optional>
### 4. Validation & Error Matrix
- <condition> → <error>
### 5. Good/Base/Bad Cases
- Good: ...
- Base: ...
- Bad: ...
### 6. Tests Required
- <unit/integration/E2E tests and assertion points>
### 7. Wrong vs Correct
- Wrong: <code>
- Correct: <code; at least one pair>
```

## If unsure what to update

Identify the completed work (bug fix, feature, refactor, or design discussion), the lesson/decision, and its area (backend, frontend, cross-layer flow, organization/reuse, or quality/testing). Record knowledge needed to understand, maintain, extend, or avoid repeating mistakes; a one-off implementation detail may be skipped.

## Quality checklist

Before finishing, verify that a new team member can understand the update; it is specific and actionable, contains code examples and executable signatures/contracts, explains why, includes validation/errors and Good/Base/Bad cases where applicable, names test assertion points, lives in the correct spec, and does not duplicate existing content.

The Trellis `break-loop` command (`trellis-break-loop` skill) performs deeper bug analysis; `update-spec` makes the updates, and `finish-work` prompts a spec review. Implementation contracts and non-obvious lessons should remain useful in later sessions.
