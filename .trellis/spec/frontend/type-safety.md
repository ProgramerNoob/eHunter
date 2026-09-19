# Type Safety

## Actual compiler boundary

[tsconfig.json](../../../tsconfig.json) extends `@vue/tsconfig/tsconfig.dom.json`.
The installed Vue base enables `strict`, `noUncheckedIndexedAccess`, and
`verbatimModuleSyntax`, but this repository explicitly sets:

```json
{
  "allowJs": true,
  "checkJs": false,
  "noImplicitAny": false,
  "strictNullChecks": false
}
```

Do not describe this as fully strict TypeScript. JavaScript helpers and unchecked
null/implicit-any paths remain. The root includes `env.d.ts`, `src/main.ts`,
`src/platform/**/*`, and `core/**/*`, and excludes `old/**/*` and `core_old/**/*` as
root inputs. Exclusion does not erase transitive imports or historical `.old.ts`
files under included directories.

[tsconfig.config.json](../../../tsconfig.config.json) is a separate composite project
using Node 22 configuration for build config files. Its test-config globs are not
proof that test runners/configurations exist. The browser configuration includes DOM
libraries; [vite.config.prod.ts](../../../vite.config.prod.ts) separately sets the
production build target to `es2015`. Build success and type-check success are distinct.

## Keep types with their owner

| Contract | Location |
| --- | --- |
| `ImgPageInfo`, `ThumbInfo`, `PreviewThumbnailStyle`, `ImgSrcMode` | [core/model/model.ts](../../../core/model/model.ts) |
| Dock slots, mode layout state and persisted layout schema | [core/model/layout.ts](../../../core/model/layout.ts) |
| Album service interface and injection name | [core/service/AlbumService.ts](../../../core/service/AlbumService.ts) |
| Platform detection, initialization steps and contextual errors | [src/platform/types.ts](../../../src/platform/types.ts) |
| Setting definitions, shortcut IDs, store-facing download state | [core/store/app.ts](../../../core/store/app.ts) |
| Component/composable-only options and events | Beside their implementation |

Use `import type` for erased contracts and ordinary imports for runtime enums/values,
as the platform adapters and layout components do. Closed sets use literal unions
(`DockSlotId = 'left' | 'right' | 'bottom'`); existing image/platform modes use enums.
Reuse these representations rather than adding equivalent string constants elsewhere.
Typed props/events are covered in [components](./component-guidelines.md).

## Validate at browser and storage boundaries

Type assertions do not validate parsed HTML, JSON, storage records, injected services,
or userscript capabilities. Follow the explicit guards in
[layoutPreference.ts](../../../core/store/layoutPreference.ts) and settings normalization
in `app.ts`: catch JSON parse failures, check object shape, and validate each field.
The layout reader accepts a size only when it is a finite integer within slot bounds:

```ts
if (typeof raw !== 'number' || !Number.isFinite(raw) || !Number.isInteger(raw)) {
    return null
}
```

This excerpt is from `pickLegalThumbSize`; the following check compares it with
`clampThumbSize` to reject out-of-range values. Do not use `Number(raw)` indiscriminately
on untrusted objects/arrays, and do not confuse migration validation with a UI action's
intentional range clamp. Preserve reset identity fields when normalizing records.

The album contract returns `Promise<Error | void>` from `init()` and
`Promise<ImgPageInfo | Error>` from `getImgSrc()`. Narrow with `instanceof Error`
before accessing image fields. The initializer also catches thrown errors and wraps
them in `InitializationError` with platform, URL and step details. A bare `.catch()`
is insufficient for the service's returned-error path.

## Ambient capabilities and known debt

[env.d.ts](../../../env.d.ts) references Vite client types. SVG-consuming SFCs such as
[App.vue](../../../core/App.vue) reference `vite-svg-loader` types.
[GalleryDownloadService.ts](../../../core/service/GalleryDownloadService.ts) locally
declares `__EHUNTER_VERSION__`, `GM_xmlhttpRequest`, and `GM_download`; Vite defines
the version constant from `package.json`. Runtime availability still needs checking.

Userscript APIs can exist in script scope without a `window`/`globalThis` copy.
Preserve `resolveGmApi`'s direct `typeof GM_*` checks and fallbacks when touching downloads.
A declaration or cast must not replace that capability detection.

Existing `any` dictionaries, injection casts, and `ComputedRef<any>` loader inputs are
migration debt. Use the known domain type and explicit guards for new boundaries;
keep improvements scoped rather than changing global compiler options to quiet errors.
Run the applicable [quality checks](./quality-guidelines.md) for code changes and report
actual results, including pre-existing failures, without claiming the repository has a
clean type-check baseline unless it was run.
