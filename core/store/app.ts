import { computed, reactive, watch } from 'vue'
import { i18n, lang } from './i18n'
import type { AlbumService } from '../service/AlbumService'
import { NameAlbumService } from '../service/AlbumService'
import type { ImgPageInfo, ThumbInfo } from 'core/model/model'
import { initViewportSizeUpdater, initKeyboardListener, resetAutoFlipTimer, checkInstructions, openWelcomeInstructionDialog, checkVersion } from './event'
import PlatformService from '../../src/platform/base/service/PlatformService.js'
import {
    clampThumbSize,
    createDefaultLayoutPreference,
    normalizeDockSlot,
    type DockSlotId,
    type ReaderModeLayoutKey,
} from '../model/layout'
import { getAdjacentBookPageIndex } from '../model/bookSpread'
import {
    clampThumbExpandSegmentIndex,
    getThumbExpandSegmentByPage,
} from '../model/thumbExpand'
import { readLayoutPreference, writeLayoutPreference } from './layoutPreference'
import { isMobileLikeDevice } from '../utils/runtimeEnv'
import { GalleryDownloadService } from '../service/GalleryDownloadService'
import type { DownloadStatusEvent, DownloadTaskPhase, DownloadSeverity } from '../service/GalleryDownloadService'

type PageTurnAnimationMode = 'realistic' | 'slide' | 'none'

type ModeScope = 'both' | 'scroll-only' | 'book-only'
type SettingsPanelCategory = 'general' | 'scroll' | 'book'
type SettingControlType = 'drop' | 'num' | 'switch'

export type ShortcutActionId =
    | 'goPrev'
    | 'goNext'
    | 'toggleMoreSettings'
    | 'toggleTopBar'
    | 'toggleThumbView'
    | 'toggleQuickPreview'
    | 'increaseWidthScale'
    | 'decreaseWidthScale'
    | 'togglePagination'
    | 'toggleAutoFlip'
    | 'toggleOddEven'

export type ShortcutBindingMap = Record<ShortcutActionId, string>

export interface ShortcutActionDefinition {
    id: ShortcutActionId
    labelI18nKey: string
    tipI18nKey?: string
}

export interface DownloadStatusNotification {
    notificationId: string
    taskId: string
    title: string
    phase: DownloadTaskPhase
    severity: DownloadSeverity
    message: string
    progressCurrent?: number
    progressTotal?: number
    actions?: DownloadStatusAction[]
    createdAt: string
    updatedAt: string
}

export interface DownloadStatusAction {
    id: string
    label: string
    variant?: 'plain' | 'danger'
    onClick?: (notification: DownloadStatusNotification) => void
}

export interface DownloadTaskRecord {
    taskId: string
    albumTitle: string
    totalPages: number
    processedPages: number
    failedPages: number
    status: DownloadTaskPhase
    actions: DownloadStatusAction[]
    createdAt: string
    updatedAt: string
}

export interface InstructionDialogPayload {
    title: string
    mdText: string
    isCompulsive?: boolean
    operations?: InstructionDialogOperation[]
}

export interface InstructionDialogEntry extends InstructionDialogPayload {
    id: string
}

export interface InstructionDialogOperation {
    name: string
    btnType: string
    isCloseModal: boolean
    onClick?: () => void
}

function cloneInstructionDialogPayload(payload: InstructionDialogPayload): InstructionDialogPayload {
    return {
        title: payload.title,
        mdText: payload.mdText,
        isCompulsive: payload.isCompulsive,
        operations: payload.operations ? [...payload.operations] : [],
    }
}

let instructionDialogSeq = 0
function createInstructionDialogEntry(payload: InstructionDialogPayload): InstructionDialogEntry {
    instructionDialogSeq += 1
    const cloned = cloneInstructionDialogPayload(payload)
    return {
        ...cloned,
        id: `dialog-${Date.now()}-${instructionDialogSeq}`,
    }
}

function syncInstructionDialogState() {
    const dialogs = store.instructionDialogStack
    const topDialog = dialogs.length > 0 ? dialogs[dialogs.length - 1] : null
    if (!topDialog) {
        store.showInstructionDialog = false
        store.instructionDialogTitle = ''
        store.instructionDialogMdText = ''
        store.instructionDialogCompulsive = false
        store.instructionDialogOperations = []
        return
    }
    store.showInstructionDialog = true
    store.instructionDialogTitle = topDialog.title
    store.instructionDialogMdText = topDialog.mdText
    store.instructionDialogCompulsive = topDialog.isCompulsive !== false
    store.instructionDialogOperations = topDialog.operations ? [...topDialog.operations] : []
}

export interface QuickSettingOption {
    id: string
    i18nKey: string
    modeScope: ModeScope
    fixed?: boolean
}

export interface SettingsCategory {
    id: 'general' | 'scroll' | 'book' | 'quick' | 'shortcuts' | 'other'
    i18nKey: string
}

export interface SettingFieldDefinition {
    id: string
    control: SettingControlType
    labelI18nKey: string
    tipI18nKey?: string
    modeScope: ModeScope
    showInTopBar: boolean
    showInDialog: boolean
    dialogCategory?: SettingsPanelCategory
    dropKey?: 'readingModeList' | 'bookDirection' | 'pageTurnAnimation' | 'langList'
    numKey?: 'widthScale' | 'loadNum' | 'downloadChunkSize' | 'volumeSize' | 'pagesPerScreen' | 'autoFlipFrequency' | 'wheelSensitivity' | 'scrollPageMargin' | 'magnifierZoom' | 'magnifierAreaSize'
    min?: number
    max?: number
    useAbbrName?: boolean
    isFloat?: boolean
    requireThumbSupportInTopBar?: boolean
}

interface PageTurnAnimationPreference {
    schemaVersion: number
    updatedAt: string
    scope: 'global'
    animationMode: PageTurnAnimationMode
    // 写入时的 reset 身份：明确重置后用于按身份匹配本次 reset 之后的新值
    resetId?: string
}

const pageTurnAnimationPreferenceKey = 'ehunter:reader:prefs:page-turn-animation'
const pageTurnAnimationPreferenceSchemaVersion = 1
const defaultPageTurnAnimationMode: PageTurnAnimationMode = 'realistic'
const unifiedSettingsPreferenceKey = 'ehunter:reader:prefs:unified-settings'
const unifiedSettingsPreferenceSchemaVersion = 3
const legacyMigrationPreferenceKey = 'ehunter:reader:prefs:legacy-migration'
const legacyMigrationPreferenceSchemaVersion = 1
const legacyImportStatusDone = 'done'
const legacyImportStatusBlocked = 'blocked'
type LegacyImportStatus = typeof legacyImportStatusDone | typeof legacyImportStatusBlocked

interface LegacyMigrationState {
    schemaVersion: number
    migratedAt: string
    legacyImport: LegacyImportStatus
    // 新重置的共享身份：同毫秒连续两次重置也能区分；历史标记缺该字段时回退 migratedAt
    resetId?: string
}

// 本站持久记录「已观察到哪一次共享重置」，只写本站 localStorage：用于在共享通道
// 不可读的后续会话里区分「本次 reset 之后的新本地写入」与重置前的旧副本。
const localResetObservationKey = 'ehunter:reader:prefs:reset-observation'
const localResetObservationSchemaVersion = 1

interface LocalResetObservation {
    schemaVersion: number
    resetId: string
    observedAt: string
}

// schemaVersion 只接受有限数值或可解析的数值字符串：损坏值（如 {toString:1}）不能让
// Number 抛错中断初始化；非法或缺失仍回落到当前 schema 版本，合法 schema 契约不变。
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
let bookTurnSettleTimerID: number = 0
let isBookTurning = false
let pendingBookTurn: null | { val: number, updater: string } = null
let readerLayoutPreference = createDefaultLayoutPreference()
let runtimeAlbumService: AlbumService | null = null
const downloadRunnerMap: Record<string, GalleryDownloadService> = {}

export const quickSettingOptions: QuickSettingOption[] = [
    { id: 'readingMode', i18nKey: 'readingMode', modeScope: 'both', fixed: true },
    { id: 'widthScale', i18nKey: 'widthScale', modeScope: 'scroll-only' },
    { id: 'loadNum', i18nKey: 'loadNum', modeScope: 'both' },
    { id: 'volumeSize', i18nKey: 'volSize', modeScope: 'scroll-only' },
    { id: 'showThumbView', i18nKey: 'thumbView', modeScope: 'scroll-only' },
    { id: 'scrollPageMargin', i18nKey: 'pageMargin', modeScope: 'scroll-only' },
    { id: 'pagesPerScreen', i18nKey: 'screenSize', modeScope: 'book-only' },
    { id: 'bookDirection', i18nKey: 'bookDirection', modeScope: 'book-only' },
    { id: 'pageTurnAnimationMode', i18nKey: 'pageTurnAnimation', modeScope: 'book-only' },
    { id: 'showBookPagination', i18nKey: 'pagination', modeScope: 'book-only' },
    { id: 'isChangeOddEven', i18nKey: 'oddEven', modeScope: 'book-only' },
    { id: 'isAutoFlip', i18nKey: 'autoFlip', modeScope: 'book-only' },
    { id: 'autoFlipFrequency', i18nKey: 'autoFlipFrequency', modeScope: 'book-only' },
    { id: 'showBookThumbView', i18nKey: 'thumbView', modeScope: 'book-only' },
    { id: 'IsReverseBookWheeFliplDirection', i18nKey: 'wheelDirection', modeScope: 'book-only' },
    { id: 'wheelSensitivity', i18nKey: 'wheelSensitivity', modeScope: 'book-only' },
    { id: 'lang', i18nKey: 'languageSetting', modeScope: 'both' },
    { id: 'autoRetryByOtherSource', i18nKey: 'autoSourceRetry', modeScope: 'both' },
]

export const settingsCategories: SettingsCategory[] = [
    { id: 'general', i18nKey: 'settingsGeneral' },
    { id: 'scroll', i18nKey: 'settingsScrollMode' },
    { id: 'book', i18nKey: 'settingsBookMode' },
    { id: 'quick', i18nKey: 'settingsQuick' },
    { id: 'shortcuts', i18nKey: 'settingsShortcuts' },
    { id: 'other', i18nKey: 'settingsOther' },
]

