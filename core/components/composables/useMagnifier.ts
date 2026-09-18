import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch, type ComputedRef, type Ref } from 'vue'
import Logger from '../../utils/logger'

function clamp(val: number, min: number, max: number) {
    return Math.max(min, Math.min(max, val))
}

interface UseMagnifierOptions {
    pageViewRef: Ref<HTMLElement | null>
    imgRef: Ref<HTMLImageElement | null>
    magnifierCanvasRef: Ref<HTMLCanvasElement | null>
    imgSrc: ComputedRef<string>
    isDesktopPointer: ComputedRef<boolean>
    magnifierZoom: ComputedRef<number>
    magnifierAreaSize: ComputedRef<number>
    pendingRevealDelayMs: number
    lensGap: number
    onSyncEnabled?: (enabled: boolean) => void
}

interface RectBox {
    left: number
    top: number
    right: number
    bottom: number
    width: number
    height: number
}

interface LensCandidate {
    placement: LensPlacement
    x: number
    y: number
}

type LensPlacement = 'right' | 'left' | 'bottom' | 'top'

const viewportPadding = 8
const minLensSide = 1

export function useMagnifier(options: UseMagnifierOptions) {
    const {
        pageViewRef,
        imgRef,
        magnifierCanvasRef,
        imgSrc,
        isDesktopPointer,
        magnifierZoom,
        magnifierAreaSize,
        pendingRevealDelayMs,
        lensGap,
        onSyncEnabled,
    } = options

    const magnifierEnabled = ref(false)
    const pointerX = ref(0)
    const pointerY = ref(0)
    const hasPointerInView = ref(false)
    const hasVisibleIntersection = ref(false)
    const lensPlacement = ref<LensPlacement>('right')
    const lensX = ref(0)
    const lensY = ref(0)
    const focusX = ref(0)
    const focusY = ref(0)
    const effectiveSampleSize = ref(magnifierAreaSize.value)
    const effectiveLensSize = ref(magnifierAreaSize.value * magnifierZoom.value)
    const lensWarmState = ref<'pending' | 'ready'>('pending')
    const magnifierReady = ref(false)
    const showPendingIndicator = ref(false)
    const pendingRevealTimerId = ref<number | null>(null)
    const magnifierWarmToken = ref(0)

    const focusBoxSize = computed(() => effectiveSampleSize.value)
    const lensSize = computed(() => effectiveLensSize.value)

    const showFocusIndicator = computed(() => {
        return isDesktopPointer.value && magnifierEnabled.value && hasPointerInView.value && hasVisibleIntersection.value && lensWarmState.value === 'ready'
    })

    const showMagnifierLens = computed(() => {
        return isDesktopPointer.value && magnifierEnabled.value && hasPointerInView.value && hasVisibleIntersection.value
    })

    const showMagnifierPending = computed(() => {
        return showMagnifierLens.value && lensWarmState.value === 'pending' && showPendingIndicator.value
    })

    function getPageRect() {
        return pageViewRef.value?.getBoundingClientRect() || null
    }

    function getIntersectionRect(rect: DOMRect): RectBox | null {
        const left = Math.max(rect.left, 0)
        const top = Math.max(rect.top, 0)
        const right = Math.min(rect.right, window.innerWidth)
        const bottom = Math.min(rect.bottom, window.innerHeight)
        const width = right - left
        const height = bottom - top
        if (width <= 0 || height <= 0) {
            return null
        }
        return { left, top, right, bottom, width, height }
    }

    const focusIndicatorStyle = computed(() => {
        if (!hasVisibleIntersection.value) {
            return {}
        }
        return {
            width: `${focusBoxSize.value}px`,
            height: `${focusBoxSize.value}px`,
            transform: `translate(${focusX.value}px, ${focusY.value}px)`,
        }
    })

    const magnifierLensStyle = computed(() => {
        if (!hasVisibleIntersection.value) {
            return {}
        }
        return {
            width: `${lensSize.value}px`,
            height: `${lensSize.value}px`,
            transform: `translate(${lensX.value}px, ${lensY.value}px)`,
        }
    })

    function clearPendingRevealTimer() {
        if (pendingRevealTimerId.value !== null) {
            window.clearTimeout(pendingRevealTimerId.value)
            pendingRevealTimerId.value = null
        }
    }

    function waitForImageLoad(imgEl: HTMLImageElement) {
        if (imgEl.complete && imgEl.naturalWidth > 0) {
            return Promise.resolve()
        }
        return new Promise<void>((resolve, reject) => {
            const onLoad = () => {
                cleanup()
                resolve()
            }
            const onError = () => {
                cleanup()
                reject(new Error('IMG_LOAD_FAILED'))
            }
            const cleanup = () => {
                imgEl.removeEventListener('load', onLoad)
                imgEl.removeEventListener('error', onError)
            }
            imgEl.addEventListener('load', onLoad, { once: true })
            imgEl.addEventListener('error', onError, { once: true })
        })
    }

    async function warmMagnifierSource(expectedSrc: string) {
        const warmToken = ++magnifierWarmToken.value
        magnifierReady.value = false
        lensWarmState.value = 'pending'
        await nextTick()
        const imgEl = imgRef.value
        if (!imgEl || imgSrc.value !== expectedSrc) {
            return
        }
        try {
            await waitForImageLoad(imgEl)
            if (typeof imgEl.decode === 'function') {
                try {
                    await imgEl.decode()
                } catch (decodeError) {
                    Logger.logText('MAGNIFIER', `image decode failed: ${String(decodeError)}`)
                }
            }
            if (warmToken !== magnifierWarmToken.value || imgSrc.value !== expectedSrc) {
                return
            }
            magnifierReady.value = true
            lensWarmState.value = 'ready'
            if (showMagnifierLens.value) {
                updateLensPosition()
            }
        } catch (warmError) {
            Logger.logText('MAGNIFIER', `warm magnifier source failed: ${String(warmError)}`)
            if (warmToken !== magnifierWarmToken.value) {
                return
            }
            magnifierReady.value = false
            lensWarmState.value = 'pending'
        }
    }

    function renderMagnifierCanvas() {
        const canvas = magnifierCanvasRef.value
        const imgEl = imgRef.value
        const rect = getPageRect()
        if (!canvas || !imgEl || !rect || !magnifierReady.value || !hasVisibleIntersection.value) {
            return
        }
        const sampleSize = effectiveSampleSize.value
        const outputSize = effectiveLensSize.value
        const dpr = window.devicePixelRatio || 1
        const targetWidth = Math.max(1, Math.round(outputSize * dpr))
        const targetHeight = Math.max(1, Math.round(outputSize * dpr))
        if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
            canvas.width = targetWidth
            canvas.height = targetHeight
        }

        const ctx = canvas.getContext('2d')
        if (!ctx) {
            return
        }

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        ctx.clearRect(0, 0, outputSize, outputSize)
        ctx.imageSmoothingEnabled = true

        const scaleX = imgEl.naturalWidth / Math.max(1, rect.width)
        const scaleY = imgEl.naturalHeight / Math.max(1, rect.height)
        const sourceLeftCss = clamp(focusX.value, 0, Math.max(0, rect.width - sampleSize))
        const sourceTopCss = clamp(focusY.value, 0, Math.max(0, rect.height - sampleSize))
        const sourceX = sourceLeftCss * scaleX
        const sourceY = sourceTopCss * scaleY
        const sourceWidth = sampleSize * scaleX
        const sourceHeight = sampleSize * scaleY

        ctx.drawImage(imgEl, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, outputSize, outputSize)
    }

    function resolveSamplingAxis(pointer: number, size: number, preferredMin: number, preferredMax: number, fallbackMin: number, fallbackMax: number) {
        if (preferredMax - preferredMin >= size) {
            return clamp(pointer - size / 2, preferredMin, preferredMax - size)
        }
        if (fallbackMax - fallbackMin >= size) {
            return clamp(pointer - size / 2, fallbackMin, fallbackMax - size)
        }
        return clamp(pointer - size / 2, fallbackMin, Math.max(fallbackMin, fallbackMax - size))
    }

    function getOverlapArea(ax: number, ay: number, aSize: number, bx: number, by: number, bSize: number) {
        const width = Math.min(ax + aSize, bx + bSize) - Math.max(ax, bx)
        const height = Math.min(ay + aSize, by + bSize) - Math.max(ay, by)
        if (width <= 0 || height <= 0) {
            return 0
        }
        return width * height
    }

    function resolveLensPlacement(lensSide: number, sampleSize: number, bounds: { minX: number, maxX: number, minY: number, maxY: number }) {
        const candidates: LensCandidate[] = [
            { placement: 'right', x: focusX.value + sampleSize + lensGap, y: focusY.value + sampleSize / 2 - lensSide / 2 },
            { placement: 'left', x: focusX.value - lensGap - lensSide, y: focusY.value + sampleSize / 2 - lensSide / 2 },
            { placement: 'bottom', x: focusX.value + sampleSize / 2 - lensSide / 2, y: focusY.value + sampleSize + lensGap },
            { placement: 'top', x: focusX.value + sampleSize / 2 - lensSide / 2, y: focusY.value - lensGap - lensSide },
        ]
        let best: { placement: LensPlacement, x: number, y: number, overlap: number } | null = null
        for (const candidate of candidates) {
            const x = clamp(candidate.x, bounds.minX, Math.max(bounds.minX, bounds.maxX - lensSide))
            const y = clamp(candidate.y, bounds.minY, Math.max(bounds.minY, bounds.maxY - lensSide))
            const overlap = getOverlapArea(x, y, lensSide, focusX.value, focusY.value, sampleSize)
            if (!best || overlap < best.overlap) {
                best = { placement: candidate.placement, x, y, overlap }
            }
        }
        return best as { placement: LensPlacement, x: number, y: number, overlap: number }
    }

    function updateLensPosition() {
        const rect = getPageRect()
        const intersection = rect ? getIntersectionRect(rect) : null
        if (!rect || !intersection) {
            hasVisibleIntersection.value = false
            effectiveSampleSize.value = magnifierAreaSize.value
            effectiveLensSize.value = magnifierAreaSize.value * magnifierZoom.value
            return
        }
        hasVisibleIntersection.value = true

        const isPointerInPage = pointerX.value >= rect.left && pointerX.value <= rect.right && pointerY.value >= rect.top && pointerY.value <= rect.bottom
        if (!isPointerInPage) {
            hasPointerInView.value = false
            return
        }

        const zoom = Math.max(1, magnifierZoom.value)
        const maxLensSide = Math.min(intersection.width, intersection.height)
        const lensSide = Math.max(minLensSide, Math.min(magnifierAreaSize.value * zoom, maxLensSide))
        const sampleSize = lensSide / zoom
        effectiveSampleSize.value = sampleSize
        effectiveLensSize.value = lensSide

        const interLocalLeft = intersection.left - rect.left
        const interLocalTop = intersection.top - rect.top
        const interLocalRight = intersection.right - rect.left
        const interLocalBottom = intersection.bottom - rect.top
        const localPointerX = clamp(pointerX.value - rect.left, 0, rect.width)
        const localPointerY = clamp(pointerY.value - rect.top, 0, rect.height)

        focusX.value = resolveSamplingAxis(localPointerX, sampleSize, interLocalLeft, interLocalRight, 0, rect.width)
        focusY.value = resolveSamplingAxis(localPointerY, sampleSize, interLocalTop, interLocalBottom, 0, rect.height)

        const bounds = {
            minX: interLocalRight - interLocalLeft >= lensSide + viewportPadding * 2 ? interLocalLeft + viewportPadding : interLocalLeft,
            maxX: interLocalRight - interLocalLeft >= lensSide + viewportPadding * 2 ? interLocalRight - viewportPadding : interLocalRight,
            minY: interLocalBottom - interLocalTop >= lensSide + viewportPadding * 2 ? interLocalTop + viewportPadding : interLocalTop,
            maxY: interLocalBottom - interLocalTop >= lensSide + viewportPadding * 2 ? interLocalBottom - viewportPadding : interLocalBottom,
        }
        const resolved = resolveLensPlacement(lensSide, sampleSize, bounds)
        lensPlacement.value = resolved.placement
        lensX.value = resolved.x
        lensY.value = resolved.y

        if (lensWarmState.value === 'ready') {
            renderMagnifierCanvas()
        }
    }

    function hideMagnifierPointerArtifacts() {
        hasPointerInView.value = false
    }

    function onMouseMove(e: MouseEvent) {
        if (!isDesktopPointer.value || !magnifierEnabled.value) {
            return
        }
        pointerX.value = e.clientX
        pointerY.value = e.clientY
        hasPointerInView.value = true
        updateLensPosition()
    }

    function onMouseLeave() {
        hideMagnifierPointerArtifacts()
    }

    function onViewportChange() {
        updateLensPosition()
    }

    function applyEnabled(enabled: boolean) {
        magnifierEnabled.value = enabled
        onSyncEnabled?.(enabled)
        if (enabled && imgSrc.value && lensWarmState.value !== 'ready') {
            void warmMagnifierSource(imgSrc.value)
        }
        if (!enabled) {
            hideMagnifierPointerArtifacts()
        }
    }

    function onMagnifierToggleSync(e: CustomEvent<{ enabled?: boolean }>) {
        applyEnabled(!!e.detail?.enabled)
    }

    function broadcastEnabled(enabled: boolean) {
        document.dispatchEvent(new CustomEvent('ehunter:magnifier-toggle', {
            detail: { enabled },
        }))
    }

    function toggleMagnifier() {
        const nextEnabled = !magnifierEnabled.value
        broadcastEnabled(nextEnabled)
        applyEnabled(nextEnabled)
    }

    function setEnabledFromSession(enabled: boolean) {
        applyEnabled(enabled)
    }

    let pageResizeObserver: ResizeObserver | null = null

    watch([showMagnifierLens, lensWarmState], ([showLens, warmState]) => {
        clearPendingRevealTimer()
        showPendingIndicator.value = false
        if (showLens && warmState === 'pending') {
            pendingRevealTimerId.value = window.setTimeout(() => {
                if (showMagnifierLens.value && lensWarmState.value === 'pending') {
                    showPendingIndicator.value = true
                }
            }, pendingRevealDelayMs)
        }
    })

    watch([magnifierZoom, magnifierAreaSize, showMagnifierLens], () => {
        updateLensPosition()
    })

    watch(imgSrc, (newSrc, oldSrc) => {
        if (newSrc === oldSrc) {
            return
        }
        magnifierReady.value = false
        lensWarmState.value = 'pending'
        if (!newSrc) {
            return
        }
        void warmMagnifierSource(newSrc)
    })

    onMounted(() => {
        document.addEventListener('ehunter:magnifier-toggle', onMagnifierToggleSync as EventListener)
        window.addEventListener('resize', onViewportChange)
        window.addEventListener('scroll', onViewportChange, { capture: true, passive: true })
        if (typeof ResizeObserver !== 'undefined') {
            pageResizeObserver = new ResizeObserver(onViewportChange)
            if (pageViewRef.value) {
                pageResizeObserver.observe(pageViewRef.value)
            }
            if (imgRef.value) {
                pageResizeObserver.observe(imgRef.value)
            }
        }
        updateLensPosition()
    })

    onBeforeUnmount(() => {
        clearPendingRevealTimer()
        document.removeEventListener('ehunter:magnifier-toggle', onMagnifierToggleSync as EventListener)
        window.removeEventListener('resize', onViewportChange)
        window.removeEventListener('scroll', onViewportChange, { capture: true })
        pageResizeObserver?.disconnect()
        pageResizeObserver = null
    })

    return {
        magnifierEnabled,
        lensWarmState,
        showFocusIndicator,
        showMagnifierLens,
        showMagnifierPending,
        focusIndicatorStyle,
        magnifierLensStyle,
        warmMagnifierSource,
        updateLensPosition,
        hideMagnifierPointerArtifacts,
        onMouseMove,
        onMouseLeave,
        toggleMagnifier,
        setEnabledFromSession,
    }
}
