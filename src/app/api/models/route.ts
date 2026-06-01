import { NextRequest, NextResponse } from 'next/server'
import {
  AI_PROVIDERS,
  GEMINI_RECOMMENDED_MODELS,
  getAvailableServerApiKey,
  getDefaultModel,
  getProvider,
  isAiProviderId,
  type AiModelOption,
  type AiProviderId,
} from '@/lib/ai-providers'
import { getClientIp, modelsLimiter } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

class ApiRouteError extends Error {
  constructor(message: string, public readonly status = 500) {
    super(message)
  }
}

function jsonNoStore(body: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers)
  headers.set('Cache-Control', 'no-store, max-age=0')
  return NextResponse.json(body, {
    ...init,
    headers,
  })
}

function resolveApiKey(provider: AiProviderId, providedApiKey: unknown): string {
  const userKey = typeof providedApiKey === 'string' ? providedApiKey.trim() : ''
  return userKey || getAvailableServerApiKey(provider)
}

async function listGeminiModels(apiKey: string): Promise<AiModelOption[]> {
  if (!apiKey) throw new ApiRouteError('API Key do Gemini não configurada.', 400)

  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
    headers: {
      'x-goog-api-key': apiKey,
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new ApiRouteError('Não foi possível listar modelos do Gemini. Verifique a API key.', response.status)
  }

  const data = await response.json()

  return (data.models || [])
    .filter((model: { supportedGenerationMethods?: string[] }) =>
      model.supportedGenerationMethods?.includes('generateContent')
    )
    .map((model: { name: string; displayName?: string; description?: string; inputTokenLimit?: number }) => {
      const id = model.name.replace(/^models\//, '')
      const lowerId = id.toLowerCase()
      let category: 'audio' | 'text' | 'image' | 'other' = 'text'
      if (lowerId.includes('embedding') || lowerId.includes('classifier') || lowerId.includes('aqa')) {
        category = 'other'
      } else if (lowerId.includes('imagen') || lowerId.includes('image')) {
        category = 'image'
      } else if (
        (lowerId.includes('1.5') || lowerId.includes('2.0') || lowerId.includes('2.5') || lowerId.includes('flash') || lowerId.includes('pro')) &&
        !(lowerId.includes('1.0') || lowerId.includes('vision') || lowerId.includes('text'))
      ) {
        category = 'audio'
      }

      return {
        id,
        name: model.displayName || id,
        provider: 'gemini' as const,
        description: model.description,
        contextLength: model.inputTokenLimit,
        inputModalities: category === 'audio' ? ['audio', 'text'] : ['text'],
        outputModalities: ['text'],
        recommended: GEMINI_RECOMMENDED_MODELS.includes(id),
        category,
      }
    })
    .sort((a: AiModelOption, b: AiModelOption) => {
      const aRecommendationIndex = GEMINI_RECOMMENDED_MODELS.indexOf(a.id)
      const bRecommendationIndex = GEMINI_RECOMMENDED_MODELS.indexOf(b.id)
      if (aRecommendationIndex !== -1 || bRecommendationIndex !== -1) {
        if (aRecommendationIndex === -1) return 1
        if (bRecommendationIndex === -1) return -1
        return aRecommendationIndex - bRecommendationIndex
      }
      return a.id.localeCompare(b.id)
    })
}

async function listOpenRouterModels(apiKey: string): Promise<AiModelOption[]> {
  const headers: HeadersInit = {}
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`

  const response = await fetch('https://openrouter.ai/api/v1/models?output_modalities=text', {
    headers,
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error('Não foi possível listar modelos do OpenRouter.')
  }

  const data = await response.json()

  return (data.data || [])
    .filter((model: { architecture?: { input_modalities?: string[]; output_modalities?: string[] } }) => {
      const output = model.architecture?.output_modalities || []
      return output.includes('text')
    })
    .map((model: {
      id: string
      name?: string
      description?: string
      context_length?: number
      created?: number
      architecture?: { input_modalities?: string[]; output_modalities?: string[] }
    }) => {
      const input = model.architecture?.input_modalities || []
      const id = model.id.toLowerCase()
      let category: 'audio' | 'text' | 'image' | 'other' = 'text'
      
      if (id.includes('embed') || id.includes('moderation')) {
        category = 'other'
      } else if (input.includes('audio')) {
        category = 'audio'
      } else if (input.includes('image')) {
        category = 'image'
      }

      return {
        id: model.id,
        name: model.name || model.id,
        provider: 'openrouter' as const,
        description: model.description,
        contextLength: model.context_length,
        created: model.created,
        inputModalities: model.architecture?.input_modalities,
        outputModalities: model.architecture?.output_modalities,
        category,
      }
    })
}

async function listOpenAiModels(apiKey: string): Promise<AiModelOption[]> {
  if (!apiKey) throw new ApiRouteError('API Key da OpenAI não configurada.', 400)

  const response = await fetch('https://api.openai.com/v1/models', {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new ApiRouteError('Não foi possível listar modelos da OpenAI. Verifique a API key.', response.status)
  }

  const data = await response.json()

  return (data.data || [])
    .map((model: { id: string; created?: number; owned_by?: string }) => {
      const id = model.id.toLowerCase()
      let category: 'audio' | 'text' | 'image' | 'other' = 'text'
      
      if (
        id.includes('embedding') ||
        id.includes('moderation') ||
        id.includes('babbage') ||
        id.includes('davinci') ||
        id.includes('curie') ||
        id.includes('ada')
      ) {
        category = 'other'
      } else if (id.includes('dall-e') || id.includes('image')) {
        category = 'image'
      } else if (id.includes('whisper') || id.includes('tts') || id.includes('audio')) {
        category = 'audio'
      }
      
      return {
        id: model.id,
        name: model.id,
        provider: 'openai' as const,
        description: model.owned_by ? `Owner: ${model.owned_by}` : undefined,
        created: model.created,
        category,
      }
    })
    .sort((a: AiModelOption, b: AiModelOption) => a.id.localeCompare(b.id))
}

async function listAnthropicModels(apiKey: string): Promise<AiModelOption[]> {
  if (!apiKey) throw new ApiRouteError('API Key da Anthropic não configurada.', 400)

  const response = await fetch('https://api.anthropic.com/v1/models?limit=1000', {
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new ApiRouteError('Não foi possível listar modelos da Anthropic. Verifique a API key.', response.status)
  }

  const data = await response.json()

  return (data.data || [])
    .filter((model: { id: string }) => {
      const id = model.id.toLowerCase()
      return id.includes('claude')
    })
    .map((model: { id: string; display_name?: string; created_at?: string }) => {
      const id = model.id.toLowerCase()
      let category: 'audio' | 'text' | 'image' | 'other' = 'text'
      if (id.includes('claude-3') || id.includes('claude-3-5')) {
        category = 'image'
      }
      
      return {
        id: model.id,
        name: model.display_name || model.id,
        provider: 'anthropic' as const,
        created: model.created_at,
        category,
      }
    })
}

async function listModels(provider: AiProviderId, apiKey: string): Promise<AiModelOption[]> {
  switch (provider) {
    case 'gemini':
      return listGeminiModels(apiKey)
    case 'openrouter':
      return listOpenRouterModels(apiKey)
    case 'openai':
      return listOpenAiModels(apiKey)
    case 'anthropic':
      return listAnthropicModels(apiKey)
  }
}

export async function GET() {
  return jsonNoStore({
    providers: AI_PROVIDERS.map((provider) => ({
      ...provider,
      configured: Boolean(getAvailableServerApiKey(provider.id)),
      defaultModel: getDefaultModel(provider.id),
    })),
  })
}

export async function POST(request: NextRequest) {
  try {
    const rateLimit = modelsLimiter.check(getClientIp(request))
    if (!rateLimit.allowed) {
      return jsonNoStore(
        { error: 'Muitas solicitações. Aguarde antes de listar modelos novamente.' },
        { status: 429 }
      )
    }

    const body = await request.json().catch(() => null)
    const provider = body?.provider

    if (!isAiProviderId(provider)) {
      return jsonNoStore({ error: 'Provedor de IA inválido.' }, { status: 400 })
    }

    getProvider(provider)

    const apiKey = resolveApiKey(provider, body?.apiKey)
    const models = await listModels(provider, apiKey)

    return jsonNoStore({
      provider,
      models,
      configuredByServer: Boolean(getAvailableServerApiKey(provider)),
      defaultModel: getDefaultModel(provider),
    })
  } catch (error) {
    console.error('Error listing AI models:', error instanceof Error ? error.message : error)

    return jsonNoStore(
      { error: error instanceof Error ? error.message : 'Não foi possível listar modelos.' },
      { status: error instanceof ApiRouteError ? error.status : 500 }
    )
  }
}
