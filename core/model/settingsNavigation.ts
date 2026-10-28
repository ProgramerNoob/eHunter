export interface SettingsSectionOffset<T extends string = string> {
    id: T
    offsetTop: number
}

export const settingsCategoryActivationOffsetPx = 24

export function resolveActiveSettingsCategory<T extends string>(
    scrollTop: number,
    sections: SettingsSectionOffset<T>[],
    scrollMax: number,
): T | null {
    const last = sections[sections.length - 1]
    if (!last) {
        return null
    }
    if (scrollMax > 0 && scrollTop >= scrollMax - 1 && last.offsetTop > scrollMax) {
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
