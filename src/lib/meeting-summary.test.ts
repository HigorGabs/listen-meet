import { describe, expect, it } from 'vitest'
import {
  buildAllMeetingsTxt,
  buildMeetingTxt,
  parseMeetingSummary,
  type MeetingRecord,
} from './meeting-summary'

const rawSummary = {
  title: 'Reunião de Produto',
  overview: 'Discussão sobre prioridades do trimestre.',
  summary: 'Time definiu prioridades e próximos passos.',
  keyPoints: ['Priorizar onboarding', 'Medir ativação'],
  actionItems: ['Higor revisar backlog'],
  participants: ['Higor', 'Ana'],
  topics: ['Produto', 'Métricas'],
}

describe('meeting summary parsing', () => {
  it('parses JSON wrapped in a Markdown code fence', () => {
    const summary = parseMeetingSummary(`\`\`\`json
${JSON.stringify(rawSummary)}
\`\`\``)

    expect(summary.title).toBe('Reunião de Produto')
    expect(summary.keyPoints).toHaveLength(2)
  })

  it('extracts the first balanced JSON object from surrounding text', () => {
    const summary = parseMeetingSummary(`Resposta:
${JSON.stringify(rawSummary)}
Obrigado.`)

    expect(summary.participants).toEqual(['Higor', 'Ana'])
  })

  it('rejects invalid JSON responses', () => {
    expect(() => parseMeetingSummary('sem json')).toThrow('JSON válido')
  })
})

describe('meeting summary export', () => {
  it('builds a text export for one meeting', () => {
    const summary = parseMeetingSummary(JSON.stringify(rawSummary))
    const content = buildMeetingTxt({
      summary,
      date: new Date('2026-05-29T12:00:00.000Z'),
      duration: 125,
    })

    expect(content).toContain('RESUMO DA REUNIÃO - Reunião de Produto')
    expect(content).toContain('Duração: 2 minutos')
    expect(content).toContain('1. Priorizar onboarding')
  })

  it('builds localized English export content with provider metadata', () => {
    const summary = parseMeetingSummary(JSON.stringify(rawSummary))
    const content = buildMeetingTxt({
      summary,
      date: new Date('2026-05-29T12:00:00.000Z'),
      duration: 125,
      locale: 'en',
      providerName: 'OpenRouter',
      modelName: 'google/gemini-flash-latest',
    })

    expect(content).toContain('MEETING SUMMARY - Reunião de Produto')
    expect(content).toContain('Duration: 2 minutes')
    expect(content).toContain('Generated automatically by Listen Meet with OpenRouter')
    expect(content).toContain('Model: google/gemini-flash-latest')
  })

  it('builds a text export for all meetings', () => {
    const summary = parseMeetingSummary(JSON.stringify(rawSummary))
    const meeting: MeetingRecord = {
      id: 'meeting-1',
      title: summary.title,
      date: '2026-05-29T12:00:00.000Z',
      duration: 60,
      summary,
      filename: 'meeting.txt',
    }

    const content = buildAllMeetingsTxt([meeting])

    expect(content).toContain('REUNIÃO: Reunião de Produto')
    expect(content).toContain('PARTICIPANTES: Higor, Ana')
  })
})