export const shortcutActionDefinitions: ShortcutActionDefinition[] = [
    { id: 'goPrev', labelI18nKey: 'shortcutGoPrev', tipI18nKey: 'shortcutGoPrevTip' },
    { id: 'goNext', labelI18nKey: 'shortcutGoNext', tipI18nKey: 'shortcutGoNextTip' },
    { id: 'toggleMoreSettings', labelI18nKey: 'shortcutToggleMoreSettings', tipI18nKey: 'shortcutToggleMoreSettingsTip' },
    { id: 'toggleTopBar', labelI18nKey: 'shortcutToggleTopBar', tipI18nKey: 'shortcutToggleTopBarTip' },
    { id: 'toggleThumbView', labelI18nKey: 'shortcutToggleThumbView', tipI18nKey: 'shortcutToggleThumbViewTip' },
    { id: 'toggleQuickPreview', labelI18nKey: 'shortcutToggleQuickPreview', tipI18nKey: 'shortcutToggleQuickPreviewTip' },
    { id: 'increaseWidthScale', labelI18nKey: 'shortcutIncreaseWidthScale', tipI18nKey: 'shortcutIncreaseWidthScaleTip' },
    { id: 'decreaseWidthScale', labelI18nKey: 'shortcutDecreaseWidthScale', tipI18nKey: 'shortcutDecreaseWidthScaleTip' },
    { id: 'togglePagination', labelI18nKey: 'shortcutTogglePagination', tipI18nKey: 'shortcutTogglePaginationTip' },
    { id: 'toggleAutoFlip', labelI18nKey: 'shortcutToggleAutoFlip', tipI18nKey: 'shortcutToggleAutoFlipTip' },
    { id: 'toggleOddEven', labelI18nKey: 'shortcutToggleOddEven', tipI18nKey: 'shortcutToggleOddEvenTip' },
]

export const defaultShortcutBindings: ShortcutBindingMap = {
    goPrev: 'ArrowLeft,ArrowUp,a',
    goNext: 'ArrowRight,ArrowDown,d',
    toggleMoreSettings: 'Shift',
    toggleTopBar: 'q',
    toggleThumbView: 't',
    toggleQuickPreview: 'f',
    increaseWidthScale: ']',
    decreaseWidthScale: '[',
    togglePagination: '',
    toggleAutoFlip: '',
    toggleOddEven: '',
}

export interface ShortcutKeyCandidate {
    key: string
    label: string
}

export const shortcutKeyCandidates: ShortcutKeyCandidate[] = [
    { key: 'ArrowUp', label: '↑' },
    { key: 'ArrowDown', label: '↓' },
    { key: 'ArrowLeft', label: '←' },
    { key: 'ArrowRight', label: '→' },
    { key: 'Escape', label: 'Esc' },
    { key: 'Tab', label: 'Tab' },
    { key: 'CapsLock', label: 'Caps' },
    { key: 'Control', label: 'Ctrl' },
    { key: 'Shift', label: 'Shift' },
    { key: 'F1', label: 'F1' },
    { key: 'F2', label: 'F2' },
    { key: 'F3', label: 'F3' },
    { key: 'F4', label: 'F4' },
    { key: 'F5', label: 'F5' },
    { key: 'F6', label: 'F6' },
    { key: 'F7', label: 'F7' },
    { key: 'F8', label: 'F8' },
    { key: 'F9', label: 'F9' },
    { key: 'F10', label: 'F10' },
    { key: 'F11', label: 'F11' },
    { key: 'F12', label: 'F12' },
    { key: '1', label: '1' },
    { key: '2', label: '2' },
    { key: '3', label: '3' },
    { key: '4', label: '4' },
    { key: '5', label: '5' },
    { key: '6', label: '6' },
    { key: '7', label: '7' },
    { key: '8', label: '8' },
    { key: '9', label: '9' },
    { key: '-', label: '-' },
    { key: '=', label: '=' },
    { key: '[', label: '[' },
    { key: ']', label: ']' },
    { key: 'a', label: 'A' },
    { key: 'b', label: 'B' },
    { key: 'c', label: 'C' },
    { key: 'd', label: 'D' },
    { key: 'e', label: 'E' },
    { key: 'f', label: 'F' },
    { key: 'g', label: 'G' },
    { key: 'h', label: 'H' },
    { key: 'i', label: 'I' },
    { key: 'j', label: 'J' },
    { key: 'k', label: 'K' },
    { key: 'l', label: 'L' },
    { key: 'm', label: 'M' },
    { key: 'n', label: 'N' },
    { key: 'o', label: 'O' },
    { key: 'p', label: 'P' },
    { key: 'q', label: 'Q' },
    { key: 'r', label: 'R' },
    { key: 's', label: 'S' },
    { key: 't', label: 'T' },
    { key: 'u', label: 'U' },
    { key: 'v', label: 'V' },
    { key: 'w', label: 'W' },
    { key: 'x', label: 'X' },
    { key: 'y', label: 'Y' },
    { key: 'z', label: 'Z' },
]

export const settingFieldDefinitions: SettingFieldDefinition[] = [
    {
        id: 'readingMode',
        control: 'drop',
        labelI18nKey: 'readingMode',
        tipI18nKey: 'readingModeTip',
        modeScope: 'both',
        showInTopBar: true,
        showInDialog: false,
        dropKey: 'readingModeList',
    },
    {
        id: 'lang',
        control: 'drop',
        labelI18nKey: 'languageSetting',
        tipI18nKey: 'languageSettingTip',
        modeScope: 'both',
        showInTopBar: true,
        showInDialog: true,
        dialogCategory: 'general',
        dropKey: 'langList',
        useAbbrName: true,
    },
    {
        id: 'loadNum',
        control: 'num',
        labelI18nKey: 'loadNum',
        tipI18nKey: 'loadNumTip',
        modeScope: 'both',
        showInTopBar: true,
        showInDialog: true,
        dialogCategory: 'general',
        numKey: 'loadNum',
        min: 1,
        max: 100,
    },
    {
        id: 'downloadChunkSize',
        control: 'num',
        labelI18nKey: 'downloadChunkSize',
        tipI18nKey: 'downloadChunkSizeTip',
        modeScope: 'both',
        showInTopBar: false,
        showInDialog: true,
        dialogCategory: 'general',
        numKey: 'downloadChunkSize',
        min: 1,
        max: 1000,
    },
    {
        id: 'autoRetryByOtherSource',
        control: 'switch',
        labelI18nKey: 'autoSourceRetry',
        tipI18nKey: 'autoSourceRetryTip',
        modeScope: 'both',
        showInTopBar: true,
        showInDialog: true,
        dialogCategory: 'general',
    },
    {
        id: 'magnifierZoom',
        control: 'num',
        labelI18nKey: 'magnifierZoom',
        tipI18nKey: 'magnifierZoomTip',
        modeScope: 'both',
        showInTopBar: false,
        showInDialog: true,
        dialogCategory: 'general',
        numKey: 'magnifierZoom',
        min: 2,
        max: 5,
    },
    {
        id: 'magnifierAreaSize',
        control: 'num',
        labelI18nKey: 'magnifierAreaSize',
        tipI18nKey: 'magnifierAreaSizeTip',
        modeScope: 'both',
        showInTopBar: false,
        showInDialog: true,
        dialogCategory: 'general',
        numKey: 'magnifierAreaSize',
        min: 20,
        max: 300,
    },
    {
        id: 'widthScale',
        control: 'num',
        labelI18nKey: 'widthScale',
        tipI18nKey: 'widthScaleTip',
        modeScope: 'scroll-only',
        showInTopBar: true,
        showInDialog: true,
        dialogCategory: 'scroll',
        numKey: 'widthScale',
        min: 30,
        max: 100,
        isFloat: true,
    },
    {
        id: 'volumeSize',
        control: 'num',
        labelI18nKey: 'volSize',
        tipI18nKey: 'volSizeTip',
        modeScope: 'scroll-only',
        showInTopBar: true,
        showInDialog: true,
        dialogCategory: 'scroll',
        numKey: 'volumeSize',
        min: 1,
        max: 200,
    },
    {
        id: 'showThumbView',
        control: 'switch',
        labelI18nKey: 'thumbView',
        tipI18nKey: 'thumbViewTip',
        modeScope: 'scroll-only',
        showInTopBar: true,
        showInDialog: true,
        dialogCategory: 'scroll',
        requireThumbSupportInTopBar: true,
    },
    {
        id: 'scrollPageMargin',
        control: 'num',
        labelI18nKey: 'pageMargin',
        tipI18nKey: 'pageMarginTip',
        modeScope: 'scroll-only',
        showInTopBar: true,
        showInDialog: true,
        dialogCategory: 'scroll',
        numKey: 'scrollPageMargin',
        min: 0,
        max: 300,
    },
    {
        id: 'pagesPerScreen',
        control: 'num',
        labelI18nKey: 'screenSize',
        tipI18nKey: 'screenSizeTip',
        modeScope: 'book-only',
        showInTopBar: true,
        showInDialog: true,
        dialogCategory: 'book',
        numKey: 'pagesPerScreen',
        min: 1,
        max: 10,
    },
    {
        id: 'bookDirection',
        control: 'drop',
        labelI18nKey: 'bookDirection',
        tipI18nKey: 'bookDirectionTip',
        modeScope: 'book-only',
        showInTopBar: true,
        showInDialog: true,
        dialogCategory: 'book',
        dropKey: 'bookDirection',
        useAbbrName: true,
    },
    {
        id: 'pageTurnAnimationMode',
        control: 'drop',
        labelI18nKey: 'pageTurnAnimation',
        tipI18nKey: 'pageTurnAnimationTip',
        modeScope: 'book-only',
        showInTopBar: true,
        showInDialog: true,
        dialogCategory: 'book',
        dropKey: 'pageTurnAnimation',
    },
    {
        id: 'showBookPagination',
        control: 'switch',
        labelI18nKey: 'pagination',
        tipI18nKey: 'paginationTip',
        modeScope: 'book-only',
        showInTopBar: true,
        showInDialog: true,
        dialogCategory: 'book',
    },
    {
        id: 'isChangeOddEven',
        control: 'switch',
        labelI18nKey: 'oddEven',
        tipI18nKey: 'oddEvenTip',
        modeScope: 'book-only',
        showInTopBar: true,
        showInDialog: true,
        dialogCategory: 'book',
    },
    {
        id: 'isAutoFlip',
        control: 'switch',
        labelI18nKey: 'autoFlip',
        tipI18nKey: 'autoFlipTip',
        modeScope: 'book-only',
        showInTopBar: true,
        showInDialog: true,
        dialogCategory: 'book',
    },
    {
        id: 'autoFlipFrequency',
        control: 'num',
        labelI18nKey: 'autoFlipFrequency',
        tipI18nKey: 'autoFlipFrequencyTip',
        modeScope: 'book-only',
        showInTopBar: true,
        showInDialog: true,
        dialogCategory: 'book',
        numKey: 'autoFlipFrequency',
        min: 1,
        max: 240,
    },
    {
        id: 'showBookThumbView',
        control: 'switch',
        labelI18nKey: 'thumbView',
        tipI18nKey: 'thumbViewTip',
        modeScope: 'book-only',
        showInTopBar: true,
        showInDialog: true,
        dialogCategory: 'book',
    },
    {
        id: 'IsReverseBookWheeFliplDirection',
        control: 'switch',
        labelI18nKey: 'wheelDirection',
        tipI18nKey: 'wheelDirectionTip',
        modeScope: 'book-only',
        showInTopBar: true,
        showInDialog: true,
        dialogCategory: 'book',
    },
    {
        id: 'wheelSensitivity',
        control: 'num',
        labelI18nKey: 'wheelSensitivity',
        tipI18nKey: 'wheelSensitivityTip',
        modeScope: 'book-only',
        showInTopBar: true,
        showInDialog: true,
        dialogCategory: 'book',
        numKey: 'wheelSensitivity',
        min: 1,
        max: 250,
    },
]

