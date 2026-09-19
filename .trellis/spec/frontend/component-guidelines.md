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
- Reuse the local SCSS approach; Less exists in historical code and is still installed,
  but is not the pattern to introduce into new reader components.

## Text, interaction and accessibility

Visible translated text comes from [core/store/i18n.ts](../../../core/store/i18n.ts)
and [core/assets/i18n.ts](../../../core/assets/i18n.ts). Extend the existing language
entries and bind reactive text through `i18n`, as the settings and thumbnail dialogs do.

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
