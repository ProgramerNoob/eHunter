---
name: trellis-break-loop
description: "After fixing a bug, analyze causes, failed fixes, and prevention; record lessons in specs."
---

# Break the Loop

After debugging, analyze both the fix and how to prevent the same class of bug.

## Analysis

1. **Root cause**: choose a category and describe the specific cause.

   | Category | Meaning | Example |
   | --- | --- | --- |
   | A. Missing Spec | Required practice undocumented | Feature without checklist |
   | B. Cross-Layer Contract | Layer interface unclear | Unexpected API format |
   | C. Change Propagation Failure | Related sites missed | Signature changed without callers |
   | D. Test Coverage Gap | Isolated checks miss integration | Unit passes, integration fails |
   | E. Implicit Assumption | Undocumented dependency | Seconds vs milliseconds |

2. **Failed fixes**, when applicable: explain each attempt in terms of symptom-only repair, incomplete scope, tool limitations, or a mistaken mental model (including missed layers).
3. **Prevention**: assess documentation, architecture that makes the error impossible, compile-time checks, runtime monitoring/scans, integration/E2E coverage, and review checklists. Give each proposed mechanism a priority, concrete action, and status.
4. **Systematic expansion**: look for similar issues, architecture flaws, process improvements, and missing team knowledge.
5. **Knowledge capture**: update `.trellis/spec/guides/` and relevant `.trellis/spec/` docs; create an issue record if applicable, a feature ticket for the root fix, and updated check guidelines when needed.

Report using this structure:

```markdown
## Bug Analysis: [Short Description]

### 1. Root Cause Category
- Category: [A/B/C/D/E] — [Name]
- Specific Cause: [Details]

### 2. Why Fixes Failed (if applicable)
1. [Attempt]: [Why it failed]

### 3. Prevention Mechanisms
| Priority | Mechanism | Specific Action | Status |
| --- | --- | --- | --- |
| P0 | ... | ... | todo/done |

### 4. Systematic Expansion
- Similar issues: [Locations]
- Design improvement: [Architecture]
- Process improvement: [Process]
- Knowledge gaps: [Missing understanding]

### 5. Knowledge Capture
- [ ] [Documents to update / tickets to create]
```

## Bayesian reasoning

When several root causes are plausible and evidence is incomplete:

1. State hypotheses, priors, and reasons. Priors sum to 100%; investigate first if you cannot assign them.
2. Record specific observations and reliability (test output > log message > user report > hunch). Check whether multiple hypotheses explain each observation.
3. Ask how likely the evidence is under each hypothesis: predicted evidence increases belief, contradictory evidence decreases it, equally likely evidence leaves it unchanged. Direction matters more than exact calculation.
4. Seek evidence that distinguishes the leading hypotheses, rather than more of the same evidence.
5. State confidence and act accordingly:

   | Confidence | Action |
   | --- | --- |
   | 90%+ | Proceed with fix, monitor |
   | 70–90% | Proceed, add fallback check |
   | 50–70% | Test hypothesis before committing |
   | <50% | Gather evidence rather than guess |

Use qualified confidence while evidence is incomplete. Avoid base-rate neglect (a failed test can have other causes), confirmation bias (seek evidence against the leading hypothesis), and anchoring (use current context, not yesterday's bug).

## Immediate follow-through

After analysis, perform the knowledge updates rather than leaving only a chat checklist:

1. Update the relevant guides/specs: cross-platform → `cross-platform-thinking-guide.md`; cross-layer → `cross-layer-thinking-guide.md`; reuse → `code-reuse-thinking-guide.md`; domain-specific → `backend/*.md` or `frontend/*.md`.
2. Sync `.trellis/spec/` updates to `src/templates/markdown/spec/`.
3. Commit the spec updates as the primary output of the analysis.
