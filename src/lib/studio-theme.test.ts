import { describe, expect, it } from 'vitest'
import { STUDIO_THEMES, normalizeStudioTheme } from './studio-theme'

describe('studio theme', () => {
  it('supports only dark and white themes', () => {
    expect(STUDIO_THEMES.map((theme) => theme.id)).toEqual(['dark', 'white'])
  })

  it('falls back old or invalid theme values to dark', () => {
    expect(normalizeStudioTheme('default')).toBe('dark')
    expect(normalizeStudioTheme('custom')).toBe('dark')
    expect(normalizeStudioTheme('white')).toBe('white')
  })
})
