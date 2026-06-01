export const STUDIO_THEME_STORAGE_KEY = 'listen-meet-theme'

export const STUDIO_THEMES = [
  { id: 'dark', label: 'Dark' },
  { id: 'white', label: 'White' },
] as const

export type StudioThemeId = typeof STUDIO_THEMES[number]['id']

export function isStudioThemeId(value: unknown): value is StudioThemeId {
  return typeof value === 'string' && STUDIO_THEMES.some((theme) => theme.id === value)
}

export function normalizeStudioTheme(value: unknown): StudioThemeId {
  return isStudioThemeId(value) ? value : 'dark'
}
