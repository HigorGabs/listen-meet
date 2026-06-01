import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  canUseServerApiKeys,
  getAudioFormat,
  getGeminiFallbackModels,
  getServerApiKey,
  isAiProviderId,
} from './ai-providers'

const originalEnv = { ...process.env }

afterEach(() => {
  vi.unstubAllEnvs()
  process.env = { ...originalEnv }
})

describe('AI providers', () => {
  it('validates known provider ids', () => {
    expect(isAiProviderId('gemini')).toBe(true)
    expect(isAiProviderId('openrouter')).toBe(true)
    expect(isAiProviderId('unknown')).toBe(false)
  })

  it('prefers explicit Gemini model before configured fallbacks', () => {
    process.env.GEMINI_MODEL = 'gemini-flash-latest'
    process.env.GEMINI_FALLBACK_MODELS = 'gemini-3.5-flash,gemini-flash-latest'

    expect(getGeminiFallbackModels('gemini-custom')).toEqual([
      'gemini-custom',
      'gemini-flash-latest',
      'gemini-3.5-flash',
      'gemini-2.5-flash',
      'gemini-2.5-flash-lite',
    ])
  })

  it('reads the server key for the selected provider', () => {
    process.env.OPENROUTER_API_KEY = 'test-openrouter-key'

    expect(getServerApiKey('openrouter')).toBe('test-openrouter-key')
  })

  it('disables server API keys in production unless explicitly enabled', () => {
    vi.stubEnv('NODE_ENV', 'production')
    delete process.env.LISTEN_MEET_ALLOW_SERVER_KEYS

    expect(canUseServerApiKeys()).toBe(false)

    process.env.LISTEN_MEET_ALLOW_SERVER_KEYS = 'true'

    expect(canUseServerApiKeys()).toBe(true)
  })

  it('keeps the real audio extension instead of relabeling webm as wav', () => {
    expect(getAudioFormat('recording.webm', 'audio/webm;codecs=opus')).toBe('webm')
    expect(getAudioFormat('meeting.wav', 'audio/wav')).toBe('wav')
    expect(getAudioFormat(undefined, 'audio/mpeg')).toBe('mp3')
  })
})
