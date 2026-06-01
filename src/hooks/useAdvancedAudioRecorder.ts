'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { getAudioFilenameForBlob, validateAudioFile, MAX_AUDIO_UPLOAD_MB } from '@/lib/audio-constraints'

export interface AudioDevice {
  deviceId: string
  label: string
  kind: string
}

export interface RecordingData {
  blob: Blob
  duration: number
  size: number
  filename?: string
  source: 'recording' | 'upload'
}

export interface UseAdvancedAudioRecorderReturn {
  // Recording state
  isRecording: boolean
  isPaused: boolean
  duration: number
  
  // Recording controls
  startRecording: () => Promise<void>
  stopRecording: () => void
  pauseRecording: () => void
  resumeRecording: () => void
  
  // Device management
  audioDevices: AudioDevice[]
  selectedDeviceId: string
  setSelectedDeviceId: (deviceId: string) => void
  refreshDevices: () => Promise<void>
  
  // Audio monitoring
  audioLevel: number
  isMonitoring: boolean
  startMonitoring: () => Promise<boolean>
  stopMonitoring: () => void
  
  // File upload
  handleFileUpload: (file: File, maxUploadMb?: number) => Promise<void>
  
  // Results
  recordingData: RecordingData | null
  error: string | null
  clearError: () => void
  isCompressing?: boolean
}

