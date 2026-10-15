---
name: trellis-brainstorm
description: "Plan new, complex, or unclear requirements and competing approaches: create tasks/PRDs, clarify needs, research choices, and converge on MVP."
---

# Trellis Brainstorm

## Planning contract

Use this skill for Phase 1 after task-creation consent. Creating a task, an initial request to build/fix/refactor, or a request to "go ahead" does not approve leaving planning. Every non-trivial task requires a subsequent user response; implementation starts only after explicit approval of the latest final planning summary. Material artifact changes after approval require another final review.

While a user-owned product, scope, UX, compatibility, risk, or acceptance decision remains unresolved, end the turn with exactly one highest-value question. Keep product code, implementation dispatch, and `task.py start` behind the final approval gate.

## Evidence and questions

Before asking, inspect code, tests, fixtures, configs, README/docs, specs, domain notes, related tasks/research, and available session history. Repository facts and technical constraints come from inspection. Product intent, feature boundaries, UX preferences, and risk tolerance belong to the user; existing patterns support recommendations, not decisions on their behalf.

Ask one question per message, stating the decision, why it matters, your recommendation, and the trade-off of choosing differently. Do evidence work without asking whether to search or continue brainstorming. If no user decision remains, proceed to final review without manufactured clarification. That review is a phase-transition gate, and still needs subsequent approval.

## Planning flow

1. If no task exists, create it after consent:
   ```bash
   TASK_DIR=$(python3 ./.trellis/scripts/task.py create "<short task title>" --description "<one-line summary>" --slug <slug>)
   ```
   Title and description are non-empty: creation rejects blanks, and archive refuses records with either blank. Use a slug without a date prefix; the script adds `MM-DD-`. Update the generated `prd.md` with the request and known facts before follow-up questions.
2. Inspect evidence and separate confirmed facts, missing product intent, scope/risk decisions, and likely exclusions. Use the repository's existing product/domain/spec hierarchy; proceed with available evidence if none exists.
3. Ask the highest-value unresolved question, with recommendation and trade-off, then stop without implementation. After each answer, update `prd.md`, refresh the decision inventory, and repeat inspection.
4. Once user decisions are resolved, create/update `design.md` and `implement.md` for complex tasks and curate required context manifests.
5. Complete both convergence gates below. Present the final planning summary and end the turn. Run `task.py start` and implement only after a subsequent message explicitly approves that summary.

## First-principles analysis

For vague requirements, over-engineering, or complexity added by convention:

1. Restate the problem in one sentence without implementation choices: "Profile data loads too slowly", rather than "Add Redis caching".
2. List fundamental truths: physical limits, business rules, technical invariants, and user needs (including measurable targets).
3. Challenge each component: fact or convention; what breaks if removed; root problem or symptom; who benefits from its complexity?
4. Build the minimum mechanism satisfying those truths. Each added complexity names the truth requiring it.
5. Check the original problem is solved, identify unverified assumptions, and choose the simplest experiment to test them.

## Artifact rules

| Artifact | Contents |
| --- | --- |
| `prd.md` | Goal/user value, confirmed facts, requirements, testable acceptance criteria, out of scope, and any blocking open questions |
| `design.md` | Architecture/boundaries, data flow/contracts, compatibility/migration, trade-offs, operations/rollback |
| `implement.md` | Ordered implementation checklist, validation commands, risky files/rollback points, checks before `task.py start` |

Lightweight tasks may be PRD-only; complex tasks need all three before start. `implement.md` does not replace `implement.jsonl`. In sub-agent-dispatch workflows, both `implement.jsonl` and `check.jsonl` need at least one real spec/research entry; missing/empty manifests and legacy `_example` rows do not qualify. Inline workflows skip this manifest gate and load Phase 2 context through `trellis-before-dev`.

## Requirement convergence gate

Before final review, verify:

- User outcome/value, included and excluded behavior, and observable acceptance criteria are explicit.
- User-owned product, scope, UX, compatibility, risk, and acceptance decisions are resolved; no blocking question remains.
- Technical unknowns are researched or explicitly deferred without changing MVP behavior.
- Repository-answerable questions have been resolved through inspection.
- Required artifacts and real curated manifest entries are ready.

Lightweight tasks still require evidence inspection, convergence, final review, and fresh implementation approval.

## PRD convergence pass

Before declaring planning ready or running `task.py start`, rewrite `prd.md` once against the artifact structure above:

- Put each repeated fact in one authoritative section.
- Fold temporary `What I already know`, `Assumptions`, and resolved `Open Questions` into Goal, Background, Requirements, Technical Notes, or Acceptance Criteria; remove resolved questions and empty sections.
- Merge bug and requirement lists covering the same work. Keep each defect's severity, evidence, and file:line anchors with its owning requirement.
- Preserve every anchor, decision, constraint, requirement ID, and acceptance mapping.

Read the result top to bottom. It is ready when no temporary unresolved sections, blocking questions, lost mappings, or duplicate facts remain (repetition is justified only by new information).

## Final review

Show Goal, In Scope, Out of Scope, Acceptance Criteria, Key Decisions, relevant Risks or Deferred Items, and artifact status. Planning is ready for implementation only when both convergence gates pass, this summary has been presented, and the user explicitly approves it in a subsequent message.
