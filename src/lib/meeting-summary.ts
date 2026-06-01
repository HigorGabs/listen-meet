import { z } from 'zod'

const stringArraySchema = z.preprocess(
  (value) => {
    if (typeof value === 'string' && value.trim()) return [value.trim()]
    return value
  },
  z.array(z.string().trim().min(1)).default([])
)

const timelineItemSchema = z.object({
  phase: z.string().trim().min(1),
  description: z.string().trim().min(1),
  time: z.string().trim().min(1),
})

const participationItemSchema = z.object({
  participant: z.string().trim().min(1),
  talkTime: z.string().trim().min(1),
  contributions: z.string().trim().min(1),
  role: z.string().trim().min(1),
})

const topicBreakdownItemSchema = z.object({
  topic: z.string().trim().min(1),
  percentage: z.coerce.number().int().nonnegative(),
})

const sentimentTimelineItemSchema = z.object({
  phase: z.string().trim().min(1),
  sentiment: z.string().trim().min(1),
})

export const meetingSummarySchema = z.object({
  title: z.string().trim().min(1),
  overview: z.string().trim().min(1),
  summary: z.string().trim().min(1).optional(),
  keyPoints: stringArraySchema,
  actionItems: stringArraySchema,
  participants: stringArraySchema,
  topics: stringArraySchema,
  metrics: z
    .object({
      efficiency: z.string().trim().min(1).default('N/A'),
      engagement: z.string().trim().min(1).default('N/A'),
      decisionsCount: z.coerce.number().int().nonnegative().default(0),
    })
    .optional(),
  timeline: z.array(timelineItemSchema).default([]).optional(),
  tags: z
    .object({
      meetingType: z.string().trim().min(1).default('N/A'),
      priority: z.string().trim().min(1).default('N/A'),
      status: z.string().trim().min(1).default('N/A'),
    })
    .optional(),
  insights: z
    .object({
      sentiment: z.string().trim().min(1).default('N/A'),
      engagement: z.string().trim().min(1).default('N/A'),
      outcome: z.string().trim().min(1).default('N/A'),
    })
    .optional(),
  participationAnalysis: z.array(participationItemSchema).default([]).optional(),
  transcript: z.string().optional(),
  meetingQualityScore: z.coerce.number().int().min(0).max(100).default(75).optional(),
  topicBreakdown: z.array(topicBreakdownItemSchema).default([]).optional(),
  sentimentTimeline: z.array(sentimentTimelineItemSchema).default([]).optional(),
  decisions: stringArraySchema.optional(),

  // Super Report 21 Categories extension
  summaryOneLine: z.string().trim().optional(),
  agendaAlignment: z.object({
    achieved: stringArraySchema,
    pending: stringArraySchema,
  }).optional(),
  criticalDecisions: z.array(z.object({
    decision: z.string().trim(),
    rationale: z.string().trim(),
  })).default([]).optional(),
  actionPlan: z.array(z.object({
    task: z.string().trim(),
    assignee: z.string().trim().default('N/A'),
    deadline: z.string().trim().default('N/A'),
    priority: z.string().trim().default('N/A'),
  })).default([]).optional(),
  risksAndBlockers: z.array(z.object({
    risk: z.string().trim(),
    impact: z.string().trim(),
    mitigation: z.string().trim(),
  })).default([]).optional(),
  roadmap: z.array(z.object({
    milestone: z.string().trim(),
    date: z.string().trim(),
  })).default([]).optional(),
  technicalGlossary: z.array(z.object({
    term: z.string().trim(),
    definition: z.string().trim(),
  })).default([]).optional(),
  toolsMentioned: z.array(z.object({
    tool: z.string().trim(),
    context: z.string().trim(),
  })).default([]).optional(),
  openQuestions: stringArraySchema.optional(),
  consensusAnalysis: z.object({
    level: z.string().trim().default('N/A'),
    disagreements: stringArraySchema,
  }).optional(),
  meetingEfficiencyAnalysis: z.object({
    focusScore: z.coerce.number().int().min(0).max(100).default(75),
    timeWasted: z.string().trim().default('0%'),
    focusDetails: z.string().trim().default(''),
  }).optional(),
  quotesAndHighlights: z.array(z.object({
    quote: z.string().trim(),
    author: z.string().trim(),
  })).default([]).optional(),
  overallSentiment: z.string().trim().optional(),
  conversationalMetrics: z.object({
    silenceTime: z.string().trim().default('0%'),
    speed: z.string().trim().default('Normal'),
    pausesCount: z.coerce.number().int().nonnegative().default(0),
  }).optional(),
  priorityMatrix: z.object({
    urgentImportant: stringArraySchema,
    urgentNotImportant: stringArraySchema,
    notUrgentImportant: stringArraySchema,
    notUrgentNotImportant: stringArraySchema,
  }).optional(),
  nextAgenda: stringArraySchema.optional(),
  individualDevelopment: z.array(z.object({
    name: z.string().trim(),
    suggestion: z.string().trim(),
  })).default([]).optional(),
  energyAndHumor: z.object({
    startingEnergy: z.string().trim().default('N/A'),
    peakEnergy: z.string().trim().default('N/A'),
    endingEnergy: z.string().trim().default('N/A'),
  }).optional(),
})

