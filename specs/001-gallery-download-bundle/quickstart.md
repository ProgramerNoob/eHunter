# Quickstart: Gallery Download Bundle

## Prerequisites

- Node.js environment compatible with project toolchain
- Dependencies installed (`npm install`)
- Active branch: `001-gallery-download-bundle`

## Run

1. Start dev runtime:

```bash
npm run dev
```

2. Open reader page and verify runtime behavior using [ego-browser](../../.pi/browser-testing.md); follow the linked guide for common operations.

**Acceptance status (2026-09-18)**: These steps reflect the confirmed JSON format. This documentation sync did not run them; record fresh results and artifact evidence in `plan.md` via `tasks.md` T036–T037. Historical YAML/task checks do not establish acceptance of `metadata.json`.

## Validation Checklist

### Story P1: Confirm-to-download and chunked export

- Open `DownloadConfirmDialog`, click confirm, and verify task starts immediately.
- Validate images are processed in page order and file names use zero-padded numbering (`001`, `002`, ...).
- For a 20–50-page gallery under the default chunk size, verify one standard ZIP downloads and opens successfully.
- For a 300-page gallery with chunk size 200, verify two standard ZIP downloads open successfully and contain their corresponding page ranges.
- Extract each ZIP independently, including the later chunk by itself. Verify the root contains one UTF-8 `metadata.json`, parseable as JSON, with exactly these seven fields: `introUrl`, `galleryTitle`, `totalPages`, `downloadTime`, `eHunterVersion`, `totalChunks`, `chunkIndex`. JSON is the only metadata format.
- Check string types for intro URL, original title, timestamp, and version; page and chunk counts/indices must be JSON integers. Include a non-ASCII gallery title to verify UTF-8 round-tripping.
- Verify `totalChunks=1` and `chunkIndex=1` for the single ZIP; for the 300-page export verify `totalPages=300`, `totalChunks=2`, and `chunkIndex` values 1 and 2 matching the ZIPs. All task-level fields, including the captured timestamp, must agree between chunks.
- Check title/intro URL/version against the source task, and verify the timestamp is readable and parseable. The existing user-local-time requirement remains in force; the current UTC producer discrepancy is recorded in `plan.md`.
- Confirm the archive path in `core/service/GalleryDownloadService.ts` continues to use existing `fflate` with native JSON serialization, as required by the [2026-09-18 decision, section 1](../decisions/2026-09-18-reader-behavior.md#1-下载格式). The historical YAML and `jszip`/`yaml` plan is superseded.

### Story P2: Reusable floating status notifications

- Verify notification stack appears at bottom-right above status-pannel.
- Trigger 2-3 download tasks and verify notifications are vertically stacked without overlap.
- Validate phase transitions in UI: fetching -> compressing -> completed/partial/failed.

### Story P3: Robustness and retry behavior

- Simulate intermittent image request failures and verify per-request policy is initial attempt + 2 retries.
- With `autoRetryByOtherSource` enabled, verify stage order is `ChangeSource` then `Origin`.
- With `autoRetryByOtherSource` disabled, verify only default/origin chain is used.
- Verify partial failures do not abort entire task and final notification reports failure count.

## Responsive Verification

1. Desktop viewport: 1200x900.
2. Mobile viewport: 390x844 (iPhone 12 Pro profile).
3. Confirm notification readability, spacing, and non-overlap in both viewports.

## Regression Checks

- Scroll mode reading flow unchanged while download runs in background.
- Book mode reading flow unchanged while download runs in background.
- No third-party UI component library introduced.

## Optional Static Check

```bash
npm run type-check
```
