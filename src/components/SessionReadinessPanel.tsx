'use client'

import { useState } from 'react'
import { MaterialIcon } from '@/components/ui/material-icon'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { getMessages, type Locale } from '@/lib/i18n'

interface SessionReadinessPanelProps {
  apiKeySourceLabel: string
  captureReadiness: {
    hasAudioDevice: boolean
    hasAudioSignal: boolean
    hasCaptureError: boolean
  }
  isConfigured: boolean
  isProcessing: boolean
  lastProcessedMeetingTitle?: string
  modelName: string
  modelsCount: number
  providerName: string
  uploadLimitMb: number
  locale?: Locale
  processingMode?: 'multimodal' | 'text'
  onProcessingModeChange?: (mode: 'multimodal' | 'text') => void
  participants?: string[]
  onParticipantsChange?: (participants: string[]) => void
  company?: string
  onCompanyChange?: (company: string) => void
  customTitle?: string
  onCustomTitleChange?: (title: string) => void
  meetingContext?: string
  onMeetingContextChange?: (context: string) => void
  knownCompanies?: string[]
  template?: 'default' | 'daily' | 'oneOnOne'
  onTemplateChange?: (template: 'default' | 'daily' | 'oneOnOne') => void
  onOpenProfileToTab?: (tab: string) => void
}

