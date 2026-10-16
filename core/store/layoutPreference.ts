import PlatformService from '../../src/platform/base/service/PlatformService.js'
import {
    clampThumbSize,
    createDefaultLayoutPreference,
    createDefaultModeLayout,
    normalizeDockSlot,
    readerLayoutPreferenceKey,
    readerLayoutPreferenceSchemaVersion,
    type ReaderModeLayoutKey,
    type ReaderModeLayoutPreference,
    type ReaderModeLayoutState,
} from '../model/layout'

const layoutModeKeys: ReaderModeLayoutKey[] = ['scroll', 'book']

function readRawPreference(allowLocalFallback: boolean = true): any {
    return PlatformService.storageGetShared(readerLayoutPreferenceKey, null, allowLocalFallback)
}

function readSiteLocalRawPreference(): any {
    return PlatformService.storageGetLocal(readerLayoutPreferenceKey, null)
}

function writeRawPreference(data: ReaderModeLayoutPreference): void {
    PlatformService.storageSetShared(readerLayoutPreferenceKey, data)
}

function parseRawPreferenceObject(rawData: any): Record<string, any> | null {
    if (!rawData) {
        return null
    }
    let value = rawData
    if (typeof value === 'string') {
        try {
            value = JSON.parse(value)
        } catch (e) {
            return null
        }
    }
    return value && typeof value === 'object' ? value : null
}

function pickLegalDockSlot(raw: any): string | null {
    return raw === 'left' || raw === 'right' || raw === 'bottom' ? raw : null
}

function pickLegalThumbSize(slot: string, raw: any): number | null {
    if (typeof raw !== 'number' || !Number.isFinite(raw) || !Number.isInteger(raw)) {
        return null
    }
    return clampThumbSize(slot as any, raw) === raw ? raw : null
}

function pickLegalSchemaVersion(raw: any): number | null {
    if (typeof raw === 'number') {
        return Number.isFinite(raw) ? raw : null
    }
    if (typeof raw === 'string' && raw.trim() !== '') {
        const parsed = Number(raw)
        return Number.isFinite(parsed) ? parsed : null
    }
    return null
}

interface MergedModeLayout {
    slot: string
    size: number | null
    importedSlot: boolean
    importedSize: boolean
}

function mergeModeLayout(sharedMode: any, legacyMode: any): MergedModeLayout {
    const sharedObject = sharedMode && typeof sharedMode === 'object' ? sharedMode : null
    const legacyObject = legacyMode && typeof legacyMode === 'object' ? legacyMode : null
    const sharedSlot = pickLegalDockSlot(sharedObject ? sharedObject.thumbSlot : null)
    const legacySlot = pickLegalDockSlot(legacyObject ? legacyObject.thumbSlot : null)
    const slot = sharedSlot || legacySlot || 'left'
    const sharedSize = sharedObject ? pickLegalThumbSize(slot, sharedObject.thumbSizePx) : null
    const legacySize = sharedSize === null && legacyObject ? pickLegalThumbSize(slot, legacyObject.thumbSizePx) : null
    return {
        slot,
        size: sharedSize !== null ? sharedSize : legacySize,
        importedSlot: !sharedSlot && !!legacySlot,
        importedSize: sharedSize === null && legacySize !== null,
    }
}

function normalizeModeLayout(mode: ReaderModeLayoutKey, raw: any): ReaderModeLayoutState {
    const fallback = createDefaultModeLayout(mode)
    if (!raw || typeof raw !== 'object') {
        return fallback
    }
    const slot = normalizeDockSlot(raw.thumbSlot)
    const legalSize = pickLegalThumbSize(slot, raw.thumbSizePx)
    const size = legalSize !== null ? legalSize : clampThumbSize(slot, Number.NaN)
    const updatedAt = typeof raw.updatedAt === 'string' ? raw.updatedAt : fallback.updatedAt
    const normalized: ReaderModeLayoutState = {
        thumbSlot: slot,
        thumbSizePx: size,
        updatedAt,
    }
    if (typeof raw.resetId === 'string' && raw.resetId) {
        normalized.resetId = raw.resetId
    }
    return normalized
}

