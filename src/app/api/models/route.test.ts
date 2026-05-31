import { afterEach, describe, expect, it, vi } from 'vitest'
import { GET, POST } from './route'

const originalEnv = { ...process.env }

function postModels(provider = 'openrouter', ip = '198.51.100.10') {
  return POST(new Request('https://listen-meet.test/api/models', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': ip,
    },
    body: JSON.stringify({ provider, apiKey: provider === 'gemini' ? 'gemini-test-key' : undefined }),
  }) as never)
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  process.env = { ...originalEnv }
})

describe('/api/models', () => {
  it('does not expose configured server keys in production by default', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    process.env.GEMINI_API_KEY = 'server-gemini-key'
    delete process.env.LISTEN_MEET_ALLOW_SERVER_KEYS

    const response = await GET()
    const body = await response.json()

    expect(body.providers.find((provider: { id: string }) => provider.id === 'gemini').configured).toBe(false)
  })

  it('uses x-goog-api-key header instead of a query-string key for Gemini model listing', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        models: [
          {
            name: 'models/gemini-flash-latest',
            displayName: 'Gemini Flash Latest',
            supportedGenerationMethods: ['generateContent'],
          },
        ],
      }),
    } as Response)

    const response = await postModels('gemini', '198.51.100.11')

    expect(response.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledWith(
      'https://generativelanguage.googleapis.com/v1beta/models',
      expect.objectContaining({
        headers: expect.objectContaining({
          'x-goog-api-key': 'gemini-test-key',
        }),
      })
    )
  })

  it('rate limits repeated model list requests from the same client', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          {
            id: 'google/gemini-flash-latest',
            name: 'Gemini Flash Latest',
            architecture: {
              input_modalities: ['audio', 'text'],
              output_modalities: ['text'],
            },
          },
        ],
      }),
    } as Response)

    let lastResponse: Response | undefined
    for (let index = 0; index < 65; index += 1) {
      lastResponse = await postModels('openrouter', '198.51.100.12')
    }

    expect(lastResponse?.status).toBe(429)
  })
})
