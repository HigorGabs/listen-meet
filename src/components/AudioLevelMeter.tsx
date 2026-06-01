'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { getMessages, type Locale } from '@/lib/i18n'

interface AudioLevelMeterProps {
  level: number
  isActive: boolean
  className?: string
  locale?: Locale
}

const SPECTRUM_BARS = 40

function getBarHeight(index: number, phase: number, activity: number, isActive: boolean) {
  if (!isActive) {
    // Rest state: tiny resting ticks
    return 3 + Math.sin(index * 0.5) * 1.5
  }
  // Active state: small technical ticks at the bottom
  const wave = Math.sin(index * 0.35 + phase) * 0.42
  const texture = Math.sin(index * 0.98 - phase * 1.5) * 0.22
  const centerLift = 1 - Math.abs(index - (SPECTRUM_BARS - 1) / 2) / (SPECTRUM_BARS / 2)
  const profile = Math.max(0.12, Math.min(1, 0.42 + wave + texture + centerLift * 0.28))
  
  return 3 + profile * 5 + activity * (profile * 12 + 4)
}

function generateWavePath(
  width: number,
  height: number,
  phase: number,
  frequency: number,
  amplitude: number,
  activity: number,
  isActive: boolean
) {
  const activeAmp = isActive ? amplitude * (0.15 + activity * 0.85) : 1.5
  const points: string[] = []
  const step = 4
  
  for (let x = 0; x <= width; x += step) {
    const t = x / width
    // Taper ends smoothly using sine squared envelope
    const env = Math.pow(Math.sin(t * Math.PI), 2)
    const y = height / 2 + Math.sin(t * frequency * Math.PI * 2 - phase) * activeAmp * env
    if (x === 0) {
      points.push(`M ${x} ${y}`)
    } else {
      points.push(`L ${x} ${y}`)
    }
  }
  return points.join(' ')
}

export function AudioLevelMeter({ level, isActive, className, locale = 'pt-BR' }: AudioLevelMeterProps) {
  const t = getMessages(locale)
  const normalizedLevel = Math.max(0, Math.min(100, Math.round(level)))
  const activity = isActive ? normalizedLevel / 100 : 0
  const [phase, setPhase] = useState(0)

  useEffect(() => {
    if (!isActive) return
    let animId: number
    const tick = () => {
      setPhase((prev) => (prev + 0.08) % (Math.PI * 2))
      animId = requestAnimationFrame(tick)
    }
    animId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animId)
  }, [isActive])

  const tone = normalizedLevel > 82
    ? 'bg-red-400 text-red-400'
    : normalizedLevel > 58
      ? 'bg-amber-300 text-amber-300'
      : 'bg-[var(--studio-primary)] text-[var(--studio-primary)]'

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
    const barHeight = getBarHeight(index, phase, activity, isActive)
    const opacity = isActive ? 0.38 + activity * 0.52 + Math.sin(index * 0.18 + phase) * 0.08 : 0.2
    
    return (
      <div
        key={index}
        data-testid="audio-spectrum-bar"
        aria-hidden="true"
        className={cn(
          'w-0.5 rounded-full transition-[height,opacity,background-color] duration-150 sm:w-1',
          isActive && normalizedLevel > 0 ? `${tone} shadow-[0_0_8px_currentColor]` : 'bg-slate-600/30'
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
        'grid gap-4 rounded-lg border border-[color:var(--studio-border)] bg-[var(--studio-panel-strong)] p-4 shadow-inner shadow-black/20',
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

        {/* Dynamic Voice Wave Display */}
        <div className="relative flex h-28 items-end justify-center overflow-hidden rounded-md border border-[color:var(--studio-border)] bg-[var(--studio-bg)] px-3 py-3 shadow-inner shadow-black/20">
          <svg className="absolute inset-0 h-full w-full pointer-events-none" viewBox="0 0 300 100" preserveAspectRatio="none">
            {/* Wave 3 (Tertiary) */}
            <path
              d={generateWavePath(300, 100, phase * 0.6, 1.0, 12, activity, isActive)}
              fill="none"
              stroke="url(#wave-grad-3)"
              strokeWidth="1.5"
            />
            {/* Wave 2 (Secondary) */}
            <path
              d={generateWavePath(300, 100, -phase * 0.8, 2.2, 18, activity, isActive)}
              fill="none"
              stroke="url(#wave-grad-2)"
              strokeWidth="2"
            />
            {/* Wave 1 (Primary) */}
            <path
              d={generateWavePath(300, 100, phase * 1.1, 1.4, 28, activity, isActive)}
              fill="none"
              stroke="url(#wave-grad-1)"
              strokeWidth="2.5"
            />

            <defs>
              <linearGradient id="wave-grad-1" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="var(--studio-primary)" stopOpacity="0.1" />
                <stop offset="50%" stopColor="var(--studio-primary)" stopOpacity="0.8" />
                <stop offset="100%" stopColor="var(--studio-primary)" stopOpacity="0.1" />
              </linearGradient>
              <linearGradient id="wave-grad-2" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="var(--studio-secondary)" stopOpacity="0.05" />
                <stop offset="50%" stopColor="var(--studio-secondary)" stopOpacity="0.65" />
                <stop offset="100%" stopColor="var(--studio-secondary)" stopOpacity="0.05" />
              </linearGradient>
              <linearGradient id="wave-grad-3" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ec4899" stopOpacity="0.02" />
                <stop offset="50%" stopColor="#ec4899" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#ec4899" stopOpacity="0.02" />
              </linearGradient>
            </defs>
          </svg>

          {/* Equalizer bars - positioned neatly at the bottom */}
          <div className="z-10 flex items-end justify-center gap-0.5 w-full h-6 px-2 opacity-50">
            {bars}
          </div>
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

      <div className="sr-only">
        <div className={cn(
          "font-mono text-3xl font-extralight tracking-tighter transition-all duration-300",
          isActive && normalizedLevel > 0 
            ? normalizedLevel > 82
              ? "text-red-400" 
              : normalizedLevel > 58
                ? "text-amber-300" 
                : "text-[var(--studio-primary)]" 
            : "text-[var(--studio-muted)]"
        )}>
          {normalizedLevel}%
        </div>
        <div className={cn(
          "rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] border transition-all duration-300 shrink-0",
          isActive 
            ? normalizedLevel > 0
              ? normalizedLevel > 82
                ? "border-red-500/30 bg-red-500/10 text-red-400 shadow-[0_0_8px_rgba(239,68,68,0.1)]"
                : normalizedLevel > 58
                  ? "border-amber-500/30 bg-amber-500/10 text-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.1)]"
                  : "border-[color:var(--studio-primary-border)] bg-[var(--studio-primary-soft)] text-[var(--studio-primary)] shadow-[0_0_8px_rgba(16,185,129,0.15)]"
              : "border-[color:var(--studio-border)] bg-[var(--studio-panel)] text-[var(--studio-subtle)]"
            : "border-transparent bg-zinc-800/40 text-zinc-500"
        )}>
          {isActive ? (normalizedLevel > 0 ? (locale === 'en' ? 'Capturing' : 'Capturando') : (locale === 'en' ? 'Silent' : 'Silêncio')) : (locale === 'en' ? 'Offline' : 'Inativo')}
        </div>
      </div>
    </div>
  )
}
