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

function buildMeetingPrompt(
  locale: Locale,
  duration: number,
  transcript?: string,
  predefinedParticipants: string[] = [],
  customTitle?: string,
  meetingContext?: string,
  company?: string,
  template?: string,
  userProfile?: { name: string; role?: string } | null,
  collaborators?: Array<{ name: string; role?: string }>
): string {
  const durationMinutes = Math.floor(duration / 60)
  const outputLanguage = locale === 'en' ? 'English' : 'português brasileiro'

  const inputSourceDesc = transcript 
    ? `Use a seguinte transcrição literal do áudio da reunião para extrair a análise:
---
${transcript}
---`
    : `Analise o seguinte arquivo de áudio de uma reunião e gere um resumo estruturado.`

  const transcriptJsonDesc = transcript
    ? `Use exatamente a transcrição fornecida acima para preencher este campo`
    : `Transcrição completa do áudio`

  let predefinedParticipantsInstruction = ''
  if (predefinedParticipants.length > 0) {
    predefinedParticipantsInstruction = `
CONTRATOS DE NOMES DE PARTICIPANTES (CRÍTICO):
Os participantes confirmados presentes nesta reunião são: ${predefinedParticipants.map(p => `"${p}"`).join(', ')}.
Associe rigidamente os falantes/oradores identificados na reunião a esta lista de nomes, evitando inventar oradores com nomes genéricos ou grafias incorretas se puder mapeá-los a estes participantes.`
  }

  let profileAndCollaboratorsInstruction = ''
  if (userProfile || (collaborators && collaborators.length > 0)) {
    profileAndCollaboratorsInstruction = `
INFORMAÇÕES DE INTEGRANTES DO TIME E CARGOS (CRÍTICO PARA MAPEAR FALANTES):
- Usuário principal (gravando a reunião): "${userProfile?.name || 'Eu'}"` + (userProfile?.role ? ` (Cargo/Role: ${userProfile.role})` : '') + `
`
    if (collaborators && collaborators.length > 0) {
      profileAndCollaboratorsInstruction += `- Colaboradores frequentes neste projeto:
${collaborators.map(c => `  * "${c.name}"` + (c.role ? ` (Cargo/Role: ${c.role})` : '')).join('\n')}
`
    }
    profileAndCollaboratorsInstruction += `
Use rigidamente as informações de nomes, cargos e relacionamentos acima para correlacionar e identificar os oradores no áudio/transcrição da reunião e na hora de atribuir responsáveis pelas tarefas no JSON.`
  }

  let contextInstruction = ''
  if (company || customTitle || meetingContext || (template && template !== 'default')) {
    contextInstruction = `
CONTEXTO E DIRETRIZES DA REUNIÃO (CRÍTICO):
${company ? `- Empresa/Projeto da Reunião: "${company}"` : ''}
${customTitle ? `- Título predefinido pelo usuário: "${customTitle}" (Utilize exatamente este título ou incorpore-o no campo "title" do JSON de retorno)` : ''}
${meetingContext ? `- Contexto fornecido pelo usuário: "${meetingContext}" (Use essa informação para entender termos técnicos, jargões, objetivos de negócio ou discussões específicas)` : ''}`

    if (template === 'daily') {
      contextInstruction += `
- Modelo de Reunião Selecionado: Daily Scrum (Status Meeting).
  DIRETRIZES DO DAILY SCRUM (CRÍTICO):
  1. Defina obrigatoriamente a chave "tags.meetingType" no JSON como "Daily Scrum".
  2. Estruture a descrição geral ("overview") e o resumo ("summary") abordando especificamente o progresso individual e coletivo baseado nos 3 pilares da Daily Scrum:
     - O que cada pessoa realizou/concluiu ontem.
     - O que cada pessoa planeja trabalhar hoje (próximos passos).
     - Quais impedimentos ou bloqueios foram reportados.
  3. Mapeie todos os impedimentos, travas ou bloqueios mencionados em "risksAndBlockers" com a respectiva mitigação ou ação corretiva discutida.
  4. Garanta a correta identificação dos responsáveis pelas tarefas no array "actionItems" usando o formato literal: "Nome da Tarefa [Responsável: Nome]" e preenchendo a propriedade correspondente "assignee" no array "actionPlan".`
    } else if (template === 'oneOnOne') {
      contextInstruction += `
- Modelo de Reunião Selecionado: 1:1 Feedback (One-on-One).
  DIRETRIZES DE 1:1 (CRÍTICO):
  1. Defina obrigatoriamente a chave "tags.meetingType" no JSON como "1:1".
  2. Estruture a descrição geral ("overview") e o resumo ("summary") em torno do alinhamento entre colaborador e gestor, focando em metas traçadas, desenvolvimento profissional e feedbacks.
  3. Preencha o campo "individualDevelopment" com o feedback detalhado e sugestões de evolução profissional.`
    }
  }

  return `
${inputSourceDesc}
${predefinedParticipantsInstruction}
${profileAndCollaboratorsInstruction}
${contextInstruction}

DURAÇÃO: ${durationMinutes} minutos

Forneça um resumo estruturado no seguinte formato JSON, preservando exatamente as chaves abaixo:

{
  "title": "Título sugerido para a reunião",
  "overview": "Resumo geral da reunião em 2-3 parágrafos",
  "summary": "Parágrafo conciso de 2-3 linhas explicando o contexto geral da reunião, principais decisões tomadas e próximos passos definidos",
  "keyPoints": ["Ponto principal 1", "Ponto principal 2", "Ponto principal 3"],
  "actionItems": ["Ação 1 [Responsável: Higor]", "Ação 2 [Responsável: Ana]"],
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
    {"participant": "Participante B", "talkTime": "35%", "contributions": "Análise de mercado", "role": "Especialista"}
  ],
  "meetingQualityScore": 85,
  "topicBreakdown": [
    {"topic": "Discussão Técnica", "percentage": 60},
    {"topic": "Alinhamento", "percentage": 40}
  ],
  "sentimentTimeline": [
    {"phase": "Início", "sentiment": "Neutro"},
    {"phase": "Decisões", "sentiment": "Produtivo"}
  ],
  "decisions": ["Decisão importante 1", "Decisão importante 2"],
  "transcript": "${transcriptJsonDesc}",

  "summaryOneLine": "Resumo em uma única sentença marcante",
  "agendaAlignment": {
    "achieved": ["Objetivo propostos que foi alcançado"],
    "pending": ["Tópico pendente ou adiado para próximo encontro"]
  },
  "criticalDecisions": [
    {"decision": "Decisão tomada", "rationale": "Racional/Justificativa da decisão"}
  ],
  "actionPlan": [
    {"task": "Ação específica", "assignee": "Responsável pela tarefa", "deadline": "Prazo estimado", "priority": "Alta/Média/Baixa"}
  ],
  "risksAndBlockers": [
    {"risk": "Risco/impedimento", "impact": "Alto/Médio/Baixo", "mitigation": "Mitigação"}
  ],
  "roadmap": [
    {"milestone": "Marco/Entregável", "date": "Data prevista"}
  ],
  "technicalGlossary": [
    {"term": "Termo técnico/Sigla", "definition": "Explicação detalhada"}
  ],
  "toolsMentioned": [
    {"tool": "Ferramenta/Sistema citada", "context": "Contexto em que foi mencionada"}
  ],
  "openQuestions": ["Pergunta levantada sem resposta definida"],
  "consensusAnalysis": {
    "level": "Alto/Médio/Baixo",
    "disagreements": ["Ponto de divergência ou debate acalorado"]
  },
  "meetingEfficiencyAnalysis": {
    "focusScore": 85,
    "timeWasted": "15%",
    "focusDetails": "Detalhamento da produtividade do tempo"
  },
  "quotesAndHighlights": [
    {"quote": "Citação literal importante dita", "author": "Autor da fala"}
  ],
  "overallSentiment": "Análise detalhada do tom e clima predominante",
  "conversationalMetrics": {
    "silenceTime": "5%",
    "speed": "Moderada",
    "pausesCount": 4
  },
  "priorityMatrix": {
    "urgentImportant": ["Ação A"],
    "urgentNotImportant": ["Ação B"],
    "notUrgentImportant": ["Ação C"],
    "notUrgentNotImportant": ["Ação D"]
  },
  "nextAgenda": ["Pauta recomendada para próximo encontro"],
  "individualDevelopment": [
    {"name": "Nome do participante", "suggestion": "Sugestão/feedback construtivo de atuação"}
  ],
  "energyAndHumor": {
    "startingEnergy": "Alta/Baixa/Média",
    "peakEnergy": "Alta/Baixa/Média",
    "endingEnergy": "Alta/Baixa/Média"
  }
}

INSTRUÇÕES:
- Responda APENAS com o JSON válido, sem texto adicional.
- Escreva todos os valores textuais em ${outputLanguage}.
- Seja extremamente conciso mas abrangente e detalhado no preenchimento de todas as chaves (peque pelo excesso de dados).
- Identifique os pontos mais importantes da discussão.
- Extraia todas as ações específicas e preencha os campos "actionItems" e "actionPlan" de forma correspondente.
- No campo "summaryOneLine", resuma todo o teor do encontro em uma única linha clara e marcante.
- No campo "agendaAlignment", separe os objetivos propostos que foram atingidos ("achieved") dos que ficaram em aberto ou pendentes ("pending").
- No campo "criticalDecisions", mapeie as principais decisões e o racional (motivação técnica/de negócios) por trás delas.
- No campo "actionPlan", monte um plano de ação completo. Mapeie todas as tarefas aos participantes conhecidos.
- No campo "risksAndBlockers", identifique riscos de prazos, técnicos, ou de negócio mencionados e suas devidas mitigações discutidas.
- No campo "roadmap", trace a linha do tempo futura e marcos com datas para cada decisão tomada.
- No campo "technicalGlossary", explique qualquer termo técnico, sigla corporativa ou jargão falado na reunião.
- No campo "toolsMentioned", liste todos os sistemas, softwares ou links citados (ex: Jira, Notion, GitHub, servidores, bancos de dados, planilhas) e como eles se aplicam.
- No campo "openQuestions", extraia as perguntas que ficaram sem resposta definitiva ou que necessitam de alinhamento futuro.
- No campo "consensusAnalysis", meça o nível de concordância geral da sala e aponte os focos de debate ou discordância saudável.
- No campo "meetingEfficiencyAnalysis", calcule um score de foco da pauta e aponte desvios de tempo (tangentes, brincadeiras, etc.).
- No campo "quotesAndHighlights", extraia citações marcantes ditas textualmente por participantes.
- No campo "overallSentiment", descreva as nuances emocionais (ex: empolgado, focado, cansado, tenso) do grupo.
- No campo "conversationalMetrics", estime os tempos de silêncio e pausas, avaliando o ritmo do diálogo.
- No campo "priorityMatrix", classifique as ações extraídas na clássica Matriz de Eisenhower (Urgente/Importante, etc.).
- No campo "nextAgenda", sugira a pauta exata e focada para o próximo encontro com base no que ficou pendente ou de follow-up.
- No campo "individualDevelopment", ofereça uma sugestão construtiva e acionável de feedback ou desenvolvimento para cada participante principal com base em sua postura ou desafios apresentados.
- No campo "energyAndHumor", descreva a variação da energia do grupo ao longo da reunião (início, pico e final).
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
  audio: { data: string; format: string } | null,
  prompt: string
): Promise<string> {
  if (!model) throw new Error('Selecione um modelo do OpenRouter.')

  const contentValue = audio 
    ? [
        { type: 'text', text: prompt },
        {
          type: 'input_audio',
          inputAudio: {
            data: audio.data,
            format: audio.format,
          },
        },
      ]
    : prompt

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
          content: contentValue,
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

    const maxAbsoluteLimitBytes = 30 * 1024 * 1024 // 30MB absolute ceiling
    if (contentLength > maxAbsoluteLimitBytes) {
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
    const processingMode = getStringValue(formData.get('processingMode')) || 'multimodal'
    const predefinedParticipantsString = getStringValue(formData.get('participants'))
    let predefinedParticipants: string[] = []
    if (predefinedParticipantsString) {
      try {
        predefinedParticipants = JSON.parse(predefinedParticipantsString)
      } catch (err) {
        console.error('Failed to parse predefined participants:', err)
      }
    }
    const customTitle = getStringValue(formData.get('customTitle'))
    const meetingContext = getStringValue(formData.get('meetingContext'))
    const company = getStringValue(formData.get('company'))
    const template = getStringValue(formData.get('template')) || 'default'
    const userProfileString = getStringValue(formData.get('userProfile'))
    let userProfile: { name: string; role?: string } | null = null
    if (userProfileString) {
      try {
        userProfile = JSON.parse(userProfileString)
      } catch (err) {
        console.error('Failed to parse user profile:', err)
      }
    }
    const collaboratorsString = getStringValue(formData.get('collaborators'))
    let collaborators: Array<{ name: string; role?: string }> = []
    if (collaboratorsString) {
      try {
        collaborators = JSON.parse(collaboratorsString)
      } catch (err) {
        console.error('Failed to parse collaborators:', err)
      }
    }

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
    const providerConfig = getProvider(provider)
    const validation = validateAudioFile({
      name: audioFile.name,
      type: audioFile.type,
      size: audioFile.size,
    }, providerConfig.maxUploadMb)

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
    let text = ''

    if (processingMode === 'text') {
      // 1. literal transcription pass
      const transPrompt = "Transcreva o áudio literal completo. Responda apenas com a transcrição pura e literal do áudio da reunião, sem introduções, resumos, explicações ou formatação JSON."
      const rawTranscript = provider === 'gemini'
        ? await generateWithGeminiFallback(
            new GoogleGenerativeAI(apiKey),
            {
              mimeType: getAudioMimeType(audioFile.name, audioFile.type),
              data: audioBase64
            },
            transPrompt,
            model
          )
        : await generateWithOpenRouter(
            apiKey,
            model,
            {
              data: audioBase64,
              format: getAudioFormat(audioFile.name, audioFile.type),
            },
            transPrompt
          )

      // 2. text-only structured analysis pass
      const finalPrompt = buildMeetingPrompt(
        locale,
        duration,
        rawTranscript,
        predefinedParticipants,
        customTitle,
        meetingContext,
        company,
        template,
        userProfile,
        collaborators
      )
      if (provider === 'gemini') {
        const genAI = new GoogleGenerativeAI(apiKey)
        const activeModelName = model || getGeminiFallbackModels(model)[0]
        const generativeModel = genAI.getGenerativeModel({ model: activeModelName })
        const result = await generativeModel.generateContent(finalPrompt)
        text = result.response.text()
      } else {
        text = await generateWithOpenRouter(
          apiKey,
          model,
          null, // pass null audio for text-only call!
          finalPrompt
        )
      }
    } else {
      // Multimodal mode: Full audio direct pass
      const prompt = buildMeetingPrompt(
        locale,
        duration,
        undefined,
        predefinedParticipants,
        customTitle,
        meetingContext,
        company,
        template,
        userProfile,
        collaborators
      )
      text = provider === 'gemini'
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
    }

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
