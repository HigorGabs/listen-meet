'use client'

import { AdvancedAudioRecorder } from '@/components/AdvancedAudioRecorder'
import { MeetingsList } from '@/components/MeetingsList'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Mic, History, Settings, AlertCircle, CheckCircle, Key, Download, Loader2 } from 'lucide-react'
import { useState, useEffect } from 'react'
import { MeetingRecord, MeetingStorage } from '@/utils/storage'

export default function Home() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStatus, setProcessingStatus] = useState('')
  const [geminiApiKey, setGeminiApiKey] = useState('')
  const [isConfigured, setIsConfigured] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [activeTab, setActiveTab] = useState('record')
  const [lastProcessedMeeting, setLastProcessedMeeting] = useState<MeetingRecord | null>(null)
  const [showProcessedMessage, setShowProcessedMessage] = useState(false)
  const [processedIds, setProcessedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    // Check if API key is stored in localStorage
    const storedKey = localStorage.getItem('gemini-api-key')
    if (storedKey) {
      setGeminiApiKey(storedKey)
      setIsConfigured(true)
    } else {
      setShowSettings(true)
    }
  }, [])

  const saveApiKey = () => {
    if (geminiApiKey.trim()) {
      localStorage.setItem('gemini-api-key', geminiApiKey.trim())
      setIsConfigured(true)
      setShowSettings(false)
    }
  }

  const testApiKey = async () => {
    if (!geminiApiKey.trim()) return
    
    try {
      const response = await fetch('/api/test-gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: geminiApiKey })
      })
      
      if (response.ok) {
        alert('✅ API Key válida! Configuração salva.')
        saveApiKey()
      } else {
        alert('❌ API Key inválida. Verifique e tente novamente.')
      }
    } catch {
      alert('❌ Erro ao testar API Key. Verifique sua conexão.')
    }
  }

  const handleRecordingComplete = async (data: { blob: Blob; duration: number; filename?: string; source: 'recording' | 'upload' }) => {
    // Create unique ID for this recording
    const recordingId = `${data.blob.size}-${data.duration}-${Date.now()}`
    
    // Check if already processed
    if (processedIds.has(recordingId)) {
      console.log('Recording already processed, skipping...')
      return
    }
    
    // Add to processed IDs
    setProcessedIds(prev => new Set(prev).add(recordingId))

    if (!isConfigured) {
      alert('Por favor, configure sua API Key do Gemini primeiro.')
      setShowSettings(true)
      return
    }

    setIsProcessing(true)
    setProcessingStatus('Enviando áudio para processamento...')
    
    try {
      // Create FormData to send audio file
      const formData = new FormData()
      formData.append('audio', data.blob, data.filename || 'recording.webm')
      formData.append('apiKey', geminiApiKey)
      formData.append('duration', data.duration.toString())

      setProcessingStatus('Analisando áudio com Gemini AI...')

      // Process with Gemini
      const response = await fetch('/api/process-audio', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('Falha ao processar áudio')
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Erro desconhecido')
      }

      setProcessingStatus('Salvando reunião...')

      // Create meeting record
      const meetingRecord: MeetingRecord = {
        id: Date.now().toString(),
        title: result.summary.title,
        date: new Date().toISOString(),
        duration: data.duration,
        summary: result.summary,
        filename: result.filename || `reuniao-${new Date().toISOString().split('T')[0]}.txt`
      }

      // Save to localStorage
      MeetingStorage.saveMeeting(meetingRecord)
      
      setLastProcessedMeeting(meetingRecord)
      setShowProcessedMessage(true)
      setActiveTab('history')
      
      // Auto-hide message after 10 seconds
      setTimeout(() => {
        setShowProcessedMessage(false)
      }, 10000)
      
      // Removed auto-download functionality
      /*
      // Auto-download txt file
      const downloadContent = `RESUMO DA REUNIÃO - ${result.summary.title}
Data: ${new Date().toLocaleDateString('pt-BR')}
Duração: ${Math.floor(data.duration / 60)} minutos

=== RESUMO ===
${result.summary.summary || result.summary.overview}

=== RESUMO GERAL ===
${result.summary.overview}

=== 📊 MÉTRICAS DA REUNIÃO ===
Eficiência: ${result.summary.metrics?.efficiency || 'N/A'}
Participação: ${result.summary.metrics?.engagement || 'N/A'}
Decisões tomadas: ${result.summary.metrics?.decisionsCount || 'N/A'}

=== ⏰ TIMELINE DA REUNIÃO ===
${result.summary.timeline?.map((item: any) => `${item.phase}: ${item.description} (${item.time})`).join('\n') || 'Timeline não disponível'}

=== 🏷️ TAGS/CATEGORIAS ===
Tipo de reunião: ${result.summary.tags?.meetingType || 'N/A'}
Prioridade: ${result.summary.tags?.priority || 'N/A'}
Status: ${result.summary.tags?.status || 'N/A'}

=== 📈 INSIGHTS DA IA ===
Sentiment: ${result.summary.insights?.sentiment || 'N/A'}
Engagement: ${result.summary.insights?.engagement || 'N/A'}
Outcome: ${result.summary.insights?.outcome || 'N/A'}

=== 👥 ANÁLISE DE PARTICIPAÇÃO ===
${result.summary.participationAnalysis?.map((p: any) => 
  `${p.participant}: ${p.talkTime} do tempo | ${p.contributions} | Papel: ${p.role}`
).join('\n') || 'Análise não disponível'}

=== PONTOS PRINCIPAIS ===
${result.summary.keyPoints.map((point: string, index: number) => `${index + 1}. ${point}`).join('\n')}

=== AÇÕES IDENTIFICADAS ===
${result.summary.actionItems.map((action: string, index: number) => `${index + 1}. ${action}`).join('\n')}

=== PARTICIPANTES ===
${result.summary.participants.join(', ')}

=== TÓPICOS ABORDADOS ===
${result.summary.topics.join(', ')}

=== TRANSCRIÇÃO COMPLETA ===
${result.summary.transcript || 'Transcrição não disponível'}

---
Gerado automaticamente pelo Listen Meet com Google Gemini AI
`

      // Trigger download
      const blob = new Blob([downloadContent], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = meetingRecord.filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      */
      
    } catch (error) {
      console.error('Error processing recording:', error)
      alert('❌ Erro ao processar gravação: ' + (error as Error).message)
    } finally {
      setIsProcessing(false)
      setProcessingStatus('')
    }
  }

  if (showSettings) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Key className="h-6 w-6 text-blue-600" />
            </div>
            <CardTitle className="text-2xl">Configurar API Key</CardTitle>
            <CardDescription>
              Configure sua API Key do Google Gemini para usar o Listen Meet
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="apikey">Google Gemini API Key</Label>
              <Input
                id="apikey"
                type="password"
                placeholder="AIzaSy..."
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Obtenha sua chave em: <a href="https://makersuite.google.com/app/apikey" target="_blank" className="text-blue-600 hover:underline">Google AI Studio</a>
              </p>
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={testApiKey}
                disabled={!geminiApiKey.trim()}
                className="flex-1"
              >
                Testar e Salvar
              </Button>
              {isConfigured && (
                <Button 
                  variant="outline"
                  onClick={() => setShowSettings(false)}
                >
                  Cancelar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Mic className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-xl font-bold">Listen Meet</h1>
          </div>
          
          <div className="flex items-center gap-4">
            {isConfigured ? (
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm text-green-600">API Configurada</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-orange-500" />
                <span className="text-sm text-orange-600">API não configurada</span>
              </div>
            )}
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowSettings(true)}
              className="gap-2"
            >
              <Settings className="h-4 w-4" />
              Configurações
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="max-w-6xl mx-auto">
          
          {/* API Configuration Alert */}
          {!isConfigured && (
            <Alert className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Configure sua API Key</AlertTitle>
              <AlertDescription className="mt-2">
                Para usar o Listen Meet, você precisa configurar sua Google Gemini API Key.
                <div className="mt-3">
                  <Button size="sm" onClick={() => setShowSettings(true)}>
                    Configurar Agora
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Processing Status */}
          {isProcessing && (
            <Card className="mb-6 border-blue-200 bg-blue-50">
              <CardContent className="py-3 px-4">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  <div>
                    <p className="font-medium text-blue-900 text-sm">Processando Reunião</p>
                    <p className="text-xs text-blue-700">{processingStatus}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Last Processed Meeting */}
          {lastProcessedMeeting && !isProcessing && showProcessedMessage && (
            <Card className="mb-6 border-green-200 bg-green-50">
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <div>
                      <p className="font-medium text-green-900 text-sm">
                        Reunião processada: {lastProcessedMeeting.title}
                      </p>
                      <p className="text-xs text-green-700">
                        Arquivo salvo no histórico
                      </p>
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => MeetingStorage.downloadMeetingTxt(lastProcessedMeeting)}
                    className="gap-2 h-8"
                  >
                    <Download className="h-3 w-3" />
                    Baixar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Main Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 bg-white">
              <TabsTrigger value="record" className="gap-2">
                <Mic className="h-4 w-4" />
                Gravar Reunião
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-2">
                <History className="h-4 w-4" />
                Histórico
              </TabsTrigger>
            </TabsList>

            <TabsContent value="record" className="space-y-6">
              <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <AdvancedAudioRecorder 
                    onRecordingComplete={handleRecordingComplete}
                  />
                </div>

                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Como funciona</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex gap-3">
                        <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                          <span className="text-xs font-medium text-blue-600">1</span>
                        </div>
                        <div>
                          <h4 className="font-medium text-sm">Grave ou carregue áudio</h4>
                          <p className="text-xs text-gray-600 mt-1">
                            Capture reuniões ao vivo ou faça upload de arquivos
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex gap-3">
                        <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                          <span className="text-xs font-medium text-blue-600">2</span>
                        </div>
                        <div>
                          <h4 className="font-medium text-sm">IA processa automaticamente</h4>
                          <p className="text-xs text-gray-600 mt-1">
                            Gemini AI analisa e transcreve o conteúdo
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex gap-3">
                        <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                          <span className="text-xs font-medium text-blue-600">3</span>
                        </div>
                        <div>
                          <h4 className="font-medium text-sm">Receba resumo completo</h4>
                          <p className="text-xs text-gray-600 mt-1">
                            Download automático em .txt para uso offline
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Recursos</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                          Gravação com monitoramento em tempo real
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                          Upload de múltiplos formatos de áudio
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                          Transcrição e resumo automático
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                          Identificação de ações e participantes
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                          Armazenamento local e download .txt
                        </li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="history">
              <MeetingsList onNewRecording={() => setActiveTab('record')} />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}
