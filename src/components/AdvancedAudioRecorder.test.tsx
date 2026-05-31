import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AdvancedAudioRecorder } from './AdvancedAudioRecorder'
import { useAdvancedAudioRecorder } from '@/hooks/useAdvancedAudioRecorder'

vi.mock('@/hooks/useAdvancedAudioRecorder')

const mockUseAdvancedAudioRecorder = vi.mocked(useAdvancedAudioRecorder)

function baseRecorderState(overrides = {}) {
  return {
    isRecording: false,
    isPaused: false,
    duration: 0,
    startRecording: vi.fn(),
    stopRecording: vi.fn(),
    pauseRecording: vi.fn(),
    resumeRecording: vi.fn(),
    audioDevices: [],
    selectedDeviceId: 'default',
    setSelectedDeviceId: vi.fn(),
    refreshDevices: vi.fn(),
    audioLevel: 0,
    isMonitoring: false,
    startMonitoring: vi.fn(),
    stopMonitoring: vi.fn(),
    handleFileUpload: vi.fn(),
    recordingData: null,
    error: null,
    clearError: vi.fn(),
    ...overrides,
  }
}

describe('AdvancedAudioRecorder', () => {
  beforeEach(() => {
    mockUseAdvancedAudioRecorder.mockReturnValue(baseRecorderState())
  })

  it('renders the studio recorder idle state', () => {
    render(<AdvancedAudioRecorder />)

    expect(screen.getByText('Console de captura')).toBeInTheDocument()
    expect(screen.getByText('Sinal ao vivo')).toBeInTheDocument()
    expect(screen.getByText('Matriz de entrada')).toBeInTheDocument()
    expect(screen.getByText('Área de Upload')).toBeInTheDocument()
    expect(screen.getByText('Fonte')).toBeInTheDocument()
    expect(screen.getByText('Microfone')).toBeInTheDocument()
    expect(screen.getByText('Sinal')).toBeInTheDocument()
    expect(screen.getAllByText('0%').length).toBeGreaterThan(0)
    expect(screen.getByText('Modo')).toBeInTheDocument()
    expect(screen.getByText('Pronto')).toBeInTheDocument()
    expect(screen.getByText('00:00')).toBeInTheDocument()

    const startButton = screen.getByRole('button', { name: /iniciar gravação/i })
    const testButton = screen.getByRole('button', { name: /testar áudio/i })
    expect(startButton).toBeEnabled()
    expect(testButton).toBeEnabled()
    expect(startButton).toHaveClass('h-12', 'rounded-lg', 'font-semibold')
    expect(testButton).toHaveClass('h-12', 'rounded-lg', 'font-semibold')
    expect(startButton.parentElement).toHaveClass('sm:grid-cols-2')
  })

  it('renders recorder controls in English when requested', () => {
    render(<AdvancedAudioRecorder locale="en" />)

    expect(screen.getByText('Capture console')).toBeInTheDocument()
    expect(screen.getByText('Live signal')).toBeInTheDocument()
    expect(screen.getByText('Input matrix')).toBeInTheDocument()
    expect(screen.getByText('Upload Area')).toBeInTheDocument()
    expect(screen.getByText('Source')).toBeInTheDocument()
    expect(screen.getByText('Microphone')).toBeInTheDocument()
    expect(screen.getByText('Mode')).toBeInTheDocument()
    expect(screen.getByText('Ready')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /start recording/i })).toBeEnabled()
    expect(screen.getByRole('button', { name: /test audio/i })).toBeEnabled()
  })

  it('renders recording controls when capture is active', () => {
    mockUseAdvancedAudioRecorder.mockReturnValue(baseRecorderState({
      isRecording: true,
      duration: 125,
      audioLevel: 64,
      isMonitoring: true,
    }))

    render(<AdvancedAudioRecorder />)

    expect(screen.getAllByText('02:05').length).toBeGreaterThan(0)
    expect(screen.getByText('Sessão ativa')).toBeInTheDocument()
    expect(screen.getByText('Gravando')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /pausar/i })).toBeEnabled()
    expect(screen.getByRole('button', { name: /parar/i })).toBeEnabled()
  })

  it('discards direct recordings shorter than five seconds', async () => {
    const onRecordingComplete = vi.fn()
    mockUseAdvancedAudioRecorder.mockReturnValue(baseRecorderState({
      recordingData: {
        blob: new Blob(['short'], { type: 'audio/webm' }),
        duration: 4,
        size: 5,
        source: 'recording',
      },
    }))

    render(<AdvancedAudioRecorder onRecordingComplete={onRecordingComplete} />)

    await waitFor(() => {
      expect(screen.getByText(/gravação descartada/i)).toBeInTheDocument()
    })
    expect(screen.queryByText('Gravação concluída')).not.toBeInTheDocument()
    expect(onRecordingComplete).not.toHaveBeenCalled()
  })

  it('processes direct recordings with at least five seconds', async () => {
    const recordingData = {
      blob: new Blob(['valid'], { type: 'audio/webm' }),
      duration: 5,
      size: 5,
      source: 'recording' as const,
    }
    const onRecordingComplete = vi.fn()
    mockUseAdvancedAudioRecorder.mockReturnValue(baseRecorderState({ recordingData }))

    render(<AdvancedAudioRecorder onRecordingComplete={onRecordingComplete} />)

    await waitFor(() => {
      expect(onRecordingComplete).toHaveBeenCalledWith(recordingData)
    })
    expect(screen.getByText('Gravação concluída')).toBeInTheDocument()
  })
})
