'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Calendar, 
  Clock, 
  Users, 
  Download, 
  Trash2, 
  Search,
  FileText,
  PlayCircle,
  MoreVertical,
  Filter,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Timer,
  Tag,
  Brain,
  Users2
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MeetingRecord, MeetingStorage } from '@/utils/storage'
import { cn } from '@/lib/utils'

interface MeetingsListProps {
  onNewRecording?: () => void
}

export function MeetingsList({ onNewRecording }: MeetingsListProps) {
  const [meetings, setMeetings] = useState<MeetingRecord[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState<'all' | 'today' | 'week' | 'month'>('all')
  const [selectedMeeting, setSelectedMeeting] = useState<string | null>(null)
  const [showAdvanced, setShowAdvanced] = useState<Record<string, boolean>>({})

  useEffect(() => {
    loadMeetings()
  }, [])

  const loadMeetings = () => {
    const allMeetings = MeetingStorage.getAllMeetings()
    setMeetings(allMeetings)
  }

  const filteredMeetings = meetings.filter(meeting => {
    // Search filter
    const matchesSearch = meeting.summary.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         meeting.summary.overview.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         meeting.summary.participants.some(p => p.toLowerCase().includes(searchTerm.toLowerCase()))

    if (!matchesSearch) return false

    // Date filter
    const meetingDate = new Date(meeting.date)
    const now = new Date()
    
    switch (filter) {
      case 'today':
        return meetingDate.toDateString() === now.toDateString()
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        return meetingDate >= weekAgo
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        return meetingDate >= monthAgo
      default:
        return true
    }
  })

  const handleDelete = (id: string) => {
    MeetingStorage.deleteMeeting(id)
    loadMeetings()
  }

  const handleDownload = (meeting: MeetingRecord) => {
    MeetingStorage.downloadMeetingTxt(meeting)
  }

  const toggleAdvanced = (meetingId: string, event?: React.MouseEvent) => {
    event?.stopPropagation()
    setShowAdvanced(prev => ({
      ...prev,
      [meetingId]: !prev[meetingId]
    }))
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()
    const isYesterday = date.toDateString() === new Date(now.getTime() - 24 * 60 * 60 * 1000).toDateString()
    
    if (isToday) return 'Hoje'
    if (isYesterday) return 'Ontem'
    
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    })
  }

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 60) return `${diffInMinutes}min atrás`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h atrás`
    return formatDate(dateString)
  }

  if (meetings.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
          <FileText className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
          Nenhuma reunião gravada
        </h3>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          Comece gravando sua primeira reunião para ver o histórico aqui.
        </p>
        <Button onClick={onNewRecording} className="gap-2">
          <PlayCircle className="w-4 h-4" />
          Gravar Nova Reunião
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Buscar reuniões..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="default" className="gap-2">
                <Filter className="w-4 h-4" />
                {filter === 'all' ? 'Todas' : 
                 filter === 'today' ? 'Hoje' :
                 filter === 'week' ? 'Esta semana' : 'Este mês'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setFilter('all')}>
                Todas as reuniões
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter('today')}>
                Hoje
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter('week')}>
                Esta semana
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter('month')}>
                Este mês
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button onClick={onNewRecording} className="gap-2">
            <PlayCircle className="w-4 h-4" />
            Nova Gravação
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
                <p className="text-2xl font-bold">{meetings.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Tempo Total</p>
                <p className="text-2xl font-bold">
                  {Math.floor(meetings.reduce((acc, m) => acc + m.duration, 0) / 60)}min
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Esta Semana</p>
                <p className="text-2xl font-bold">
                  {meetings.filter(m => {
                    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                    return new Date(m.date) >= weekAgo
                  }).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Meetings List */}
      <div className="space-y-4">
        {filteredMeetings.map((meeting) => (
          <Card 
            key={meeting.id} 
            className={cn(
              "transition-all duration-200 hover:shadow-lg cursor-pointer",
              selectedMeeting === meeting.id && "ring-2 ring-blue-500"
            )}
            onClick={() => setSelectedMeeting(selectedMeeting === meeting.id ? null : meeting.id)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg line-clamp-1 mb-1">
                    {meeting.summary.title}
                  </CardTitle>
                  <CardDescription className="line-clamp-2">
                    {meeting.summary.overview}
                  </CardDescription>
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleDownload(meeting)}>
                      <Download className="w-4 h-4 mr-2" />
                      Baixar TXT
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleDelete(meeting.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {formatDate(meeting.date)}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {formatDuration(meeting.duration)}
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {meeting.summary.participants.length} participantes
                </div>
                <div className="text-xs">
                  {getTimeAgo(meeting.date)}
                </div>
              </div>
            </CardHeader>

            {selectedMeeting === meeting.id && (
              <CardContent className="pt-0">
                <div className="space-y-4">
                  {/* Key Points */}
                  {meeting.summary.keyPoints.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Pontos Principais</h4>
                      <ul className="space-y-1">
                        {meeting.summary.keyPoints.map((point, index) => (
                          <li key={index} className="text-sm flex items-start gap-2">
                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                            {point}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Action Items */}
                  {meeting.summary.actionItems.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Ações Identificadas</h4>
                      <div className="space-y-1">
                        {meeting.summary.actionItems.map((action, index) => (
                          <Badge key={index} variant="outline" className="mr-2 mb-1">
                            {action}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Topics */}
                  {meeting.summary.topics.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Tópicos</h4>
                      <div className="flex flex-wrap gap-1">
                        {meeting.summary.topics.map((topic, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {topic}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Ver Mais Button */}
                  <div className="flex justify-center pt-2 border-t">
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={(e) => toggleAdvanced(meeting.id, e)}
                      className="gap-2 text-blue-600 hover:text-blue-700"
                    >
                      {showAdvanced[meeting.id] ? (
                        <>
                          <ChevronUp className="w-4 h-4" />
                          Ver menos
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4" />
                          Ver mais
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Advanced Information */}
                  {showAdvanced[meeting.id] && (
                    <div className="space-y-4 pt-4 border-t">
                      {/* Summary */}
                      {meeting.summary.summary && (
                        <div>
                          <h4 className="font-medium mb-2 flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            Resumo
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {meeting.summary.summary}
                          </p>
                        </div>
                      )}

                      {/* Metrics */}
                      {meeting.summary.metrics && (
                        <div>
                          <h4 className="font-medium mb-2 flex items-center gap-2">
                            <BarChart3 className="w-4 h-4" />
                            Métricas da Reunião
                          </h4>
                          <div className="grid grid-cols-3 gap-3 text-sm">
                            <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                              <div className="font-medium text-green-600">
                                {meeting.summary.metrics.efficiency}
                              </div>
                              <div className="text-xs text-gray-500">Eficiência</div>
                            </div>
                            <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                              <div className="font-medium text-blue-600">
                                {meeting.summary.metrics.engagement}
                              </div>
                              <div className="text-xs text-gray-500">Participação</div>
                            </div>
                            <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                              <div className="font-medium text-purple-600">
                                {meeting.summary.metrics.decisionsCount}
                              </div>
                              <div className="text-xs text-gray-500">Decisões</div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Timeline */}
                      {meeting.summary.timeline && meeting.summary.timeline.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2 flex items-center gap-2">
                            <Timer className="w-4 h-4" />
                            Timeline da Reunião
                          </h4>
                          <div className="space-y-2">
                            {meeting.summary.timeline.map((item, index) => (
                              <div key={index} className="flex items-start gap-3 text-sm">
                                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                                <div>
                                  <div className="font-medium">{item.phase}</div>
                                  <div className="text-gray-600 dark:text-gray-400">{item.description}</div>
                                  <div className="text-xs text-gray-500">{item.time}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Tags */}
                      {meeting.summary.tags && (
                        <div>
                          <h4 className="font-medium mb-2 flex items-center gap-2">
                            <Tag className="w-4 h-4" />
                            Tags/Categorias
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="outline" className="text-xs">
                              <span className="font-medium">Tipo:</span> {meeting.summary.tags.meetingType}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              <span className="font-medium">Prioridade:</span> {meeting.summary.tags.priority}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              <span className="font-medium">Status:</span> {meeting.summary.tags.status}
                            </Badge>
                          </div>
                        </div>
                      )}

                      {/* Insights */}
                      {meeting.summary.insights && (
                        <div>
                          <h4 className="font-medium mb-2 flex items-center gap-2">
                            <Brain className="w-4 h-4" />
                            Insights da IA
                          </h4>
                          <div className="grid grid-cols-3 gap-3 text-sm">
                            <div className="text-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                              <div className="font-medium text-blue-700 dark:text-blue-300">
                                {meeting.summary.insights.sentiment}
                              </div>
                              <div className="text-xs text-gray-500">Sentiment</div>
                            </div>
                            <div className="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded">
                              <div className="font-medium text-green-700 dark:text-green-300">
                                {meeting.summary.insights.engagement}
                              </div>
                              <div className="text-xs text-gray-500">Engagement</div>
                            </div>
                            <div className="text-center p-2 bg-purple-50 dark:bg-purple-900/20 rounded">
                              <div className="font-medium text-purple-700 dark:text-purple-300">
                                {meeting.summary.insights.outcome}
                              </div>
                              <div className="text-xs text-gray-500">Outcome</div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Participation Analysis */}
                      {meeting.summary.participationAnalysis && meeting.summary.participationAnalysis.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2 flex items-center gap-2">
                            <Users2 className="w-4 h-4" />
                            Análise de Participação
                          </h4>
                          <div className="space-y-2">
                            {meeting.summary.participationAnalysis.map((participant, index) => (
                              <div key={index} className="p-3 bg-gray-50 dark:bg-gray-800 rounded text-sm">
                                <div className="flex justify-between items-start mb-1">
                                  <span className="font-medium">{participant.participant}</span>
                                  <Badge variant="secondary" className="text-xs">
                                    {participant.talkTime}
                                  </Badge>
                                </div>
                                <div className="text-gray-600 dark:text-gray-400 text-xs">
                                  <div><strong>Contribuições:</strong> {participant.contributions}</div>
                                  <div><strong>Papel:</strong> {participant.role}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 pt-2 border-t">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleDownload(meeting)}
                          className="gap-2"
                        >
                          <Download className="w-4 h-4" />
                          Baixar
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {filteredMeetings.length === 0 && searchTerm && (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">
            Nenhuma reunião encontrada para &quot;{searchTerm}&quot;
          </p>
        </div>
      )}
    </div>
  )
}