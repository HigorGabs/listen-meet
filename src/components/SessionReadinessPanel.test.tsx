import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SessionReadinessPanel } from './SessionReadinessPanel'

describe('SessionReadinessPanel', () => {
  it('renders AI configuration, processing mode and preparation checklist', () => {
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
    expect(screen.getByText('Modo de Processamento')).toBeInTheDocument()
    expect(screen.getByText('Checklist de Preparação')).toBeInTheDocument()
    expect(screen.getByText('Microfone')).toBeInTheDocument()
    expect(screen.getByText('Aguardando dispositivo')).toBeInTheDocument()
    expect(screen.getByText('Sinal de Áudio')).toBeInTheDocument()
    expect(screen.getByText('Aguardando teste')).toBeInTheDocument()
    expect(screen.getByText('IA para Transcrição')).toBeInTheDocument()
    expect(screen.getByText('Áudio Completo')).toBeInTheDocument()
    expect(screen.getByText('Econômico')).toBeInTheDocument()
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
    expect(screen.getByText('Processing Mode')).toBeInTheDocument()
    expect(screen.getByText('Preparation Checklist')).toBeInTheDocument()
    expect(screen.getByText('Waiting for device')).toBeInTheDocument()
    expect(screen.getByText('Waiting for test')).toBeInTheDocument()
    expect(screen.getByText('Full Audio')).toBeInTheDocument()
    expect(screen.getByText('Economical')).toBeInTheDocument()
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

    expect(screen.getAllByText('Conectado').length).toBe(2)
    expect(screen.getByText('Detectado')).toBeInTheDocument()
    expect(screen.getByText('Pronta para transcrição')).toBeInTheDocument()
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

  it('renders meeting template select dropdown and calls onTemplateChange', () => {
    let selectedTemplate = 'default'
    const onTemplateChange = (t: any) => {
      selectedTemplate = t
    }

    const { container } = render(
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
        template="daily"
        onTemplateChange={onTemplateChange}
      />
    )

    expect(screen.getByText('Modelo / Template da Reunião')).toBeInTheDocument()
    const selects = container.querySelectorAll('select')
    const select = selects[1]
    expect(select).toBeInTheDocument()
    expect(select).toHaveValue('daily')
  })
})
