'use client'

import { MaterialIcon } from '@/components/ui/material-icon'
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
}: SessionReadinessPanelProps) {
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
      status: isConfigured ? t.common.ready : t.common.pending,
      ready: isConfigured,
      icon: 'smart_toy',
    },
  ]

  return (
    <aside className="grid gap-4">
      <section className="rounded-lg border border-[color:var(--studio-border)] bg-[var(--studio-card)] p-5 shadow-xl shadow-black/10">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--studio-muted)]">{t.readiness.configTitle}</p>
            <h2 className="mt-1 text-base font-semibold text-[var(--studio-text)]">
              {isConfigured ? t.readiness.readyForTranscription : t.readiness.configPending}
            </h2>
          </div>
          <div className={cn(
            'flex h-9 w-9 items-center justify-center rounded-lg border',
            isConfigured
              ? 'border-[color:var(--studio-primary-border)] bg-[var(--studio-primary-soft)] text-[var(--studio-primary)]'
              : 'border-amber-300/25 bg-amber-300/10 text-amber-200'
          )}>
            {isProcessing ? (
              <MaterialIcon name="progress_activity" className="animate-spin text-base" />
            ) : (
              <MaterialIcon name="check_circle" className="text-base" filled />
            )}
          </div>
        </div>

        <dl className="space-y-3 text-sm">
          <div className="grid grid-cols-[92px_minmax(0,1fr)] gap-3">
            <dt className="text-[var(--studio-subtle)]">{t.readiness.provider}</dt>
            <dd className="truncate font-medium text-[var(--studio-text)]">{providerName}</dd>
          </div>
          <div className="grid grid-cols-[92px_minmax(0,1fr)] gap-3">
            <dt className="text-[var(--studio-subtle)]">{t.readiness.model}</dt>
            <dd className="truncate font-medium text-[var(--studio-text)]">{modelName || t.readiness.selectModel}</dd>
          </div>
          <div className="grid grid-cols-[92px_minmax(0,1fr)] gap-3">
            <dt className="text-[var(--studio-subtle)]">{t.readiness.key}</dt>
            <dd className="truncate font-medium text-[var(--studio-text)]">{apiKeySourceLabel}</dd>
          </div>
          <div className="grid grid-cols-[92px_minmax(0,1fr)] gap-3">
            <dt className="text-[var(--studio-subtle)]">{t.readiness.models}</dt>
            <dd className="font-medium text-[var(--studio-primary)]">{t.readiness.modelCount(modelsCount)}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-lg border border-dashed border-[color:var(--studio-border)] bg-[var(--studio-panel)] p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-lg border border-[color:var(--studio-secondary-border)] bg-[var(--studio-secondary-soft)] p-2 text-[var(--studio-secondary)]">
            <MaterialIcon name="cloud_upload" className="text-base" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--studio-text)]">{t.readiness.uploadArea}</p>
            <p className="mt-1 text-xs leading-5 text-[var(--studio-muted)]">
              {t.readiness.uploadCopy(uploadLimitMb)}
            </p>
            <p className="mt-2 inline-flex rounded-md bg-[var(--studio-panel-strong)] px-2 py-1 text-xs font-medium text-[var(--studio-text)]">
              {t.readiness.uploadLimit(uploadLimitMb)}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-[color:var(--studio-border)] bg-[var(--studio-card)] p-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--studio-muted)]">{t.readiness.checklist}</p>
        <div className="mt-4 grid gap-3">
          {checklist.map((item) => {
            return (
              <div key={item.label} className="flex items-center justify-between gap-3 rounded-md bg-[var(--studio-panel)] p-3">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-md',
                    item.ready ? 'bg-[var(--studio-primary-soft)] text-[var(--studio-primary)]' : 'bg-amber-300/10 text-amber-200'
                  )}>
                    <MaterialIcon name={item.icon} className="text-base" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--studio-text)]">{item.label}</p>
                    <p className="mt-0.5 text-xs text-[var(--studio-subtle)]">{item.status}</p>
                  </div>
                </div>
                <span className={cn('h-2 w-2 rounded-full', item.ready ? 'bg-[var(--studio-primary)]' : 'bg-amber-300')} />
              </div>
            )
          })}
        </div>
      </section>

      <section className="rounded-lg border border-[color:var(--studio-border)] bg-[var(--studio-panel)] p-5">
        {lastProcessedMeetingTitle ? (
          <div className="flex items-start gap-3">
            <MaterialIcon name="audio_file" className="mt-1 text-base text-[var(--studio-primary)]" />
            <div>
              <p className="text-xs text-[var(--studio-primary)]">{t.readiness.latestMeeting}</p>
              <p className="mt-1 text-sm font-semibold text-[var(--studio-text)]">{lastProcessedMeetingTitle}</p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3">
            <MaterialIcon name="audio_file" className="mt-1 text-base text-[var(--studio-secondary)]" />
            <p className="text-sm leading-5 text-[var(--studio-muted)]">
              {t.readiness.emptyInsight}
            </p>
          </div>
        )}
      </section>
    </aside>
  )
}
