'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

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
  startMonitoring: () => Promise<void>
  stopMonitoring: () => void
  
  // File upload
  handleFileUpload: (file: File) => Promise<void>
  
  // Results
  recordingData: RecordingData | null
  error: string | null
  clearError: () => void
}

export function useAdvancedAudioRecorder(): UseAdvancedAudioRecorderReturn {
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [duration, setDuration] = useState(0)
  const [recordingData, setRecordingData] = useState<RecordingData | null>(null)
  const [error, setError] = useState<string | null>(null)
  
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
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

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

  // Audio level monitoring
  const analyzeAudio = useCallback(() => {
    console.log('analyzeAudio chamado, isMonitoring:', isMonitoring, 'analyser:', !!analyserRef.current)
    if (!analyserRef.current) return

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
    analyserRef.current.getByteFrequencyData(dataArray)

    // Calculate RMS (Root Mean Square) for audio level
    let sum = 0
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i] * dataArray[i]
    }
    const rms = Math.sqrt(sum / dataArray.length)
    
    // Normalize to 0-100 scale
    const level = Math.min(100, (rms / 255) * 100 * 2) // Amplify for better visibility
    console.log('Nível detectado:', level)
    setAudioLevel(level)

    if (isMonitoring) {
      animationFrameRef.current = requestAnimationFrame(analyzeAudio)
    }
  }, [isMonitoring])

  const startMonitoring = useCallback(async () => {
    try {
      console.log('Hook: startMonitoring chamado')
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

      console.log('Hook: Monitoramento iniciado com sucesso')
      setIsMonitoring(true)
      
      // Start the audio analysis loop
      const startAnalyzing = () => {
        if (!analyserRef.current) return
        
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
        analyserRef.current.getByteFrequencyData(dataArray)
        
        let sum = 0
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i] * dataArray[i]
        }
        const rms = Math.sqrt(sum / dataArray.length)
        const level = Math.min(100, (rms / 255) * 100 * 2)
        
        console.log('Nível detectado:', level)
        setAudioLevel(level)
        
        animationFrameRef.current = requestAnimationFrame(startAnalyzing)
      }
      
      startAnalyzing()

    } catch (err) {
      console.error('Error starting audio monitoring:', err)
      setError('Não foi possível iniciar monitoramento de áudio. Verifique as permissões.')
    }
  }, [selectedDeviceId])

  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false)
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    if (monitorStreamRef.current) {
      monitorStreamRef.current.getTracks().forEach(track => track.stop())
      monitorStreamRef.current = null
    }

    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }

    analyserRef.current = null
    setAudioLevel(0)
  }, [])




  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMonitoring()
    }
  }, [stopMonitoring])

  const startRecording = useCallback(async () => {
    console.log('Hook: startRecording chamado')
    try {
      setError(null)
      setRecordingData(null)
      
      console.log('Hook: Iniciando monitoramento para gravação...')
      // Start monitoring during recording
      await startMonitoring()
      
      console.log('Hook: Configurando constraints para:', selectedDeviceId)
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

      console.log('Hook: Solicitando getUserMedia...')
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      console.log('Hook: Stream obtido:', stream)
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
      analyzeAudio()

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

      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        console.log('Hook: MediaRecorder parado, processando dados...')
        const blob = new Blob(chunksRef.current, { 
          type: mimeType || 'audio/webm' 
        })
        // Calculate final duration based on actual recording time
        const finalDuration = startTimeRef.current ? Math.floor((Date.now() - startTimeRef.current) / 1000) : duration
        
        console.log('Hook: Criando recordingData:', { size: blob.size, duration: finalDuration })
        setRecordingData({
          blob,
          duration: finalDuration,
          size: blob.size,
          source: 'recording'
        })

        // Cleanup
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop())
          streamRef.current = null
        }
        
        // Stop monitoring after recording ends
        stopMonitoring()
      }

      mediaRecorder.start(1000) // Collect data every second
      
      startTimeRef.current = Date.now()
      console.log('Hook: Configurando estados...')
      setIsRecording(true)
      setIsPaused(false)
      setDuration(0)

      // Start duration timer
      intervalRef.current = setInterval(updateDuration, 1000)
      console.log('Hook: Gravação iniciada com sucesso!')

    } catch (err) {
      console.error('Error starting recording:', err)
      setError('Não foi possível iniciar a gravação. Verifique as permissões do microfone.')
    }
  }, [selectedDeviceId, duration, updateDuration, stopMonitoring, startMonitoring, analyzeAudio])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      setIsPaused(false)

      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [isRecording])

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording && !isPaused) {
      mediaRecorderRef.current.pause()
      setIsPaused(true)
      
      // Mark pause start time
      pausedTimeRef.current = Date.now()
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [isRecording, isPaused])

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

  const handleFileUpload = useCallback(async (file: File) => {
    try {
      setError(null)
      setRecordingData(null)

      // Validate file type
      const validAudioTypes = [
        'audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/wave', 'audio/x-wav',
        'audio/webm', 'audio/ogg', 'audio/aac', 'audio/m4a', 'audio/mp4',
        'audio/flac', 'audio/x-flac', 'audio/3gpp', 'audio/amr'
      ]

      const isValidAudio = validAudioTypes.some(type => file.type.startsWith(type.split('/')[0])) || 
                          file.name.match(/\.(mp3|wav|webm|ogg|aac|m4a|mp4|flac|3gp|amr)$/i)

      if (!isValidAudio) {
        setError('Formato de arquivo não suportado. Use MP3, WAV, WEBM, OGG, AAC, M4A, FLAC, etc.')
        return
      }

      // Check file size (max 100MB)
      if (file.size > 100 * 1024 * 1024) {
        setError('Arquivo muito grande. Tamanho máximo: 100MB')
        return
      }

      // Get duration using audio element
      const audioUrl = URL.createObjectURL(file)
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
        blob: file,
        duration,
        size: file.size,
        filename: file.name,
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
  }
}