# State Management

## State ownership

The reader uses Vue primitives directly, without Pinia or Vuex.
[core/store/app.ts](../../../core/store/app.ts) exports a singleton `reactive` store,
computed selectors, settings definitions and `storeAction`. Avoid adding a second
state framework for a focused feature.

| State | Owner / examples |
| --- | --- |
| Menu anchor, pointer position, dragging, loading indicator | Component or composable refs |
| Current page, reading mode, image/thumbnail arrays, dialogs, download status | `store` in `app.ts` |
| Volume/page ranges and viewport dimensions derived from state | Exported computed selectors |
| Language and translated strings | [i18n.ts](../../../core/store/i18n.ts): `lang` ref and `i18n` computed |
| Platform parsing, source URL reuse, platform capabilities | Injected `AlbumService` instance |
| Settings/layout records | Store persistence helpers and [layoutPreference.ts](../../../core/store/layoutPreference.ts) |

Use `storeAction` for shared transitions rather than assigning fields from new UI code.
Actions can do more than assignment: `setCurViewIndex` applies book navigation rules,
and settings actions persist values. Derived display values belong in computed state.
Older direct assignments are not evidence that these side effects can be skipped.

## Service injection and initialization

[AlbumService.ts](../../../core/service/AlbumService.ts) exports the string key
`NameAlbumService = 'album_service'`. The entry creates one selected service and
provides it before asynchronous initialization:

```ts
const albumService = createPlatformService(detectionResult.platform!)
app.provide(NameAlbumService, albumService)
await initializeWithTimeout(albumService, detectionResult.platform!)
```

This excerpt is from [src/main.ts](../../../src/main.ts). It controls the initialization
order; children should not call `albumService.init()` again. `App.vue` injects that
service and calls the distinct store `init(albumService)` once. The store copies
service thumbnail/image records, sets album metadata and current page, applies
preferences, and starts reader listeners/timers. These are page-lifetime singletons,
not per-component setup effects.

Use capability methods (`isSupportOriginImg`, `isSupportImgChangeSource`,
`isSupportThumbView`) through the interface. The current injection uses a string and
casts, not an `InjectionKey<AlbumService>`; type casts alone do not guarantee a provider.
See [type safety](./type-safety.md) when changing this boundary.

## Optional update notices and EH mobile viewport lifecycle

### Scope / trigger

The optional remote notice must not turn a network outage into reader initialization
failure. EH mobile viewport handling isolates wide host content while the reader is open.

### Signatures

[core/store/event.ts](../../../core/store/event.ts) owns
`checkVersion(): void` and `fetchRemoteUpdateMessage(): Promise<UpdateMessage | null>`.
[src/main.ts](../../../src/main.ts) owns `ensureEHViewportForOpen(): void`
and `restoreEHViewportOnClose(): void`.

### Contracts

Version checks schedule once per page, after 5000 ms. Deduplicate identical configured
URLs, use one GET per unique URL through `PlatformService.fetch` (native credentials
`omit`), and bound fetch plus body reading to 15000 ms. Keep first-settled competition,
the existing language/version/time/duration gates, and remote-before-local notice order.
The deadline stops logical waiting; it does not promise cancellation of a GM request.

For EH mobile opening, snapshot the original viewport and inline root `overflow-x` /
`overflow-y` values **and priorities** once, then apply `hidden !important` to both axes.
Repeated open calls retain that snapshot. Ordinary close and initialization-error close
restore or remove only the managed properties and viewport; unrelated styles remain.
Desktop and non-EH paths do not acquire this root overflow state.

### Validation and error matrix

| Input or transition | Required result |
| --- | --- |
| Network, non-200 HTTP, body, JSON/shape failure or deadline | Warning with URL/reason; no remote dialog or success timestamp; local notice continues |
| Valid eligible remote message | Existing localized dialog/actions and timestamp behavior |
| Dialog or storage throws | Error remains observable outside the fetch/parse catch |
| Response arrives after deadline | No late dialog or timestamp write |
| Close, error close, or repeated open/close | Restore original viewport and both overflow values/priorities |

### Good/base/bad cases

Good: a valid eligible notice opens; base: no eligible message leaves reading and local
notes available; bad: a hung body reaches the same deadline as a hung fetch.

### Required tests