export const settingFieldMap: Record<string, SettingFieldDefinition> = settingFieldDefinitions
    .reduce((map, item) => {
        map[item.id] = item
        return map
    }, {} as Record<string, SettingFieldDefinition>)

export const dialogSettingFieldIds: Record<SettingsPanelCategory, string[]> = {
    general: settingFieldDefinitions.filter(item => item.showInDialog && item.dialogCategory === 'general').map(item => item.id),
    scroll: settingFieldDefinitions.filter(item => item.showInDialog && item.dialogCategory === 'scroll').map(item => item.id),
    book: settingFieldDefinitions.filter(item => item.showInDialog && item.dialogCategory === 'book').map(item => item.id),
}

const pinnedQuickSettingId = 'readingMode'
const defaultQuickSettingOrder = quickSettingOptions.map(item => item.id)
const defaultQuickSettingSelected = [
    'readingMode',
    'widthScale',
    'loadNum',
    'volumeSize',
    'showThumbView',
    'pagesPerScreen',
    'bookDirection',
    'isChangeOddEven',
    'showBookPagination',
    'showBookThumbView',
    'lang',
]

interface UnifiedSettingsPreference {
    schemaVersion: number
    updatedAt: string
    settings: Record<string, any>
    quickSelection: string[]
    quickOrder: string[]
    shortcuts?: Partial<ShortcutBindingMap>
    // 写入时的 reset 身份：明确重置后用于按身份匹配本次 reset 之后的新值
    resetId?: string
}

function normalizeShortcutToken(raw: any): string {
    if (typeof raw !== 'string') {
        return ''
    }
    return raw.trim()
}

function normalizeShortcutBindings(raw: any): ShortcutBindingMap {
    const result: ShortcutBindingMap = {
        ...defaultShortcutBindings,
    }
    if (!raw || typeof raw !== 'object') {
        return result
    }
    for (const definition of shortcutActionDefinitions) {
        const key = definition.id
        if (!Object.prototype.hasOwnProperty.call(raw, key)) {
            continue
        }
        const val = normalizeShortcutToken((raw as Record<string, any>)[key])
        if (typeof val === 'string') {
            result[key] = val
        }
    }
    return result
}

function isPageTurnAnimationMode(value: any): value is PageTurnAnimationMode {
    return value === 'realistic' || value === 'slide' || value === 'none'
}

function normalizePageTurnAnimationMode(value: any): PageTurnAnimationMode {
    return isPageTurnAnimationMode(value) ? value : defaultPageTurnAnimationMode
}

