export const AI_PROVIDER_IDS = ['gemini', 'openrouter', 'openai', 'anthropic'] as const

export type AiProviderId = typeof AI_PROVIDER_IDS[number]

export interface AiProvider {
  id: AiProviderId
  name: string
  apiKeyLabel: string
  serverEnvVar: string
  supportsAudioProcessing: boolean
  requiresApiKeyForModels: boolean
  maxUploadMb: number
}

export interface AiModelOption {
  id: string
  name: string
  provider: AiProviderId
  description?: string
  contextLength?: number
  inputModalities?: string[]
  outputModalities?: string[]
  created?: number | string
  recommended?: boolean
  category?: 'audio' | 'text' | 'image' | 'other'
  isFree?: boolean
}

export interface AiRuntimeConfig {
  provider: AiProviderId
  model: string
  apiKey?: string
}

export const AI_PROVIDERS: AiProvider[] = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    apiKeyLabel: 'Google Gemini API Key',
    serverEnvVar: 'GEMINI_API_KEY',
    supportsAudioProcessing: true,
    requiresApiKeyForModels: true,
    maxUploadMb: 25,
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    apiKeyLabel: 'OpenRouter API Key',
    serverEnvVar: 'OPENROUTER_API_KEY',
    supportsAudioProcessing: true,
    requiresApiKeyForModels: false,
    maxUploadMb: 15,
  },
  {
    id: 'openai',
    name: 'OpenAI',
    apiKeyLabel: 'OpenAI API Key',
    serverEnvVar: 'OPENAI_API_KEY',
    supportsAudioProcessing: true,
    requiresApiKeyForModels: true,
    maxUploadMb: 25,
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    apiKeyLabel: 'Anthropic API Key',
    serverEnvVar: 'ANTHROPIC_API_KEY',
    supportsAudioProcessing: true,
    requiresApiKeyForModels: true,
    maxUploadMb: 25,
  },
]

export const GEMINI_RECOMMENDED_MODELS = [
  'gemini-flash-latest',
  'gemini-3.5-flash',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
]

export function isAiProviderId(value: unknown): value is AiProviderId {
  return typeof value === 'string' && AI_PROVIDER_IDS.includes(value as AiProviderId)
}

export function getProvider(providerId: AiProviderId): AiProvider {
  const provider = AI_PROVIDERS.find((item) => item.id === providerId)
  if (!provider) throw new Error(`Unsupported AI provider: ${providerId}`)
  return provider
}

export function getServerApiKey(providerId: AiProviderId): string {
  switch (providerId) {
    case 'gemini':
      return process.env.GEMINI_API_KEY?.trim() || ''
    case 'openrouter':
      return process.env.OPENROUTER_API_KEY?.trim() || ''
    case 'openai':
      return process.env.OPENAI_API_KEY?.trim() || ''
    case 'anthropic':
      return process.env.ANTHROPIC_API_KEY?.trim() || ''
  }
}

export function canUseServerApiKeys(): boolean {
  if (process.env.NODE_ENV !== 'production') return true
  return process.env.LISTEN_MEET_ALLOW_SERVER_KEYS?.trim().toLowerCase() === 'true'
}

export function getAvailableServerApiKey(providerId: AiProviderId): string {
  return canUseServerApiKeys() ? getServerApiKey(providerId) : ''
}

export function getDefaultModel(providerId: AiProviderId): string {
  switch (providerId) {
    case 'gemini':
      return process.env.GEMINI_MODEL?.trim() || GEMINI_RECOMMENDED_MODELS[0]
    case 'openrouter':
      return process.env.OPENROUTER_MODEL?.trim() || ''
    case 'openai':
      return process.env.OPENAI_MODEL?.trim() || ''
    case 'anthropic':
      return process.env.ANTHROPIC_MODEL?.trim() || ''
  }
}

export function getGeminiFallbackModels(selectedModel?: string): string[] {
  const configured = [
    process.env.GEMINI_MODEL,
    ...(process.env.GEMINI_FALLBACK_MODELS?.split(',') || []),
  ]

  return [selectedModel, ...configured, ...GEMINI_RECOMMENDED_MODELS]
    .map((model) => model?.trim())
    .filter((model): model is string => Boolean(model))
    .filter((model, index, models) => models.indexOf(model) === index)
}

export function getAudioFormat(filename?: string, mimeType?: string): string {
  const extension = filename?.split('.').pop()?.toLowerCase()
  if (extension) return extension

  const baseMime = mimeType?.split(';')[0]?.toLowerCase()
  switch (baseMime) {
    case 'audio/mpeg':
    case 'audio/mp3':
      return 'mp3'
    case 'audio/webm':
    case 'video/webm':
      return 'webm'
    case 'audio/wav':
    case 'audio/x-wav':
      return 'wav'
    case 'audio/ogg':
      return 'ogg'
    case 'audio/flac':
    case 'audio/x-flac':
      return 'flac'
    case 'audio/aac':
      return 'aac'
    case 'audio/mp4':
    case 'audio/m4a':
    case 'audio/x-m4a':
      return 'm4a'
    default:
      return 'wav'
  }
}
