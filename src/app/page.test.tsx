import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MeetingStorage } from '@/utils/storage'
import Home from './page'

vi.mock('@/components/AdvancedAudioRecorder', () => ({
  AdvancedAudioRecorder: ({ onReadinessChange, onRecordingComplete }: {
    onReadinessChange?: (readiness: {
      hasAudioDevice: boolean
      hasAudioSignal: boolean
      hasCaptureError: boolean
    }) => void
    onRecordingComplete?: (data: {
      blob: Blob
      duration: number
      filename?: string
      source: 'recording' | 'upload'
    }) => void | Promise<void>
  }) => (
    <div>
      Console de captura mockado
      <button
        type="button"
        onClick={() => onReadinessChange?.({
          hasAudioDevice: true,
          hasAudioSignal: true,
          hasCaptureError: false,
        })}
      >
        Simular áudio pronto
      </button>
      <button
        type="button"
        onClick={() => onRecordingComplete?.({
          blob: new Blob(['audio'], { type: 'audio/mp4' }),
          duration: 125,
          source: 'recording',
        })}
      >
        Simular gravação completa
      </button>
    </div>
  ),
}))

function createDeferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve
    reject = promiseReject
  })

  return { promise, resolve, reject }
}

vi.mock('@/components/MeetingsList', () => ({
  MeetingsList: () => <div>Arquivo inteligente mockado</div>,
}))

const providersResponse = {
  providers: [
    {
      id: 'gemini',
      name: 'Google Gemini',
      apiKeyLabel: 'Google Gemini API Key',
      serverEnvVar: 'GEMINI_API_KEY',
      supportsAudioProcessing: true,
      requiresApiKeyForModels: true,
      configured: true,
      defaultModel: 'gemini-flash-latest',
    },
  ],
}

const modelsResponse = {
  provider: 'gemini',
  configuredByServer: true,
  defaultModel: 'gemini-flash-latest',
  models: [
    {
      id: 'gemini-flash-latest',
      name: 'Gemini Flash Latest',
      provider: 'gemini',
      recommended: true,
    },
  ],
}

const openRouterModelsResponse = {
  provider: 'openrouter',
  configuredByServer: true,
  defaultModel: 'openrouter/audio-model',
  models: [
    {
      id: 'openrouter/audio-model',
      name: 'OpenRouter Audio Model',
      provider: 'openrouter',
      recommended: true,
    },
  ],
}

