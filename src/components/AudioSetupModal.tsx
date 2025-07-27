'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ExternalLink, Download, Mic } from 'lucide-react'

interface AudioSetupModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AudioSetupModal({ open, onOpenChange }: AudioSetupModalProps) {
  const [activeTab, setActiveTab] = useState('mac')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mic className="w-5 h-5" />
            Como Capturar Áudio de Reuniões
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Para gravar o áudio completo de reuniões (incluindo outros participantes), você precisa configurar 
            o roteamento de áudio do seu sistema. Selecione seu sistema operacional abaixo:
          </p>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="mac">macOS</TabsTrigger>
              <TabsTrigger value="windows">Windows</TabsTrigger>
            </TabsList>

            <TabsContent value="mac" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span>🍎</span>
                    Configuração para macOS
                  </CardTitle>
                  <CardDescription>
                    Use o BlackHole para rotear o áudio do sistema
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Passo 1</Badge>
                      <span className="text-sm">Instalar BlackHole</span>
                    </div>
                    <div className="ml-20 space-y-2">
                      <p className="text-sm text-muted-foreground">
                        BlackHole é um driver de áudio virtual que permite capturar o áudio do sistema.
                      </p>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => window.open('https://existential.audio/blackhole/', '_blank')}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download BlackHole
                          <ExternalLink className="w-3 h-3 ml-1" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => window.open('https://github.com/ExistentialAudio/BlackHole', '_blank')}
                        >
                          GitHub
                          <ExternalLink className="w-3 h-3 ml-1" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Passo 2</Badge>
                      <span className="text-sm">Configurar Aggregate Device</span>
                    </div>
                    <div className="ml-20 space-y-2">
                      <ol className="text-sm space-y-1 text-muted-foreground">
                        <li>1. Abra <strong>Audio MIDI Setup</strong> (Applications → Utilities)</li>
                        <li>2. Clique no <strong>+</strong> → "Create Aggregate Device"</li>
                        <li>3. Marque seu <strong>microfone</strong> e <strong>BlackHole 2ch</strong></li>
                        <li>4. Defina como "Master Device" seu microfone</li>
                        <li>5. Salve como "Listen Meet Setup"</li>
                      </ol>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Passo 3</Badge>
                      <span className="text-sm">Configurar Multi-Output Device</span>
                    </div>
                    <div className="ml-20 space-y-2">
                      <ol className="text-sm space-y-1 text-muted-foreground">
                        <li>1. No Audio MIDI Setup, clique no <strong>+</strong> → "Create Multi-Output Device"</li>
                        <li>2. Marque seus <strong>alto-falantes/fones</strong> e <strong>BlackHole 2ch</strong></li>
                        <li>3. Salve como "Listen Meet Output"</li>
                      </ol>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Passo 4</Badge>
                      <span className="text-sm">Usar na Reunião</span>
                    </div>
                    <div className="ml-20 space-y-2">
                      <ol className="text-sm space-y-1 text-muted-foreground">
                        <li>1. Nas <strong>Preferências do Sistema</strong> → Som:</li>
                        <li className="ml-4">• <strong>Saída:</strong> "Listen Meet Output"</li>
                        <li>2. No Listen Meet:</li>
                        <li className="ml-4">• <strong>Dispositivo de entrada:</strong> "Listen Meet Setup"</li>
                        <li>3. Agora você captura seu microfone + áudio da reunião!</li>
                      </ol>
                    </div>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      <strong>💡 Dica:</strong> No QuickTime, selecione "Listen Meet Setup" como microfone 
                      para gravar reuniões completas.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="windows" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span>🪟</span>
                    Configuração para Windows
                  </CardTitle>
                  <CardDescription>
                    Use VB-Audio Virtual Cable para rotear o áudio
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Passo 1</Badge>
                      <span className="text-sm">Instalar VB-Audio Virtual Cable</span>
                    </div>
                    <div className="ml-20 space-y-2">
                      <p className="text-sm text-muted-foreground">
                        VB-Cable cria um cabo de áudio virtual para capturar o som do sistema.
                      </p>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => window.open('https://vb-audio.com/Cable/', '_blank')}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download VB-Cable
                          <ExternalLink className="w-3 h-3 ml-1" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Passo 2</Badge>
                      <span className="text-sm">Configurar Áudio do Sistema</span>
                    </div>
                    <div className="ml-20 space-y-2">
                      <ol className="text-sm space-y-1 text-muted-foreground">
                        <li>1. Clique com botão direito no ícone de som (barra de tarefas)</li>
                        <li>2. Selecione <strong>"Abrir configurações de som"</strong></li>
                        <li>3. Em <strong>"Dispositivo de saída"</strong>: selecione "CABLE Input (VB-Audio...)"</li>
                        <li>4. Clique em <strong>"Propriedades do dispositivo"</strong></li>
                        <li>5. Ative <strong>"Escutar este dispositivo"</strong></li>
                        <li>6. Em <strong>"Reproduzir através deste dispositivo"</strong>: selecione seus alto-falantes/fones</li>
                      </ol>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Passo 3</Badge>
                      <span className="text-sm">Usar na Reunião</span>
                    </div>
                    <div className="ml-20 space-y-2">
                      <ol className="text-sm space-y-1 text-muted-foreground">
                        <li>1. No Listen Meet:</li>
                        <li className="ml-4">• <strong>Dispositivo de entrada:</strong> "CABLE Output (VB-Audio...)"</li>
                        <li>2. Na aplicação da reunião (Zoom, Teams, etc.):</li>
                        <li className="ml-4">• <strong>Microfone:</strong> seu microfone normal</li>
                        <li className="ml-4">• <strong>Alto-falantes:</strong> "CABLE Input (VB-Audio...)"</li>
                        <li>3. Agora você captura o áudio completo da reunião!</li>
                      </ol>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Alternativa</Badge>
                      <span className="text-sm">OBS Studio (Gratuito)</span>
                    </div>
                    <div className="ml-20 space-y-2">
                      <p className="text-sm text-muted-foreground">
                        O OBS Studio também pode capturar áudio do sistema e microfone simultaneamente.
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => window.open('https://obsproject.com/', '_blank')}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download OBS Studio
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </Button>
                    </div>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      <strong>💡 Dica:</strong> Teste a configuração antes da reunião importante! 
                      O VB-Cable pode precisar de reinicialização após a instalação.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="bg-yellow-50 dark:bg-yellow-950 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">
              ⚠️ Importante
            </h4>
            <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
              <li>• Sempre teste a configuração antes de reuniões importantes</li>
              <li>• Respeite as políticas de privacidade ao gravar reuniões</li>
              <li>• Informe os participantes quando estiver gravando</li>
              <li>• Alguns aplicativos podem detectar e bloquear gravação de áudio</li>
            </ul>
          </div>

          <div className="flex justify-end">
            <Button onClick={() => onOpenChange(false)}>
              Entendi
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}