---
name: trellis-before-dev
description: "Load project specs before coding, when switching packages, or when refreshing conventions."
---

# Before Development

Complete these steps before writing code:

1. Read the task's `prd.md`, then `design.md` and `implement.md` if present, for requirements, design, execution order, and validation.
2. Discover packages and spec layers:
   ```bash
   python3 ./.trellis/scripts/get_context.py --mode packages
   ```
3. Select specs by the package, work type (frontend, backend, tests, docs), and spec/research paths in the task artifacts. Read each relevant index:
   ```bash
   cat .trellis/spec/<package>/<layer>/index.md
   ```
   Follow its **Pre-Development Checklist** and read the applicable guideline files it names; the index alone is insufficient.
4. Read the shared guides index:
   ```bash
   cat .trellis/spec/guides/index.md
   ```
5. For a non-trivial change (multiple files, a layer boundary, public interface, or code you did not just write), state:
   - the smallest gap between current and intended behavior;
   - where that behavior lives;
   - expected files and why each change is needed;
   - excluded scope;
   - how any local refactor will be shown to preserve behavior.

Small, well-scoped changes can proceed directly after loading guidelines. If the discovered scope is clearly larger, explain why before continuing; do not widen it on your own. Proceed once the relevant standards and patterns are understood.
