import { computed, onBeforeUnmount, onMounted, ref, type Ref } from 'vue'

function clamp(val: number, min: number, max: number) {
    return Math.max(min, Math.min(max, val))
}

interface UsePageMenuOptions {
    pageViewRef: Ref<HTMLElement | null>
    menuOwnerId: string
    shouldIgnoreClick?: (event: MouseEvent) => boolean
}

export function usePageMenu(options: UsePageMenuOptions) {
    const { pageViewRef, menuOwnerId, shouldIgnoreClick } = options

    const menuOpen = ref(false)
    const menuAnchorX = ref(12)
    const menuAnchorY = ref(12)

    const menuAnchorStyle = computed(() => ({
        left: `${menuAnchorX.value}px`,
        top: `${menuAnchorY.value}px`,
    }))

    function getPageRect() {
        return pageViewRef.value?.getBoundingClientRect() || null
    }

    function positionMenu(clientX: number, clientY: number) {
        const rect = getPageRect()
        if (!rect) {
            menuAnchorX.value = 12
            menuAnchorY.value = 12
            return
        }
        menuAnchorX.value = clamp(clientX - rect.left, 8, Math.max(8, rect.width - 8))
        menuAnchorY.value = clamp(clientY - rect.top, 8, Math.max(8, rect.height - 8))
    }

    function openMenuAt(clientX: number, clientY: number) {
        document.dispatchEvent(new CustomEvent('ehunter:page-menu-open', {
            detail: { owner: menuOwnerId },
        }))
        positionMenu(clientX, clientY)
        menuOpen.value = true
    }

    function closeMenu() {
        menuOpen.value = false
    }

    function onOtherPageMenuOpen(e: CustomEvent<{ owner?: string }>) {
        if (e.detail?.owner !== menuOwnerId && menuOpen.value) {
            closeMenu()
        }
    }

    function onDocumentClick(e: MouseEvent) {
        if (!menuOpen.value) {
            return
        }
        // 长按打开菜单的手势会在松手时补发一次合成 click，此时不应关闭菜单
        if (shouldIgnoreClick?.(e)) {
            return
        }
        const root = pageViewRef.value
        const target = e.target as Node | null
        if (!root || !target) {
            closeMenu()
            return
        }
        const menuAnchor = root.querySelector('.menu-anchor')
        if (menuAnchor && menuAnchor.contains(target)) {
            return
        }
        closeMenu()
    }

    onMounted(() => {
        document.addEventListener('ehunter:page-menu-open', onOtherPageMenuOpen as EventListener)
        document.addEventListener('click', onDocumentClick, true)
    })

    onBeforeUnmount(() => {
        document.removeEventListener('ehunter:page-menu-open', onOtherPageMenuOpen as EventListener)
        document.removeEventListener('click', onDocumentClick, true)
    })

    return {
        menuOpen,
        menuAnchorStyle,
        openMenuAt,
        closeMenu,
    }
}
