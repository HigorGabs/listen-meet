import { describe, expect, it } from 'vitest'
import { getMessages, normalizeLocale } from './i18n'

describe('i18n', () => {
  it('normalizes supported locales and falls back to pt-BR', () => {
    expect(normalizeLocale('pt-BR')).toBe('pt-BR')
    expect(normalizeLocale('en')).toBe('en')
    expect(normalizeLocale('es')).toBe('pt-BR')
  })

  it('provides Portuguese and English navigation strings', () => {
    expect(getMessages('pt-BR').nav.record).toBe('Gravar Reunião')
    expect(getMessages('en').nav.record).toBe('Record Meeting')
    expect(getMessages('pt-BR').settings.title).toBe('Configurar IA')
    expect(getMessages('en').settings.title).toBe('Configure AI')
  })
})
