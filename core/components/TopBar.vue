<template>
    <nav class="top-bar">
        <div class="float-content" ref="floatContentRef">
            <div class="more-button-wrapper">
                <CircleIconButton class="button tips tips-left tips-down" icon-type="more"
                    :title-content="i18n.more" @click="toggleMoreMenu" size="normal"/>
                <MoreMenuPopover 
                    :active="showMoreMenu"
                    @close="showMoreMenu = false"
                    @more-settings="storeAction.openMoreSettingsDialog()"
                    @quick-preview="storeAction.openThumbExpandDialog()"
                    @download="storeAction.openDownloadConfirmDialog()" />
            </div>
            <CircleIconButton class="button tips tips-left tips-down" icon-type="menu"
                :title-content="i18n.toggleTopBar" :rotate="store.showTopBar" @click="storeAction.toggleShowTopBar()" size="normal"/>
            <CircleIconButton class="button tips tips-left tips-down" icon-type="close"
                :title-content="i18n.closeEHunter" @click="closeEHunter" size="normal"/>
        </div>
        <div :class="['inner-content', { hide: !store.showTopBar }]" ref="innerContentRef">
            <div class="item" v-for="(field, index) in topBarFields" :key="field.id" 
                :class="{ 'less-margin': field.id === 'lang' }"
                :style="getItemStyle(index)">
                <span
                    class="label tips tips-down tips-right"
                    :title-content="field.tipI18nKey ? i18n[field.tipI18nKey] : ''">
                    {{ i18n[field.labelI18nKey] }}:
                </span>
                <DropOption
                    v-if="field.control === 'drop'"
                    :list="getDropList(field.id)"
                    :cur-val="getFieldValue(field.id)"
                    :format-cur-val-by-list="true"
                    :use-abbr-name="!!field.useAbbrName"
                    @change="(val) => handleFieldChange(field.id, val)" />
                <NumDropOption
                    v-else-if="field.control === 'num'"
                    :quick-options="getNumList(field.id)"
                    :cur-val="getFieldValue(field.id)"
                    :suffix="getNumSuffix(field.id)"
                    :min="field.min || 0"
                    :max="field.max || 999"
                    :is-float="!!field.isFloat"
                    @change="(val) => handleFieldChange(field.id, val)" />
                <SimpleSwitch
                    v-else-if="field.control === 'switch'"
                    :active="!!getFieldValue(field.id)"
                    @change="(val) => handleFieldChange(field.id, val)" />
            </div>
        </div>
        <MoreSettingsDialog />
        <DownloadConfirmDialog />
    </nav>
</template>

