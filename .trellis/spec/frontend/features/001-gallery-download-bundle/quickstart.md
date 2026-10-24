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

2. Open reader page and verify runtime behavior using [ego-browser](../../browser-acceptance.md); follow the linked guide for common operations.

**Acceptance status**: These steps reflect the confirmed JSON format. They are not a record of a completed run; record fresh results and artifact evidence before treating `metadata.json` as accepted.

## Validation Checklist

### Story P1: Confirm-to-download and chunked export

- Open `DownloadConfirmDialog`, click confirm, and verify task starts immediately.
- Validate images are packaged in page order with zero-padded file names (`0001`, `0002`, ...) even though the three concurrent workers fetch pages out of order.
- Verify the status notification reports finished page counts (`已完成 N/总数`) that never decrease while fetching.
- For a 20–50-page gallery under the default chunk size, verify one standard ZIP downloads and opens successfully.
- For a 300-page gallery with chunk size 200, verify two standard ZIP downloads open successfully and contain their corresponding page ranges.
- Extract each ZIP independently, including the later chunk by itself. Verify the root contains one UTF-8 `metadata.json`, parseable as JSON, with exactly these seven fields: `introUrl`, `galleryTitle`, `totalPages`, `downloadTime`, `eHunterVersion`, `totalChunks`, `chunkIndex`. JSON is the only metadata format.
- Check string types for intro URL, original title, timestamp, and version; page and chunk counts/indices must be JSON integers. Include a non-ASCII gallery title to verify UTF-8 round-tripping.
- Verify `totalChunks=1` and `chunkIndex=1` for the single ZIP; for the 300-page export verify `totalPages=300`, `totalChunks=2`, and `chunkIndex` values 1 and 2 matching the ZIPs. All task-level fields, including the captured timestamp, must agree between chunks.
- Check title/intro URL/version against the source task, and verify the timestamp is readable, parseable, and carries a non-`Z` offset matching the browser's timezone.
- Confirm the archive path in `core/service/GalleryDownloadService.ts` continues to use existing `fflate` with native JSON serialization, as required by the [2026-09-18 decision, section 1](../../decisions/2026-09-18-reader-behavior.md#1-下载格式). JSON is the sole metadata format.

### Story P2: Reusable floating status notifications

- Verify notification stack appears at bottom-right above status-pannel.
- Trigger 2-3 download tasks and verify notifications are vertically stacked without overlap.
- Validate phase transitions in UI: fetching -> compressing -> completed/partial/failed.

### Story P3: Robustness and retry behavior

- Simulate intermittent image request failures and verify the default-only policy allows 3 attempts on a single stage.
- With `autoRetryByOtherSource` enabled, verify stage order is `Default`, then `ChangeSource`, then `Origin`, with 2 attempts per stage.
- With `autoRetryByOtherSource` disabled, verify only the `Default` stage is used.
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