export function useAdvancedAudioRecorder(): UseAdvancedAudioRecorderReturn {
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [duration, setDuration] = useState(0)
  const [recordingData, setRecordingData] = useState<RecordingData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isCompressing, setIsCompressing] = useState(false)
  
  const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('default')
  
  // Audio monitoring state
  const [audioLevel, setAudioLevel] = useState<number>(0)
  const [isMonitoring, setIsMonitoring] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const monitorStreamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const startTimeRef = useRef<number>(0)
  const pausedTimeRef = useRef<number>(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastAudioLevelUpdateRef = useRef(0)

  const clearDurationTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const stopStreamTracks = useCallback((stream: MediaStream | null) => {
    stream?.getTracks().forEach((track) => track.stop())
  }, [])

  // Load available audio devices
  const refreshDevices = useCallback(async () => {
    try {
      // Request permissions first
      await navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
        stream.getTracks().forEach(track => track.stop())
      })

      const devices = await navigator.mediaDevices.enumerateDevices()
      const audioInputs = devices
        .filter(device => device.kind === 'audioinput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `Microfone ${device.deviceId.slice(0, 8)}`,
          kind: device.kind
        }))

      setAudioDevices(audioInputs)
    } catch (err) {
      console.error('Error loading audio devices:', err)
      setError('Não foi possível carregar dispositivos de áudio. Verifique as permissões.')
    }
  }, [])

  // Load devices on mount
  useEffect(() => {
    refreshDevices()
  }, [refreshDevices])

  const updateDuration = useCallback(() => {
    if (startTimeRef.current) {
      const elapsed = Date.now() - startTimeRef.current
      setDuration(Math.floor(elapsed / 1000))
    }
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const startAudioLevelLoop = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    const updateLevel = () => {
      if (!analyserRef.current) return

      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
      analyserRef.current.getByteFrequencyData(dataArray)

      let sum = 0
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i] * dataArray[i]
      }

      const rms = Math.sqrt(sum / dataArray.length)
      const level = Math.min(100, (rms / 255) * 100 * 2)
      const now = performance.now()
      if (now - lastAudioLevelUpdateRef.current >= 66) {
        lastAudioLevelUpdateRef.current = now
        setAudioLevel(level)
      }

      animationFrameRef.current = requestAnimationFrame(updateLevel)
    }

    updateLevel()
  }, [])

  const startMonitoring = useCallback(async (): Promise<boolean> => {
    try {
      setError(null)
      
      const constraints: MediaStreamConstraints = {
        audio: selectedDeviceId === 'default' ? {
          echoCancellation: false, // Better for monitoring
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: 44100,
        } : {
          deviceId: { exact: selectedDeviceId },
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: 44100,
        }
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      monitorStreamRef.current = stream

      // Create audio context and analyser
      const audioContext = new (window.AudioContext || (window as unknown as typeof AudioContext))()
      audioContextRef.current = audioContext

      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      
      analyser.fftSize = 256
      analyser.smoothingTimeConstant = 0.8
      
      source.connect(analyser)
      analyserRef.current = analyser

      setIsMonitoring(true)
      startAudioLevelLoop()
      return true

    } catch (err) {
      console.error('Error starting audio monitoring:', err)
      setError('Não foi possível iniciar monitoramento de áudio. Verifique as permissões.')
      return false
    }
  }, [selectedDeviceId, startAudioLevelLoop])

  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false)
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    if (monitorStreamRef.current) {
      stopStreamTracks(monitorStreamRef.current)
      monitorStreamRef.current = null
    }

    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }

    analyserRef.current = null
    setAudioLevel(0)
  }, [stopStreamTracks])




  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearDurationTimer()
      if (mediaRecorderRef.current) {
        try {
          mediaRecorderRef.current.stop()
        } catch {
          // Recorder may already be inactive in some browsers.
        }
        mediaRecorderRef.current = null
      }
      stopStreamTracks(streamRef.current)
      streamRef.current = null
      stopMonitoring()
    }
  }, [clearDurationTimer, stopMonitoring, stopStreamTracks])

  const startRecording = useCallback(async () => {
    try {
      setError(null)
      setRecordingData(null)

      if (isMonitoring) {
        stopMonitoring()
      }

      const constraints: MediaStreamConstraints = {
        audio: selectedDeviceId === 'default' ? {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
        } : {
          deviceId: { exact: selectedDeviceId },
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
        }
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream
      chunksRef.current = []

      // Set up audio monitoring for recording levels
      const audioContext = new (window.AudioContext || (window as unknown as typeof AudioContext))()
      audioContextRef.current = audioContext

      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      
      analyser.fftSize = 256
      analyser.smoothingTimeConstant = 0.8
      
      source.connect(analyser)
      analyserRef.current = analyser

      setIsMonitoring(true)
      startAudioLevelLoop()

      // Try different codecs based on browser support
      let mimeType = 'audio/webm;codecs=opus'
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm'
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'audio/mp4'
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = '' // Let browser decide
          }
        }
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType || undefined,
        audioBitsPerSecond: 24000,
      })
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { 
          type: mimeType || 'audio/webm' 
        })
        // Calculate final duration based on actual recording time
        const finalDuration = startTimeRef.current ? Math.floor((Date.now() - startTimeRef.current) / 1000) : duration
        
        setRecordingData({
          blob,
          duration: finalDuration,
          size: blob.size,
          filename: getAudioFilenameForBlob(blob),
          source: 'recording'
        })

        // Cleanup
        if (streamRef.current) {
          stopStreamTracks(streamRef.current)
          streamRef.current = null
        }
        
        // Stop monitoring after recording ends
        stopMonitoring()
      }

      mediaRecorder.start(1000) // Collect data every second
      
      startTimeRef.current = Date.now()
      setIsRecording(true)
      setIsPaused(false)
      setDuration(0)

      // Start duration timer
      intervalRef.current = setInterval(updateDuration, 1000)

    } catch (err) {
      console.error('Error starting recording:', err)
      stopMonitoring()
      stopStreamTracks(streamRef.current)
      streamRef.current = null
      setError('Não foi possível iniciar a gravação. Verifique as permissões do microfone.')
    }
  }, [selectedDeviceId, duration, updateDuration, stopMonitoring, isMonitoring, startAudioLevelLoop, stopStreamTracks])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      setIsPaused(false)

      clearDurationTimer()
    }
  }, [clearDurationTimer, isRecording])

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording && !isPaused) {
      mediaRecorderRef.current.pause()
      setIsPaused(true)
      
      // Mark pause start time
      pausedTimeRef.current = Date.now()
      
      clearDurationTimer()
    }
  }, [clearDurationTimer, isRecording, isPaused])

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording && isPaused) {
      mediaRecorderRef.current.resume()
      setIsPaused(false)
      
      // Adjust start time to account for pause duration
      const pauseDuration = Date.now() - pausedTimeRef.current
      startTimeRef.current += pauseDuration
      
      // Resume duration timer
      intervalRef.current = setInterval(updateDuration, 1000)
    }
  }, [isRecording, isPaused, updateDuration])

  const handleFileUpload = useCallback(async (file: File, maxUploadMb?: number) => {
    try {
      setError(null)
      setRecordingData(null)
      
      const limitMb = maxUploadMb ?? MAX_AUDIO_UPLOAD_MB
      const limitBytes = limitMb * 1024 * 1024
      
      let finalFile = file
      
      if (file.size > 10 * 1024 * 1024 || file.size > limitBytes) {
        setIsCompressing(true)
        try {
          finalFile = await compressAudioFile(file)
        } catch (compressErr) {
          console.warn('Falha na compactação automática do áudio:', compressErr)
        } finally {
          setIsCompressing(false)
        }
      }

      const validation = validateAudioFile({
        name: finalFile.name,
        type: finalFile.type,
        size: finalFile.size
      }, maxUploadMb)

      if (!validation.valid) {
        setError(validation.message || 'Arquivo de áudio inválido.')
        return
      }

      // Get duration using audio element
      const audioUrl = URL.createObjectURL(finalFile)
      const audio = new Audio(audioUrl)
      
      const duration = await new Promise<number>((resolve, reject) => {
        audio.addEventListener('loadedmetadata', () => {
          URL.revokeObjectURL(audioUrl)
          resolve(Math.floor(audio.duration))
        })
        audio.addEventListener('error', () => {
          URL.revokeObjectURL(audioUrl)
          reject(new Error('Não foi possível analisar o arquivo de áudio'))
        })
      })

      setRecordingData({
        blob: finalFile,
        duration,
        size: finalFile.size,
        filename: finalFile.name,
        source: 'upload'
      })

    } catch (err) {
      console.error('Error handling file upload:', err)
      setError('Erro ao processar arquivo de áudio. Tente outro arquivo.')
    }
  }, [])

  return {
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
    refreshDevices,
    audioLevel,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    handleFileUpload,
    recordingData,
    error,
    clearError,
    isCompressing,
  }
}

