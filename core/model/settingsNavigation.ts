export interface SettingsSectionOffset {
    id: string
    offsetTop: number
}

export const settingsCategoryActivationOffsetPx = 24

export function resolveActiveSettingsCategory(
    scrollTop: number,
    sections: SettingsSectionOffset[],
    scrollMax: number,
): string {
    const last = sections[sections.length - 1]
    if (!last) {
        return ''
    }
    if (scrollMax > 0 && scrollTop >= scrollMax - 1) {
        return last.id
    }
    let active = sections[0].id
    for (const section of sections) {
        if (scrollTop + settingsCategoryActivationOffsetPx >= section.offsetTop) {
            active = section.id
        }
    }
    return active
}

export function resolveSettingsCategoryScrollTop(
    targetOffsetTop: number,
    scrollMax: number,
): number {
    return Math.max(0, Math.min(Math.round(targetOffsetTop), Math.max(0, scrollMax)))
}
