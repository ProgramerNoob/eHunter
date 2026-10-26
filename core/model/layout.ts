export type ReaderModeLayoutKey = 'scroll' | 'book'
export type DockSlotId = 'left' | 'right' | 'bottom'
export type LayoutBlockId = 'thumb' | 'main'

export interface LayoutBlockSizeRange {
    minSizePx: number
    maxSizePx: number
}

export interface LayoutBlockRegistration {
    blockId: LayoutBlockId
    titleI18nKey: string
    dockable: boolean
    resizable: boolean
    allowedSlots: DockSlotId[]
    sizeRange: LayoutBlockSizeRange
    slotSizeRanges?: Partial<Record<DockSlotId, LayoutBlockSizeRange>>
    touchLongPressMs: number
}

export interface ReaderModeLayoutState {
    thumbSlot: DockSlotId
    thumbSizePx: number
    updatedAt: string
    resetId?: string
}

export interface ReaderModeLayoutPreference {
    schemaVersion: number
    updatedAt: string
    layouts: Record<ReaderModeLayoutKey, ReaderModeLayoutState>
    resetId?: string
}

export const readerLayoutPreferenceKey = 'ehunter:reader:prefs:mode-layout'
export const readerLayoutPreferenceSchemaVersion = 1

export const thumbBoundaryId = 'thumb-main-boundary'
export const sideMinSizePx = 60
export const sideMaxSizePx = 520
export const bottomMinSizePx = 60
export const bottomMaxSizePx = 420
export const touchLongPressMs = 500
export const baseThumbItemWidth = 150
export const baseThumbItemHeight = 160
export const thumbSpriteWidth = 100
export const thumbSpriteHeight = 144
export const minThumbScale = 0.35
export const bottomCompactRatio = 0.78
export const thumbVerticalItemGap = 10
export const thumbVerticalItemPaddingX = 10
export const thumbBottomItemPaddingY = 10
export const thumbBottomItemPaddingX = 2

export const thumbExpandWideBreakpoint = 1600
export const thumbExpandItemWidthWide = 150
export const thumbExpandItemWidthNormal = 120
export const thumbExpandItemPadding = 8

const now = () => new Date().toISOString()

const mainSizeFloorRatio = 0.6

export const layoutBlockRegistry: LayoutBlockRegistration[] = [
    {
        blockId: 'thumb',
        titleI18nKey: 'thumbView',
        dockable: true,
        resizable: true,
        allowedSlots: ['left', 'right', 'bottom'],
        sizeRange: { minSizePx: sideMinSizePx, maxSizePx: sideMaxSizePx },
        slotSizeRanges: {
            bottom: { minSizePx: bottomMinSizePx, maxSizePx: bottomMaxSizePx },
        },
        touchLongPressMs,
    },
    {
        blockId: 'main',
        titleI18nKey: 'readingMode',
        dockable: false,
        resizable: true,
        allowedSlots: [],
        sizeRange: { minSizePx: 320, maxSizePx: 2400 },
        touchLongPressMs,
    },
]

export function getLayoutBlock(blockId: LayoutBlockId): LayoutBlockRegistration | undefined {
    return layoutBlockRegistry.find(block => block.blockId === blockId)
}

export function getBlockSizeRange(blockId: LayoutBlockId, slot?: DockSlotId): LayoutBlockSizeRange {
    const block = getLayoutBlock(blockId)
    if (!block) {
        return { minSizePx: 0, maxSizePx: 0 }
    }
    const slotRange = slot ? block.slotSizeRanges?.[slot] : undefined
    return slotRange ? slotRange : block.sizeRange
}

export function getDockAllowedSlots(): DockSlotId[] {
    const thumb = getLayoutBlock('thumb')
    return thumb ? [...thumb.allowedSlots] : []
}

export function getDockLongPressMs(): number {
    const thumb = getLayoutBlock('thumb')
    return thumb ? thumb.touchLongPressMs : touchLongPressMs
}

export function computeMainMinSizePx(viewportPx: number): number {
    const main = getLayoutBlock('main')
    const minSize = main ? main.sizeRange.minSizePx : 0
    return Math.min(minSize, Math.round(Math.max(0, viewportPx) * mainSizeFloorRatio))
}

export function getThumbSizeRange(slot: DockSlotId, viewportPx?: number): { min: number; max: number } {
    const base = getBlockSizeRange('thumb', slot)
    const min = base.minSizePx
    const baseMax = base.maxSizePx
    if (viewportPx === undefined || viewportPx <= 0) {
        return { min, max: baseMax }
    }
    const ceiling = Math.min(baseMax, viewportPx - computeMainMinSizePx(viewportPx))
    if (ceiling < min) {
        const floor = Math.max(0, ceiling)
        return { min: floor, max: floor }
    }
    return { min, max: ceiling }
}

export function clampThumbSize(slot: DockSlotId, size: number, viewportPx?: number): number {
    if (!Number.isFinite(size)) {
        return slot === 'bottom' ? 200 : 150
    }
    const range = getThumbSizeRange(slot, viewportPx)
    return Math.min(range.max, Math.max(range.min, Math.round(size)))
}

export function normalizeDockSlot(slot: any): DockSlotId {
    if (slot === 'left' || slot === 'right' || slot === 'bottom') {
        return slot
    }
    return 'left'
}

export function computeThumbContainerScale(slot: DockSlotId, thumbItemWidth: number, thumbItemHeight: number): number {
    if (slot === 'bottom') {
        return Math.max(minThumbScale, thumbItemHeight / baseThumbItemHeight)
    }
    return Math.max(minThumbScale, thumbItemWidth / baseThumbItemWidth)
}

export function computeThumbStageBaseWidth(slot: DockSlotId): number {
    if (slot === 'bottom') {
        return Math.round(baseThumbItemWidth * bottomCompactRatio)
    }
    return baseThumbItemWidth
}

export function computeSideHeaderFontSizePx(thumbItemWidth: number): number {
    const size = Math.floor(thumbItemWidth * 0.12)
    return Math.max(10, Math.min(18, size))
}

export function computeSideHeaderLetterSpacingEm(thumbItemWidth: number): number {
    const spacing = thumbItemWidth * 0.0009
    return Math.max(0.02, Math.min(0.08, spacing))
}

export function computeBottomHeaderFontSizePx(thumbViewHeight: number): number {
    const size = Math.floor(thumbViewHeight * 0.065)
    return Math.max(8, Math.min(13, size))
}

export function computeBottomHeaderLetterSpacingEm(thumbViewHeight: number): number {
    const spacing = thumbViewHeight * 0.0018
    return Math.max(0.02, Math.min(0.2, spacing))
}

export function createDefaultModeLayout(mode: ReaderModeLayoutKey): ReaderModeLayoutState {
    return {
        thumbSlot: 'left',
        thumbSizePx: clampThumbSize('left', 150),
        updatedAt: now(),
    }
}

export function createDefaultLayoutPreference(): ReaderModeLayoutPreference {
    return {
        schemaVersion: readerLayoutPreferenceSchemaVersion,
        updatedAt: now(),
        layouts: {
            scroll: createDefaultModeLayout('scroll'),
            book: createDefaultModeLayout('book'),
        },
    }
}