export type MeetingSummary = z.infer<typeof meetingSummarySchema>

export interface MeetingRecord {
  id: string
  title: string
  date: string
  duration: number
  summary: MeetingSummary
  locale?: 'pt-BR' | 'en'
  providerName?: string
  modelName?: string
  audioBlob?: Blob
  filename: string
  company?: string
  meetingContext?: string
  template?: 'default' | 'daily' | 'oneOnOne'
}

export interface MeetingExportInput {
  summary: MeetingSummary
  date: string | Date
  duration: number
  locale?: 'pt-BR' | 'en'
  providerName?: string
  modelName?: string
}

function extractJsonObject(text: string): string {
  const trimmed = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()

  if (trimmed.startsWith('{') && trimmed.endsWith('}')) return trimmed

  let depth = 0
  let start = -1
  let inString = false
  let escaped = false

  for (let index = 0; index < trimmed.length; index += 1) {
    const char = trimmed[index]

    if (escaped) {
      escaped = false
      continue
    }

    if (char === '\\') {
      escaped = true
      continue
    }

    if (char === '"') {
      inString = !inString
      continue
    }

    if (inString) continue

    if (char === '{') {
      if (depth === 0) start = index
      depth += 1
    }

    if (char === '}') {
      depth -= 1
      if (depth === 0 && start >= 0) {
        return trimmed.slice(start, index + 1)
      }
    }
  }

  throw new Error('Resposta da IA não contém JSON válido.')
}

export function normalizeMeetingSummary(input: unknown): MeetingSummary {
  return meetingSummarySchema.parse(input)
}

export function parseMeetingSummary(text: string): MeetingSummary {
  const json = extractJsonObject(text)
  return normalizeMeetingSummary(JSON.parse(json))
}

export function createMeetingFilename(date = new Date()): string {
  const timestamp = date.toISOString().replace(/[:.]/g, '-')
  return `reuniao-${timestamp}.txt`
}

function normalizeExportLocale(locale?: MeetingExportInput['locale']): 'pt-BR' | 'en' {
  return locale === 'en' ? 'en' : 'pt-BR'
}

function formatMeetingDate(date: string | Date, locale: 'pt-BR' | 'en'): string {
  return new Date(date).toLocaleDateString(locale === 'en' ? 'en-US' : 'pt-BR')
}