describe('Home page studio shell', () => {
  beforeEach(() => {
    sessionStorage.clear()
    localStorage.clear()
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => providersResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => modelsResponse,
      }))
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows active provider, model and key source in the studio header', async () => {
    render(<Home />)

    await waitFor(() => {
      expect(screen.getByText('Estúdio de Gravação')).toBeInTheDocument()
      expect(screen.getByText('Configuração de IA')).toBeInTheDocument()
      expect(screen.getByText('Checklist de Preparação')).toBeInTheDocument()
      expect(screen.getAllByText(/Google Gemini/i).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/Gemini Flash Latest/i).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/variável do servidor/i).length).toBeGreaterThan(0)
    })

    expect(screen.getByText('Console de captura mockado')).toBeInTheDocument()
  })

  it('keeps the capture overview focused on route status instead of upload limits', async () => {
    render(<Home />)

    const captureHeading = await screen.findByRole('heading', { name: 'Central de captura' })
    const captureOverview = captureHeading.closest('section')

    expect(captureOverview).not.toBeNull()
    expect(within(captureOverview as HTMLElement).getByText('Status')).toBeInTheDocument()
    expect(within(captureOverview as HTMLElement).getByText('Pronta')).toBeInTheDocument()
    expect(within(captureOverview as HTMLElement).queryByText('Upload')).not.toBeInTheDocument()
    expect(within(captureOverview as HTMLElement).queryByText(/até 4MB/i)).not.toBeInTheDocument()
  })

  it('opens the AI configuration panel with explicit key source controls', async () => {
    render(<Home />)

    await userEvent.click(await screen.findByRole('button', { name: /meu perfil/i }))
    expect(screen.queryByText('Configurar IA')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('menuitem', { name: /^API$/i }))

    expect(screen.getByText('Configurar IA')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /servidor/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /minha chave/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /listar modelos ativos/i })).toBeInTheDocument()
  })

  it('applies and persists theme and locale selections', async () => {
    render(<Home />)

    await screen.findByText('Estúdio de Gravação')
    expect(screen.queryByLabelText('Tema')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Idioma')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /meu perfil/i }))
    await userEvent.click(screen.getByRole('menuitem', { name: /white/i }))
    await userEvent.click(screen.getByRole('menuitem', { name: /^EN$/ }))

    expect(document.documentElement).toHaveAttribute('data-theme', 'white')
    expect(localStorage.getItem('listen-meet-theme')).toBe('white')
    expect(localStorage.getItem('listen-meet-locale')).toBe('en')
    expect(localStorage.getItem('listen-meet-palette')).toBeNull()
    expect(screen.getByText('Recording Studio')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Capture center' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /profile/i })).toBeInTheDocument()
  })

  it('keeps capture readiness pending until the recorder reports real audio readiness', async () => {
    render(<Home />)

    await screen.findByText('Checklist de Preparação')

    expect(screen.getByText('Aguardando dispositivo')).toBeInTheDocument()
    expect(screen.getByText('Aguardando teste')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /simular áudio pronto/i }))

    expect(screen.getAllByText('Conectado').length).toBeGreaterThan(0)
    expect(screen.getByText('Detectado')).toBeInTheDocument()
  })

  it('does not persist session API keys in browser storage', async () => {
    vi.mocked(fetch).mockReset()
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          providers: providersResponse.providers.map((provider) => ({
            ...provider,
            configured: false,
          })),
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => modelsResponse,
      } as Response)

    render(<Home />)

    expect(await screen.findByText('Configurar IA')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /minha chave/i }))
    await userEvent.type(screen.getByLabelText(/google gemini api key/i), 'secret-session-key')
    await userEvent.click(screen.getByRole('button', { name: /listar modelos ativos/i }))
    await screen.findByText(/1 modelo/i)
    await userEvent.click(screen.getByRole('button', { name: /usar configuração/i }))

    expect(sessionStorage.getItem('listen-meet-ai-config')).not.toContain('secret-session-key')
  })

  it('saves meeting locale and provider metadata for future history downloads', async () => {
    vi.mocked(fetch).mockReset()
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => providersResponse,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => modelsResponse,
      } as Response)
      .mockImplementationOnce(async (_input, init) => {
        const formData = init?.body as FormData
        const audio = formData.get('audio') as File
        expect(audio.name).toBe('recording.mp4')
        expect(formData.get('locale')).toBe('en')

        return {
          ok: true,
          json: async () => ({
            success: true,
            summary: {
              title: 'Product Sync',
              overview: 'The team discussed onboarding.',
              keyPoints: ['Improve onboarding'],
              actionItems: ['Review activation'],
              participants: ['Higor'],
              topics: ['Product'],
            },
            filename: 'meeting.txt',
            duration: 125,
          }),
        } as Response
      })

    render(<Home />)

    await screen.findByText('Estúdio de Gravação')
    await userEvent.click(screen.getByRole('button', { name: /meu perfil/i }))
    await userEvent.click(screen.getByRole('menuitem', { name: /^EN$/ }))
    await userEvent.click(screen.getByRole('button', { name: /simular gravação completa/i }))

    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem('listen-meet-recordings') || '[]')
      expect(saved[0]).toMatchObject({
        locale: 'en',
        providerName: 'Google Gemini',
        modelName: 'Gemini Flash Latest',
      })
    })
  })

  it('alerts when the processed meeting cannot be saved locally', async () => {
    vi.mocked(fetch).mockReset()
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => providersResponse,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => modelsResponse,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          summary: {
            title: 'Storage Full',
            overview: 'The meeting was processed but local storage failed.',
            keyPoints: ['Processed audio'],
            actionItems: ['Free local storage'],
            participants: ['Higor'],
            topics: ['Storage'],
          },
          filename: 'meeting.txt',
          duration: 125,
        }),
      } as Response)
    vi.spyOn(MeetingStorage, 'saveMeeting').mockResolvedValue(false)

    render(<Home />)

    await screen.findByText('Estúdio de Gravação')
    await userEvent.click(screen.getByRole('button', { name: /simular gravação completa/i }))

    await screen.findByText('Erro ao salvar reunião. O armazenamento local pode estar cheio.')
  })

  it('ignores stale model-list responses when provider switches race', async () => {
    const staleOpenRouterModels = createDeferred<Response>()
    const currentGeminiModels = createDeferred<Response>()
    vi.mocked(fetch).mockReset()
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          providers: [
            ...providersResponse.providers,
            {
              id: 'openrouter',
              name: 'OpenRouter',
              apiKeyLabel: 'OpenRouter API Key',
              serverEnvVar: 'OPENROUTER_API_KEY',
              supportsAudioProcessing: true,
              requiresApiKeyForModels: false,
              configured: true,
              defaultModel: 'openrouter/audio-model',
            },
          ],
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => modelsResponse,
      } as Response)
      .mockImplementationOnce(() => staleOpenRouterModels.promise)
      .mockImplementationOnce(() => currentGeminiModels.promise)

    render(<Home />)

    await screen.findByText('Estúdio de Gravação')
    await userEvent.click(screen.getByRole('button', { name: /meu perfil/i }))
    await userEvent.click(screen.getByRole('menuitem', { name: /^API$/i }))

    const providerCombobox = screen.getByRole('combobox', { name: /provedor/i })
    await userEvent.click(providerCombobox)
    await userEvent.click(await screen.findByRole('option', { name: /OpenRouter/i }))
    await userEvent.click(providerCombobox)
    await userEvent.click(await screen.findByRole('option', { name: /Google Gemini/i }))

    currentGeminiModels.resolve({
      ok: true,
      json: async () => modelsResponse,
    } as Response)

    await waitFor(() => {
      expect(screen.getAllByText(/Gemini Flash Latest/i).length).toBeGreaterThan(0)
    })

    staleOpenRouterModels.resolve({
      ok: true,
      json: async () => openRouterModelsResponse,
    } as Response)

    await waitFor(() => {
      expect(screen.queryByText(/OpenRouter Audio Model/i)).not.toBeInTheDocument()
      expect(screen.getAllByText(/Gemini Flash Latest/i).length).toBeGreaterThan(0)
    })
  })
})