function filterLocalLayoutByAcceptance(localObject: Record<string, any> | null, acceptLocalLayout: (rawMode: any) => boolean): Record<string, any> | null {
    const rawLayouts = localObject && localObject.layouts && typeof localObject.layouts === 'object' ? localObject.layouts : null
    if (!rawLayouts) {
        return null
    }
    const layouts: Record<string, any> = {}
    for (const mode of layoutModeKeys) {
        const modeObject = rawLayouts[mode]
        if (modeObject && typeof modeObject === 'object' && acceptLocalLayout(modeObject)) {
            layouts[mode] = modeObject
        }
    }
    return Object.keys(layouts).length > 0 ? { ...localObject, layouts } : null
}

export function sanitizeLayoutPreference(rawData: any): ReaderModeLayoutPreference {
    const defaults = createDefaultLayoutPreference()
    if (!rawData) {
        return defaults
    }
    if (typeof rawData === 'string') {
        try {
            rawData = JSON.parse(rawData)
        } catch (e) {
            return defaults
        }
    }
    if (typeof rawData !== 'object') {
        return defaults
    }
    const layouts = rawData.layouts && typeof rawData.layouts === 'object' ? rawData.layouts : {}
    const sanitized: ReaderModeLayoutPreference = {
        schemaVersion: pickLegalSchemaVersion(rawData.schemaVersion) || readerLayoutPreferenceSchemaVersion,
        updatedAt: typeof rawData.updatedAt === 'string' ? rawData.updatedAt : new Date().toISOString(),
        layouts: {
            scroll: normalizeModeLayout('scroll', layouts.scroll),
            book: normalizeModeLayout('book', layouts.book),
        },
    }
    if (typeof rawData.resetId === 'string' && rawData.resetId) {
        sanitized.resetId = rawData.resetId
    }
    return sanitized
}

export function readLayoutPreference(
    importLegacyLocal: boolean = true,
    allowLocalFallback: boolean = importLegacyLocal,
    acceptLocalLayout: ((rawMode: any) => boolean) | null = null,
    resetId: string | null = null,
): ReaderModeLayoutPreference {
    const sharedObject = parseRawPreferenceObject(readRawPreference(allowLocalFallback))
    const rawLegacyObject = importLegacyLocal ? parseRawPreferenceObject(readSiteLocalRawPreference()) : null
    const legacyObject = acceptLocalLayout
        ? filterLocalLayoutByAcceptance(rawLegacyObject, acceptLocalLayout)
        : rawLegacyObject
    const sharedLayouts = sharedObject && sharedObject.layouts && typeof sharedObject.layouts === 'object' ? sharedObject.layouts : {}
    const legacyLayouts = legacyObject && legacyObject.layouts && typeof legacyObject.layouts === 'object' ? legacyObject.layouts : {}
    let imported = false
    const nextLayouts: Record<string, any> = {}
    for (const mode of layoutModeKeys) {
        const merged = mergeModeLayout(sharedLayouts[mode], legacyLayouts[mode])
        if (!merged.importedSlot && !merged.importedSize) {
            if (sharedLayouts[mode] !== undefined) {
                nextLayouts[mode] = sharedLayouts[mode]
            }
            continue
        }
        const nextMode: Record<string, any> = sharedLayouts[mode] && typeof sharedLayouts[mode] === 'object' ? { ...sharedLayouts[mode] } : {}
        nextMode.thumbSlot = merged.slot
        if (merged.size !== null) {
            nextMode.thumbSizePx = merged.size
        } else {
            delete nextMode.thumbSizePx
        }
        nextMode.updatedAt = new Date().toISOString()
        if (resetId) {
            nextMode.resetId = resetId
        }
        nextLayouts[mode] = nextMode
        imported = true
    }
    if (!imported) {
        return sanitizeLayoutPreference(sharedObject)
    }
    const preference = {
        schemaVersion: pickLegalSchemaVersion(sharedObject && sharedObject.schemaVersion) || readerLayoutPreferenceSchemaVersion,
        updatedAt: new Date().toISOString(),
        layouts: nextLayouts,
    } as ReaderModeLayoutPreference
    writeRawPreference(preference)
    return sanitizeLayoutPreference(preference)
}

export function writeLayoutPreference(data: ReaderModeLayoutPreference): ReaderModeLayoutPreference {
    const sanitized = sanitizeLayoutPreference(data)
    writeRawPreference(sanitized)
    return sanitized
}

export function resetLayoutPreference(): ReaderModeLayoutPreference {
    const defaults = createDefaultLayoutPreference()
    writeRawPreference(defaults)
    return defaults
}
