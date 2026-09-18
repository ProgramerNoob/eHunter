function normalizeHostToHostname(hostOrHostname: string): string {
    const trimmed = hostOrHostname.trim()
    if (!trimmed) {
        return ''
    }
    if (trimmed.startsWith('[')) {
        const end = trimmed.indexOf(']')
        return end > 0 ? trimmed.slice(1, end) : trimmed
    }
    const firstColon = trimmed.indexOf(':')
    if (firstColon > -1) {
        return trimmed.slice(0, firstColon)
    }
    return trimmed
}

export function isIPv4Host(hostOrHostname: string): boolean {
    const hostname = normalizeHostToHostname(hostOrHostname)
    return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname)
}

export function isTestEnvironmentHost(hostOrHostname: string): boolean {
    const hostname = normalizeHostToHostname(hostOrHostname)
    return hostname === 'localhost' || isIPv4Host(hostname)
}

export function isTestEnvironment(): boolean {
    return isTestEnvironmentHost(window.location.host || '')
}

/**
 * 设备形态判断：供 EH 移动端视口处理与翻页动效默认值共用。
 * 触摸设备（粗指针）或常见移动端 UA 视为移动端。
 */
export function isMobileLikeDevice(): boolean {
    try {
        if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) {
            return true
        }
    } catch (e) {
    }
    const userAgent = typeof navigator === 'undefined' ? '' : navigator.userAgent || ''
    return /iphone|ipad|ipod|android|mobile/i.test(userAgent)
}
