'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { MaterialIcon } from '@/components/ui/material-icon'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useAdvancedAudioRecorder } from '@/hooks/useAdvancedAudioRecorder'
import { AudioSetupModal } from './AudioSetupModal'
import { AudioLevelMeter } from './AudioLevelMeter'
import { cn } from '@/lib/utils'
import {
  MAX_AUDIO_UPLOAD_MB,
  MIN_RECORDING_DURATION_SECONDS,
  shouldProcessRecording,
} from '@/lib/audio-constraints'
import { getMessages, type Locale } from '@/lib/i18n'

export interface AudioCaptureReadiness {
  hasAudioDevice: boolean
  hasAudioSignal: boolean
  hasCaptureError: boolean
}

interface AdvancedAudioRecorderProps {
  onRecordingComplete?: (data: { blob: Blob; duration: number; filename?: string; source: 'recording' | 'upload' }) => void | Promise<void>
  onReadinessChange?: (readiness: AudioCaptureReadiness) => void
  className?: string
  disabled?: boolean
  locale?: Locale
  maxUploadMb?: number
  processingMode?: 'multimodal' | 'text'
  activeTab?: string
  onTabChange?: (tab: string) => void
}

export function AdvancedAudioRecorder({
  onRecordingComplete,
  onReadinessChange,
  className,
  disabled = false,
  locale = 'pt-BR',
  maxUploadMb = MAX_AUDIO_UPLOAD_MB,
  processingMode = 'multimodal',
  activeTab = 'record',
  onTabChange,
}: AdvancedAudioRecorderProps) {
  const t = getMessages(locale)
  const [showSetupModal, setShowSetupModal] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [discardedRecordingMessage, setDiscardedRecordingMessage] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const processedRecordingRef = useRef<Blob | null>(null)
  const lastReadinessRef = useRef<AudioCaptureReadiness | null>(null)
  const [hasDetectedSignal, setHasDetectedSignal] = useState(false)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (!isRecording && !disabled) {
      setIsDragging(true)
    }
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (isRecording || disabled) return
    const file = e.dataTransfer.files?.[0]
    if (file) {
      setDiscardedRecordingMessage('')
      await handleFileUpload(file, maxUploadMb)
    }
  }

  const [isMounted, setIsMounted] = useState(false)
  useEffect(() => {
    setIsMounted(true)
  }, [])

  const {
    isRecording,
    isPaused,
    duration,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    audioDevices,
    selectedDeviceId,
    setSelectedDeviceId,
    audioLevel,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    handleFileUpload,
    recordingData,
    error,
    clearError,
    isCompressing,
  } = useAdvancedAudioRecorder()

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const handleStartRecording = async () => {
    clearError()
    setDiscardedRecordingMessage('')
    setIsTesting(false)
    await startRecording()
  }

  const handleStopRecording = () => {
    stopRecording()
  }

  const handleFileInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setDiscardedRecordingMessage('')
      await handleFileUpload(file, maxUploadMb)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleTestAudio = async () => {
    if (!isTesting) {
      setIsTesting(true)
      const started = await startMonitoring()
      if (!started) setIsTesting(false)
    } else {
      setIsTesting(false)
      stopMonitoring()
    }
  }

  const studioState = isRecording
    ? isPaused
      ? t.recorder.sessionPaused
      : t.recorder.sessionActive
    : isTesting
      ? t.recorder.monitoringInput
      : t.recorder.readyToRecord

  const captureState = isRecording
    ? isPaused
      ? t.recorder.paused
      : t.recorder.recording
    : isTesting
      ? t.recorder.testing
      : isMonitoring
        ? t.recorder.monitoring
        : t.recorder.inactive

  const signalActive = isMonitoring || isRecording
  const captureMode = isRecording
    ? isPaused
      ? t.recorder.paused
      : t.recorder.live
    : isTesting || isMonitoring
      ? t.recorder.test
      : t.recorder.ready
  const captureSource = recordingData?.source === 'upload' ? t.recorder.upload : t.recorder.microphone
  const signalLevel = `${Math.round(audioLevel)}%`
  const canShowRecordingResult = recordingData ? shouldProcessRecording(recordingData) : false

  const estSizeKb = duration * 6
  const estSizeFormatted = estSizeKb < 1024 
    ? `${estSizeKb.toFixed(0)} KB` 
    : `${(estSizeKb / 1024).toFixed(1)} MB`

  const selectedDevice = audioDevices.find(d => d.deviceId === selectedDeviceId)
  const defaultMicLabel = locale === 'en' ? 'Default Microphone' : 'Microfone Padrão'
  const activeDeviceLabel = selectedDevice ? selectedDevice.label : defaultMicLabel

  const truncateFilename = (name: string, maxLen = 16) => {
    if (name.length <= maxLen) return name
    const extIdx = name.lastIndexOf('.')
    if (extIdx !== -1 && name.length - extIdx <= 5) {
      const ext = name.slice(extIdx)
      const base = name.slice(0, extIdx)
      return base.slice(0, maxLen - ext.length - 3) + '...' + ext
    }
    return name.slice(0, maxLen - 3) + '...'
  }

  const activeDuration = recordingData ? recordingData.duration : duration
  const estProcessingTime = Math.max(10, Math.round(activeDuration * 0.08))
  const cardInputLabel = locale === 'en' ? 'Projection' : 'Projeção'
  const cardInputVal = activeDuration > 0
    ? (locale === 'en' ? `~${estProcessingTime}s AI` : `~${estProcessingTime}s IA`)
    : (locale === 'en' ? 'Ready' : 'Pronto')

  const cardSizeLabel = locale === 'en' ? 'Size' : 'Tamanho'
  const cardSizeVal = recordingData 
    ? formatFileSize(recordingData.size)
    : duration > 0
      ? estSizeFormatted
      : '0 KB'

  const cardLangLabel = locale === 'en' ? 'AI Mode' : 'Modo de IA'
  const cardLangVal = processingMode === 'multimodal'
    ? (locale === 'en' ? 'Full Audio' : 'Áudio Completo')
    : (locale === 'en' ? 'Economical' : 'Econômico')

  useEffect(() => {
    if (recordingData && processedRecordingRef.current !== recordingData.blob) {
      processedRecordingRef.current = recordingData.blob

      if (!shouldProcessRecording(recordingData)) {
        setDiscardedRecordingMessage(t.recorder.shortDiscarded(MIN_RECORDING_DURATION_SECONDS))
        return
      }

      setDiscardedRecordingMessage('')
      if (onRecordingComplete) {
        void onRecordingComplete(recordingData)
      }
    }

    if (!recordingData) {
      processedRecordingRef.current = null
      setDiscardedRecordingMessage('')
    }
  }, [recordingData, onRecordingComplete, t])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const persisted = sessionStorage.getItem('listen-meet-audio-detected') === 'true'
      if (persisted) {
        setHasDetectedSignal(true)
      }
    }
  }, [])

  useEffect(() => {
    if (signalActive && audioLevel > 1) {
      setHasDetectedSignal(true)
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('listen-meet-audio-detected', 'true')
      }
    }
  }, [signalActive, audioLevel])

  useEffect(() => {
    const nextReadiness = {
      hasAudioDevice: audioDevices.length > 0,
      hasAudioSignal: hasDetectedSignal || (signalActive && audioLevel > 1),
      hasCaptureError: Boolean(error),
    }

    const previous = lastReadinessRef.current
    if (
      previous?.hasAudioDevice === nextReadiness.hasAudioDevice &&
      previous?.hasAudioSignal === nextReadiness.hasAudioSignal &&
      previous?.hasCaptureError === nextReadiness.hasCaptureError
    ) {
      return
    }

    lastReadinessRef.current = nextReadiness
    onReadinessChange?.(nextReadiness)
  }, [audioDevices.length, audioLevel, error, onReadinessChange, signalActive, hasDetectedSignal])

  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-xl border border-[color:var(--studio-border)] bg-[var(--studio-card)] glass-card text-[var(--studio-text)] shadow-2xl shadow-black/20 transition-all duration-300',
        className
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--studio-primary)] to-transparent" />

      <header className="flex flex-col gap-4 border-b border-[color:var(--studio-border)] bg-[var(--studio-panel)] px-5 py-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--studio-primary)]">
            <MaterialIcon name="radio_button_checked" className={cn('text-sm', isRecording && !isPaused && 'animate-pulse')} />
            {studioState}
          </div>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-[var(--studio-text)]">{t.recorder.title}</h2>
            <p className="mt-1 text-sm text-[var(--studio-muted)]">
              {t.recorder.description}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className={cn(
            "flex items-center gap-2.5 rounded-lg border px-3 py-1.5 transition-all duration-300 backdrop-blur-md shadow-xs min-h-[40px]",
            captureState === t.recorder.inactive && "border-[color:var(--studio-border)] bg-[var(--studio-panel-strong)]/40 text-[var(--studio-muted)]",
            captureState === t.recorder.recording && "border-red-500/30 bg-red-500/10 text-red-400 shadow-[0_0_12px_rgba(239,68,68,0.15)]",
            captureState === t.recorder.paused && "border-amber-500/30 bg-amber-500/10 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.15)]",
            (captureState === t.recorder.testing || captureState === t.recorder.monitoring) && "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.15)]"
          )}>
            <span className={cn(
              "h-1.5 w-1.5 rounded-full transition-all duration-300 shrink-0",
              captureState === t.recorder.inactive && "bg-zinc-500",
              captureState === t.recorder.recording && "bg-red-500 animate-pulse shadow-[0_0_6px_#ef4444]",
              captureState === t.recorder.paused && "bg-amber-500 animate-pulse shadow-[0_0_6px_#f59e0b]",
              (captureState === t.recorder.testing || captureState === t.recorder.monitoring) && "bg-emerald-500 animate-pulse shadow-[0_0_6px_#10b981]"
            )} />
            <div className="text-left">
              <span className="block text-[8px] font-bold uppercase tracking-[0.24em] text-[var(--studio-subtle)] leading-none">{t.recorder.state}</span>
              <span className={cn(
                "block mt-1 text-xs font-bold leading-none tracking-wide",
                captureState === t.recorder.inactive && "text-[var(--studio-muted)]",
                captureState === t.recorder.recording && "text-red-400",
                captureState === t.recorder.paused && "text-amber-400",
                (captureState === t.recorder.testing || captureState === t.recorder.monitoring) && "text-emerald-400"
              )}>{captureState}</span>
            </div>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSetupModal(true)}
                className="h-10 w-10 border-[color:var(--studio-border)] bg-[var(--studio-panel-strong)] p-0 text-[var(--studio-muted)] hover:bg-[var(--studio-card-alt)] hover:text-[var(--studio-text)]"
                aria-label={t.recorder.helpAria}
              >
                <MaterialIcon name="help" className="text-base" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t.recorder.helpTooltip}</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </header>

      <div className="grid gap-5 p-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          {error && (
            <div role="alert" className="flex items-center gap-2 rounded-lg border border-[color:var(--studio-danger-border)] bg-[var(--studio-danger-bg)] p-3 text-[var(--studio-danger-text)]">
              <MaterialIcon name="error" className="text-base" />
              <span className="text-sm">{error}</span>
              <Button variant="ghost" size="sm" onClick={clearError} className="ml-auto text-[var(--studio-danger-text)] hover:bg-[var(--studio-danger-bg)]">
                {t.common.close}
              </Button>
            </div>
          )}

          {discardedRecordingMessage && (
            <div role="status" aria-live="polite" className="flex items-center gap-2 rounded-lg border border-[color:var(--studio-warning-border)] bg-[var(--studio-warning-bg)] p-3 text-[var(--studio-warning-text)]">
              <MaterialIcon name="error" className="text-base" />
              <span className="text-sm">{discardedRecordingMessage}</span>
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
            <div className={cn(
              "rounded-lg border border-[color:var(--studio-border)] bg-[var(--studio-panel-strong)] p-5 transition-all duration-300 flex flex-col items-center justify-center text-center min-h-[160px]",
              isRecording && !isPaused && "animate-breathe-glow-red border-red-500/20",
              isRecording && isPaused && "animate-breathe-glow-amber border-amber-500/20"
            )}>
              <div className="flex flex-col items-center justify-center gap-3">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-[var(--studio-subtle)] justify-center">
                  <MaterialIcon name="timer" className="text-base text-[var(--studio-secondary)]" />
                  {t.recorder.sessionTime}
                </div>
                <div className="whitespace-nowrap font-sans tracking-tight text-4xl font-light leading-none text-[var(--studio-text)] sm:text-5xl my-2">
                  {formatTime(duration)}
                </div>
                <div className="flex items-center gap-2 rounded-full border border-[color:var(--studio-border)] bg-[var(--studio-panel)] px-3 py-1 text-xs text-[var(--studio-muted)] justify-center">
                  <span className={cn(
                    'h-1.5 w-1.5 rounded-full',
                    isRecording && !isPaused ? 'animate-pulse bg-red-500' : isPaused ? 'bg-amber-500 animate-pulse' : 'bg-zinc-500'
                  )} />
                  {isRecording && !isPaused ? t.recorder.live : isPaused ? t.recorder.paused : captureState}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 lg:grid-cols-1">
              <div className="rounded-lg border border-[color:var(--studio-border)] bg-[var(--studio-card-alt)] p-3">
                <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--studio-subtle)]">{cardInputLabel}</p>
                <p className="mt-2 text-sm font-semibold text-[var(--studio-text)]">{cardInputVal}</p>
              </div>
              <div className="rounded-lg border border-[color:var(--studio-border)] bg-[var(--studio-card-alt)] p-3">
                <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--studio-subtle)]">{cardSizeLabel}</p>
                <p className="mt-2 text-sm font-semibold text-[var(--studio-text)]">{cardSizeVal}</p>
              </div>
              <div className="rounded-lg border border-[color:var(--studio-border)] bg-[var(--studio-card-alt)] p-3">
                <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--studio-subtle)]">{cardLangLabel}</p>
                <p className="mt-2 text-sm font-semibold text-[var(--studio-text)]">{cardLangVal}</p>
              </div>
            </div>
          </div>

          <section className="space-y-3 rounded-lg border border-[color:var(--studio-border)] bg-[var(--studio-panel-strong)] p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <MaterialIcon name="graphic_eq" className="text-base text-[var(--studio-primary)]" />
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--studio-muted)]">{t.recorder.liveSignal}</h3>
              </div>
              {audioLevel === 0 && signalActive && (
                <span className="text-xs text-[var(--studio-warning-text)]">{t.recorder.calibrate}</span>
              )}
            </div>
            <AudioLevelMeter level={audioLevel} isActive={signalActive} locale={locale} />
          </section>

          <div className="grid gap-3 sm:grid-cols-2">
            {!isRecording ? (
              <>
                <Button
                  onClick={handleStartRecording}
                  size="lg"
                  disabled={disabled}
                  className="h-12 rounded-lg bg-[var(--studio-primary)] font-semibold text-[#061021] hover:opacity-90"
                >
                  <MaterialIcon name="mic" className="text-base" />
                  {t.recorder.start}
                </Button>
                <Button
                  onClick={handleTestAudio}
                  variant="outline"
                  size="lg"
                  disabled={disabled}
                  className="h-12 rounded-lg border-[color:var(--studio-border)] bg-[var(--studio-panel)] font-semibold text-[var(--studio-text)] hover:bg-[var(--studio-card-alt)] hover:text-[var(--studio-text)]"
                >
                  <MaterialIcon name="headphones" className="text-base" />
                  {isTesting ? t.recorder.stopTest : t.recorder.testAudio}
                </Button>
              </>
            ) : (
              <>
                {!isPaused ? (
                  <Button
                    onClick={pauseRecording}
                    variant="outline"
                    size="lg"
                    disabled={disabled}
                    className="h-12 rounded-lg border-[color:var(--studio-border)] bg-[var(--studio-panel)] font-semibold text-[var(--studio-text)] hover:bg-[var(--studio-card-alt)] hover:text-[var(--studio-text)]"
                  >
                    <MaterialIcon name="pause" className="text-base" />
                    {t.recorder.pause}
                  </Button>
                ) : (
                  <Button
                    onClick={resumeRecording}
                    variant="outline"
                    size="lg"
                    disabled={disabled}
                    className="h-12 rounded-lg border-[color:var(--studio-border)] bg-[var(--studio-panel)] font-semibold text-[var(--studio-text)] hover:bg-[var(--studio-card-alt)] hover:text-[var(--studio-text)]"
                  >
                    <MaterialIcon name="play_arrow" className="text-base" />
                    {t.recorder.continue}
                  </Button>
                )}
                <Button onClick={handleStopRecording} variant="destructive" size="lg" className="h-12 rounded-lg font-semibold">
                  <MaterialIcon name="stop" className="text-base" filled />
                  {t.recorder.stop}
                </Button>
              </>
            )}
          </div>
        </div>

        <aside className="space-y-4">
          <section className="rounded-lg border border-[color:var(--studio-border)] bg-[var(--studio-panel)] p-4">
            <div className="mb-4 flex items-center gap-2">
              <MaterialIcon name="tune" className="text-base text-[var(--studio-secondary)]" />
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--studio-muted)]">{t.recorder.inputMatrix}</h3>
            </div>
            <div className="space-y-2">
              <label htmlFor="audio-device" className="text-xs text-[var(--studio-subtle)]">{t.recorder.device}</label>
              <Select value={selectedDeviceId} onValueChange={setSelectedDeviceId}>
                <SelectTrigger id="audio-device" className="w-full border-[color:var(--studio-border)] bg-[var(--studio-panel-strong)] text-[var(--studio-text)]">
                  <SelectValue placeholder={t.recorder.device} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">{t.recorder.defaultMic}</SelectItem>
                  {audioDevices.map((device) => (
                    <SelectItem key={device.deviceId} value={device.deviceId}>
                      {device.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[10px] uppercase tracking-[0.14em] text-[var(--studio-subtle)]">
              <div className="rounded-md bg-[var(--studio-panel-strong)] p-2">{t.recorder.mic}</div>
              <div className="rounded-md bg-[var(--studio-panel-strong)] p-2">{t.recorder.virtual}</div>
              <div className="rounded-md bg-[var(--studio-panel-strong)] p-2">{t.recorder.upload}</div>
            </div>
          </section>

          <section 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              "rounded-lg border p-4 transition-all duration-300",
              isDragging 
                ? "border-glow-primary border-solid bg-[rgba(16,185,129,0.06)] scale-[1.02]" 
                : "border-dashed border-[color:var(--studio-border)] bg-[var(--studio-panel)]"
            )}
          >
            {isCompressing ? (
              <div className="flex flex-col items-center justify-center py-6 text-center space-y-3">
                <MaterialIcon name="hourglass_empty" className="text-xl animate-spin text-[var(--studio-secondary)]" />
                <p className="text-sm font-semibold text-[var(--studio-text)]">
                  {locale === 'en' ? 'Compressing audio...' : 'Compactando áudio...'}
                </p>
                <p className="text-xs text-[var(--studio-muted)] leading-relaxed max-w-[240px]">
                  {locale === 'en' 
                    ? 'Downsampling to 16kHz mono to fit the provider upload limit.' 
                    : 'Reamostrando para 16kHz mono para adequar ao limite de envio.'}
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "rounded-md p-2 transition-colors duration-300",
                    isDragging 
                      ? "bg-[var(--studio-primary-soft)] text-[var(--studio-primary)] animate-pulse" 
                      : "bg-[var(--studio-secondary-soft)] text-[var(--studio-secondary)]"
                  )}>
                    <MaterialIcon name="audio_file" className="text-base" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[var(--studio-text)]">
                      {isDragging ? (locale === 'en' ? 'Drop audio here!' : 'Solte o áudio aqui!') : t.recorder.uploadArea}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-[var(--studio-subtle)]">
                      {t.recorder.uploadFormats(maxUploadMb)}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={handleUploadClick}
                  className="mt-4 w-full border-[color:var(--studio-border)] bg-[var(--studio-panel-strong)] text-[var(--studio-text)] hover:bg-[var(--studio-card-alt)] hover:text-[var(--studio-text)] cursor-pointer"
                  disabled={isRecording || disabled}
                >
                  <MaterialIcon name="upload" className="text-base" />
                  {t.common.selectFile}
                </Button>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,.mp3,.wav,.webm,.ogg,.aac,.m4a,.flac,.3gp,.amr"
              onChange={handleFileInputChange}
              className="hidden"
            />
          </section>

          {recordingData && canShowRecordingResult && (
            <section className="rounded-lg border border-[color:var(--studio-primary-border)] bg-[var(--studio-primary-soft)] p-4">
              <div className="mb-2 flex items-center gap-2 text-[var(--studio-primary)]">
                <MaterialIcon name="check_circle" className="text-base" filled />
                <span className="font-medium">
                  {recordingData.source === 'recording' ? t.recorder.recordingCompleted : t.recorder.fileUploaded}
                </span>
              </div>
              <div className="space-y-1 text-xs text-[var(--studio-muted)]">
                {recordingData.filename && <div>{t.recorder.file}: {recordingData.filename}</div>}
                <div>{t.recorder.duration}: {formatTime(recordingData.duration)}</div>
                <div>{t.recorder.size}: {formatFileSize(recordingData.size)}</div>
                <div>{t.recorder.type}: {recordingData.blob.type || 'audio/webm'}</div>
              </div>
            </section>
          )}

          <section className="rounded-lg border border-[color:var(--studio-border)] bg-[var(--studio-panel)] p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--studio-text)]">
              <MaterialIcon name="route" className="text-base text-[var(--studio-primary)]" />
              {t.recorder.routeTitle}
            </div>
            <p className="mt-2 text-xs leading-5 text-[var(--studio-subtle)]">
              {t.recorder.routeDescription}
            </p>
            <div className="mt-3 flex items-center gap-2 text-xs text-[var(--studio-subtle)]">
              <MaterialIcon name="hard_drive" className="text-base" />
              {t.recorder.localHistory}
            </div>
          </section>
        </aside>
      </div>

      <AudioSetupModal
        open={showSetupModal}
        onOpenChange={setShowSetupModal}
        locale={locale}
      />

      {isMounted && typeof document !== 'undefined' && activeTab !== 'record' && (isRecording || isMonitoring) && createPortal(
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-full border border-[color:var(--studio-border)] bg-[var(--studio-panel)]/95 p-2 px-4 shadow-2xl shadow-black/60 backdrop-blur-md animate-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center gap-2">
            <span className={cn(
              "h-2 w-2 rounded-full shrink-0",
              isRecording 
                ? "bg-red-500 animate-pulse shadow-[0_0_8px_#ef4444]" 
                : "bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]"
            )} />
            <span className="font-mono text-xs font-semibold text-[var(--studio-text)] shrink-0">
              {isRecording ? formatTime(duration) : (locale === 'en' ? 'Live test' : 'Sinal vivo')}
            </span>
          </div>

          {isMonitoring && (
            <div className="flex items-center gap-0.5 h-3 px-1">
              <div className="w-0.5 bg-[var(--studio-primary)] rounded-full transition-all duration-100" style={{ height: `${Math.max(2, (audioLevel / 100) * 12)}px` }} />
              <div className="w-0.5 bg-[var(--studio-primary)] rounded-full transition-all duration-100" style={{ height: `${Math.max(2, (audioLevel / 100) * 8)}px` }} />
              <div className="w-0.5 bg-[var(--studio-primary)] rounded-full transition-all duration-100" style={{ height: `${Math.max(2, (audioLevel / 100) * 10)}px` }} />
            </div>
          )}

          <div className="flex items-center gap-1 border-l border-[color:var(--studio-border)] pl-2 ml-1">
            {isRecording && (
              <Button
                size="icon"
                variant="ghost"
                onClick={isPaused ? resumeRecording : pauseRecording}
                className="h-7 w-7 rounded-full text-[var(--studio-text)] hover:bg-[var(--studio-card-alt)] cursor-pointer"
              >
                <MaterialIcon name={isPaused ? "play_arrow" : "pause"} className="text-sm" />
              </Button>
            )}
            <Button
              size="icon"
              variant="ghost"
              onClick={isRecording ? stopRecording : stopMonitoring}
              className="h-7 w-7 rounded-full text-red-400 hover:bg-red-500/10 cursor-pointer"
            >
              <MaterialIcon name="stop" className="text-sm" />
            </Button>
            {onTabChange && (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => onTabChange('record')}
                className="h-7 w-7 rounded-full text-[var(--studio-muted)] hover:text-[var(--studio-text)] hover:bg-[var(--studio-card-alt)] cursor-pointer"
              >
                <MaterialIcon name="open_in_full" className="text-sm" />
              </Button>
            )}
          </div>
        </div>,
        document.body
      )}
    </section>
  )
}
