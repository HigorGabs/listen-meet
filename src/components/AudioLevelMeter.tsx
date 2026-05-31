'use client'

import { cn } from '@/lib/utils'
import { getMessages, type Locale } from '@/lib/i18n'

interface AudioLevelMeterProps {
  level: number
  isActive: boolean
  className?: string
  locale?: Locale
}

const SPECTRUM_BARS = 40

function spectrumProfile(index: number) {
  const wave = Math.sin(index * 0.73) * 0.32
  const texture = Math.sin(index * 1.91 + 0.7) * 0.18
  const drift = Math.cos(index * 0.41) * 0.16
  const centerLift = 1 - Math.abs(index - (SPECTRUM_BARS - 1) / 2) / (SPECTRUM_BARS / 2)

  return Math.max(0.18, Math.min(1, 0.46 + wave + texture + drift + centerLift * 0.22))
}

export function AudioLevelMeter({ level, isActive, className, locale = 'pt-BR' }: AudioLevelMeterProps) {
  const t = getMessages(locale)
  const normalizedLevel = Math.max(0, Math.min(100, Math.round(level)))
  const activity = isActive ? normalizedLevel / 100 : 0
  const tone = normalizedLevel > 82
      ? 'bg-red-400 shadow-red-400/30'
      : normalizedLevel > 58
        ? 'bg-amber-300 shadow-amber-300/30'
        : 'bg-emerald-300 shadow-emerald-300/30'

  const signalLabel = !isActive
    ? t.meter.inactive
    : normalizedLevel > 82
      ? t.meter.highPeak
      : normalizedLevel > 58
        ? t.meter.strongPresence
        : normalizedLevel > 8
          ? t.meter.cleanPresence
          : t.meter.silence

  const bars = Array.from({ length: SPECTRUM_BARS }, (_, index) => {
    const profile = spectrumProfile(index)
    const barHeight = 8 + profile * 26 + activity * (12 + profile * 34)
    const opacity = isActive ? 0.34 + activity * 0.58 + profile * 0.08 : 0.42

    return (
      <div
        key={index}
        data-testid="audio-spectrum-bar"
        aria-hidden="true"
        className={cn(
          'w-1 rounded-full transition-[height,opacity,background-color] duration-300 sm:w-1.5',
          isActive && normalizedLevel > 0 ? `${tone} shadow-[0_0_14px_currentColor]` : 'bg-slate-600/45'
        )}
        style={{ height: `${barHeight}px`, opacity }}
      />
    )
  })

  return (
    <div
      role="meter"
      aria-label={t.meter.aria}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={normalizedLevel}
      data-state={isActive ? 'active' : 'inactive'}
      className={cn(
        'grid gap-4 rounded-lg border border-[color:var(--studio-border)] bg-[var(--studio-panel-strong)] p-4 shadow-inner shadow-black/20 sm:grid-cols-[minmax(0,1fr)_86px]',
        className
      )}
    >
      <div className="min-w-0 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--studio-subtle)]">
              {t.meter.spectrum}
            </p>
            <p className="mt-1 text-xs text-[var(--studio-subtle)]">{t.meter.realtimeInput}</p>
          </div>
          <div className="hidden rounded-md bg-[var(--studio-panel)] px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-[var(--studio-subtle)] sm:block">
            {signalLabel}
          </div>
        </div>

        <div className="flex min-h-24 items-end justify-center gap-1 rounded-md border border-[color:var(--studio-border)] bg-[var(--studio-bg)] px-3 py-4 shadow-inner shadow-black/20">
          {bars}
        </div>

        <div className="h-1.5 overflow-hidden rounded-full bg-[var(--studio-card-alt)]" data-testid="audio-presence-rail">
          <div
            className={cn(
              'h-full rounded-full transition-[width,background-color] duration-300',
              normalizedLevel > 82
                ? 'bg-red-400'
                : normalizedLevel > 58
                  ? 'bg-amber-300'
                  : 'bg-[var(--studio-primary)]'
            )}
            style={{ width: `${isActive ? normalizedLevel : 0}%` }}
          />
        </div>
      </div>

      <div className="flex items-end justify-between gap-3 sm:block sm:min-w-20 sm:text-right">
        <div className="font-mono text-2xl font-semibold leading-none text-[var(--studio-text)]">
          {normalizedLevel}%
        </div>
        <div className="mt-2 text-[10px] uppercase tracking-[0.18em] text-[var(--studio-subtle)]">
          {isActive ? t.meter.active : t.meter.inactive}
        </div>
      </div>
    </div>
  )
}
