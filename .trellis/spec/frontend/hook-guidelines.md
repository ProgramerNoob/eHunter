# Composable Guidelines

## Existing boundary

Here, “hooks” means Vue composables. The current `use*` modules live in
[core/components/composables/](../../../core/components/composables) and are composed by
[PageView.vue](../../../core/components/PageView.vue):

| Composable | Owns | Inputs that remain external |
| --- | --- | --- |
| [usePageMenu](../../../core/components/composables/usePageMenu.ts) | Open state, anchor geometry, document click/menu coordination | Element ref, owner ID, optional click filter |
| [useMagnifier](../../../core/components/composables/useMagnifier.ts) | Lens geometry, source warming, visibility, DOM observers | Element refs, computed image/settings, session synchronization callback |
| [usePageImageLoader](../../../core/components/composables/usePageImageLoader.ts) | Load status, retry sequence, error text | Album service, page identity/info, magnifier warming callback |
| [useTouchLongPress](../../../core/components/composables/useTouchLongPress.ts) | Touch movement tracking and timer | Timing/tolerance constants, current eligibility callback, activation callback |

Use a named options interface and return an object of refs/computed values and named
handlers. Keep pure domain calculations outside Vue when they have no reactive or
DOM dependency; [imageRetryPolicy.ts](../../../core/service/imageRetryPolicy.ts) and
[bookSpread.ts](../../../core/model/bookSpread.ts) are existing examples.

## Preserve reactive inputs

Pass refs or computed refs for values that must update after setup. `useMagnifier`
accepts `ComputedRef<string>` for its image source and computed numeric settings;
`PageView.vue` passes `computed(() => imgPageInfo.value?.src || '')`.
Use getter callbacks for a current decision, as `useTouchLongPress.shouldHandle` does.

Destructuring an options object preserves a supplied ref, but a supplied primitive is
only a setup-time value. In particular, `usePageImageLoader` currently captures a
numeric `index`. Before reusing it for a component whose identity can change, inspect
the caller's key/index lifetime; do not assume the composable reacts to index changes.
Its `ComputedRef<any>` page-info type is existing type debt, not a model for new APIs.

Templates unwrap returned refs; TypeScript handlers use `.value`. Watch explicit
sources (`watch(imgSrc, ...)`, `watch(() => props.active, ...)`) and use `nextTick`
when the handler needs newly rendered elements or geometry.

## Service calls and errors

The page component injects `AlbumService` and passes it to the loader. Do not construct
EH/NH services inside composables or add site parsing to an interaction helper.
The current loader handles the service's error-as-value contract explicitly:

```ts
const resp = await albumService.getImgSrc(index, mode)
if (resp instanceof Error) {
    if (mode === ImgSrcMode.Default) {
        autoRetryQueue.value = buildRetryQueueAfterFailure(mode)
        await runAutoRetryQueue()
    }
    return
}
if (imgPageInfo.value.src !== resp.src) {
    storeAction.setImgPageInfoSrc(index, resp.src)
}
```

This excerpt is from `usePageImageLoader.loadImgSrc`; the following success-path code
also updates precise image geometry.
Preserve `Default`/`Fast`/`Origin`/`ChangeSource` distinctions and check platform
capabilities before offering actions. Loading status belongs to the loader; shared
image data is updated through store actions.

## Own and release side effects

- Register component-scoped document/window listeners on mount and remove the same
  handler and capture setting on unmount. `usePageMenu` removes its capture-phase
  click listener with `true`, matching registration.
- `useMagnifier` clears its delayed indicator timer, removes resize/scroll/custom-event
  listeners, and disconnects its `ResizeObserver` in `onBeforeUnmount`.
- `useTouchLongPress` clears its timer on movement past tolerance, end, cancellation,
  and unmount. Cover cancellation as well as the normal completion path.
- Global coordination events are namespaced: `ehunter:page-menu-open` and
  `ehunter:magnifier-toggle`. Preserve their owner/session semantics; they do not
  replace persistent state.

Do not treat those cleanup examples as a guarantee that all asynchronous work in the
repository is cancellable. When adding delayed work, decide how it behaves if the page
source changes or the component unmounts. Verify with repeated open/close, mode changes,
and touch cancellation using the [quality guide](./quality-guidelines.md).
