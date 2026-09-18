# Data Model: Gallery Download Bundle

## 1) DownloadTask

- Description: One user-triggered export execution started from `DownloadConfirmDialog`.
- Fields:
  - `taskId` (string, required): Unique runtime identifier.
  - `albumId` (string, required): Gallery identity from album service.
  - `albumTitle` (string, required): Original gallery title.
  - `sanitizedBaseName` (string, required): Cross-platform safe filename base.
  - `introUrl` (string, required): Intro HTML URL written to `metadata.json`.
  - `totalPages` (number, required): Total gallery page count.
  - `chunkSize` (number, required): Effective chunk size after validation.
  - `totalChunks` (number, required): Computed from `totalPages/chunkSize`.
  - `currentPage` (number, required): 1-based progress pointer.
  - `status` (enum, required): `queued|fetching|compressing|completed|failed|partial`.
  - `failedCount` (number, required): Number of pages that failed all attempts.
  - `createdAt` (datetime string, required): Task start timestamp.
  - `completedAt` (datetime string, optional): End timestamp.
- Validation rules:
  - `chunkSize` MUST be positive; fallback to default `200` when invalid.
  - `currentPage` MUST never decrease during normal processing.
  - `status=completed` requires `failedCount=0`; otherwise `partial` or `failed`.

## 2) DownloadChunk

- Description: A bounded archive unit produced from sequential pages.
- Fields:
  - `chunkIndex` (number, required): 1-based chunk index.
  - `totalChunks` (number, required): Total chunk count.
  - `startPage` (number, required): Inclusive 1-based first page in chunk.
  - `endPage` (number, required): Inclusive 1-based last page in chunk.
  - `imageCount` (number, required): Count of successful image files in this chunk.
  - `failedPageNumbers` (number[], required): Pages that failed in this chunk.
  - `zipFileName` (string, required): Final downloadable file name.
  - `metadataFileName` (string, required): Fixed archive entry name `metadata.json` at the ZIP root; a conceptual artifact field, not an added runtime status property.
- Validation rules:
  - `startPage <= endPage`.
  - `chunkIndex` MUST be within `[1, totalChunks]`.
  - `imageCount + failedPageNumbers.length` MUST equal pages in chunk range.

## 3) ImageDownloadItem

- Description: Per-page image retrieval and packaging state.
- Fields:
  - `pageNumber` (number, required): 1-based page number.
  - `pageIndex` (number, required): 0-based index used by album service.
  - `fileStem` (string, required): Zero-padded number (minimum width 3).
  - `extension` (string, optional): Source-derived extension (`jpg|jpeg|png|webp|gif|bmp|avif` etc.).
  - `modeSequence` (enum[], required): Retrieval stage sequence; either `[Default/Origin]` or `[ChangeSource, Origin]`.
  - `attemptsUsed` (number, required): Total attempts consumed for final stage result.
  - `result` (enum, required): `success|failed`.
  - `failureReason` (string, optional): Error summary for reporting.
- Validation rules:
  - Each stage allows maximum 3 attempts (initial + 2 retries).
  - `result=success` requires non-empty `extension` and resolved source URL.

## 4) GalleryMetadataJson

- Description: UTF-8 JSON document named `metadata.json` in every ZIP archive, including single-chunk exports. This replaces the historical YAML model under the [2026-09-18 decision, section 1](../decisions/2026-09-18-reader-behavior.md#1-下载格式).
- Fields (exactly these seven; all required):
  - `introUrl` (string): Gallery intro HTML URL.
  - `galleryTitle` (string): Original gallery title, before ZIP filename sanitization.
  - `totalPages` (integer): Total gallery page count, at least 1 for an exported archive.
  - `downloadTime` (datetime string): Timestamp captured once for the task, readable and parseable with an explicit timezone.
  - `eHunterVersion` (string): eHunter version recorded for the task.
  - `totalChunks` (integer): Planned number of ZIP chunks, at least 1.
  - `chunkIndex` (integer): 1-based index of the current ZIP chunk.
- Validation rules:
  - Every archive MUST include a complete, independently parseable metadata object; JSON is the single metadata format.
  - `totalChunks = ceil(totalPages / effectiveChunkSize)` and `1 <= chunkIndex <= totalChunks`; the index MUST align with the actual chunk file.
  - A single-chunk export MUST carry `totalChunks=1` and `chunkIndex=1`.
  - Task-level fields, including `downloadTime`, MUST remain consistent across chunks; only `chunkIndex` changes.
  - The existing user-local-time assumption in `spec.md` remains applicable. The current producer uses UTC ISO 8601 (`toISOString()`); the unresolved difference is recorded in `plan.md`.

## 5) StatusNotification

- Description: Reusable UI status item shown in the bottom-right floating stack.
- Fields:
  - `notificationId` (string, required): Unique display identifier.
  - `taskId` (string, required): Associated download task.
  - `severity` (enum, required): `info|success|warning|error`.
  - `phase` (enum, required): `fetching|compressing|completed|failed|partial`.
  - `message` (string, required): Human-readable progress text.
  - `progressCurrent` (number, optional): Current processed count.
  - `progressTotal` (number, optional): Total expected count.
  - `createdAt` (datetime string, required)
  - `updatedAt` (datetime string, required)
  - `dismissible` (boolean, required)
- Validation rules:
  - Multiple items with distinct `taskId` MUST coexist in stack order.
  - `progressCurrent <= progressTotal` when both exist.

## Relationships

- A `DownloadTask` has one or many `DownloadChunk`.
- A `DownloadChunk` contains many `ImageDownloadItem` records for its page window.
- Each `DownloadChunk` emits one `GalleryMetadataJson` snapshot as `metadata.json`, serialized with native JSON and encoded/packaged using existing `fflate`.
- A `DownloadTask` drives one or many `StatusNotification` updates over lifecycle.

## State Transitions

- `DownloadTask`: `queued -> fetching -> compressing -> completed|partial|failed`.
- `ImageDownloadItem`: `pending -> trying(stage,attempt) -> success|failed`.
- `StatusNotification`: `created(info) -> updated(progress/phase) -> final(success|warning|error)`.