Run the assertions against the real notification and entry modules:
Run `npm run test:reader-lifecycle`:
[update-notice.test.cjs](../../../tests/update-notice.test.cjs) exercises native/GM
failure, success gates, timers, late results and real product exceptions;
[entry-viewport.test.cjs](../../../tests/entry-viewport.test.cjs) exercises ordinary/error
close, rapid repeated transitions, styles/priorities and non-EH/desktop isolation.
DOM fixtures prove lifecycle logic, not layout: also run the shared browser preflight
on Vite and real EH, desktop and mobile, through the update deadline and close/reopen.

### Wrong versus correct

Do not suppress global request errors or whitelist the update URL in preflight. Complete
the optional operation's bounded failure path locally and retain its diagnostic. Do not
set a viewport in the test or accept `clientWidth` instead of `innerWidth`; isolate host
overflow in the product lifecycle, then independently assert the fixed CSS viewport.

## Adding or changing a setting

Trace the entire path in `app.ts` and
[settingFieldRuntime.ts](../../../core/store/settingFieldRuntime.ts):

1. Define the field, options/range and category in the existing settings metadata.
2. Add its runtime state, action and field getter/setter routing.
3. Include it in persistence serialization and input normalization if it must survive
   a reload; update quick-setting selection/order rules only when relevant.
4. Update translations and the feature contract, then check the settings dialog and
   any quick control use the same value and bounds.

A UI control alone does not create a persisted setting. `readingMode` is pinned in
quick settings; unknown field IDs and invalid stored values are filtered during
normalization. Retain those rules when extending settings.

The runtime routing table and the settings definitions must stay in sync. Before deleting a store
field, check [settingFieldRuntime.ts](../../../core/store/settingFieldRuntime.ts) as well as
`settingFieldDefinitions` ([core/store/app.ts](../../../core/store/app.ts:354)): a route that outlives its
definition is a dead branch, while a field kept only for that route still participates in
persistence and normalization. Delete both sides together, or keep the field and document why.
As of 2026-10-03 the two tables are isomorphic — 21 field ids each, with an empty difference in
both directions — so a new asymmetry on either side is a defect.

## Persistence, migration and reset

The governing contract is the
[reader behavior decision](./decisions/2026-09-18-reader-behavior.md).
[PlatformService.js](../../../src/platform/base/service/PlatformService.js) owns the
browser storage boundary:

- `storageGetShared` / `storageSetShared` use synchronous userscript GM storage when
  available. Normal access degrades to current-origin `localStorage` after a GM failure
  for that page lifetime; origin-local fallback is not cross-site synchronization.
- `storageGetLocal` is deliberately site-local. Shared read/write helpers have special
  fallback/required-shared options for reset correctness; do not bypass them with
  direct local storage access or substitute the older generic methods.
- Legal shared values win. Missing or invalid fields are filled from eligible current-
  site legacy records, then defaults. Same-site unified settings take precedence over
  old independent records. Retain local old data for fallback; migration is repeatable.
- The active records include unified settings (schema 3), page-turn animation (schema 1),
  and per-mode layout preferences. [layout.ts](../../../core/model/layout.ts) defines the
  layout key/schema. Do not merge scroll and book layouts into a single preference.
- Invalid/out-of-range stored numbers count as missing for migration, rather than
  being clamped into a value that prevents a valid fallback from filling the field.
- Explicit reset clears only eHunter-owned prefixes (`ehunter:` and `AlbumCache`),
  writes a blocked-import marker with a reset identity, records local observation,
  and reloads only after required clearing/marker writes succeed. Preserve `resetId`
  metadata during normalization and writes so stale local copies cannot return.

Page-turn defaults are computed only without a legal migrated preference: reduced
motion selects no animation, otherwise mobile uses slide and desktop realistic.
Magnifier size/zoom persist; its enabled state is page-session state. Read the decision
before changing either lifetime; saving another setting must not recompute animation.

## Album data is not preference storage

Current [EH](../../../src/platform/eh/service/AlbumServiceImpl.ts) and
[NH](../../../src/platform/nh/service/AlbumServiceImpl.ts) services retain parsed records
and resolved image URLs in memory. EH reuses an available source for `Default` and
`Fast`; `Origin` and `ChangeSource` re-fetch. NH reuses an available source and does
not implement EH's origin/change-source capabilities.

The historical persistent album cache (`src/platform/eh/service/AlbumCacheService.ts`,
with its cache versioning and Normal/Large thumbnail behavior) and its consumer
`AlbumServiceImpl.old.ts` were deleted on 2026-10-03; the selected EH implementation
never used them. Factory reset's removal of old album keys (`AlbumCache` /
`AlbumCacheVersion`) does not imply the current adapters write them. Follow
[quality guidance](./quality-guidelines.md) for storage/cache acceptance.