function prefersReducedMotion(): boolean {
    try {
        return Boolean(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    } catch (e) {
        return false
    }
}

/**
 * 无合法迁移值时的首次初始化（决策第 2 节）：系统「减少动态效果」开启则无动效，
 * 否则桌面端拟真、移动端平移。结果随后写入存储，后续系统变化不再重算。
 */
function getInitialPageTurnAnimationMode(): PageTurnAnimationMode {
    if (prefersReducedMotion()) {
        return 'none'
    }
    return isMobileLikeDevice() ? 'slide' : defaultPageTurnAnimationMode
}

// 共享通道：有用户脚本存储时读共享数据，否则按 origin 降级到本站 localStorage。
// allowLocalFallback=false 用于已确认重置后的读取：只信共享通道，不读本站旧副本
function readSharedPreferenceRaw(key: string, allowLocalFallback: boolean = true): any {
    return PlatformService.storageGetShared(key, null, allowLocalFallback)
}

// 站点本地通道：只读当前 origin 的 localStorage，用于旧版本地副本补缺
function readSiteLocalPreferenceRaw(key: string): any {
    return PlatformService.storageGetLocal(key, null)
}

function writeSharedPreferenceRaw(key: string, data: any): boolean {
    return PlatformService.storageSetShared(key, data)
}

function parsePreferenceObject(rawData: any): Record<string, any> | null {
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

function parseLegacyMigrationState(rawData: any): LegacyMigrationState | null {
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
    if (!value || typeof value !== 'object') {
        return null
    }
    const status = value.legacyImport
    if (status !== legacyImportStatusDone && status !== legacyImportStatusBlocked) {
        return null
    }
    // 标记里的 resetId 是本次重置身份的一部分：解析时必须原样保留，否则共享标记在
    // 真机 JSON 往返后会退化成 migratedAt，导致同一次 reset 被当成不同身份而拒绝本站新值。
    const resetId = typeof value.resetId === 'string' && value.resetId ? value.resetId : ''
    return {
        schemaVersion: pickLegalSchemaVersion(value.schemaVersion) ?? legacyMigrationPreferenceSchemaVersion,
        migratedAt: typeof value.migratedAt === 'string' ? value.migratedAt : '',
        legacyImport: status,
        ...(resetId ? { resetId } : {}),
    }
}

function writeLegacyMigrationState(status: LegacyImportStatus, resetId?: string): boolean {
    const state: LegacyMigrationState = {
        schemaVersion: legacyMigrationPreferenceSchemaVersion,
        migratedAt: new Date().toISOString(),
        legacyImport: status,
    }
    if (status === legacyImportStatusBlocked && resetId) {
        state.resetId = resetId
    }
    if (status === legacyImportStatusBlocked) {
        // 重置标记必须确认写入真实共享通道：仅本站降级写入成功不能保证重置防复活契约
        return PlatformService.storageSetShared(legacyMigrationPreferenceKey, state, true)
    }
    return writeSharedPreferenceRaw(legacyMigrationPreferenceKey, state)
}

function readLegacyMigrationState(): LegacyMigrationState | null {
    return parseLegacyMigrationState(readSharedPreferenceRaw(legacyMigrationPreferenceKey))
}

// 共享标记声明的 reset 身份：新标记自带 resetId（同毫秒连续两次重置也能区分）；历史标记
// 没有 resetId，仍用 migratedAt 区分，无时间戳时退化为同一字面量，避免把「不知道是哪次」
// 当成任意一次新重置。
function resolveResetMarkerId(state: LegacyMigrationState | null): string | null {
    if (!state || state.legacyImport !== legacyImportStatusBlocked) {
        return null
    }
    if (typeof state.resetId === 'string' && state.resetId) {
        return state.resetId
    }
    return state.migratedAt || 'blocked-without-timestamp'
}

// 新重置的本地身份：优先使用原生 crypto.randomUUID（同毫秒连续两次重置不会碰撞）；夹具或旧
// 环境缺 crypto 时退化为「时间戳 + 计数器 + 随机数」，仍保证同毫秒内两次重置身份不同。
let resetIdentityCounter = 0
function mintResetIdentity(): string {
    try {
        const cryptoApi: any = (globalThis as any).crypto
        if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
            return cryptoApi.randomUUID()
        }
    } catch (e) {
    }
    resetIdentityCounter += 1
    return `local-reset-${Date.now().toString(36)}-${resetIdentityCounter}-${Math.random().toString(36).slice(2, 8)}`
}

function readLocalResetObservation(): LocalResetObservation | null {
    const raw = parsePreferenceObject(PlatformService.storageGetLocal(localResetObservationKey, null))
    if (!raw) {
        return null
    }
    const resetId = typeof raw.resetId === 'string' ? raw.resetId : ''
    const observedAt = typeof raw.observedAt === 'string' ? raw.observedAt : ''
    if (!resetId || !observedAt) {
        return null
    }
    return {
        schemaVersion: pickLegalSchemaVersion(raw.schemaVersion) ?? localResetObservationSchemaVersion,
        resetId,
        observedAt,
    }
}

// 观察记录只写本站 localStorage：共享通道读写故障时也要记住「本页见过这次 reset」；
// 存储不可写时按没有记录处理，不伪造持久化保证。
function persistLocalResetObservation(resetId: string): void {
    const record: LocalResetObservation = {
        schemaVersion: localResetObservationSchemaVersion,
        resetId,
        observedAt: new Date().toISOString(),
    }
    try {
        PlatformService.storage.local.setItem(localResetObservationKey, JSON.stringify(record))
    } catch (e) {
    }
}

// blocked 确认可能来自共享通道，也可能来自本地镜像（共享读不到时 PlatformService 会退避到
// 本地副本）。共享标记读得到时按共享身份记录；读不到且本页还没有观察记录时，才用镜像里的
// resetId/migratedAt 建立身份，否则本次 reset 之后新写的值全部没有身份，刷新后会被当作旧值
// 丢弃（P2-1 的仅写坏/读写坏场景）。已有观察记录时不因镜像改写它：镜像不能证明发生了新 reset，
// 改写会让「无 GM 时本地身份自洽」的既有行为退化。
function observeSharedResetMarker(): void {
    const observation = readLocalResetObservation()
    const sharedResetId = resolveResetMarkerId(parseLegacyMigrationState(readSharedPreferenceRaw(legacyMigrationPreferenceKey, false)))
    if (sharedResetId) {
        if (observation && observation.resetId === sharedResetId) {
            return
        }
        persistLocalResetObservation(sharedResetId)
        return
    }
    if (observation) {
        return
    }
    const mirroredResetId = resolveResetMarkerId(readLegacyMigrationState())
    if (mirroredResetId) {
        persistLocalResetObservation(mirroredResetId)
    }
}

// 当前 reset 身份：以真实共享标记为准（新标记自带 resetId，历史标记回退 migratedAt）；标记
// 本页读不到时，只在已有本站观察记录的前提下沿用其中的身份，不再比较墙钟。标记与观察记录
// 不一致（期间又发生了新 reset）时以共享标记为准，并尽力同步本站观察记录。
function currentResetIdentity(): string | null {
    const markerId = resolveResetMarkerId(parseLegacyMigrationState(readSharedPreferenceRaw(legacyMigrationPreferenceKey, false)))
    const observation = readLocalResetObservation()
    if (markerId) {
        if (observation && observation.resetId === markerId) {
            return observation.resetId
        }
        // 观察记录写失败不影响本次判定：身份以共享标记为准
        persistLocalResetObservation(markerId)
        return markerId
    }
    return observation ? observation.resetId : null
}

// 已确认重置后，本站副本能否作为补缺来源：副本必须自带与当前 reset 身份一致的 resetId
// （由本次 reset 之后的真实写作路径打标）。重置前的旧副本没有该身份，系统时钟回拨也不会
// 让它蒙混过关；没有当前身份时一律按缺失处理，不伪造「一定属于本次 reset」的保证。
function isLocalPayloadFromCurrentReset(rawData: any): boolean {
    const raw = parsePreferenceObject(rawData)
    if (!raw) {
        return false
    }
    const currentId = currentResetIdentity()
    return currentId !== null && raw.resetId === currentId
}

// 已确认重置后，本站副本的可信度不再按「通道整体可信」判断，而是逐条按 reset 身份判定：
// 只有与当前 reset 身份一致（isLocalPayloadFromCurrentReset）的新值才允许补缺，
// 旧副本一律按缺失处理，但保留在存储里不删除、不覆盖。

// 本页面是否已确认「显式重置」。一旦在共享通道仍健康时读到 blocked 就锁定为 true：
// 此后即便 GM 写异常导致普通通道降级到本站 localStorage，也不会因本地旧副本没有
// blocked 而丢失该状态，从而避免被清掉的旧偏好复活（决策 2026-09-18 第 3 节）。
let legacyImportBlockedConfirmed = false

// 显式重置后禁止再次导入旧副本，避免被清掉的旧设置复活
function isLegacyImportBlocked(): boolean {
    if (legacyImportBlockedConfirmed) {
        return true
    }
    const state = readLegacyMigrationState()
    if (state && state.legacyImport === legacyImportStatusBlocked) {
        legacyImportBlockedConfirmed = true
        // 先固化「本页已观察到这次 reset」，之后的读取只认本次 reset 之后写入本站的新副本
        observeSharedResetMarker()
        return true
    }
    // 共享通道拿不到 blocked（GM 读故障或标记缺失）时，本站持久化的观察记录同样证明本页见过
    // 一次重置：沿用记录里的观察时刻，绝不改写（改成当前时间会作废此前保存的新本地值）
    legacyImportBlockedConfirmed = readLocalResetObservation() !== null
    return legacyImportBlockedConfirmed
}

// 已确认重置后：真实共享通道里的合法值优先（整条共享记录本身不可解析时等同全缺失）；共享
// 缺失，或共享条目里缺失/非法的项（例如本页写不进 GM，只有本站镜像拿到新值）时，只接受能证明
// 是「本次 reset 之后写入本站」的新本地副本，并按 mergeRecords 逐项补缺。
// 共享读故障时本地降级也不会被无条件放行：旧副本没有写入时刻，一律按缺失处理。
function readPreferenceRawRespectingReset(key: string, mergeRecords?: (sharedValue: Record<string, any>, localValue: Record<string, any>) => any): any {
    if (!isLegacyImportBlocked()) {
        return readSharedPreferenceRaw(key, true)
    }
    const sharedRaw = readSharedPreferenceRaw(key, false)
    const localRaw = readSiteLocalPreferenceRaw(key)
    const acceptedLocal = isLocalPayloadFromCurrentReset(localRaw) ? localRaw : null
    if (acceptedLocal === null || !mergeRecords) {
        return sharedRaw !== null && sharedRaw !== undefined ? sharedRaw : acceptedLocal
    }
    const sharedObject = parsePreferenceObject(sharedRaw)
    if (!sharedObject) {
        // 坏 JSON / 非对象：共享整条记录不可用，等同全缺失，只允许同代本站副本补缺
        return acceptedLocal
    }
    const localObject = parsePreferenceObject(acceptedLocal)
    return localObject ? mergeRecords(sharedObject, localObject) : sharedRaw
}

// 布局偏好：未确认重置时维持既有语义（共享优先、缺失按本站回退）；确认重置后共享真实通道
// 优先、且不允许整体降级读本站旧副本，只按 resetId 身份逐条补缺本次 reset 之后写入的条目。
function readReaderLayoutPreferenceRespectingReset() {
    if (!isLegacyImportBlocked()) {
        return readLayoutPreference(true, true, null, currentResetIdentity())
    }
    return readLayoutPreference(true, false, isLocalPayloadFromCurrentReset, currentResetIdentity())
}

function parsePageTurnPreference(rawData: any): PageTurnAnimationPreference | null {
    if (!rawData) {
        return null
    }
    if (typeof rawData === 'string') {
        try {
            rawData = JSON.parse(rawData)
        } catch (e) {
            return null
        }
    }
    if (typeof rawData !== 'object') {
        return null
    }
    // 非法动效值视为“无合法偏好”，交由逐项补缺与默认初始化处理，不做静默降级
    if (!isPageTurnAnimationMode(rawData.animationMode)) {
        return null
    }
    return {
        schemaVersion: pickLegalSchemaVersion(rawData.schemaVersion) ?? pageTurnAnimationPreferenceSchemaVersion,
        updatedAt: typeof rawData.updatedAt === 'string' ? rawData.updatedAt : new Date().toISOString(),
        scope: 'global',
        animationMode: rawData.animationMode,
    }
}

function buildPageTurnPreference(mode: PageTurnAnimationMode): PageTurnAnimationPreference {
    const resetId = currentResetIdentity()
    return {
        schemaVersion: pageTurnAnimationPreferenceSchemaVersion,
        updatedAt: new Date().toISOString(),
        scope: 'global',
        animationMode: mode,
        ...(resetId ? { resetId } : {}),
    }
}

function persistPageTurnAnimationMode(mode: PageTurnAnimationMode) {
    writeSharedPreferenceRaw(pageTurnAnimationPreferenceKey, buildPageTurnPreference(mode))
}
function readPageTurnAnimationMode(): PageTurnAnimationMode {
    // 迁移完成后统一设置是主存储，其中已有的合法值优先（决策 2026-09-18 第 3 节）
    const unifiedPreference = parseUnifiedSettingsPreference(readUnifiedSettingsRaw())
    const unifiedStoredMode = unifiedPreference ? unifiedPreference.settings.pageTurnAnimationMode : undefined
    if (unifiedStoredMode) {
        return unifiedStoredMode
    }
    const sharedStored = parsePageTurnPreference(readPreferenceRawRespectingReset(pageTurnAnimationPreferenceKey, mergePageTurnPreferenceRecord))
    if (sharedStored) {
        return sharedStored.animationMode
    }
    if (!isLegacyImportBlocked()) {
        const legacyStored = parsePageTurnPreference(readSiteLocalPreferenceRaw(pageTurnAnimationPreferenceKey))
        if (legacyStored) {
            return legacyStored.animationMode
        }
    }
    // 所有来源都无合法值：按系统/设备初始化并保存实际值，之后系统变化或保存其他设置都不再重算
    const initializedMode = getInitialPageTurnAnimationMode()
    persistPageTurnAnimationMode(initializedMode)
    return initializedMode
}

function readUnifiedSettingsRaw(): any {
    // 已确认重置后不读本站旧统一设置；共享通道里的合法值仍优先生效
    return readPreferenceRawRespectingReset(unifiedSettingsPreferenceKey, mergeUnifiedSettingsRecord)
}

function writeUnifiedSettingsRaw(data: UnifiedSettingsPreference): void {
    const resetId = currentResetIdentity()
    writeSharedPreferenceRaw(unifiedSettingsPreferenceKey, resetId ? { ...data, resetId } : data)
}

function sanitizeQuickSettingSelection(rawSelection: any, rawOrder: any): { selected: string[], order: string[] } {
    const validIds = new Set(quickSettingOptions.map(item => item.id))
    const orderInput = Array.isArray(rawOrder) ? rawOrder : defaultQuickSettingOrder
    const selectedInput = Array.isArray(rawSelection) ? rawSelection : defaultQuickSettingSelected

    const order: string[] = []
    for (const id of orderInput) {
        if (typeof id === 'string' && validIds.has(id) && !order.includes(id)) {
            order.push(id)
        }
    }
    for (const id of defaultQuickSettingOrder) {
        if (!order.includes(id)) {
            order.push(id)
        }
    }

    const selected: string[] = []
    for (const id of selectedInput) {
        if (typeof id === 'string' && validIds.has(id) && !selected.includes(id)) {
            selected.push(id)
        }
    }
    if (!selected.includes(pinnedQuickSettingId)) {
        selected.unshift(pinnedQuickSettingId)
    }

    const orderWithoutPinned = order.filter(id => id !== pinnedQuickSettingId)
    return {
        selected,
        order: [pinnedQuickSettingId, ...orderWithoutPinned],
    }
}

function normalizeFiniteNumber(raw: any): number | undefined {
    return typeof raw === 'number' && Number.isFinite(raw) ? raw : undefined
}

// 数值设置复用设置字段定义的 min/max/isFloat 边界；越界、非整数与类型错误一律等同缺失
// （决策 2026-09-18 第 3 节）：不做钳制，交给迁移与默认值补齐
function normalizeNumberSetting(raw: any, fieldId: string): number | undefined {
    const field = settingFieldMap[fieldId]
    if (!field || typeof raw !== 'number' || !Number.isFinite(raw)) {
        return undefined
    }
    if (!field.isFloat && !Number.isInteger(raw)) {
        return undefined
    }
    if ((typeof field.min === 'number' && raw < field.min) || (typeof field.max === 'number' && raw > field.max)) {
        return undefined
    }
    return raw
}

function normalizeEnumSetting(raw: any, allowedValues: (string | number)[]): string | number | undefined {
    return allowedValues.includes(raw) ? raw : undefined
}

function normalizeBooleanValue(raw: any): boolean | undefined {
    return typeof raw === 'boolean' ? raw : undefined
}

// 每个设置项只接受合法值；非法值等同缺失，交给迁移与默认值处理
const unifiedSettingsValueNormalizers: Record<string, (raw: any) => any> = {
    readingMode: (raw: any) => normalizeEnumSetting(raw, settingConf.readingModeList.map((item) => item.val)),
    widthScale: (raw: any) => normalizeNumberSetting(raw, 'widthScale'),
    loadNum: (raw: any) => normalizeNumberSetting(raw, 'loadNum'),
    downloadChunkSize: (raw: any) => normalizeNumberSetting(raw, 'downloadChunkSize'),
    volumeSize: (raw: any) => normalizeNumberSetting(raw, 'volumeSize'),
    showThumbView: normalizeBooleanValue,
    scrollPageMargin: (raw: any) => normalizeNumberSetting(raw, 'scrollPageMargin'),
    pagesPerScreen: (raw: any) => normalizeNumberSetting(raw, 'pagesPerScreen'),
    bookDirection: (raw: any) => normalizeEnumSetting(raw, settingConf.bookDirection.list.map((item) => item.val)),
    pageTurnAnimationMode: (raw: any) => (raw === 'slide' || raw === 'none' || raw === 'realistic' ? raw : undefined),
    showBookPagination: normalizeBooleanValue,
    isChangeOddEven: normalizeBooleanValue,
    isReverseFlip: normalizeBooleanValue,
    isAutoFlip: normalizeBooleanValue,
    autoFlipFrequency: (raw: any) => normalizeNumberSetting(raw, 'autoFlipFrequency'),
    showBookThumbView: normalizeBooleanValue,
    IsReverseBookWheeFliplDirection: normalizeBooleanValue,
    wheelSensitivity: (raw: any) => normalizeNumberSetting(raw, 'wheelSensitivity'),
    magnifierZoom: (raw: any) => normalizeNumberSetting(raw, 'magnifierZoom'),
    magnifierAreaSize: (raw: any) => normalizeNumberSetting(raw, 'magnifierAreaSize'),
    lang: (raw: any) => (typeof raw === 'string' && ['cn', 'en', 'jp'].includes(raw) ? raw : undefined),
    autoRetryByOtherSource: normalizeBooleanValue,
    hasShownWelcomeInstruction: normalizeBooleanValue,
    hasShownBookInstruction: normalizeBooleanValue,
    lastSeenVersionNotice: (raw: any) => (typeof raw === 'string' ? raw : undefined),
    lastRemoteUpdateNoticeAt: normalizeFiniteNumber,
}

function normalizeSettingsValues(rawSettings: any): Record<string, any> {
    const result: Record<string, any> = {}
    if (!rawSettings || typeof rawSettings !== 'object') {
        return result
    }
    for (const key of Object.keys(unifiedSettingsValueNormalizers)) {
        const value = unifiedSettingsValueNormalizers[key]((<Record<string, any>>rawSettings)[key])
        if (typeof value !== 'undefined') {
            result[key] = value
        }
    }
    return result
}

function parseUnifiedSettingsPreference(rawData: any): UnifiedSettingsPreference | null {
    let value = rawData
    if (!value) {
        return null
    }
    if (typeof value === 'string') {
        try {
            value = JSON.parse(value)
        } catch (e) {
            return null
        }
    }
    if (!value || typeof value !== 'object') {
        return null
    }
    const quick = sanitizeQuickSettingSelection(value.quickSelection, value.quickOrder)
    const schemaVersion = pickLegalSchemaVersion(value.schemaVersion) ?? unifiedSettingsPreferenceSchemaVersion
    const shortcuts = normalizeShortcutBindings(value.shortcuts)
    // 旧 schema 只升级旧默认绑定字面量；显式空串是用户合法偏好，不能被当作缺失恢复默认
    if (schemaVersion < 3) {
        if (shortcuts.toggleTopBar === 'Escape') {
            shortcuts.toggleTopBar = defaultShortcutBindings.toggleTopBar
        }
        if (shortcuts.toggleThumbView === '~') {
            shortcuts.toggleThumbView = defaultShortcutBindings.toggleThumbView
        }
    }
    return {
        schemaVersion,
        updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : new Date().toISOString(),
        settings: normalizeSettingsValues(value.settings),
        quickSelection: quick.selected,
        quickOrder: quick.order,
        shortcuts,
    }
}

function persistUnifiedSettingsState() {
    const payload: UnifiedSettingsPreference = {
        schemaVersion: unifiedSettingsPreferenceSchemaVersion,
        updatedAt: new Date().toISOString(),
        settings: {
            readingMode: store.readingMode,
            widthScale: store.widthScale,
            loadNum: store.loadNum,
            downloadChunkSize: store.downloadChunkSize,
            volumeSize: store.volumeSize,
            showThumbView: store.showThumbView,
            scrollPageMargin: store.scrollPageMargin,
            pagesPerScreen: store.pagesPerScreen,
            bookDirection: store.bookDirection,
            pageTurnAnimationMode: store.pageTurnAnimationMode,
            showBookPagination: store.showBookPagination,
            isChangeOddEven: store.isChangeOddEven,
            isReverseFlip: store.isReverseFlip,
            isAutoFlip: store.isAutoFlip,
            autoFlipFrequency: store.autoFlipFrequency,
            showBookThumbView: store.showBookThumbView,
            IsReverseBookWheeFliplDirection: store.IsReverseBookWheeFliplDirection,
            wheelSensitivity: store.wheelSensitivity,
            magnifierZoom: store.magnifierZoom,
            magnifierAreaSize: store.magnifierAreaSize,
            lang: lang.value,
            autoRetryByOtherSource: store.autoRetryByOtherSource,
            hasShownWelcomeInstruction: store.hasShownWelcomeInstruction,
            hasShownBookInstruction: store.hasShownBookInstruction,
            lastSeenVersionNotice: store.lastSeenVersionNotice,
            lastRemoteUpdateNoticeAt: store.lastRemoteUpdateNoticeAt,
        },
        quickSelection: [...store.quickSettingSelected],
        quickOrder: [...store.quickSettingOrder],
        shortcuts: {
            ...store.shortcutBindings,
        },
    }
    writeUnifiedSettingsRaw(payload)
}

function applyUnifiedSettingsPreference() {
    const preference = parseUnifiedSettingsPreference(readUnifiedSettingsRaw())
    if (!preference) {
        store.quickSettingSelected = [...defaultQuickSettingSelected]
        store.quickSettingOrder = [...defaultQuickSettingOrder]
        return
    }

    const settings = preference.settings || {}
    for (const key of Object.keys(settings)) {
        if (key === 'lang') {
            lang.value = settings[key]
            continue
        }
        ;(<any>store)[key] = settings[key]
    }

    const quick = sanitizeQuickSettingSelection(preference.quickSelection, preference.quickOrder)
    store.quickSettingSelected = quick.selected
    store.quickSettingOrder = quick.order
    store.shortcutBindings = normalizeShortcutBindings(preference.shortcuts)
    persistUnifiedSettingsState()
}

// 决策第 3 节：语言与其它设置项一样以已有合法存储值为准；欢迎提示未展示时也不能用浏览器语言覆盖已有值
export function hasStoredLangPreference(): boolean {
    const sharedRaw = readUnifiedSettingsRaw()
    const sharedPreference = parseUnifiedSettingsPreference(sharedRaw)
    if (sharedPreference && typeof sharedPreference.settings.lang === 'string') {
        return true
    }
    if (isLegacyImportBlocked()) {
        return false
    }
    const localRaw = readSiteLocalPreferenceRaw(unifiedSettingsPreferenceKey)
    if (localRaw === sharedRaw) {
        return false
    }
    const localPreference = parseUnifiedSettingsPreference(localRaw)
    return !!(localPreference && typeof localPreference.settings.lang === 'string')
}

function pickPresentStringArray(source: Record<string, any> | null, field: string): string[] | null {
    if (!source) {
        return null
    }
    const raw = source[field]
    if (!Array.isArray(raw) || raw.length === 0) {
        return null
    }
    // 只认已知快捷设置 ID：未知/非法成员等同缺失；全被过滤掉时返回 null，
    // 让调用方的 `||` 回退链继续落到下一个来源，而不是被空数组挡住。
    const validIds = new Set(quickSettingOptions.map(item => item.id))
    const filtered = raw.filter((item: any) => typeof item === 'string' && validIds.has(item))
    return filtered.length > 0 ? filtered : null
}

function collectPresentShortcuts(parsed: UnifiedSettingsPreference | null, source: Record<string, any> | null): Record<string, string> {
    const result: Record<string, string> = {}
    if (!parsed || !source || !source.shortcuts || typeof source.shortcuts !== 'object') {
        return result
    }
    for (const definition of shortcutActionDefinitions) {
        const key = definition.id
        if (!Object.prototype.hasOwnProperty.call(source.shortcuts, key)) {
            continue
        }
        const rawValue = (source.shortcuts as Record<string, any>)[key]
        // 缺失或非法字段不迁移；显式清空（空字符串）是合法值，需保留为「已清空」
        if (typeof rawValue !== 'string') {
            continue
        }
        result[key] = normalizeShortcutToken(parsed.shortcuts[key])
    }
    return result
}

// 已确认重置后共享记录里的项优先；缺失或非法（解析后不存在）的项，只从带匹配 resetId 的
// 本站副本逐项补缺，规则与 migrateLegacySettingsIfNeeded 一致：settings、快捷选择/排序、快捷键。
function mergeUnifiedSettingsRecord(sharedValue: Record<string, any>, localValue: Record<string, any>): Record<string, any> {
    const sharedPreference = parseUnifiedSettingsPreference(sharedValue)
    const localPreference = parseUnifiedSettingsPreference(localValue)
    if (!sharedPreference || !localPreference) {
        return sharedValue
    }
    const settings: Record<string, any> = { ...sharedPreference.settings }
    for (const key of Object.keys(unifiedSettingsValueNormalizers)) {
        if (typeof settings[key] === 'undefined' && typeof localPreference.settings[key] !== 'undefined') {
            settings[key] = localPreference.settings[key]
        }
    }
    const quickSelection = pickPresentStringArray(sharedValue, 'quickSelection') || pickPresentStringArray(localValue, 'quickSelection') || sharedValue.quickSelection
    const quickOrder = pickPresentStringArray(sharedValue, 'quickOrder') || pickPresentStringArray(localValue, 'quickOrder') || sharedValue.quickOrder
    // 各来源先按自身 schema 规范化再合并：否则旧 schema 的字面量会混进以当前 schema 返回的
    // 结果，re-parse 时被再次迁移（schema2 的 Escape/~ 会变成 q/t）。
    const sharedShortcuts = collectPresentShortcuts(sharedPreference, sharedValue)
    const shortcuts: Record<string, any> = { ...sharedShortcuts }
    for (const key of Object.keys(collectPresentShortcuts(localPreference, localValue))) {
        if (typeof sharedShortcuts[key] === 'undefined') {
            shortcuts[key] = localPreference.shortcuts[key]
        }
    }
    return { ...sharedValue, schemaVersion: unifiedSettingsPreferenceSchemaVersion, settings, quickSelection, quickOrder, shortcuts }
}

// 单页动效是单字段记录：共享记录的动效合法即优先，否则整体退回同代本站副本（再由调用方按契约补缺/初始化）
function mergePageTurnPreferenceRecord(sharedValue: Record<string, any>, localValue: Record<string, any>): any {
    return parsePageTurnPreference(sharedValue) ? sharedValue : localValue
}

/**
 * 逐项迁移旧设置：
 * 1. 共享数据里的合法值优先保留；
 * 2. 缺失或非法项按「本站点统一旧值 → 站点独立旧值 → 默认值」补缺；
 * 3. 旧副本只读不删，用户脚本存储恢复后共享合法值仍然优先；
 * 4. 只有确实导入到内容时才写回，因此重复执行结果一致。
 */
function migrateLegacySettingsIfNeeded(): boolean {
    // 先在共享通道仍健康时确认本页面的重置状态：命中 blocked 后会被本页锁定，
    // 后续写入失败降级也不会改用本站旧副本。
    if (isLegacyImportBlocked()) {
        return false
    }
    const migrationState = readLegacyMigrationState()

    const sharedRaw = readUnifiedSettingsRaw()
    const localRaw = readSiteLocalPreferenceRaw(unifiedSettingsPreferenceKey)
    const sharedObject = parsePreferenceObject(sharedRaw)
    const localObject = localRaw === sharedRaw ? null : parsePreferenceObject(localRaw)
    const sharedPreference = parseUnifiedSettingsPreference(sharedRaw)
    const localPreference = localObject ? parseUnifiedSettingsPreference(localObject) : null
    // 动效字段的补缺来源优先共享独立记录，其次本站统一旧值，最后本站独立旧值
    const sharedPageTurnPreference = parsePageTurnPreference(readSharedPreferenceRaw(pageTurnAnimationPreferenceKey))
    const legacyPageTurnPreference = parsePageTurnPreference(readSiteLocalPreferenceRaw(pageTurnAnimationPreferenceKey))

    const importedSettings: Record<string, any> = {}
    for (const key of Object.keys(unifiedSettingsValueNormalizers)) {
        if (sharedPreference && typeof sharedPreference.settings[key] !== 'undefined') {
            continue
        }
        if (key === 'pageTurnAnimationMode' && sharedPageTurnPreference) {
            importedSettings[key] = sharedPageTurnPreference.animationMode
            continue
        }
        const localValue = localPreference ? localPreference.settings[key] : undefined
        if (typeof localValue !== 'undefined') {
            importedSettings[key] = localValue
            continue
        }
        if (key === 'pageTurnAnimationMode' && legacyPageTurnPreference) {
            importedSettings[key] = legacyPageTurnPreference.animationMode
        }
    }

    const sharedQuickSelection = pickPresentStringArray(sharedObject, 'quickSelection')
    const sharedQuickOrder = pickPresentStringArray(sharedObject, 'quickOrder')
    const legacyQuickSelection = pickPresentStringArray(localObject, 'quickSelection')
    const legacyQuickOrder = pickPresentStringArray(localObject, 'quickOrder')

    const sharedShortcuts = collectPresentShortcuts(sharedPreference, sharedObject)
    const legacyShortcuts = collectPresentShortcuts(localPreference, localObject)
    const importedShortcuts: Record<string, string> = {}
    for (const key of Object.keys(legacyShortcuts)) {
        if (typeof sharedShortcuts[key] === 'undefined') {
            importedShortcuts[key] = legacyShortcuts[key]
        }
    }

    const hasImportedSettings = Object.keys(importedSettings).length > 0
    const hasImportedQuick = (!sharedQuickSelection && !!legacyQuickSelection) || (!sharedQuickOrder && !!legacyQuickOrder)
    if (!hasImportedSettings && !hasImportedQuick && Object.keys(importedShortcuts).length === 0) {
        // 已标记完成时不再重复写标记，保证重复初始化结果稳定
        if (!migrationState) {
            writeLegacyMigrationState(legacyImportStatusDone)
        }
        return false
    }

    const quick = sanitizeQuickSettingSelection(
        sharedQuickSelection || legacyQuickSelection,
        sharedQuickOrder || legacyQuickOrder,
    )
    const payload: UnifiedSettingsPreference = {
        schemaVersion: unifiedSettingsPreferenceSchemaVersion,
        updatedAt: new Date().toISOString(),
        settings: {
            ...(sharedPreference ? sharedPreference.settings : {}),
            ...importedSettings,
        },
        quickSelection: quick.selected,
        quickOrder: quick.order,
        shortcuts: {
            ...defaultShortcutBindings,
            ...legacyShortcuts,
            ...sharedShortcuts,
        },
    }
    writeUnifiedSettingsRaw(payload)
    if (!migrationState || migrationState.legacyImport !== legacyImportStatusDone) {
        writeLegacyMigrationState(legacyImportStatusDone)
    }
    return true
}

function getLayoutModeKey(readingMode: number): ReaderModeLayoutKey {
    return readingMode === 0 ? 'scroll' : 'book'
}

function syncThumbVisualMetrics(sizePx: number) {
    store.thumbItemWidth = Math.max(60, Math.round(sizePx))
    store.thumbImgWidth = Math.max(40, Math.round(store.thumbItemWidth * (100 / 150)))
    store.thumbItemHeight = Math.max(64, Math.round(store.thumbItemWidth * (160 / 150)))
}

function applyCurrentModeLayoutPreference() {
    const key = getLayoutModeKey(store.readingMode)
    const modeLayout = readerLayoutPreference.layouts[key]
    const slot = normalizeDockSlot(modeLayout.thumbSlot)
    store.thumbDockSlot = slot
    const clampedSize = clampThumbSize(slot, modeLayout.thumbSizePx)
    store.thumbViewWidth = clampedSize
    store.thumbViewHeight = clampThumbSize('bottom', modeLayout.thumbSizePx)
    syncThumbVisualMetrics(clampedSize)
}

function persistCurrentModeLayoutPreference() {
    const key = getLayoutModeKey(store.readingMode)
    const slot = normalizeDockSlot(store.thumbDockSlot)
    const size = slot === 'bottom' ? store.thumbViewHeight : store.thumbViewWidth
    const resetId = currentResetIdentity()
    readerLayoutPreference.layouts[key] = {
        thumbSlot: slot,
        thumbSizePx: clampThumbSize(slot, size),
        updatedAt: new Date().toISOString(),
        ...(resetId ? { resetId } : {}),
    }
    readerLayoutPreference.updatedAt = new Date().toISOString()
    readerLayoutPreference = writeLayoutPreference(readerLayoutPreference)
}

export const computedVisibleQuickSettingIds = computed(() => {
    const selected = new Set(store.quickSettingSelected)
    return store.quickSettingOrder.filter(id => {
        if (!selected.has(id)) {
            return false
        }
        const item = quickSettingOptions.find(option => option.id === id)
        if (!item) {
            return false
        }
        if (item.modeScope === 'both') {
            return true
        }
        if (item.modeScope === 'scroll-only') {
            return store.readingMode === 0
        }
        return store.readingMode === 1
    })
})

// Helper function to get responsive default values based on viewport width
function getResponsiveDefaults() {
    const width = typeof window !== 'undefined' ? window.innerWidth : 1024
    const isMobile = width < 767
    return {
        showThumbView: !isMobile,
        showBookThumbView: !isMobile,
        pagesPerScreen: isMobile ? 1 : 2,
        showBookPagination: !isMobile,
    }
}

const responsiveDefaults = getResponsiveDefaults()

export const store = reactive({
    // common
    viewportWidth: 0,
    viewportHeight: 0,

    // env variables
    isSupportThumbView: true,

    // top bar
    showTopBar: false,
    showMoreSettings: false,
    showMoreSettingsDialog: false,
    showThumbExpandDialog: false,
    showDownloadConfirmDialog: false,
    showInstructionDialog: false,
    instructionDialogTitle: '',
    instructionDialogMdText: '',
    instructionDialogCompulsive: false,
    instructionDialogOperations: <InstructionDialogOperation[]>[],
    instructionDialogStack: <InstructionDialogEntry[]>[],
    activeSettingsCategory: <SettingsCategory['id']>'general',
    topBarHeight: 40, // px, for calc
    readingMode: 0, // 0: scroll, 1: book
    widthScale: 80, // percent, the scale of img
    loadNum: 3, // the sum of pages per loading
    downloadChunkSize: 200,
    volumeSize: 100, // default 10, the page quantity per volume
    showThumbView: responsiveDefaults.showThumbView,
    bookDirection: 0, // 0: RTL, 1: LTR
    showBookPagination: responsiveDefaults.showBookPagination, // show/hide bottom floating pagination bar
    isChangeOddEven: false,
    isReverseFlip: false, // reverse the page flipping direction
    isAutoFlip: false,
    autoFlipFrequency: 10, // sec
    showBookThumbView: responsiveDefaults.showBookThumbView,
    IsReverseBookWheeFliplDirection: false,
    wheelSensitivity: 100,
    scrollPageMargin: 70,
    autoRetryByOtherSource: true,
    magnifierZoom: 3,
    magnifierAreaSize: 80,
    hasShownWelcomeInstruction: false,
    hasShownBookInstruction: false,
    lastSeenVersionNotice: '',
    lastRemoteUpdateNoticeAt: 0,
    quickSettingSelected: [...defaultQuickSettingSelected],
    quickSettingOrder: [...defaultQuickSettingOrder],
    shortcutBindings: <ShortcutBindingMap>{
        ...defaultShortcutBindings,
    },
    isFactoryResetDialogVisible: false,
    factoryResetStatus: 'idle',
    factoryResetErrorMessage: '',
    downloadNotifications: <DownloadStatusNotification[]>[],
    downloadTaskMap: <Record<string, DownloadTaskRecord>>{},

    // thumbView
    thumbDockSlot: <DockSlotId>'left',
    thumbViewWidth: 150, // px
    thumbViewHeight: 200, // px
    thumbItemWidth: 150, // px
    thumbItemHeight: 160, // px
    thumbImgWidth: 100, // px
    thumbExpandSegmentIndex: 0,

    // scroll view
    // volumePreloadCount: 2,

    // book view
    pagesPerScreen: responsiveDefaults.pagesPerScreen, // the page quantity per screen
    flipDirection: 0, // 0: next, 1: pre
    pageTurnAnimationMode: <PageTurnAnimationMode>defaultPageTurnAnimationMode,

    // gallery info
    thumbInfos: <ThumbInfo[]>[],
    imgPageInfos: <ImgPageInfo[]>[],
    pageCount: 0,
    curViewIndex: 0,
    curViewIndexUpdater: '',
    albumTitle: '',
})

export const computedCurVolNo = computed(() => {
    return Math.ceil((store.curViewIndex + 1) / store.volumeSize)
})

export const computedVolFirstIndex = computed(() => {
    return (computedCurVolNo.value - 1) * store.volumeSize
})

export const computedVolIndex = computed(() => {
    return store.curViewIndex - computedVolFirstIndex.value
})

export const computedVolumeSum = computed(() => {
    return Math.ceil(store.pageCount / store.volumeSize)
})

export const computedVolPageIndexList = computed(() => {
    let result: number[] = []
    const volLastExclusive = computedVolFirstIndex.value + store.volumeSize
    for (let i = computedVolFirstIndex.value; i < volLastExclusive && i < store.pageCount; i++) {
        result.push(i)
    }
    return result
})

export const computedVolPreloadPageIndexList = computed(() => {
    let result: number[] = []
    if (computedCurVolNo.value >= computedVolumeSum.value) {
        return result
    }
    let preloadNum = (store.curViewIndex + store.loadNum) - (computedVolFirstIndex.value + store.volumeSize)
    if (preloadNum <= 0) {
        return result
    }
    for (let i = 0; i < preloadNum; i++) {
        let index = computedVolFirstIndex.value + store.volumeSize + i
        if (index <= store.pageCount - 1) {
            result.push(index)
        }
    }
    return result
})

// the viewport width of AlbumBookView or AlbumScrollView, for calculating the page size of book view
export const computedAlbumViewportWidth = computed(() => {
    const showThumb = (store.readingMode == 0 && store.showThumbView) || (store.readingMode == 1 && store.showBookThumbView)
    if (showThumb && store.thumbDockSlot !== 'bottom') {
        return store.viewportWidth - store.thumbViewWidth
    }
    return store.viewportWidth
})

export const computedAlbumViewportHeight = computed(() => {
    const showThumb = (store.readingMode == 0 && store.showThumbView) || (store.readingMode == 1 && store.showBookThumbView)
    let height = store.viewportHeight
    if (store.showTopBar) {
        height -= store.topBarHeight
    }
    if (showThumb && store.thumbDockSlot === 'bottom') {
        height -= store.thumbViewHeight
    }
    return height
})

export const computedAlbumViewportRatio = computed(() => {
    return computedAlbumViewportHeight.value / computedAlbumViewportWidth.value
})

export const settingConf = {
    readingModeList: [
        { i18nKey: 'scrollMode', val: 0 },
        { i18nKey: 'bookMode', val: 1 },
    ],
    widthScale: {
        list: [40, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100],
        suffix: '%'
    },
    loadNum: {
        list: [1, 2, 3, 5, 10, 20, 30, 40, 50, 100],
        suffix: 'P'
    },
    downloadChunkSize: {
        list: [50, 100, 150, 200, 300, 500],
        suffix: 'P'
    },
    volumeSize: {
        list: [10, 20, 30, 50, 100],
        suffix: 'P'
    },
    pagesPerScreen: {
        list: [1, 2, 3, 4, 5],
        suffix: 'P',
    },
    bookDirection: {
        list: [
            { i18nKey: 'rtl', abbrI18nKey: 'rtlAbbr', val: 0 },
            { i18nKey: 'ltr', abbrI18nKey: 'ltrAbbr', val: 1 },
        ]
    },
    pageTurnAnimation: {
        list: [
            { i18nKey: 'pageTurnAnimationRealistic', val: 'realistic' },
            { i18nKey: 'pageTurnAnimationSlide', val: 'slide' },
            { i18nKey: 'pageTurnAnimationNone', val: 'none' },
        ]
    },
    autoFlipFrequency: {
        list: [3, 5, 8, 10, 15, 20, 30, 45, 60],
        suffix: ' sec'
    },
    wheelSensitivity: {
        list: [10, 30, 50, 80, 100, 120, 150, 170, 200, 220, 250],
    },
    magnifierZoom: {
        list: [2, 3, 4, 5],
        suffix: 'x'
    },
    magnifierAreaSize: {
        list: [50, 80, 120, 150],
        suffix: 'px'
    },
    scrollPageMargin: {
        list: [0, 30, 70, 100, 150],
        suffix: 'px'
    },
    langList: [
        { name: 'English', abbrName: 'EN', val: 'en' },
        { name: '简体中文', abbrName: 'CN', val: 'cn' },
        { name: '日本語', abbrName: 'JP', val: 'jp' }
    ]
}

export const storeAction = {
    toggleShowMoreSettings: () => {
        storeAction.toggleShowMoreSettingsDialog()
    },
    toggleShowMoreSettingsDialog: () => {
        store.showMoreSettingsDialog = !store.showMoreSettingsDialog
        if (store.showMoreSettingsDialog) {
            store.activeSettingsCategory = 'general'
        }
    },
    openMoreSettingsDialog: () => {
        store.showMoreSettingsDialog = true
        store.activeSettingsCategory = 'general'
    },
    closeMoreSettingsDialog: () => {
        store.showMoreSettingsDialog = false
    },
    openThumbExpandDialog: () => {
        store.thumbExpandSegmentIndex = getThumbExpandSegmentByPage(store.curViewIndex)
        store.showThumbExpandDialog = true
    },
    closeThumbExpandDialog: () => {
        store.showThumbExpandDialog = false
    },
    openDownloadConfirmDialog: () => {
        store.showDownloadConfirmDialog = true
    },
    closeDownloadConfirmDialog: () => {
        store.showDownloadConfirmDialog = false
    },
    openInstructionDialog: (payload: InstructionDialogPayload) => {
        store.instructionDialogStack.push(createInstructionDialogEntry(payload))
        syncInstructionDialogState()
    },
    closeInstructionDialog: (dialogId?: string) => {
        if (dialogId) {
            const index = store.instructionDialogStack.findIndex(dialog => dialog.id === dialogId)
            if (index >= 0) {
                store.instructionDialogStack.splice(index, 1)
            }
        } else {
            store.instructionDialogStack.pop()
        }
        syncInstructionDialogState()
        if (!store.showInstructionDialog) {
            checkInstructions()
        }
    },
    openWelcomeInstructionDialog: () => {
        openWelcomeInstructionDialog(false)
    },
    markWelcomeInstructionShown: () => {
        store.hasShownWelcomeInstruction = true
        persistUnifiedSettingsState()
    },
    markBookInstructionShown: () => {
        store.hasShownBookInstruction = true
        persistUnifiedSettingsState()
    },
    markVersionNoticeSeen: (version: string) => {
        store.lastSeenVersionNotice = version
        persistUnifiedSettingsState()
    },
    markRemoteUpdateNoticeShown: (timestamp: number) => {
        store.lastRemoteUpdateNoticeAt = timestamp
        persistUnifiedSettingsState()
    },
    setThumbExpandSegmentIndex: (segmentIndex: number) => {
        store.thumbExpandSegmentIndex = clampThumbExpandSegmentIndex(segmentIndex, store.pageCount)
    },
    setActiveSettingsCategory: (val: SettingsCategory['id']) => {
        store.activeSettingsCategory = val
    },
    toggleShowTopBar: () => {
        store.showTopBar = !store.showTopBar
    },
    setTopBar: (val: boolean) => {
        store.showTopBar = val
    },
    setReadingMode: (val: number) => {
        store.readingMode = val
        applyCurrentModeLayoutPreference()
        resetAutoFlipTimer()
        checkInstructions()
        persistUnifiedSettingsState()
    },
    setThumbDockSlot: (slot: DockSlotId) => {
        const normalized = normalizeDockSlot(slot)
        const previous = store.thumbDockSlot
        store.thumbDockSlot = normalized
        if (normalized === 'bottom') {
            store.thumbViewHeight = clampThumbSize('bottom', previous === 'bottom' ? store.thumbViewHeight : store.thumbViewWidth)
            syncThumbVisualMetrics(store.thumbViewHeight)
        } else {
            store.thumbViewWidth = clampThumbSize(normalized, previous === 'bottom' ? store.thumbViewHeight : store.thumbViewWidth)
            syncThumbVisualMetrics(store.thumbViewWidth)
        }
        persistCurrentModeLayoutPreference()
    },
    setThumbPanelSize: (val: number) => {
        if (store.thumbDockSlot === 'bottom') {
            store.thumbViewHeight = clampThumbSize('bottom', val)
            syncThumbVisualMetrics(store.thumbViewHeight)
        } else {
            store.thumbViewWidth = clampThumbSize(store.thumbDockSlot, val)
            syncThumbVisualMetrics(store.thumbViewWidth)
        }
        persistCurrentModeLayoutPreference()
    },
    setWidthScale: (val: number) => {
        store.widthScale = val
        persistUnifiedSettingsState()
    },
    setLoadNum: (val: number) => {
        store.loadNum = val
        persistUnifiedSettingsState()
    },
    setDownloadChunkSize: (val: number) => {
        if (!Number.isFinite(val) || val <= 0) {
            store.downloadChunkSize = 200
        } else {
            store.downloadChunkSize = Math.floor(val)
        }
        persistUnifiedSettingsState()
    },
    setVolumeSize: (val: number) => {
        store.volumeSize = val
        persistUnifiedSettingsState()
    },
    toggleShowThumbView: () => {
        store.showThumbView = !store.showThumbView
        persistUnifiedSettingsState()
    },
    setPagesPerScreen: (val: number) => {
        store.pagesPerScreen = val
        persistUnifiedSettingsState()
    },
    setBookDirection: (val: number) => {
        store.bookDirection = val
        persistUnifiedSettingsState()
    },
    setPageTurnAnimationMode: (val: string) => {
        let mode = normalizePageTurnAnimationMode(val)
        store.pageTurnAnimationMode = mode
        persistPageTurnAnimationMode(mode)
        if (mode === 'none') {
            if (bookTurnSettleTimerID) {
                window.clearTimeout(bookTurnSettleTimerID)
            }
            bookTurnSettleTimerID = 0
            isBookTurning = false
            pendingBookTurn = null
        }
        persistUnifiedSettingsState()
    },
    toggleShowBookPagination: () => {
        store.showBookPagination = !store.showBookPagination
        persistUnifiedSettingsState()
    },
    toggleIsChangeOddEven: () => {
        store.isChangeOddEven = !store.isChangeOddEven
        persistUnifiedSettingsState()
    },
    toggleOddEvenFromPageMenu: () => {
        store.isChangeOddEven = !store.isChangeOddEven
        persistUnifiedSettingsState()
    },
    toggleIsReverseFlip: () => {
        store.isReverseFlip = !store.isReverseFlip
        persistUnifiedSettingsState()
    },
    toggleIsAutoFlip: () => {
        store.isAutoFlip = !store.isAutoFlip
        resetAutoFlipTimer()
        persistUnifiedSettingsState()
    },
    setAutoFlipFrequency: (val: number) => {
        store.autoFlipFrequency = val
        persistUnifiedSettingsState()
    },
    toggleShowBookThumbView: () => {
        store.showBookThumbView = !store.showBookThumbView
        persistUnifiedSettingsState()
    },
    toggleIsReverseBookWheeFliplDirection: () => {
        store.IsReverseBookWheeFliplDirection = !store.IsReverseBookWheeFliplDirection
        persistUnifiedSettingsState()
    },
    setWheelSensitivity: (val: number) => {
        store.wheelSensitivity = val
        persistUnifiedSettingsState()
    },
    setScrollPageMargin: (val: number) => {
        store.scrollPageMargin = val
        persistUnifiedSettingsState()
    },
    setMagnifierZoom: (val: number) => {
        store.magnifierZoom = Math.max(2, Math.min(5, Math.round(val)))
        persistUnifiedSettingsState()
    },
    setMagnifierAreaSize: (val: number) => {
        store.magnifierAreaSize = Math.max(20, Math.min(300, Math.round(val)))
        persistUnifiedSettingsState()
    },
    setLang: (val: string) => {
        lang.value = val
        persistUnifiedSettingsState()
    },
    setAutoRetryByOtherSource: (val: boolean) => {
        store.autoRetryByOtherSource = val
        persistUnifiedSettingsState()
    },
    setShortcutBinding: (id: ShortcutActionId, val: string) => {
        store.shortcutBindings[id] = normalizeShortcutToken(val)
        persistUnifiedSettingsState()
    },
    resetShortcutBindings: () => {
        store.shortcutBindings = {
            ...defaultShortcutBindings,
        }
        persistUnifiedSettingsState()
    },
    isQuickSettingSelected: (id: string) => {
        return store.quickSettingSelected.includes(id)
    },
    toggleQuickSettingSelection: (id: string) => {
        if (id === pinnedQuickSettingId) {
            return
        }
        let index = store.quickSettingSelected.indexOf(id)
        if (index >= 0) {
            store.quickSettingSelected.splice(index, 1)
        } else {
            store.quickSettingSelected.push(id)
        }
        if (!store.quickSettingSelected.includes(pinnedQuickSettingId)) {
            store.quickSettingSelected.unshift(pinnedQuickSettingId)
        }
        persistUnifiedSettingsState()
    },
    moveQuickSettingItem: (id: string, targetIndex: number) => {
        if (id === pinnedQuickSettingId) {
            return
        }
        let from = store.quickSettingOrder.indexOf(id)
        if (from < 0) {
            return
        }
        const withoutPinned = store.quickSettingOrder.filter(item => item !== pinnedQuickSettingId)
        const currentIndex = withoutPinned.indexOf(id)
        if (currentIndex < 0) {
            return
        }
        const boundedTarget = Math.max(0, Math.min(targetIndex, withoutPinned.length - 1))
        if (boundedTarget === currentIndex) {
            return
        }
        withoutPinned.splice(currentIndex, 1)
        withoutPinned.splice(boundedTarget, 0, id)
        store.quickSettingOrder = [pinnedQuickSettingId, ...withoutPinned]
        persistUnifiedSettingsState()
    },
    showFactoryResetDialog: () => {
        store.isFactoryResetDialogVisible = true
        store.factoryResetStatus = 'confirming'
        store.factoryResetErrorMessage = ''
    },
    hideFactoryResetDialog: () => {
        store.isFactoryResetDialogVisible = false
        if (store.factoryResetStatus === 'confirming') {
            store.factoryResetStatus = 'idle'
        }
    },
    runFactoryReset: () => {
        try {
            store.factoryResetStatus = 'running'
            store.factoryResetErrorMessage = ''
            // 只清 eHunter 自己的键，避免连带清掉站点自身数据；ehunter: 覆盖当前设置键，
            // AlbumCache 覆盖 2.x 遗留相册缓存键（AlbumCache/AlbumCacheVersion），与新链路无持久化相册缓存一致
            const cleared = PlatformService.storageClear(['ehunter:', 'AlbumCache'])
            if (!cleared) {
                store.factoryResetStatus = 'failed'
                store.factoryResetErrorMessage = 'Factory reset failed'
                return
            }
            // 标记旧副本不再导入，避免被清掉的旧设置复活；标记写入失败时不能重载，
            // 否则内存中的标记随页面卸载，旧副本可能再次导入。
            // 本次重置铸造统一身份：标记与本站观察记录共用，重置后的新写入都带上它。
            const resetId = mintResetIdentity()
            if (!writeLegacyMigrationState(legacyImportStatusBlocked, resetId)) {
                store.factoryResetStatus = 'failed'
                store.factoryResetErrorMessage = 'Factory reset failed'
                return
            }
            // 成功重置后立即持久记录同一身份：即便后续 GM 读写故障，本页也能按身份区分
            // 本次 reset 之后的新写入与重置前旧副本（写失败时按没有记录处理，不伪造保证）。
            persistLocalResetObservation(resetId)
            store.factoryResetStatus = 'success'
            window.location.reload()
        } catch (e) {
            store.factoryResetStatus = 'failed'
            store.factoryResetErrorMessage = 'Factory reset failed'
        }
    },
    setCurViewIndex: (val: number, updater: string) => {
        const resolveBookTarget = (target: number): number => {
            if (store.readingMode !== 1) {
                return target
            }
            const step = Math.max(1, store.pagesPerScreen)
            const delta = target - store.curViewIndex
            if (Math.abs(delta) !== step) {
                return target
            }
            return getAdjacentBookPageIndex({
                pageCount: store.pageCount,
                pagesPerScreen: store.pagesPerScreen,
                isChangeOddEven: store.isChangeOddEven,
            }, store.curViewIndex, delta > 0 ? 1 : -1)
        }

        const applyCurViewIndex = (target: number, targetUpdater: string) => {
            if (target == store.curViewIndex) {
                return
            }
            let result = store.curViewIndex
            if (target < 0) {
                result = 0
            } else if (target >= store.pageCount) {
                result = store.pageCount - 1
            } else {
                result = target
            }
            if (result > store.curViewIndex) {
                store.flipDirection = 0
            } else if (result < store.curViewIndex) {
                store.flipDirection = 1
            }
            store.curViewIndex = result
            if (targetUpdater) {
                store.curViewIndexUpdater = targetUpdater
            }
            resetAutoFlipTimer()
        }

        const getBookTurnDuration = (): number => {
            switch (store.pageTurnAnimationMode) {
                case 'none':
                    return 0
                case 'slide':
                    return 220
                default:
                    return 280
            }
        }

        const settleBookTurn = () => {
            if (!pendingBookTurn) {
                isBookTurning = false
                bookTurnSettleTimerID = 0
                return
            }
            let nextTurn = pendingBookTurn
            pendingBookTurn = null
            applyCurViewIndex(nextTurn.val, nextTurn.updater)
            let duration = getBookTurnDuration()
            if (duration <= 0) {
                settleBookTurn()
                return
            }
            bookTurnSettleTimerID = window.setTimeout(settleBookTurn, duration)
        }

        if (store.readingMode == 1 && store.pageTurnAnimationMode !== 'none') {
            if (isBookTurning) {
                pendingBookTurn = { val: resolveBookTarget(val), updater }
                return
            }
            isBookTurning = true
            applyCurViewIndex(resolveBookTarget(val), updater)
            let duration = getBookTurnDuration()
            if (duration <= 0) {
                settleBookTurn()
            } else {
                bookTurnSettleTimerID = window.setTimeout(settleBookTurn, duration)
            }
            return
        }

        if (bookTurnSettleTimerID) {
            window.clearTimeout(bookTurnSettleTimerID)
            bookTurnSettleTimerID = 0
        }
        isBookTurning = false
        pendingBookTurn = null

        applyCurViewIndex(resolveBookTarget(val), updater)
    },
    setThumbInfos: (val: Array<ThumbInfo>) => {
        store.thumbInfos = val
    },
    setImgPageInfos: (val: Array<ImgPageInfo>) => {
        store.imgPageInfos = val
    },
    setImgPageInfoSrc: (index: number, val: string) => {
        if (index < store.imgPageInfos.length) {
            store.imgPageInfos[index].src = val
        }
    },
    setImgPageInfoPreciseHeightOfWidth: (index: number, val: number) => {
        if (index < store.imgPageInfos.length) {
            store.imgPageInfos[index].preciseHeightOfWidth = val
        }
    },
    setViewportWidth: (val: number) => {
        store.viewportWidth = val
    },
    setViewportHeight: (val: number) => {
        store.viewportHeight = val
    },
    getAlbumService: (): AlbumService | null => {
        return runtimeAlbumService
    },
    startDownloadTask: (taskId: string, albumTitle: string, totalPages: number) => {
        const now = new Date().toISOString()
        const terminateAction: DownloadStatusAction = {
            id: `terminate-${taskId}`,
            label: i18n.value.terminate,
            variant: 'danger',
            onClick: () => {
                const runner = downloadRunnerMap[taskId]
                if (runner) {
                    runner.abort(taskId)
                }
            },
        }
        store.downloadTaskMap[taskId] = {
            taskId,
            albumTitle,
            totalPages,
            processedPages: 0,
            failedPages: 0,
            status: 'queued',
            actions: [terminateAction],
            createdAt: now,
            updatedAt: now,
        }
    },
    registerDownloadRunner: (taskId: string, runner: GalleryDownloadService) => {
        downloadRunnerMap[taskId] = runner
    },
    clearDownloadRunner: (taskId: string) => {
        delete downloadRunnerMap[taskId]
    },
    applyDownloadStatusEvent: (taskId: string, albumTitle: string, event: DownloadStatusEvent) => {
        const now = new Date().toISOString()
        if (!store.downloadTaskMap[taskId]) {
            storeAction.startDownloadTask(taskId, albumTitle, event.totalPages)
        }
        const task = store.downloadTaskMap[taskId]
        task.status = event.phase
        task.processedPages = event.processedPages
        task.failedPages = event.failedPages
        task.totalPages = event.totalPages
        task.updatedAt = now

        const notificationId = `download:${taskId}`
        const index = store.downloadNotifications.findIndex(item => item.notificationId === notificationId)
        const payload: DownloadStatusNotification = {
            notificationId,
            taskId,
            title: albumTitle,
            phase: event.phase,
            severity: event.severity,
            message: event.message,
            progressCurrent: event.processedPages,
            progressTotal: event.totalPages,
            actions: ['completed', 'failed', 'partial'].includes(event.phase) ? [] : task.actions,
            createdAt: index >= 0 ? store.downloadNotifications[index].createdAt : now,
            updatedAt: now,
        }
        if (index >= 0) {
            store.downloadNotifications[index] = payload
            return
        }
        store.downloadNotifications.unshift(payload)
    },
    dismissDownloadNotification: (notificationId: string) => {
        const index = store.downloadNotifications.findIndex(item => item.notificationId === notificationId)
        if (index >= 0) {
            store.downloadNotifications.splice(index, 1)
        }
    },
    triggerDownloadNotificationAction: (notificationId: string, actionId: string) => {
        const notification = store.downloadNotifications.find(item => item.notificationId === notificationId)
        if (!notification || !notification.actions) {
            return
        }
        const action = notification.actions.find(item => item.id === actionId)
        if (action && action.onClick) {
            action.onClick(notification)
        }
    },
    getImgPageInfo: (val: number) => {
        return store.imgPageInfos[val]
    },
    getImgPageHeightOfWidth: (val: number) => {
        let info = storeAction.getImgPageInfo(val)
        if (info.preciseHeightOfWidth) {
            return info.preciseHeightOfWidth
        }
        return info.heightOfWidth
    },
}

let isInited = false
export function init(albumService: AlbumService) {
    if (isInited) {
        return
    }
    store.pageCount = albumService.getPageCount()
    runtimeAlbumService = albumService

    let thumbInfos = albumService.getThumbInfos(false)
    // console.log('[init] thumbInfos:', JSON.parse(JSON.stringify(thumbInfos)))
    store.thumbInfos = JSON.parse(JSON.stringify(thumbInfos))

    let imgPageInfos = albumService.getImgPageInfos()
    // console.log('[init] imgPageInfos:', JSON.parse(JSON.stringify(imgPageInfos)))
    store.imgPageInfos = JSON.parse(JSON.stringify(imgPageInfos))
    
    store.albumTitle = albumService.getTitle()
    store.curViewIndex = albumService.getCurPageIndex()
    migrateLegacySettingsIfNeeded()
    store.pageTurnAnimationMode = readPageTurnAnimationMode()
    applyUnifiedSettingsPreference()
    readerLayoutPreference = readReaderLayoutPreferenceRespectingReset()
    applyCurrentModeLayoutPreference()
    initViewportSizeUpdater()
    initKeyboardListener()
    resetAutoFlipTimer()
    checkInstructions()
    checkVersion()
    isInited = true
}

watch(() => lang.value, () => {
    persistUnifiedSettingsState()
})
