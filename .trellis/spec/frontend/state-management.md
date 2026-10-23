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
The two tables are isomorphic — 21 field ids each, with an empty difference in
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

### Reset identity

- The shared marker must be written through the real shared channel; a successful
  site-local degraded write does not satisfy the reset contract.
- Stored records: `ehunter:reader:prefs:page-turn-animation` (schema 1),
  `ehunter:reader:prefs:unified-settings` (schema 3, `settings` / `quickSelection` /
  `quickOrder` / optional `shortcuts`), `ehunter:reader:prefs:legacy-migration`
  (schema 1, `legacyImport` is `done` or `blocked`), and—site-local only—
  `ehunter:reader:prefs:reset-observation` (schema 1, `resetId` + `observedAt`).
  `resetId` is an optional field on the shared records; `migratedAt` and `observedAt`
  are ISO 8601 strings.
- The current reset identity comes from the shared marker: its `resetId` when present,
  otherwise `migratedAt`, otherwise the literal `blocked-without-timestamp`. A marker
  without a timestamp must not be treated as an arbitrary new reset. Each reset mints a
  fresh identity (`crypto.randomUUID()`, falling back to timestamp + counter + random)
  so two resets in the same millisecond stay distinct.
- Observation is written to site-local storage so a later session can tell that this page
  saw the reset even when the shared channel is unreadable. When the shared marker cannot
  be read, the identity from an existing local observation is reused; wall-clock values are
  never compared. If marker and observation disagree, the shared marker wins and the
  observation is synced toward it. An observation write failure counts as no record rather
  than a persistence claim.
- The blocked-import state latches once a healthy shared channel yields `blocked`, so the
  status survives a GM write failure that degrades the normal channel to site-local
  storage, and cleared preferences cannot reappear.
- After a confirmed reset, reads consult the real shared channel first, where an
  unparseable record counts as fully missing. Where the shared value is missing or an
  individual entry is invalid, only local copies whose `resetId` equals the current reset
  identity may fill gaps. Pre-reset copies lack that identifier, so a clock rollback cannot
  revive them; they stay in storage, are treated as missing, and are not deleted or
  overwritten.
- Every source is normalized against its own stored schema before records are merged,
  otherwise old-schema literals re-parse as current-schema values. Merging upgrades only
  old default-bound literals: an explicit empty string is a legal preference and must not
  be restored to its default.
- Invalid values for a mode or setting count as missing rather than being silently
  clamped, so the fill chain (`shared → same-site unified legacy → site-local legacy →
  default`) continues. This applies to the shortcut map and to quick-selection /
  quick-order entries; unknown quick-setting IDs are filtered out, and a fully filtered
  list returns null so the caller's fallback chain keeps going.

Page-turn defaults are computed only without a legal migrated preference: reduced
motion selects no animation, otherwise mobile uses slide and desktop realistic.
Magnifier size/zoom persist; its enabled state is page-session state. Saving another
setting must not recompute animation. The governing rules stay with the
[reader behavior decision](./decisions/2026-09-18-reader-behavior.md).

### Layout preferences

Scroll and book layouts are recorded separately under
[layout.ts](../../../core/model/layout.ts), whose key and schema define the slots. The
normalization and read path in
[layoutPreference.ts](../../../core/store/layoutPreference.ts) keeps these rules:

- Slots and sizes are validated independently: an illegal slot cannot displace a legal
  local slot. Only a real finite integer inside the slot range is legal; `Number(raw)`
  coercion is not used, because `{toString: 1}` throws and `[300]` would pass as legal.
- Sizes out of range or non-integer count as missing, so the local legacy value or the
  slot default applies (bottom 200, side 150). They are not clamped.
- A legal shared size means the local candidate is not parsed, so a corrupt local value
  cannot overwrite it.
- `resetId` is reset-identity metadata on both the record and its entries: normalization,
  reads and writes must preserve it, otherwise a fresh entry is mistaken for a stale copy.
  After a confirmed reset, per-entry filtering accepts only layout entries matching the
  current reset identity; the rest count as missing and are left in storage undeleted.
- `importLegacyLocal=false` stops treating local values as a fill source after a confirmed
  reset, while a degraded shared read may still return them. `allowLocalFallback` decides
  whether a degraded shared channel may return the site mirror; the store passes `false`
  after a reset. `acceptLocalLayout` decides per entry whether site-local layout counts as
  trustworthy; when omitted, local data fills gaps as usual. Passing `resetId` stamps the
  mode entries written during that pass so later reads can match them by identity.

## Platform request, gesture and viewport contracts

- `initializeWithTimeout` in [initializer.ts](../../../src/platform/initializer.ts) races
  `albumService.init()` against `TIMEOUT_MS = 60000`, and the timeout message interpolates
  the same value. A resolved `Error` or any thrown value becomes an `InitializationError`
  carrying platform, URL, timestamp and step progress.
- The base request layer ([TextReq.ts](../../../src/platform/base/request/TextReq.ts),
  [ReqQueue.ts](../../../src/platform/base/request/ReqQueue.ts),
  [MultiAsyncReq.ts](../../../src/platform/base/request/MultiAsyncReq.ts)) bounds request
  concurrency and retries with an increasing interval; changes here affect both EH and NH.
- [useMagnifier.ts](../../../core/components/composables/useMagnifier.ts) computes the lens
  side as `sample size × zoom` and clamps the lens position to the intersection of the
  page view and the browser viewport, keeping the lens fully visible; window and sampling
  box shrink together so the ratio holds.
- [runtimeEnv.ts](../../../core/utils/runtimeEnv.ts) treats a coarse pointer or a common
  mobile user agent as mobile; EH mobile viewport handling and page-turn defaults share
  that predicate.
- The NH parsers rewrite only a bare `src=` attribute (whitespace-preceded) to `x-src=`,
  which keeps the browser from loading assets while leaving `data-src` untouched. Reads
  then take `data-src` first and `x-src` second, so current pages (native `src` only) and
  legacy pages (`data-src`, optionally next to a placeholder `src`) both resolve.
- The EH intro parser drops repeated intro-page requests by validating the parsed index,
  because the intro page count can overestimate the pages that carry thumbnails.
- The page-menu long press opens the menu during the hold and consumes the synthetic click
  emitted on release; the guard must then expire by itself, or the next click in another
  region (for example the top bar) is swallowed.

## Album data is not preference storage

Current [EH](../../../src/platform/eh/service/AlbumServiceImpl.ts) and
[NH](../../../src/platform/nh/service/AlbumServiceImpl.ts) services retain parsed records
and resolved image URLs in memory. EH reuses an available source for `Default` and
`Fast`; `Origin` and `ChangeSource` re-fetch. NH reuses an available source and does
not implement EH's origin/change-source capabilities.

The current EH implementation keeps resolved image URLs in memory and has no persistent
album cache layer. Factory reset's removal of old album keys (`AlbumCache` /
`AlbumCacheVersion`) does not imply the current adapters write them. Follow
[quality guidance](./quality-guidelines.md) for storage/cache acceptance.