export function SessionReadinessPanel({
  apiKeySourceLabel,
  captureReadiness,
  isConfigured,
  isProcessing,
  lastProcessedMeetingTitle,
  modelName,
  modelsCount,
  providerName,
  uploadLimitMb,
  locale = 'pt-BR',
  processingMode = 'multimodal',
  onProcessingModeChange,
  participants = [],
  onParticipantsChange,
  company = '',
  onCompanyChange,
  customTitle = '',
  onCustomTitleChange,
  meetingContext = '',
  onMeetingContextChange,
  knownCompanies = [],
  template = 'default',
  onTemplateChange,
  onOpenProfileToTab,
}: SessionReadinessPanelProps) {
  const [participantInput, setParticipantInput] = useState('')
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const val = participantInput.trim().replace(/,$/, '')
      if (val && !participants.includes(val)) {
        onParticipantsChange?.([...participants, val])
      }
      setParticipantInput('')
    }
  }

  const handleRemoveParticipant = (indexToRemove: number) => {
    onParticipantsChange?.(participants.filter((_, i) => i !== indexToRemove))
  }

  const t = getMessages(locale)
  const microphoneStatus = captureReadiness.hasCaptureError
    ? t.readiness.permissionPending
    : captureReadiness.hasAudioDevice
      ? t.readiness.connected
      : t.readiness.awaitingDevice

  const checklist = [
    {
      label: t.readiness.microphone,
      status: microphoneStatus,
      ready: captureReadiness.hasAudioDevice && !captureReadiness.hasCaptureError,
      icon: 'mic',
    },
    {
      label: t.readiness.audioSignal,
      status: captureReadiness.hasAudioSignal ? t.readiness.detected : t.readiness.awaitingTest,
      ready: captureReadiness.hasAudioSignal,
      icon: 'radio_button_checked',
    },
    {
      label: t.readiness.aiForTranscription,
      status: isConfigured ? t.aiRoute.connected : t.common.pending,
      ready: isConfigured,
      icon: 'smart_toy',
    },
  ]

  const modeLabel = locale === 'pt-BR' ? 'Modo de Processamento' : 'Processing Mode'
  const modeMultimodalTitle = locale === 'pt-BR' ? 'Áudio Completo' : 'Full Audio'
  const modeMultimodalDesc = locale === 'pt-BR' 
    ? 'Envia o áudio direto para a IA. Captura emoções, entonação e dinâmica da conversa.' 
    : 'Sends full audio to the AI. Captures emotions, tone, and conversation dynamics.'
  
  const modeTextTitle = locale === 'pt-BR' ? 'Econômico' : 'Economical'
  const modeTextDesc = locale === 'pt-BR'
    ? 'Transcreve primeiro e analisa apenas o texto. Economiza tokens em reuniões muito longas.'
    : 'Transcribes first and analyzes text. Saves tokens for very long meetings.'

  return (
    <aside className="grid gap-4">
      {/* AI config widget */}
      <section className="rounded-xl border border-[color:var(--studio-border)] bg-[var(--studio-card)] glass-card p-5 shadow-xl shadow-black/10">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--studio-primary)]">{t.readiness.configTitle}</p>
            <h2 className="mt-1 text-base font-semibold text-[var(--studio-text)]">
              {isConfigured ? t.readiness.readyForTranscription : t.readiness.configPending}
            </h2>
          </div>
          <div className={cn(
            'flex h-9 w-9 items-center justify-center rounded-lg border transition-all duration-300',
            isConfigured
              ? 'border-[color:var(--studio-primary-border)] bg-[var(--studio-primary-soft)] text-[var(--studio-primary)] shadow-glow-primary'
              : 'border-amber-300/25 bg-amber-300/10 text-amber-200 shadow-glow-secondary'
          )}>
            {isProcessing ? (
              <MaterialIcon name="progress_activity" className="animate-spin text-base" />
            ) : (
              <MaterialIcon name="check_circle" className="text-base" filled={isConfigured} />
            )}
          </div>
        </div>

        <dl className="space-y-3 text-sm">
          <div className="grid grid-cols-[92px_minmax(0,1fr)] gap-3 border-b border-[color:var(--studio-border)]/40 pb-2">
            <dt className="text-[var(--studio-subtle)]">{t.readiness.provider}</dt>
            <dd className="truncate font-medium text-[var(--studio-text)]">{providerName}</dd>
          </div>
          <div className="grid grid-cols-[92px_minmax(0,1fr)] gap-3 border-b border-[color:var(--studio-border)]/40 pb-2">
            <dt className="text-[var(--studio-subtle)]">{t.readiness.model}</dt>
            <dd className="truncate font-medium text-[var(--studio-text)]">{modelName || t.readiness.selectModel}</dd>
          </div>
          <div className="grid grid-cols-[92px_minmax(0,1fr)] gap-3">
            <dt className="text-[var(--studio-subtle)]">{t.readiness.key}</dt>
            <dd className="truncate font-medium text-[var(--studio-text)]">{apiKeySourceLabel}</dd>
          </div>
        </dl>
      </section>

      {/* AI Processing Mode Widget */}
      <section className="rounded-xl border border-[color:var(--studio-border)] bg-[var(--studio-card)] glass-card p-5 shadow-xl shadow-black/10">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--studio-secondary)] mb-3">
          {modeLabel}
        </p>

        <div className="grid grid-cols-2 gap-1 rounded-lg border border-[color:var(--studio-border)] bg-[var(--studio-panel-strong)] p-1">
          <button
            type="button"
            onClick={() => onProcessingModeChange?.('multimodal')}
            className={cn(
              "flex flex-col items-center justify-center rounded-md py-2 px-1 text-center transition-all duration-300 cursor-pointer",
              processingMode === 'multimodal'
                ? "bg-[var(--studio-primary-soft)] text-[var(--studio-text)] shadow-[inset_0_0_0_1px_var(--studio-primary-border)]"
                : "text-[var(--studio-muted)] hover:bg-[var(--studio-panel)] hover:text-[var(--studio-text)]"
            )}
          >
            <span className="text-xs font-semibold">{modeMultimodalTitle}</span>
          </button>
          <button
            type="button"
            onClick={() => onProcessingModeChange?.('text')}
            className={cn(
              "flex flex-col items-center justify-center rounded-md py-2 px-1 text-center transition-all duration-300 cursor-pointer",
              processingMode === 'text'
                ? "bg-[var(--studio-secondary-soft)] text-[var(--studio-text)] shadow-[inset_0_0_0_1px_var(--studio-secondary-border)]"
                : "text-[var(--studio-muted)] hover:bg-[var(--studio-panel)] hover:text-[var(--studio-text)]"
            )}
          >
            <span className="text-xs font-semibold">{modeTextTitle}</span>
          </button>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-[var(--studio-muted)]">
          {processingMode === 'multimodal' ? modeMultimodalDesc : modeTextDesc}
        </p>
      </section>

      {/* Session Settings Widget */}
      <section className="rounded-xl border border-[color:var(--studio-border)] bg-[var(--studio-card)] glass-card p-5 shadow-xl shadow-black/10">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--studio-secondary)] mb-3">
          {locale === 'pt-BR' ? 'Configuração da Reunião' : 'Session Settings'}
        </p>
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] text-[var(--studio-subtle)] uppercase tracking-wider font-semibold block">
                {locale === 'pt-BR' ? 'Empresa / Projeto (Workspace)' : 'Company / Project'}
              </label>
              {onOpenProfileToTab && (
                <button
                  type="button"
                  onClick={() => onOpenProfileToTab('companies')}
                  className="text-[9px] text-[var(--studio-primary)] font-semibold hover:underline bg-transparent border-0 cursor-pointer focus:outline-none"
                >
                  {locale === 'pt-BR' ? 'Gerenciar' : 'Manage'}
                </button>
              )}
            </div>
            <select
              className="w-full text-xs rounded-md border border-[color:var(--studio-border)] bg-[var(--studio-panel)] text-[var(--studio-text)] px-3 h-9 focus:outline-none focus:border-[var(--studio-primary)] cursor-pointer"
              value={company || 'outros'}
              onChange={(e) => onCompanyChange?.(e.target.value)}
            >
              {knownCompanies.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              <option value="outros">{locale === 'pt-BR' ? 'Outros (Sem Empresa)' : 'Others (No Company)'}</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] text-[var(--studio-subtle)] uppercase tracking-wider font-semibold block mb-1">
              {locale === 'pt-BR' ? 'Título da Reunião (Opcional)' : 'Meeting Title (Optional)'}
            </label>
            <Input
              type="text"
              placeholder={locale === 'pt-BR' ? 'Ex: Daily Scrum - Sprint 3' : 'Ex: Daily Scrum - Sprint 3'}
              className="border-[color:var(--studio-border)] bg-[var(--studio-panel)] text-[var(--studio-text)] placeholder:text-[var(--studio-subtle)] text-xs h-9"
              value={customTitle}
              onChange={(e) => onCustomTitleChange?.(e.target.value)}
            />
          </div>
          <div>
            <label className="text-[10px] text-[var(--studio-subtle)] uppercase tracking-wider font-semibold block mb-1">
              {locale === 'pt-BR' ? 'Modelo / Template da Reunião' : 'Meeting Model / Template'}
            </label>
            <select
              className="w-full text-xs rounded-md border border-[color:var(--studio-border)] bg-[var(--studio-panel)] text-[var(--studio-text)] px-3 h-9 focus:outline-none focus:border-[var(--studio-primary)] cursor-pointer"
              value={template}
              onChange={(e) => onTemplateChange?.(e.target.value as 'default' | 'daily' | 'oneOnOne')}
            >
              <option value="default">{locale === 'pt-BR' ? 'Padrão (Reunião Geral)' : 'Default (General Meeting)'}</option>
              <option value="daily">{locale === 'pt-BR' ? 'Daily Scrum (Acompanhamento)' : 'Daily Scrum (Status Tracker)'}</option>
              <option value="oneOnOne">{locale === 'pt-BR' ? '1:1 Feedback (Individual)' : '1:1 Feedback (Individual)'}</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] text-[var(--studio-subtle)] uppercase tracking-wider font-semibold block mb-1">
              {locale === 'pt-BR' ? 'Contexto da Reunião para IA (Opcional)' : 'Additional Context for AI (Optional)'}
            </label>
            <textarea
              placeholder={locale === 'pt-BR' 
                ? 'Ex: Focar nas decisões do design system e prazos...' 
                : 'Ex: Focus on design system decisions and deadlines...'}
              className="w-full text-xs rounded-md border border-[color:var(--studio-border)] bg-[var(--studio-panel)] text-[var(--studio-text)] placeholder:text-[var(--studio-subtle)] px-3 py-2 h-16 focus:outline-none focus:border-[var(--studio-primary)] resize-none"
              value={meetingContext}
              onChange={(e) => onMeetingContextChange?.(e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* Meeting Participants Widget */}
      <section className="rounded-xl border border-[color:var(--studio-border)] bg-[var(--studio-card)] glass-card p-5 shadow-xl shadow-black/10">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--studio-secondary)] mb-3">
          {locale === 'pt-BR' ? 'Participantes da Reunião' : 'Meeting Participants'}
        </p>
        <div className="space-y-3">
          <p className="text-[10px] text-[var(--studio-muted)] leading-relaxed">
            {locale === 'pt-BR' 
              ? 'Digite os nomes e aperte Enter ou vírgula para ajudar a IA a identificar quem falou.' 
              : 'Type names and press Enter or comma to help the AI map voices.'}
          </p>
          <Input
            type="text"
            placeholder={locale === 'pt-BR' ? 'Ex: Higor, Ana PO, Carlos Dev' : 'E.g. Higor, Ana PO'}
            className="border-[color:var(--studio-border)] bg-[var(--studio-panel)] text-[var(--studio-text)] placeholder:text-[var(--studio-subtle)] text-xs h-9"
            value={participantInput}
            onChange={(e) => setParticipantInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          {participants.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {participants.map((name, i) => (
                <span 
                  key={i} 
                  className="inline-flex items-center gap-1 rounded bg-[var(--studio-secondary-soft)] border border-[var(--studio-secondary-border)] px-2 py-0.5 text-[10px] font-medium text-[var(--studio-text)]"
                >
                  {name}
                  <button 
                    type="button" 
                    onClick={() => handleRemoveParticipant(i)}
                    className="hover:text-red-400 font-bold ml-0.5 cursor-pointer text-xs leading-none"
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Checklist */}
      <section className="rounded-xl border border-[color:var(--studio-border)] bg-[var(--studio-card)] glass-card p-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--studio-muted)]">{t.readiness.checklist}</p>
        <div className="mt-4 grid gap-3">
          {checklist.map((item) => {
            return (
              <div key={item.label} className="flex items-center justify-between gap-3 rounded-md bg-[var(--studio-panel)] p-3 border border-[color:var(--studio-border)]/50">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-md transition-colors duration-300',
                    item.ready 
                      ? 'bg-[var(--studio-primary-soft)] text-[var(--studio-primary)] border border-[var(--studio-primary-border)]' 
                      : 'bg-amber-300/10 text-amber-200 border border-amber-300/20'
                  )}>
                    <MaterialIcon name={item.icon} className="text-base" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--studio-text)]">{item.label}</p>
                    <p className="mt-0.5 text-xs text-[var(--studio-subtle)]">{item.status}</p>
                  </div>
                </div>
                <span className={cn('h-2 w-2 rounded-full transition-all duration-300', item.ready ? 'bg-[var(--studio-primary)] shadow-[0_0_8px_var(--studio-primary)]' : 'bg-amber-300 animate-pulse')} />
              </div>
            )
          })}
        </div>
      </section>

      {/* Latest Meeting processed */}
      <section className="rounded-xl border border-[color:var(--studio-border)] bg-[var(--studio-panel)] p-5">
        {lastProcessedMeetingTitle ? (
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-[var(--studio-primary-soft)] p-2 text-[var(--studio-primary)]">
              <MaterialIcon name="audio_file" className="text-base" />
            </div>
            <div>
              <p className="text-xs text-[var(--studio-primary)] font-semibold uppercase tracking-[0.1em]">{t.readiness.latestMeeting}</p>
              <p className="mt-1 text-sm font-semibold text-[var(--studio-text)]">{lastProcessedMeetingTitle}</p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-[var(--studio-secondary-soft)] p-2 text-[var(--studio-secondary)]">
              <MaterialIcon name="audio_file" className="text-base" />
            </div>
            <p className="text-xs leading-5 text-[var(--studio-muted)]">
              {t.readiness.emptyInsight}
            </p>
          </div>
        )}
      </section>
    </aside>
  )
}
