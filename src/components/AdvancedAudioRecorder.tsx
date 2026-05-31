'use client'

import { useEffect, useRef, useState } from 'react'
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
}

export function AdvancedAudioRecorder({
  onRecordingComplete,
  onReadinessChange,
  className,
  disabled = false,
  locale = 'pt-BR',
}: AdvancedAudioRecorderProps) {
  const t = getMessages(locale)
  const [showSetupModal, setShowSetupModal] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [discardedRecordingMessage, setDiscardedRecordingMessage] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const processedRecordingRef = useRef<Blob | null>(null)
  const lastReadinessRef = useRef<AudioCaptureReadiness | null>(null)

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
      await handleFileUpload(file)
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
    const nextReadiness = {
      hasAudioDevice: audioDevices.length > 0,
      hasAudioSignal: signalActive && audioLevel > 1,
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
  }, [audioDevices.length, audioLevel, error, onReadinessChange, signalActive])

  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-lg border border-[color:var(--studio-border)] bg-[var(--studio-card)] text-[var(--studio-text)] shadow-2xl shadow-black/20',
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
          <div className="rounded-lg border border-[color:var(--studio-border)] bg-[var(--studio-card-alt)] px-3 py-2 text-right">
            <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--studio-subtle)]">{t.recorder.state}</p>
            <p className="text-sm font-semibold text-[var(--studio-text)]">{captureState}</p>
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
            <div className="rounded-lg border border-[color:var(--studio-border)] bg-[var(--studio-panel-strong)] p-5">
              <div className="flex flex-col gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-[var(--studio-subtle)]">
                    <MaterialIcon name="timer" className="text-base text-[var(--studio-secondary)]" />
                    {t.recorder.sessionTime}
                  </div>
                  <div className="mt-3 whitespace-nowrap font-mono text-6xl font-semibold leading-none text-[var(--studio-text)] sm:text-7xl">
                    {formatTime(duration)}
                  </div>
                </div>
                <div className="flex w-fit items-center gap-2 rounded-full border border-[color:var(--studio-border)] bg-[var(--studio-panel)] px-3 py-1.5 text-sm text-[var(--studio-muted)]">
                  <span className={cn(
                    'h-2 w-2 rounded-full',
                    isRecording && !isPaused ? 'animate-pulse bg-[var(--studio-primary)]' : 'bg-zinc-500'
                  )} />
                  {isRecording && !isPaused ? t.recorder.live : captureState}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 lg:grid-cols-1">
              <div className="rounded-lg border border-[color:var(--studio-border)] bg-[var(--studio-card-alt)] p-3">
                <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--studio-subtle)]">{t.recorder.source}</p>
                <p className="mt-2 text-sm font-semibold text-[var(--studio-text)]">{captureSource}</p>
              </div>
              <div className="rounded-lg border border-[color:var(--studio-border)] bg-[var(--studio-card-alt)] p-3">
                <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--studio-subtle)]">{t.recorder.signal}</p>
                <p className="mt-2 text-sm font-semibold text-[var(--studio-text)]">{signalLevel}</p>
              </div>
              <div className="rounded-lg border border-[color:var(--studio-border)] bg-[var(--studio-card-alt)] p-3">
                <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--studio-subtle)]">{t.recorder.mode}</p>
                <p className="mt-2 text-sm font-semibold text-[var(--studio-text)]">{captureMode}</p>
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

          <section className="rounded-lg border border-dashed border-[color:var(--studio-border)] bg-[var(--studio-panel)] p-4">
            <div className="flex items-start gap-3">
              <div className="rounded-md bg-[var(--studio-secondary-soft)] p-2 text-[var(--studio-secondary)]">
                <MaterialIcon name="audio_file" className="text-base" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[var(--studio-text)]">{t.recorder.uploadArea}</p>
                <p className="mt-1 text-xs leading-5 text-[var(--studio-subtle)]">
                  {t.recorder.uploadFormats(MAX_AUDIO_UPLOAD_MB)}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={handleUploadClick}
              className="mt-4 w-full border-[color:var(--studio-border)] bg-[var(--studio-panel-strong)] text-[var(--studio-text)] hover:bg-[var(--studio-card-alt)] hover:text-[var(--studio-text)]"
              disabled={isRecording || disabled}
            >
              <MaterialIcon name="upload" className="text-base" />
              {t.common.selectFile}
            </Button>
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
    </section>
  )
}
