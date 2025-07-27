'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { 
  Mic, 
  Square, 
  Pause, 
  Play, 
  Upload, 
  HelpCircle,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { useAdvancedAudioRecorder } from '@/hooks/useAdvancedAudioRecorder'
import { AudioSetupModal } from './AudioSetupModal'
import { AudioLevelMeter } from './AudioLevelMeter'
import { cn } from '@/lib/utils'

interface AdvancedAudioRecorderProps {
  onRecordingComplete?: (data: { blob: Blob; duration: number; filename?: string; source: 'recording' | 'upload' }) => void
  className?: string
}

export function AdvancedAudioRecorder({ onRecordingComplete, className }: AdvancedAudioRecorderProps) {
  const [showSetupModal, setShowSetupModal] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
    console.log('Iniciando gravação...')
    clearError()
    try {
      await startRecording()
      console.log('Gravação iniciada com sucesso')
    } catch (error) {
      console.error('Erro ao iniciar gravação:', error)
    }
  }

  const handleStopRecording = () => {
    console.log('Parando gravação...')
    stopRecording()
  }

  // Handle recording completion - only once
  const [hasProcessed, setHasProcessed] = useState(false)
  
  useEffect(() => {
    if (recordingData && onRecordingComplete && !hasProcessed) {
      console.log('Chamando onRecordingComplete com:', recordingData)
      setHasProcessed(true)
      onRecordingComplete(recordingData)
    }
  }, [recordingData, onRecordingComplete, hasProcessed])

  // Reset processed flag when recordingData changes
  useEffect(() => {
    if (!recordingData) {
      setHasProcessed(false)
    }
  }, [recordingData])

  // Reset testing state when recording starts
  useEffect(() => {
    if (isRecording && isTesting) {
      setIsTesting(false)
    }
  }, [isRecording, isTesting])

  const handleFileInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
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
    console.log('handleTestAudio chamado, isTesting:', isTesting)
    if (!isTesting) {
      setIsTesting(true)
      console.log('Iniciando startMonitoring...')
      await startMonitoring()
    } else {
      setIsTesting(false)
      console.log('Parando monitoramento...')
      stopMonitoring()
    }
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Mic className="w-5 h-5" />
              Gravador de Áudio Avançado
            </CardTitle>
            <CardDescription>
              Grave do microfone ou faça upload de arquivos de áudio
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowSetupModal(true)}
                >
                  <HelpCircle className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Como capturar áudio de reuniões</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
            <Button variant="ghost" size="sm" onClick={clearError} className="ml-auto">
              ×
            </Button>
          </div>
        )}

        {/* Device Selection */}
        <div className="space-y-3">
          <label className="text-sm font-medium">Dispositivo de Áudio</label>
          <Select value={selectedDeviceId} onValueChange={setSelectedDeviceId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um dispositivo de áudio" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Microfone Padrão</SelectItem>
              {audioDevices.map((device) => (
                <SelectItem key={device.deviceId} value={device.deviceId}>
                  {device.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* Audio Level Monitor */}
          <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Nível de Áudio
                </span>
                <Badge variant="outline" className="text-xs">
                  {isRecording ? 'Gravando' : isTesting ? 'Testando' : 'Monitorando'}
                </Badge>
              </div>
              <AudioLevelMeter 
                level={audioLevel} 
                isActive={isMonitoring} 
                className="w-full" 
              />
              {audioLevel === 0 && isMonitoring && (
                <p className="text-xs text-muted-foreground">
                  Fale algo para ver o nível de áudio
                </p>
              )}
            </div>
        </div>

        {/* Recording Controls */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {!isRecording ? (
                <>
                  <Button onClick={handleStartRecording} size="lg">
                    <Mic className="w-4 h-4 mr-2" />
                    Iniciar Gravação
                  </Button>
                  <Button 
                    onClick={handleTestAudio} 
                    variant="outline"
                    size="lg"
                  >
                    <Mic className="w-4 h-4 mr-2" />
                    {isTesting ? 'Parar Teste' : 'Testar Áudio'}
                  </Button>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  {!isPaused ? (
                    <Button onClick={pauseRecording} variant="outline">
                      <Pause className="w-4 h-4 mr-2" />
                      Pausar
                    </Button>
                  ) : (
                    <Button onClick={resumeRecording} variant="outline">
                      <Play className="w-4 h-4 mr-2" />
                      Continuar
                    </Button>
                  )}
                  <Button onClick={handleStopRecording} variant="destructive">
                    <Square className="w-4 h-4 mr-2" />
                    Parar
                  </Button>
                </div>
              )}
              
              <div className="text-2xl font-mono">
                {formatTime(duration)}
              </div>
              
              {isRecording && (
                <Badge variant={isPaused ? "secondary" : "default"}>
                  {isPaused ? "Pausado" : "Gravando"}
                </Badge>
              )}
            </div>
          </div>

          {isRecording && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Gravando...</span>
                <span>{formatTime(duration)}</span>
              </div>
              <Progress value={100} className="h-1" />
            </div>
          )}
        </div>

        {/* File Upload */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Ou faça upload de um arquivo</label>
            <span className="text-xs text-muted-foreground">
              MP3, WAV, WEBM, OGG, AAC, M4A, FLAC (max 100MB)
            </span>
          </div>
          <Button 
            variant="outline" 
            onClick={handleUploadClick}
            className="w-full"
            disabled={isRecording}
          >
            <Upload className="w-4 h-4 mr-2" />
            Selecionar Arquivo de Áudio
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*,.mp3,.wav,.webm,.ogg,.aac,.m4a,.flac,.3gp,.amr"
            onChange={handleFileInputChange}
            className="hidden"
          />
        </div>

        {/* Recording Result */}
        {recordingData && (
          <div className="p-4 border rounded-lg bg-green-50 dark:bg-green-950">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="font-medium text-green-800 dark:text-green-200">
                {recordingData.source === 'recording' ? 'Gravação Concluída' : 'Arquivo Carregado'}
              </span>
            </div>
            <div className="space-y-1 text-sm text-green-700 dark:text-green-300">
              {recordingData.filename && (
                <div>Arquivo: {recordingData.filename}</div>
              )}
              <div>Duração: {formatTime(recordingData.duration)}</div>
              <div>Tamanho: {formatFileSize(recordingData.size)}</div>
              <div>Tipo: {recordingData.blob.type || 'audio/webm'}</div>
            </div>
          </div>
        )}
      </CardContent>

      <AudioSetupModal 
        open={showSetupModal} 
        onOpenChange={setShowSetupModal} 
      />
    </Card>
  )
}