<script setup lang="ts">
/// <reference types="vite-svg-loader" />
import DropOption from './widget/DropOption.vue'
import NumDropOption from './widget/NumDropOption.vue'
import SimpleSwitch from './widget/SimpleSwitch.vue'
import CircleIconButton from './widget/CircleIconButton.vue'
import MoreMenuPopover from './widget/MoreMenuPopover.vue'
import { i18n } from '../store/i18n'
import { store, storeAction, computedVisibleQuickSettingIds, settingFieldMap } from '../store/app'
import MoreSettingsDialog from './MoreSettingsDialog.vue'
import DownloadConfirmDialog from './dialog/DownloadConfirmDialog.vue'
import { computed, ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import type { CSSProperties } from 'vue'
import { getFieldValue, setFieldValue, getDropList, getNumList, getNumSuffix } from '../store/settingFieldRuntime'

const emit = defineEmits(['closeEHunter'])

const showMoreMenu = ref(false)
const innerContentRef = ref<HTMLElement | null>(null)
const floatContentRef = ref<HTMLElement | null>(null)
const itemVisibility = ref<boolean[]>([])
const isMeasuring = ref(false)

let checkOverlapTimer: number | null = null

function getItemStyle(index: number): CSSProperties {
    if (isMeasuring.value) {
        return { visibility: 'hidden' }
    }
    if (itemVisibility.value[index] === false) {
        return { display: 'none' }
    }
    return {}
}

const topBarFields = computed(() => {
    return computedVisibleQuickSettingIds.value
        .map(id => settingFieldMap[id])
        .filter((field): field is NonNullable<typeof field> => !!field)
        .filter(field => {
            if (!field.showInTopBar) {
                return false
            }
            if (field.modeScope === 'scroll-only' && store.readingMode !== 0) {
                return false
            }
            if (field.modeScope === 'book-only' && store.readingMode !== 1) {
                return false
            }
            if (field.requireThumbSupportInTopBar && !store.isSupportThumbView) {
                return false
            }
            return true
        })
})

function handleFieldChange(id: string, val: any) {
    setFieldValue(id, val)
}

function toggleMoreMenu() {
    showMoreMenu.value = !showMoreMenu.value
}

function closeEHunter() {
    emit('closeEHunter')
}

function checkOverlap() {
    if (!innerContentRef.value || !floatContentRef.value) {
        return
    }

    if (!store.showTopBar) {
        return
    }

    isMeasuring.value = true
    itemVisibility.value = new Array(topBarFields.value.length).fill(true)

    nextTick(() => {
        const items = innerContentRef.value?.querySelectorAll('.item')
        if (!items || items.length === 0) {
            isMeasuring.value = false
            return
        }

        const floatRect = floatContentRef.value?.getBoundingClientRect()
        if (!floatRect) {
            isMeasuring.value = false
            return
        }

        const floatLeft = floatRect.left

        const visibility: boolean[] = []
        for (let i = 0; i < items.length; i++) {
            const itemRect = items[i].getBoundingClientRect()
            const itemRight = itemRect.right
            
            visibility[i] = itemRight + 10 <= floatLeft
        }

        isMeasuring.value = false
        itemVisibility.value = visibility
    })
}

let resizeObserver: ResizeObserver | null = null

function debouncedCheckOverlap(immediate = false) {
    if (checkOverlapTimer) {
        clearTimeout(checkOverlapTimer)
    }
    
    if (immediate) {
        checkOverlap()
    } else {
        checkOverlapTimer = window.setTimeout(() => {
            checkOverlap()
            checkOverlapTimer = null
        }, 100)
    }
}

const handleResize = () => debouncedCheckOverlap()

onMounted(() => {
    nextTick(() => {
        checkOverlap()
    })

    window.addEventListener('resize', handleResize)

    if (innerContentRef.value) {
        resizeObserver = new ResizeObserver(() => {
            debouncedCheckOverlap()
        })
        resizeObserver.observe(innerContentRef.value)
    }
})

onUnmounted(() => {
    window.removeEventListener('resize', handleResize)
    if (resizeObserver) {
        resizeObserver.disconnect()
    }
    if (checkOverlapTimer) {
        clearTimeout(checkOverlapTimer)
    }
})

watch(topBarFields, () => {
    nextTick(() => {
        checkOverlap()
    })
}, { deep: true })

watch(() => store.showTopBar, (newVal) => {
    if (newVal) {
        setTimeout(() => {
            checkOverlap()
        }, 350) // 动画时间是 0.3s，加上一点缓冲
    }
})

watch(() => store.readingMode, () => {
    setTimeout(() => {
        checkOverlap()
    }, 500)
})

</script>

<style lang="scss" scoped>
@import '../style/_responsive';
@import '../style/_variables';

div {
    display: flex;
}

.top-bar {
    width: 100%;
    padding: 0;
    margin: 0;
    background: transparent;
    position: relative;

    >.float-content {
        position: absolute;
        top: 0;
        right: 0;
        align-items: center;
        z-index: 20000;
        height: v-bind('store.topBarHeight+"px"');

        >.more-button-wrapper {
            position: relative;
            display: flex;
            flex-direction: row;
            align-items: center;
        }

        >.button, >.more-button-wrapper {
            margin-right: 13px;
        }
    }

    >.inner-content {
        color: white;
        flex-grow: 1;
        background: $accent_color;
        font-size: 14px;
        transition: all 0.3s ease;
        height: v-bind('store.topBarHeight + "px"');

        >.item {
            margin-left: 18px;
            position: relative;
            height: 40px;

            &.less-margin {
                margin-left: 10px;
            }

            >.label {
                display: flex;
                align-items: center;
                font-size: 14px;
                margin: auto;
                white-space: nowrap;
                cursor: default;

                &.icon {
                    >svg {
                        fill: white;
                        height: 18px;
                        width: 18px;

                        &.reset {
                            height: 18px;
                            width: 18px;
                        }

                        &.info {
                            height: 20px;
                            width: 20px;
                        }

                        &.github {
                            height: 17px;
                            height: 17px;
                        }
                    }
                }

                &.clickable {
                    cursor: pointer;
                }
            }
        }

        &.hide {
            transform: translateY(-100%);
        }

    }
}
</style>
