import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import {
  MAX_AUDIO_UPLOAD_BYTES,
  getAudioMimeType,
  validateAudioFile,
  validateAudioSignature,
} from '@/lib/audio-constraints'
import {
  buildMeetingTxt,
  createMeetingFilename,
  parseMeetingSummary,
} from '@/lib/meeting-summary'
import { getClientIp, processAudioLimiter } from '@/lib/rate-limit'
import {
  getAudioFormat,
  getAvailableServerApiKey,
  getGeminiFallbackModels,
  getProvider,
  isAiProviderId,
  type AiProviderId,
} from '@/lib/ai-providers'
import { normalizeLocale, type Locale } from '@/lib/i18n'

export const runtime = 'nodejs'
export const maxDuration = 300

interface PublicProcessingError {
  message: string
  status: number
}

function getStringValue(value: FormDataEntryValue | null): string {
  return typeof value === 'string' ? value.trim() : ''
}

function getApiKey(provider: AiProviderId, value: FormDataEntryValue | null): string {
  const providedKey = typeof value === 'string' ? value.trim() : ''
  return providedKey || getAvailableServerApiKey(provider)
}

function parseDuration(value: FormDataEntryValue | null): number {
  const duration = Number.parseInt(typeof value === 'string' ? value : '', 10)
  return Number.isFinite(duration) && duration >= 0 ? duration : 0
}

function parseContentLength(request: NextRequest): number | null {
  const header = request.headers.get('content-length')
  if (!header) return null

  const contentLength = Number(header)
  return Number.isFinite(contentLength) && contentLength > 0 ? contentLength : null
}

function getOpenRouterReferer(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  }
  return 'http://localhost:3000'
}

function buildMeetingPrompt(locale: Locale, duration: number): string {
  const durationMinutes = Math.floor(duration / 60)
  const outputLanguage = locale === 'en' ? 'English' : 'português brasileiro'

  return `
Analise o seguinte arquivo de áudio de uma reunião e gere um resumo estruturado.

DURAÇÃO: ${durationMinutes} minutos

Forneça um resumo estruturado no seguinte formato JSON, preservando exatamente as chaves abaixo:

{
  "title": "Título sugerido para a reunião",
  "overview": "Resumo geral da reunião em 2-3 parágrafos",
  "summary": "Parágrafo conciso de 2-3 linhas explicando o contexto geral da reunião, principais decisões tomadas e próximos passos definidos",
  "keyPoints": ["Ponto principal 1", "Ponto principal 2", "Ponto principal 3"],
  "actionItems": ["Ação 1", "Ação 2", "Ação 3"],
  "participants": ["Participante 1", "Participante 2"],
  "topics": ["Tópico 1", "Tópico 2", "Tópico 3"],
  "metrics": {
    "efficiency": "75%",
    "engagement": "Alto",
    "decisionsCount": 3
  },
  "timeline": [
    {"phase": "Início", "description": "Apresentação do tópico", "time": "0-5min"},
    {"phase": "Discussão principal", "description": "Análise detalhada", "time": "5-20min"},
    {"phase": "Decisões", "description": "Definição de ações", "time": "20-25min"}
  ],
  "tags": {
    "meetingType": "Planejamento",
    "priority": "Alta",
    "status": "Concluída"
  },
  "insights": {
    "sentiment": "Produtiva",
    "engagement": "Alto",
    "outcome": "Decisões claras"
  },
  "participationAnalysis": [
    {"participant": "Participante A", "talkTime": "40%", "contributions": "Ideias técnicas", "role": "Facilitador"},
    {"participant": "Participante B", "talkTime": "35%", "contributions": "Análise de mercado", "role": "Especialista"},
    {"participant": "Participante C", "talkTime": "25%", "contributions": "Questões práticas", "role": "Questionador"}
  ],
  "transcript": "Transcrição completa do áudio"
}

INSTRUÇÕES:
- Transcreva o áudio completo para texto
- Identifique os pontos mais importantes da discussão
- Extraia todas as ações específicas mencionadas
- Liste os participantes identificáveis na conversa
- Categorize os principais tópicos abordados
- Analise a eficiência da reunião (% de tempo produtivo vs tangencial)
- Avalie o nível de engajamento dos participantes
- Conte quantas decisões concretas foram tomadas
- Crie uma timeline simples das fases da reunião
- Categorize o tipo de reunião (Planejamento, Review, Brainstorm, Status)
- Defina prioridade (Alta, Média, Baixa) baseada na urgência dos tópicos
- Analise o sentimento geral (Produtiva, Construtiva, Tensa)
- Avalie se houve decisões claras ou se precisa follow-up
- Distribua tempo de fala por participante (aproximado)
- Identifique principais contribuições de cada um
- Escreva todos os valores textuais em ${outputLanguage}
- Seja conciso mas abrangente
- Se não conseguir identificar participantes específicos, use "Participante A", "Participante B", etc.

Responda APENAS com o JSON válido, sem texto adicional.
`
}

function isTransientGeminiError(error: unknown): boolean {
  if (!(error instanceof Error)) return false

  return /\b(429|500|502|503|504)\b|high demand|Service Unavailable|temporar/i.test(error.message)
}

function isProviderAuthError(error: unknown): boolean {
  return error instanceof Error && /\b(401|403)\b|API key|api key|unauthorized|forbidden|permission/i.test(error.message)
}

function isModelUnavailableError(error: unknown): boolean {
  return error instanceof Error && /\b404\b|not found|no longer available|not supported|unsupported model|model .*not available/i.test(error.message)
}

