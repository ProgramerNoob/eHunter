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

// allowLocalFallback=false 时共享通道在 GM 不可用/降级时不退回当前 origin 的 localStorage，
// 用于明确重置且本站本地副本不可信时的布局读取，避免偷读本地旧布局。
// 默认与 importLegacyLocal 一致：禁止导入旧副本时也禁止降级读本站，保持既有调用语义。
function readRawPreference(allowLocalFallback: boolean = true): any {
    return PlatformService.storageGetShared(readerLayoutPreferenceKey, null, allowLocalFallback)
}

// 站点本地通道：只读当前 origin 的 localStorage，用于旧独立布局偏好补缺
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

// 槽位与尺寸按字段独立判定合法性：非法槽位不能挤掉合法本地槽位；
// 越界或非整数的尺寸等同缺失，交给本地旧值或默认值补缺（决策 2026-09-18 第 3 节）。
function pickLegalDockSlot(raw: any): string | null {
    return raw === 'left' || raw === 'right' || raw === 'bottom' ? raw : null
}

// 仅接受真正的 number 且为有限整数，并落在当前槽位范围内；
// 不再用 Number(raw) 强制转换：{toString:1} 会抛 TypeError 中断初始化，[300] 会被误当合法值。
function pickLegalThumbSize(slot: string, raw: any): number | null {
    if (typeof raw !== 'number' || !Number.isFinite(raw) || !Number.isInteger(raw)) {
        return null
    }
    return clampThumbSize(slot as any, raw) === raw ? raw : null
}

// schemaVersion 只接受有限数值或可解析的数值字符串，避免对损坏对象/数组调用 Number 抛错；
// 非法或缺失仍回落到当前 schema 版本，合法 schema 契约不变。
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
    // 共享尺寸合法时无需解析本地候选：损坏本地值（含 {toString:1}）不会进入类型转换，
    // 也不会用本地值覆盖已有合法共享值（决策 2026-09-18 第 3 节）。
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
    // 非法尺寸等同缺失：使用该槽位的默认值（bottom 200 / side 150），不落回钳制
    const legalSize = pickLegalThumbSize(slot, raw.thumbSizePx)
    const size = legalSize !== null ? legalSize : clampThumbSize(slot, Number.NaN)
    const updatedAt = typeof raw.updatedAt === 'string' ? raw.updatedAt : fallback.updatedAt
    const normalized: ReaderModeLayoutState = {
        thumbSlot: slot,
        thumbSizePx: size,
        updatedAt,
    }
    // resetId 是重置身份元数据：normalize/读写都必须原样保留，否则新写入的条目会被误判为旧副本
    if (typeof raw.resetId === 'string' && raw.resetId) {
        normalized.resetId = raw.resetId
    }
    return normalized
}

// 逐条过滤本站旧副本：只保留调用方认可的（与当前 reset 身份一致的）layout 条目，
// 其余等同缺失。既不污染共享合法值，也不让重置前的旧副本复活；旧副本仍留在存储里不删除。
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
    // 顶层 resetId 同样属于重置身份元数据：读写与 normalize 不得丢弃
    if (typeof rawData.resetId === 'string' && rawData.resetId) {
        sanitized.resetId = rawData.resetId
    }
    return sanitized
}

// importLegacyLocal=false：明确重置后不再把本地值当作补缺来源（共享通道降级读仍可能返回它）。
// allowLocalFallback：是否允许共享通道在本页降级后返回本站镜像；重置后由 app 侧传 false。
// acceptLocalLayout：逐条判定本站 layout 条目是否可信（重置后只认与当前 reset 身份一致的
// 条目，旧副本按缺失处理）；不给定时本站旧数据照常参与补缺。
// resetId：当前 reset 身份；给出时为本轮补缺并写回的 mode 条目打标，使后续读取能按身份匹配。
export function readLayoutPreference(
    importLegacyLocal: boolean = true,
    allowLocalFallback: boolean = importLegacyLocal,
    acceptLocalLayout: ((rawMode: any) => boolean) | null = null,
    resetId: string | null = null,
): ReaderModeLayoutPreference {
    const sharedObject = parseRawPreferenceObject(readRawPreference(allowLocalFallback))
    // 明确重置后不再整体导入旧副本；共享中的合法值仍照常读取
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
