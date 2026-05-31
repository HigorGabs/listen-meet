import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SessionReadinessPanel } from './SessionReadinessPanel'

describe('SessionReadinessPanel', () => {
  it('renders AI configuration, upload area and preparation checklist', () => {
    render(
      <SessionReadinessPanel
        apiKeySourceLabel="variável do servidor"
        captureReadiness={{
          hasAudioDevice: false,
          hasAudioSignal: false,
          hasCaptureError: false,
        }}
        isConfigured
        isProcessing={false}
        modelName="Gemini Flash Latest"
        modelsCount={37}
        providerName="Google Gemini"
        uploadLimitMb={4}
      />
    )

    expect(screen.getByText('Configuração de IA')).toBeInTheDocument()
    expect(screen.getByText('Área de Upload')).toBeInTheDocument()
    expect(screen.getByText('Checklist de Preparação')).toBeInTheDocument()
    expect(screen.getByText('Microfone')).toBeInTheDocument()
    expect(screen.getByText('Aguardando dispositivo')).toBeInTheDocument()
    expect(screen.getByText('Sinal de Áudio')).toBeInTheDocument()
    expect(screen.getByText('Aguardando teste')).toBeInTheDocument()
    expect(screen.getByText('IA para Transcrição')).toBeInTheDocument()
    expect(screen.queryByText(/Arraste arquivos/i)).not.toBeInTheDocument()
    expect(screen.getByText('Até 4MB')).toBeInTheDocument()
    expect(screen.getByText('37 modelos ativos')).toBeInTheDocument()
  })

  it('renders preparation details in English when requested', () => {
    render(
      <SessionReadinessPanel
        apiKeySourceLabel="server variable"
        captureReadiness={{
          hasAudioDevice: false,
          hasAudioSignal: false,
          hasCaptureError: false,
        }}
        isConfigured
        isProcessing={false}
        locale="en"
        modelName="Gemini Flash Latest"
        modelsCount={1}
        providerName="Google Gemini"
        uploadLimitMb={4}
      />
    )

    expect(screen.getByText('AI Configuration')).toBeInTheDocument()
    expect(screen.getByText('Upload Area')).toBeInTheDocument()
    expect(screen.getByText('Preparation Checklist')).toBeInTheDocument()
    expect(screen.getByText('Waiting for device')).toBeInTheDocument()
    expect(screen.getByText('Waiting for test')).toBeInTheDocument()
    expect(screen.getByText('1 active model')).toBeInTheDocument()
  })

  it('marks preparation items ready only when recorder readiness reports real signals', () => {
    render(
      <SessionReadinessPanel
        apiKeySourceLabel="variável do servidor"
        captureReadiness={{
          hasAudioDevice: true,
          hasAudioSignal: true,
          hasCaptureError: false,
        }}
        isConfigured
        isProcessing={false}
        modelName="Gemini Flash Latest"
        modelsCount={37}
        providerName="Google Gemini"
        uploadLimitMb={4}
      />
    )

    expect(screen.getByText('Conectado')).toBeInTheDocument()
    expect(screen.getByText('Detectado')).toBeInTheDocument()
    expect(screen.getAllByText('Pronta').length).toBeGreaterThan(0)
  })

  it('renders the latest processed meeting insight', () => {
    render(
      <SessionReadinessPanel
        apiKeySourceLabel="sessão do navegador"
        captureReadiness={{
          hasAudioDevice: true,
          hasAudioSignal: true,
          hasCaptureError: false,
        }}
        isConfigured
        isProcessing={false}
        lastProcessedMeetingTitle="Reunião de Produto"
        modelName="openrouter/audio"
        modelsCount={12}
        providerName="OpenRouter"
        uploadLimitMb={4}
      />
    )

    expect(screen.getByText('Última reunião processada')).toBeInTheDocument()
    expect(screen.getByText('Reunião de Produto')).toBeInTheDocument()
  })
})
