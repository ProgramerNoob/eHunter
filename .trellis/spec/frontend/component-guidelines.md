# Component Guidelines

## Choose a local example

Use Vue SFCs with `<script setup lang="ts">` for reader components. Layout components
such as [DockWorkspace.vue](../../../core/components/layout/DockWorkspace.vue) and
[SplitHandle.vue](../../../core/components/layout/SplitHandle.vue), and dialogs such as
[ThumbExpandDialog.vue](../../../core/components/dialog/ThumbExpandDialog.vue), provide
small examples of typed props/events, computed views and lifecycle cleanup.

- Put reusable controls in `widget/`, docking behavior in `layout/`, and modal views
  in `dialog/` when that matches neighboring components.
- Keep platform DOM scraping and requests in the injected service. A component may
  query its own rendered DOM for geometry, as the thumbnail dialog does.
- Use `computed` for derived state and styles. Keep transient hover, dragging, menu
  anchors and element refs local; use [store actions](./state-management.md) for
  reader navigation, persistent settings and other shared changes.
- Compose page behavior through the existing [composables](./hook-guidelines.md)
  instead of growing another monolithic page component.

## Props and events

Use `defineProps<T>()`, with `withDefaults` for optional defaults. Emit user intent to
an owner instead of mutating a prop. `DockWorkspace.vue` demonstrates the current
pattern (excerpt):

```ts
const props = withDefaults(defineProps<{
    thumbSlot: DockSlotId
    thumbSizePx: number
    showThumb: boolean
    longPressMs?: number
}>(), {
    longPressMs: 500,
})

const emit = defineEmits<{
    (e: 'request-dock', slot: DockSlotId): void
    (e: 'request-resize', size: number): void
}>()
```

The parent decides how to apply those requests. `ThumbExpandDialog.vue` similarly
emits a typed `select-page` event. Preserve an existing component's public event
contract when extending it; there is no repository-wide requirement to convert
controls to `v-model`.

Older widgets use weaker contracts: [SimpleSwitch.vue](../../../core/components/widget/SimpleSwitch.vue)
accepts `active` and emits `change` with an untyped `defineEmits` array. This explains
existing callers, but typed payloads in the layout components are better examples
for new interfaces.

## Styling an injected reader

[AGENTS.md](../../../AGENTS.md) requires self-built UI controls, no third-party UI
library, and flex layouts with an explicit `flex-direction` by default.

- Component SCSS is usually scoped. Reuse colors and dimensions from
  [_variables.scss](../../../core/style/_variables.scss) and responsive helpers from
  [_responsive.scss](../../../core/style/_responsive.scss).
- [App.vue](../../../core/App.vue) imports global reader styles and applies broad rules
  beneath `.ehunter-app`, including flex on descendant `div`s. Account for this when
  introducing a grid or a control with another display mode; the thumbnail dialog
  explicitly uses a grid for its image tiles.
- Keep new selectors tied to the reader root or scoped component. The app is injected
  into another site's DOM, so unqualified global styles can alter the host page.
- Dialogs teleport into the reader: the thumbnail dialog targets `#ehunter-app`, while
  [MoreSettingsDialog.vue](../../../core/components/MoreSettingsDialog.vue) targets
  `.ehunter-app`. Check the target exists and inherited styles/z-index still work.
- Reuse the local SCSS approach. Less is still installed and present under `old/`, but is
  not the pattern to introduce into new reader components.
- Fixed-width cards and columns that hold variable text need `min-width: 0` and
  `overflow-wrap: anywhere` on the text element: one long unbroken token otherwise keeps
  its intrinsic width and pushes sibling controls out of the card (the close button in
  [StatusNotificationItem.vue](../../../core/components/status/StatusNotificationItem.vue)).
  A vertical stack of such cards needs a `max-height: calc(100vh - Npx)` with
  `overflow-y: auto` so a long list scrolls instead of running past the viewport
  ([StatusNotificationStack.vue](../../../core/components/status/StatusNotificationStack.vue)).

## Text, interaction and accessibility

Visible translated text comes from [core/store/i18n.ts](../../../core/store/i18n.ts)
and [core/assets/i18n.ts](../../../core/assets/i18n.ts). Extend the existing language
entries and bind reactive text through `i18n`, as the settings and thumbnail dialogs do.

Deleting a translation key is a two-step audit, because lookups are partly data-driven.
Grep the key name, then walk the indirection points that name keys from data:
`i18n[...]` in [MoreSettingsDialog.vue](../../../core/components/MoreSettingsDialog.vue:17)
and [TopBar.vue](../../../core/components/TopBar.vue:25), and the `i18nKey` / `labelI18nKey` /
`tipI18nKey` / `abbrI18nKey` / `dropKey` fields inside `settingFieldDefinitions`
([core/store/app.ts](../../../core/store/app.ts:354)), `settingConf` (`:1625`), `quickSettingOptions`
(`:228`) and `settingsCategories` (`:249`). A key with no literal hit is still live when a data
entry names it, so remove the data entry and the key together. Keys left behind by a removed
UI (for example the old second-row settings) usually have neither kind of consumer and are
safe to delete once both passes come back empty.

Use the native buttons and `aria-label` treatment in the newer dialogs and
[DockHandle.vue](../../../core/components/layout/DockHandle.vue) as examples. Verify
keyboard activation, visible focus and close behavior for changed controls. Existing
custom widgets do not establish complete accessibility coverage: `SimpleSwitch`
is a clickable `div`, and [SimpleDialog.vue](../../../core/components/widget/SimpleDialog.vue)
has special Enter handling rather than a complete modal focus-management pattern.
Do not copy those limitations into new UI.

After a UI change, exercise both reading modes where relevant and desktop/mobile
viewports, including pointer cancellation and reopening dialogs. Follow the
[quality guide](./quality-guidelines.md) for acceptance and screenshots.
