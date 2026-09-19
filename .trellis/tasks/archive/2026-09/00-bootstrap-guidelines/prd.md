# Bootstrap eHunter Development Guidelines

## Goal

Populate `.trellis/spec/frontend/` with concise, source-backed guidance so future agents follow eHunter's actual Vue and TypeScript conventions.

## Scope

- Fill the six existing frontend guides and update their `index.md`.
- Inspect `AGENTS.md`, current `core/` and `src/` implementations, package/build/type-check configuration, relevant `specs/` contracts, and existing verification scripts.
- Preserve the single-repo/frontend spec boundary. Platform services belong in the relevant frontend guidance; they are browser-side adapters, not a separate backend.
- Keep the populated thinking guides unless a concrete incompatibility is found.
- Write guideline documents in English, matching the existing spec index's language convention.
- Product source, build configuration, dependencies, user changes, and Trellis runtime/skills are outside this task's scope.

## Requirements

1. Describe current directory ownership, startup/platform selection, and the boundary between current and historical implementations.
2. Describe real component patterns, props/events, styles, and UI constraints.
3. Describe actual composable patterns, reactive inputs, lifecycle cleanup, and service ownership.
4. Describe reactive state, service injection, settings persistence, and cache boundaries.
5. Describe TypeScript contracts, validation, ambient declarations, and actual compiler configuration.
6. Describe available checks, functional/browser acceptance routing, accessibility practices, and known tooling limitations without presenting unrun checks as passed.
7. Ground important rules in source files, existing contracts, or project instructions. Distinguish existing implementation debt from patterns to follow.
8. Keep the index aligned with the final guide set and use working relative Markdown links.

## Acceptance Criteria

- [x] Fill frontend guidelines.
- [x] Add real code examples and source references.
- [x] Remove template placeholders and empty template headings from the frontend guides.
- [x] Verify relative links, index coverage, documented command availability, and source-backed claims.
- [x] Complete an independent review after the documentation is stable.

## Verification Scope

This is a documentation-only task. Validate document structure, links, command/config claims, and examples against the repository. Product builds, type-check, and browser acceptance need not be run solely for prose changes; document any such checks as unrun unless actually executed.
