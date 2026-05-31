import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Home from './page'

vi.mock('@/components/AdvancedAudioRecorder', () => ({
  AdvancedAudioRecorder: ({ onReadinessChange }: {
    onReadinessChange?: (readiness: {
      hasAudioDevice: boolean
      hasAudioSignal: boolean
      hasCaptureError: boolean
    }) => void
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
    </div>
  ),
}))

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

  it('shows active provider, model and key source in the studio header', async () => {
    render(<Home />)

    await waitFor(() => {
      expect(screen.getByText('Estúdio de Gravação')).toBeInTheDocument()
      expect(screen.getByText('Configuração de IA')).toBeInTheDocument()
      expect(screen.getByText('Checklist de Preparação')).toBeInTheDocument()
      expect(screen.getByText('Área de Upload')).toBeInTheDocument()
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

    await userEvent.click(await screen.findByRole('button', { name: /configurações/i }))
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

    await userEvent.click(screen.getByRole('button', { name: /configurações/i }))
    await userEvent.click(screen.getByRole('menuitemradio', { name: /white/i }))
    await userEvent.click(screen.getByRole('menuitemradio', { name: /^EN$/ }))

    expect(document.documentElement).toHaveAttribute('data-theme', 'white')
    expect(localStorage.getItem('listen-meet-theme')).toBe('white')
    expect(localStorage.getItem('listen-meet-locale')).toBe('en')
    expect(localStorage.getItem('listen-meet-palette')).toBeNull()
    expect(screen.getByText('Recording Studio')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Capture center' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /settings/i })).toBeInTheDocument()
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
})