function getPublicProcessingError(error: unknown): PublicProcessingError {
  if (isProviderAuthError(error)) {
    return {
      message: 'A API key do provedor selecionado foi recusada. Verifique a chave cadastrada e tente novamente.',
      status: 401,
    }
  }

  if (isTransientGeminiError(error)) {
    return {
      message: 'O provedor de IA está temporariamente indisponível ou com alta demanda. Tente novamente em instantes.',
      status: 503,
    }
  }

  if (isModelUnavailableError(error)) {
    return {
      message: 'O modelo selecionado não está disponível para essa API key. Atualize a lista de modelos e selecione outro.',
      status: 400,
    }
  }

  return {
    message: 'Não foi possível processar o áudio. Verifique o arquivo e tente novamente.',
    status: 500,
  }
}

async function generateWithGeminiFallback(
  genAI: GoogleGenerativeAI,
  audio: { mimeType: string; data: string },
  prompt: string,
  selectedModel?: string
): Promise<string> {
  let lastError: unknown

  for (const modelName of getGeminiFallbackModels(selectedModel)) {
    const model = genAI.getGenerativeModel({ model: modelName })

    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const result = await model.generateContent([
          {
            inlineData: audio,
          },
          { text: prompt },
        ])

        return result.response.text()
      } catch (error) {
        lastError = error

        if (isProviderAuthError(error)) {
          throw error
        }

        if (isModelUnavailableError(error)) {
          break
        }

        await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)))
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Gemini unavailable')
}

async function generateWithOpenRouter(
  apiKey: string,
  model: string,
  audio: { data: string; format: string },
  prompt: string
): Promise<string> {
  if (!model) throw new Error('Selecione um modelo do OpenRouter.')

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': getOpenRouterReferer(),
      'X-Title': 'Listen Meet',
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'input_audio',
              inputAudio: {
                data: audio.data,
                format: audio.format,
              },
            },
          ],
        },
      ],
      stream: false,
    }),
  })

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(data?.error?.message || data?.error || 'Falha ao chamar OpenRouter.')
  }

  const content = data?.choices?.[0]?.message?.content

  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .map((part) => part?.text || '')
      .filter(Boolean)
      .join('\n')
  }

  throw new Error('OpenRouter retornou resposta sem conteúdo.')
}

export async function POST(request: NextRequest) {
  try {
    const contentLength = parseContentLength(request)
    if (!contentLength) {
      return NextResponse.json(
        { error: 'Content-Length é obrigatório para upload de áudio.' },
        { status: 411 }
      )
    }

    if (contentLength > MAX_AUDIO_UPLOAD_BYTES + 512 * 1024) {
      return NextResponse.json(
        { error: 'Arquivo muito grande para processamento direto.' },
        { status: 413 }
      )
    }

    const rateLimit = processAudioLimiter.check(getClientIp(request))
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Muitas solicitações. Aguarde alguns minutos antes de tentar novamente.' },
        { status: 429 }
      )
    }

    const formData = await request.formData()
    const audioValue = formData.get('audio')
    const providerValue = getStringValue(formData.get('provider')) || 'gemini'
    const provider: AiProviderId = isAiProviderId(providerValue) ? providerValue : 'gemini'
    const model = getStringValue(formData.get('model'))
    const apiKey = getApiKey(provider, formData.get('apiKey'))
    const duration = parseDuration(formData.get('duration'))
    const locale = normalizeLocale(getStringValue(formData.get('locale')))

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Configure uma API key do provedor selecionado.' },
        { status: 400 }
      )
    }

    if (provider !== 'gemini' && provider !== 'openrouter') {
      return NextResponse.json(
        { error: 'Processamento de áudio direto está disponível para Gemini e OpenRouter nesta versão.' },
        { status: 400 }
      )
    }

    if (!(audioValue instanceof File)) {
      return NextResponse.json({ error: 'Arquivo de áudio é obrigatório' }, { status: 400 })
    }

    const audioFile = audioValue
    const validation = validateAudioFile({
      name: audioFile.name,
      type: audioFile.type,
      size: audioFile.size,
    })

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.message },
        { status: validation.status || 400 }
      )
    }

    const audioBuffer = await audioFile.arrayBuffer()
    const signatureValidation = validateAudioSignature({
      name: audioFile.name,
      type: audioFile.type,
      bytes: new Uint8Array(audioBuffer),
    })

    if (!signatureValidation.valid) {
      return NextResponse.json(
        { error: signatureValidation.message },
        { status: signatureValidation.status || 400 }
      )
    }

    const audioBase64 = Buffer.from(audioBuffer).toString('base64')

    const prompt = buildMeetingPrompt(locale, duration)

    const text = provider === 'gemini'
      ? await generateWithGeminiFallback(
          new GoogleGenerativeAI(apiKey),
          {
            mimeType: getAudioMimeType(audioFile.name, audioFile.type),
            data: audioBase64
          },
          prompt,
          model
        )
      : await generateWithOpenRouter(
          apiKey,
          model,
          {
            data: audioBase64,
            format: getAudioFormat(audioFile.name, audioFile.type),
          },
          prompt
        )

    const summary = parseMeetingSummary(text)

    // Generate filename for download
    const processedAt = new Date()
    const filename = createMeetingFilename(processedAt)

    // Create downloadable content
    const downloadContent = buildMeetingTxt({
      summary,
      duration,
      date: processedAt,
      locale,
      providerName: getProvider(provider).name,
      modelName: model,
    })

    return NextResponse.json({
      success: true,
      summary,
      filename,
      downloadContent,
      duration
    })

  } catch (error) {
    console.error('Error processing audio:', error instanceof Error ? error.message : error)
    const publicError = getPublicProcessingError(error)
    
    return NextResponse.json({
      error: publicError.message,
      fallback: true
    }, { status: publicError.status })
  }
}