// Client-side pure JS audio compression and downsampling helpers
async function compressAudioFile(file: File): Promise<File> {
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext || (globalThis as any).AudioContext
  if (!AudioContextClass) {
    throw new Error('Web Audio API not supported in this browser.')
  }
  const audioCtx = new AudioContextClass()
  let audioBuffer: AudioBuffer
  try {
    const arrayBuffer = await file.arrayBuffer()
    audioBuffer = await audioCtx.decodeAudioData(arrayBuffer)
  } finally {
    await audioCtx.close()
  }
  
  // Downsample to 16kHz mono (or 8kHz for longer meetings)
  const targetSampleRate = audioBuffer.duration > 2700 ? 8000 : 16000
  const numberOfChannels = 1
  
  const OfflineAudioContextClass = window.OfflineAudioContext || (window as any).webkitOfflineAudioContext || (globalThis as any).OfflineAudioContext
  if (!OfflineAudioContextClass) {
    throw new Error('OfflineAudioContext not supported in this browser.')
  }
  const offlineCtx = new OfflineAudioContextClass(
    numberOfChannels,
    Math.floor(audioBuffer.duration * targetSampleRate),
    targetSampleRate
  )
  
  const bufferSource = offlineCtx.createBufferSource()
  bufferSource.buffer = audioBuffer
  bufferSource.connect(offlineCtx.destination)
  bufferSource.start()
  
  const renderedBuffer = await offlineCtx.startRendering()
  const wavBlob = bufferToWav(renderedBuffer)
  
  const originalNameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name
  return new File([wavBlob], `${originalNameWithoutExt}_compacted.wav`, {
    type: 'audio/wav',
    lastModified: Date.now()
  })
}

function bufferToWav(buffer: AudioBuffer): Blob {
  const numOfChan = buffer.numberOfChannels
  const sampleRate = buffer.sampleRate
  const format = 1 // PCM
  const bitDepth = 16
  
  let result
  if (numOfChan === 1) {
    result = buffer.getChannelData(0)
  } else {
    const ch1 = buffer.getChannelData(0)
    const ch2 = buffer.getChannelData(1)
    result = new Float32Array(ch1.length)
    for (let i = 0; i < ch1.length; i++) {
      result[i] = (ch1[i] + ch2[i]) / 2
    }
  }
  
  const bufferLength = result.length * 2
  const wavBuffer = new ArrayBuffer(44 + bufferLength)
  const view = new DataView(wavBuffer)
  
  writeString(view, 0, 'RIFF')
  view.setUint32(4, 36 + bufferLength, true)
  writeString(view, 8, 'WAVE')
  writeString(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, format, true)
  view.setUint16(22, numOfChan, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * numOfChan * (bitDepth / 8), true)
  view.setUint16(32, numOfChan * (bitDepth / 8), true)
  view.setUint16(34, bitDepth, true)
  writeString(view, 36, 'data')
  view.setUint32(40, bufferLength, true)
  
  floatTo16BitPCM(view, 44, result)
  
  return new Blob([wavBuffer], { type: 'audio/wav' })
}

function floatTo16BitPCM(output: DataView, offset: number, input: Float32Array) {
  for (let i = 0; i < input.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, input[i]))
    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i))
  }
}