function formatMinutes(duration: number, locale: 'pt-BR' | 'en'): string {
  const minutes = Math.max(0, Math.floor(duration / 60))
  if (locale === 'en') return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`
  return `${minutes} minutos`
}

function numberedList(items: string[], emptyLabel = 'Nenhum item identificado.'): string {
  if (items.length === 0) return emptyLabel
  return items.map((item, index) => `${index + 1}. ${item}`).join('\n')
}

export function buildMeetingTxt(input: MeetingExportInput): string {
  const { summary, duration, date, providerName = 'Google Gemini', modelName } = input
  const locale = normalizeExportLocale(input.locale)

  if (locale === 'en') {
    return `MEETING SUMMARY - ${summary.title}
Date: ${formatMeetingDate(date, locale)}
Duration: ${formatMinutes(duration, locale)}

=== SUMMARY ===
${summary.summary || summary.overview}

=== OVERVIEW ===
${summary.overview}

=== MEETING METRICS ===
Efficiency: ${summary.metrics?.efficiency || 'N/A'}
Engagement: ${summary.metrics?.engagement || 'N/A'}
Decisions made: ${summary.metrics?.decisionsCount ?? 'N/A'}

=== MEETING TIMELINE ===
${summary.timeline?.map((item) => `${item.phase}: ${item.description} (${item.time})`).join('\n') || 'Timeline unavailable'}

=== TAGS/CATEGORIES ===
Meeting type: ${summary.tags?.meetingType || 'N/A'}
Priority: ${summary.tags?.priority || 'N/A'}
Status: ${summary.tags?.status || 'N/A'}

=== AI INSIGHTS ===
Sentiment: ${summary.insights?.sentiment || 'N/A'}
Engagement: ${summary.insights?.engagement || 'N/A'}
Outcome: ${summary.insights?.outcome || 'N/A'}

=== PARTICIPATION ANALYSIS ===
${summary.participationAnalysis?.map((participant) =>
  `${participant.participant}: ${participant.talkTime} of time | ${participant.contributions} | Role: ${participant.role}`
).join('\n') || 'Analysis unavailable'}

=== KEY POINTS ===
${numberedList(summary.keyPoints, 'No items identified.')}

=== IDENTIFIED ACTIONS ===
${numberedList(summary.actionItems, 'No items identified.')}

=== PARTICIPANTS ===
${summary.participants.length ? summary.participants.join(', ') : 'Participants not identified.'}

=== TOPICS ===
${summary.topics.length ? summary.topics.join(', ') : 'Topics not identified.'}

=== FULL TRANSCRIPT ===
${summary.transcript || 'Transcript unavailable'}

---
Generated automatically by Listen Meet with ${providerName}
${modelName ? `Model: ${modelName}` : ''}
`
  }

  return `RESUMO DA REUNIÃO - ${summary.title}
Data: ${formatMeetingDate(date, locale)}
Duração: ${formatMinutes(duration, locale)}

=== RESUMO ===
${summary.summary || summary.overview}

=== RESUMO GERAL ===
${summary.overview}

=== MÉTRICAS DA REUNIÃO ===
Eficiência: ${summary.metrics?.efficiency || 'N/A'}
Participação: ${summary.metrics?.engagement || 'N/A'}
Decisões tomadas: ${summary.metrics?.decisionsCount ?? 'N/A'}

=== TIMELINE DA REUNIÃO ===
${summary.timeline?.map((item) => `${item.phase}: ${item.description} (${item.time})`).join('\n') || 'Timeline não disponível'}

=== TAGS/CATEGORIAS ===
Tipo de reunião: ${summary.tags?.meetingType || 'N/A'}
Prioridade: ${summary.tags?.priority || 'N/A'}
Status: ${summary.tags?.status || 'N/A'}

=== INSIGHTS DA IA ===
Sentimento: ${summary.insights?.sentiment || 'N/A'}
Engajamento: ${summary.insights?.engagement || 'N/A'}
Resultado: ${summary.insights?.outcome || 'N/A'}

=== ANÁLISE DE PARTICIPAÇÃO ===
${summary.participationAnalysis?.map((participant) =>
  `${participant.participant}: ${participant.talkTime} do tempo | ${participant.contributions} | Papel: ${participant.role}`
).join('\n') || 'Análise não disponível'}

=== PONTOS PRINCIPAIS ===
${numberedList(summary.keyPoints)}

=== AÇÕES IDENTIFICADAS ===
${numberedList(summary.actionItems)}

=== PARTICIPANTES ===
${summary.participants.length ? summary.participants.join(', ') : 'Participantes não identificados.'}

=== TÓPICOS ABORDADOS ===
${summary.topics.length ? summary.topics.join(', ') : 'Tópicos não identificados.'}

=== TRANSCRIÇÃO COMPLETA ===
${summary.transcript || 'Transcrição não disponível'}

---
Gerado automaticamente pelo Listen Meet com ${providerName}
${modelName ? `Modelo: ${modelName}` : ''}
`
}

export function buildAllMeetingsTxt(meetings: MeetingRecord[]): string {
  if (meetings.length === 0) return 'Nenhuma reunião exportada.'

  return meetings.map((meeting) => {
    const locale = normalizeExportLocale(meeting.locale)

    return `${'='.repeat(80)}
REUNIÃO: ${meeting.summary.title}
Data: ${formatMeetingDate(meeting.date, locale)}
Duração: ${formatMinutes(meeting.duration, locale)}

RESUMO: ${meeting.summary.summary || meeting.summary.overview}

PONTOS PRINCIPAIS:
${numberedList(meeting.summary.keyPoints)}

AÇÕES:
${numberedList(meeting.summary.actionItems)}

PARTICIPANTES: ${meeting.summary.participants.length ? meeting.summary.participants.join(', ') : 'Participantes não identificados.'}
TÓPICOS: ${meeting.summary.topics.length ? meeting.summary.topics.join(', ') : 'Tópicos não identificados.'}
PROVEDOR: ${meeting.providerName || 'Google Gemini'}
${meeting.modelName ? `MODELO: ${meeting.modelName}` : ''}

${'='.repeat(80)}
`
  }).join('\n')
}
