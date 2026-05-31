import { beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from './route'

const generateContentMock = vi.hoisted(() => vi.fn())

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(function MockGoogleGenerativeAI() {
    return {
    getGenerativeModel: vi.fn(() => ({
      generateContent: generateContentMock,
    })),
    }
  }),
}))

const aiSummary = {
  title: 'Product Sync',
  overview: 'The team discussed onboarding priorities.',
  summary: 'The meeting aligned product priorities.',
  keyPoints: ['Improve onboarding'],
  actionItems: ['Review activation metrics'],
  participants: ['Higor', 'Ana'],
  topics: ['Product'],
}

function createFormData(file: File, fields: Record<string, string> = {}) {
  const formData = new FormData()
  formData.append('audio', file)
  formData.append('provider', fields.provider || 'gemini')
  formData.append('model', fields.model || 'gemini-flash-latest')
  formData.append('apiKey', fields.apiKey || 'gemini-test-key')
  formData.append('duration', fields.duration || '125')
  if (fields.locale) formData.append('locale', fields.locale)
  return formData
}

function createMultipartRequest(formData: FormData, contentLength = '1024') {
  return {
    headers: new Headers({
      'content-length': contentLength,
      'x-forwarded-for': `203.0.113.${Math.floor(Math.random() * 200) + 1}`,
    }),
    formData: async () => formData,
  } as never
}

beforeEach(() => {
  vi.clearAllMocks()
  generateContentMock.mockResolvedValue({
    response: {
      text: () => JSON.stringify(aiSummary),
    },
  })
})

describe('/api/process-audio', () => {
  it('rejects missing content-length before parsing multipart data', async () => {
    const formData = vi.fn()
    const response = await POST({
      headers: new Headers(),
      formData,
    } as never)

    expect(response.status).toBe(411)
    expect(formData).not.toHaveBeenCalled()
  })

  it('rejects spoofed audio files before calling the AI provider', async () => {
    const spoofedAudio = new File(['this is not audio'], 'meeting.mp3', { type: 'audio/mpeg' })
    const response = await POST(createMultipartRequest(createFormData(spoofedAudio)))
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toMatch(/assinatura|conteúdo|áudio/i)
    expect(generateContentMock).not.toHaveBeenCalled()
  })

  it('returns English export content when locale is English', async () => {
    const webmBytes = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x81])
    const recording = new File([webmBytes], 'recording.webm', { type: 'audio/webm' })
    const response = await POST(createMultipartRequest(createFormData(recording, { locale: 'en' })))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.downloadContent).toContain('MEETING SUMMARY - Product Sync')
    expect(body.downloadContent).toContain('Duration: 2 minutes')
    expect(body.downloadContent).toContain('Generated automatically by Listen Meet with Google Gemini')
  })
})
