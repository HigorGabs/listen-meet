export interface MeetingRecord {
  id: string
  title: string
  date: string
  duration: number
  summary: {
    title: string
    overview: string
    summary?: string
    keyPoints: string[]
    actionItems: string[]
    participants: string[]
    topics: string[]
    metrics?: {
      efficiency: string
      engagement: string
      decisionsCount: number
    }
    timeline?: Array<{
      phase: string
      description: string
      time: string
    }>
    tags?: {
      meetingType: string
      priority: string
      status: string
    }
    insights?: {
      sentiment: string
      engagement: string
      outcome: string
    }
    participationAnalysis?: Array<{
      participant: string
      talkTime: string
      contributions: string
      role: string
    }>
    transcript?: string
  }
  audioBlob?: Blob
  filename: string
}

export class MeetingStorage {
  private static STORAGE_KEY = 'listen-meet-recordings'
  private static MAX_RECORDINGS = 50

  static saveMeeting(meeting: MeetingRecord): void {
    try {
      const recordings = this.getAllMeetings()
      
      // Add new recording at the beginning
      recordings.unshift(meeting)
      
      // Keep only the latest recordings
      if (recordings.length > this.MAX_RECORDINGS) {
        recordings.splice(this.MAX_RECORDINGS)
      }
      
      // Store without audio blob to avoid localStorage limits
      const recordingsToStore = recordings.map(r => ({
        ...r,
        audioBlob: undefined // Remove blob for storage
      }))
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(recordingsToStore))
      
      console.log('Meeting saved to localStorage:', meeting.id)
    } catch (error) {
      console.error('Error saving meeting:', error)
    }
  }

  static getAllMeetings(): MeetingRecord[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      if (!stored) return []
      
      const recordings = JSON.parse(stored)
      
      // Sort by date (newest first)
      return recordings.sort((a: MeetingRecord, b: MeetingRecord) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      )
    } catch (error) {
      console.error('Error loading meetings:', error)
      return []
    }
  }

  static getMeeting(id: string): MeetingRecord | null {
    const meetings = this.getAllMeetings()
    return meetings.find(m => m.id === id) || null
  }

  static deleteMeeting(id: string): void {
    try {
      const meetings = this.getAllMeetings()
      const filtered = meetings.filter(m => m.id !== id)
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered))
      console.log('Meeting deleted:', id)
    } catch (error) {
      console.error('Error deleting meeting:', error)
    }
  }

  static downloadMeetingTxt(meeting: MeetingRecord): void {
    const content = `RESUMO DA REUNIÃO - ${meeting.summary.title}
Data: ${new Date(meeting.date).toLocaleDateString('pt-BR')}
Duração: ${Math.floor(meeting.duration / 60)} minutos

=== RESUMO ===
${meeting.summary.summary || meeting.summary.overview}

=== RESUMO GERAL ===
${meeting.summary.overview}

=== 📊 MÉTRICAS DA REUNIÃO ===
Eficiência: ${meeting.summary.metrics?.efficiency || 'N/A'}
Participação: ${meeting.summary.metrics?.engagement || 'N/A'}
Decisões tomadas: ${meeting.summary.metrics?.decisionsCount || 'N/A'}

=== ⏰ TIMELINE DA REUNIÃO ===
${meeting.summary.timeline?.map(item => `${item.phase}: ${item.description} (${item.time})`).join('\n') || 'Timeline não disponível'}

=== 🏷️ TAGS/CATEGORIAS ===
Tipo de reunião: ${meeting.summary.tags?.meetingType || 'N/A'}
Prioridade: ${meeting.summary.tags?.priority || 'N/A'}
Status: ${meeting.summary.tags?.status || 'N/A'}

=== 📈 INSIGHTS DA IA ===
Sentiment: ${meeting.summary.insights?.sentiment || 'N/A'}
Engagement: ${meeting.summary.insights?.engagement || 'N/A'}
Outcome: ${meeting.summary.insights?.outcome || 'N/A'}

=== 👥 ANÁLISE DE PARTICIPAÇÃO ===
${meeting.summary.participationAnalysis?.map(p => 
  `${p.participant}: ${p.talkTime} do tempo | ${p.contributions} | Papel: ${p.role}`
).join('\n') || 'Análise não disponível'}

=== PONTOS PRINCIPAIS ===
${meeting.summary.keyPoints.map((point, index) => `${index + 1}. ${point}`).join('\n')}

=== AÇÕES IDENTIFICADAS ===
${meeting.summary.actionItems.map((action, index) => `${index + 1}. ${action}`).join('\n')}

=== PARTICIPANTES ===
${meeting.summary.participants.join(', ')}

=== TÓPICOS ABORDADOS ===
${meeting.summary.topics.join(', ')}

=== TRANSCRIÇÃO COMPLETA ===
${meeting.summary.transcript || 'Transcrição não disponível'}

---
Gerado automaticamente pelo Listen Meet com Google Gemini AI
`

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = meeting.filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  static exportAllMeetings(): void {
    const meetings = this.getAllMeetings()
    const allContent = meetings.map(meeting => 
      `${'='.repeat(80)}
REUNIÃO: ${meeting.summary.title}
Data: ${new Date(meeting.date).toLocaleDateString('pt-BR')}
Duração: ${Math.floor(meeting.duration / 60)} minutos

RESUMO: ${meeting.summary.overview}

PONTOS PRINCIPAIS:
${meeting.summary.keyPoints.map((point, index) => `${index + 1}. ${point}`).join('\n')}

AÇÕES:
${meeting.summary.actionItems.map((action, index) => `${index + 1}. ${action}`).join('\n')}

PARTICIPANTES: ${meeting.summary.participants.join(', ')}
TÓPICOS: ${meeting.summary.topics.join(', ')}

${'='.repeat(80)}

`
    ).join('\n')

    const blob = new Blob([allContent], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `todas-reunioes-${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  static getStorageStats(): { count: number; sizeKB: number } {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY) || ''
      return {
        count: this.getAllMeetings().length,
        sizeKB: Math.round(new Blob([data]).size / 1024)
      }
    } catch {
      return { count: 0, sizeKB: 0 }
    }
  }
}