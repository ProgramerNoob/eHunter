# Directory Structure

## Ownership and placement

This is one browser application, including its platform adapters; there is no separate
backend package. Follow [AGENTS.md](../../../AGENTS.md): new work belongs primarily in
`core/` and `src/`, with small, reversible changes across their existing import boundary.
OpenAPI files such as the [settings contract](./features/002-more-settings-modal/contracts/settings-modal.openapi.yaml)
describe logical UI/state interactions; their example URLs are not deployed HTTP APIs.

| Location | Responsibility and examples |
| --- | --- |
| `src/main.ts` | Userscript startup, host overlay, mounting, open/close bridge |
| `src/platform/` | Detection, service factory, initialization, platform types |
| `src/platform/eh/`, `nh/` | Site DOM parsers and current `service/AlbumServiceImpl.ts` adapters |
| `src/platform/base/` | Shared browser storage, requests, queues, platform utilities |
| `src/platform/test/` | Local development album service and fixtures |
| `core/components/` | Reader screens and page/thumbnail rendering |
| `core/components/widget/` | Reusable controls; `layout/`, `dialog/`, `status/` hold specialized UI |
| `core/components/composables/` | Page menu, magnifier, image loading, touch behavior |
| `core/store/` | Singleton reactive state/actions, i18n, settings and layout persistence |
| `core/model/` | Shared image/layout types and pure page/thumbnail calculations |
| `core/service/` | Album contract, download orchestration, image retry policy |
| `core/utils/`, `core/style/`, `core/assets/` | Browser helpers, SCSS, icons and translations |
| `.trellis/spec/frontend/` | Engineering guides, product goals, decisions, browser acceptance and `features/` contracts/quickstarts |
| `scripts/`, `.pi/` | Bundle serving and repository-specific validation procedures |

Use PascalCase for Vue components and service files, `useX.ts` for composables, and
existing lower-camel filenames for model/store helpers. Match adjacent files rather
than renaming unrelated modules to impose a new convention.

## Trace the actual startup

1. [src/main.ts](../../../src/main.ts) calls
   [detectPlatform](../../../src/platform/detector.ts). EH matches reader `/s/` URLs on
   `e-hentai.org` or `exhentai.org`; NH matches `/g/<id>/<page>/` on `nhentai.net`.
   [runtimeEnv.ts](../../../core/utils/runtimeEnv.ts) determines local TEST hosts.
   Unsupported hosts/pages skip initialization.
2. The entry creates the open switch and lazily mounts `#ehunter-app` when opened,
   including opening from the stored status. Host actions and EH mobile viewport
   handling stay in the entry/platform layer.
3. [createPlatformService](../../../src/platform/factory.ts) selects `EHAlbumServiceImpl`,
   `NHAlbumServiceImpl`, or `TestAlbumService`. The app provides it under `NameAlbumService`
   before awaiting [initializeWithTimeout](../../../src/platform/initializer.ts).
4. `LoadingView` gates the reader until initialization succeeds. The rendered root is
   [core/TestApp.vue](../../../core/TestApp.vue), which wraps [core/App.vue](../../../core/App.vue).
   Its name does **not** select the test service. `App.vue` injects the initialized
   service and calls the store's `init(albumService)` on mount.
5. [ReaderView.vue](../../../core/components/ReaderView.vue) composes reader layout and
   reading modes. Platform parsing remains behind the
   [AlbumService contract](../../../core/service/AlbumService.ts), not in templates.

The current initializer uses **120000 ms**. The older
[platform contract](./features/001-platform-injection/contracts/AlbumService.ts)
mentions 60 seconds; do not copy that value into new implementation guidance or
silently change the current timeout while doing unrelated work.

## Current versus historical paths

- `core_old/` and `old/` are historical implementations. Changes require an explicit
  migration purpose; do not copy their architecture into new reader code.
- Historical files also remain inside current directories:
  [AlbumServiceImpl.old.ts](../../../src/platform/eh/service/AlbumServiceImpl.old.ts)
  constructs [AlbumCacheService](../../../src/platform/eh/service/AlbumCacheService.ts),
  which imports `core_old` storage/tags. The factory selects the current implementation,
  which does not use that persistent album cache.
- Shared request infrastructure may still be relevant even when a legacy consumer is
  present. Trace imports and callers before deciding a class is active or obsolete.
- EH is the first migration target; changes to `src/platform/base/` require assessing
  both EH and NH, per [AGENTS.md](../../../AGENTS.md).

## Imports and build boundaries

The source already has cross-imports: the factory imports `core/service/AlbumService`,
and [core/store/app.ts](../../../core/store/app.ts) imports platform storage. Preserve
these working boundaries during focused changes; no broad import migration is implied.

[tsconfig.json](../../../tsconfig.json) declares `@/* → src/*` and `core/* → core/*`.
Both [development](../../../vite.config.ts) and [production](../../../vite.config.prod.ts)
Vite configs explicitly alias only `@`. Existing relative imports are the safe local
pattern; a TypeScript path mapping alone does not establish a Vite runtime alias.

Production uses `src/main.ts` as an IIFE library entry and injects CSS into JavaScript.
Normal `vite build` and the userscript build are different targets; see
[quality guidance](./quality-guidelines.md) before choosing a validation command.
