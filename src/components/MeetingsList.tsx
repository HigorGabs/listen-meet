'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MaterialIcon } from '@/components/ui/material-icon'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MeetingRecord, MeetingStorage } from '@/utils/storage'
import { cn } from '@/lib/utils'
import { getMessages, type Locale } from '@/lib/i18n'
import { getClientId } from '@/lib/profile'

interface MeetingsListProps {
  onNewRecording?: () => void
  locale?: Locale
  processingMeeting?: {
    id: string
    title: string
    date: string
    duration: number
    status: 'processing'
  } | null
  refreshTrigger?: number
  onReprocess?: (meeting: MeetingRecord) => void
}

type DateFilter = 'all' | 'today' | 'week' | 'month'
type ViewMode = 'reader' | 'dashboard'
type DetailTab = 'overview' | 'actions' | 'metrics' | 'transcript' | 'integrations'

function parsePercentage(value?: string): number | null {
  if (!value) return null

  const match = value.match(/(\d+(?:[.,]\d+)?)\s*%/)
  if (!match) return null

  return Number(match[1].replace(',', '.'))
}

function getSearchableMeetingText(meeting: MeetingRecord): string {
  const { summary } = meeting
  const values = [
    summary.title,
    summary.overview,
    summary.summary,
    ...summary.keyPoints,
    ...summary.actionItems,
    ...summary.participants,
    ...summary.topics,
    summary.metrics?.efficiency,
    summary.metrics?.engagement,
    summary.metrics?.decisionsCount?.toString(),
    summary.tags?.meetingType,
    summary.tags?.priority,
    summary.tags?.status,
    summary.insights?.sentiment,
    summary.insights?.engagement,
    summary.insights?.outcome,
    summary.transcript,
    ...(summary.timeline?.flatMap((item) => [item.phase, item.description, item.time]) ?? []),
    ...(summary.participationAnalysis?.flatMap((participant) => [
      participant.participant,
      participant.talkTime,
      participant.contributions,
      participant.role,
    ]) ?? []),
  ]

  return values.filter(Boolean).join(' ').toLowerCase()
}

function parseActionResponsibility(action: string) {
  const match = action.match(/\[(?:Responsável|Responsible):\s*([^\]]+)\]/i)
  if (match) {
    const cleanAction = action.replace(match[0], '').trim()
    const responsible = match[1].trim()
    return { cleanAction, responsible }
  }
  return { cleanAction: action, responsible: null }
}

function getSentimentColor(sentiment: string) {
  const s = sentiment.toLowerCase()
  if (
    s.includes('pos') ||
    s.includes('prod') ||
    s.includes('const') ||
    s.includes('otim') ||
    s.includes('bom') ||
    s.includes('excel') ||
    s.includes('happy') ||
    s.includes('great')
  ) {
    return {
      text: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      dot: 'bg-emerald-500',
    }
  }
  if (
    s.includes('neg') ||
    s.includes('tens') ||
    s.includes('crit') ||
    s.includes('desaf') ||
    s.includes('ruim') ||
    s.includes('sad') ||
    s.includes('angry') ||
    s.includes('confl') ||
    s.includes('preoc')
  ) {
    return {
      text: 'text-rose-500',
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/20',
      dot: 'bg-rose-500',
    }
  }
  return {
    text: 'text-[var(--studio-secondary)]',
    bg: 'bg-[var(--studio-secondary-soft)]',
    border: 'border-[var(--studio-secondary-border)]',
    dot: 'bg-[var(--studio-secondary)]',
  }
}

export function MeetingsList({
  onNewRecording,
  locale = 'pt-BR',
  processingMeeting = null,
  refreshTrigger = 0,
  onReprocess,
}: MeetingsListProps) {
  const t = getMessages(locale)
  const [meetings, setMeetings] = useState<MeetingRecord[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState<DateFilter>('all')
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null)
  const [referenceDate] = useState(() => new Date())
  const [viewMode, setViewMode] = useState<ViewMode>('reader')
  const [detailTab, setDetailTab] = useState<DetailTab>('overview')
  const [checklistState, setChecklistState] = useState<Record<string, boolean>>({})
  
  // Participant Editing States
  const [editingParticipantIdx, setEditingParticipantIdx] = useState<number | null>(null)
  const [editPartName, setEditPartName] = useState('')
  const [editPartRole, setEditPartRole] = useState('')
  const [isAddingParticipant, setIsAddingParticipant] = useState(false)
  const [newPartName, setNewPartName] = useState('')
  const [newPartRole, setNewPartRole] = useState('')

  // Company filtering & Renaming states
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState<string>('all')
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editTitleValue, setEditTitleValue] = useState('')
  const [isEditingCompany, setIsEditingCompany] = useState(false)
  const [editCompanyValue, setEditCompanyValue] = useState('')

  // User Identity & Task Filtering States
  const [meName, setMeName] = useState<string>('')
  const [dashboardFilterMyTasks, setDashboardFilterMyTasks] = useState(false)
  const [filterMyTasks, setFilterMyTasks] = useState(false)

  // Dashboard Filters & Range Selector
  const [dashboardTimeRange, setDashboardTimeRange] = useState<'7days' | '30days' | 'all'>('7days')
  const [selectedDayFilter, setSelectedDayFilter] = useState<string | null>(null)

  const changeTimeRange = (range: '7days' | '30days' | 'all') => {
    setDashboardTimeRange(range)
    setSelectedDayFilter(null)
  }


  // Report Section Visibility States
  const [hiddenSections, setHiddenSections] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('listen-meet-hidden-sections')
      return stored ? JSON.parse(stored) : []
    }
    return []
  })
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({})

  useEffect(() => {
    localStorage.setItem('listen-meet-hidden-sections', JSON.stringify(hiddenSections))
  }, [hiddenSections])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedMeName = localStorage.getItem('listen-meet-me-name')
      setMeName(savedMeName || '')
    }
  }, [refreshTrigger])

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean
    title: string
    message: string
    onConfirm: () => void
  } | null>(null)

  // Integration States
  const [notionToken, setNotionToken] = useState(() => (typeof window !== 'undefined' && localStorage.getItem('listen-meet-notion-token')) || '')
  const [notionDb, setNotionDb] = useState(() => (typeof window !== 'undefined' && localStorage.getItem('listen-meet-notion-db')) || '')
  const [slackWebhook, setSlackWebhook] = useState(() => (typeof window !== 'undefined' && localStorage.getItem('listen-meet-slack-webhook')) || '')
  const [jiraToken, setJiraToken] = useState(() => (typeof window !== 'undefined' && localStorage.getItem('listen-meet-jira-token')) || '')
  const [jiraDomain, setJiraDomain] = useState(() => (typeof window !== 'undefined' && localStorage.getItem('listen-meet-jira-domain')) || '')
  const [jiraKey, setJiraKey] = useState(() => (typeof window !== 'undefined' && localStorage.getItem('listen-meet-jira-key')) || '')
  const [jiraEmail, setJiraEmail] = useState(() => (typeof window !== 'undefined' && localStorage.getItem('listen-meet-jira-email')) || '')

  const [isSyncingNotion, setIsSyncingNotion] = useState(false)
  const [isSyncingSlack, setIsSyncingSlack] = useState(false)
  const [isSyncingJira, setIsSyncingJira] = useState(false)

  const [syncStatusNotion, setSyncStatusNotion] = useState('')
  const [syncStatusSlack, setSyncStatusSlack] = useState('')
  const [syncStatusJira, setSyncStatusJira] = useState('')

  // Audio Player States
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [audioDuration, setAudioDuration] = useState(0)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const filteredMeetings = useMemo(() => meetings.filter((meeting) => {
    const query = searchTerm.toLowerCase()
    const matchesSearch = getSearchableMeetingText(meeting).includes(query)

    if (!matchesSearch) return false

    if (selectedCompanyFilter !== 'all') {
      if (selectedCompanyFilter === 'none') {
        if (meeting.company) return false
      } else if (meeting.company !== selectedCompanyFilter) {
        return false
      }
    }

    const meetingDate = new Date(meeting.date)

    if (filter === 'today') {
      return meetingDate.toDateString() === referenceDate.toDateString()
    }

    if (filter === 'week') {
      const weekAgo = new Date(referenceDate.getTime() - 7 * 24 * 60 * 60 * 1000)
      return meetingDate >= weekAgo
    }

    if (filter === 'month') {
      const monthAgo = new Date(referenceDate.getTime() - 30 * 24 * 60 * 60 * 1000)
      return meetingDate >= monthAgo
    }

    return true
  }), [filter, meetings, referenceDate, searchTerm, selectedCompanyFilter])

  const selectedMeeting = selectedMeetingId === processingMeeting?.id
    ? null
    : filteredMeetings.find((meeting) => meeting.id === selectedMeetingId) || filteredMeetings[0]

  const audioUrl = useMemo(() => {
    const activeMeeting = selectedMeetingId === processingMeeting?.id
      ? null
      : filteredMeetings.find((meeting) => meeting.id === selectedMeetingId) || filteredMeetings[0]

    if (activeMeeting?.audioBlob) {
      try {
        return URL.createObjectURL(activeMeeting.audioBlob)
      } catch (e) {
        console.error('Failed to create object URL for audioBlob:', e)
      }
    }
    return null
  }, [selectedMeetingId, filteredMeetings, processingMeeting])

  // Revoke object URL on change/unmount
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
      }
    }
  }, [audioUrl])

  // Reset audio controls and editing states when meeting changes
  useEffect(() => {
    setIsPlaying(false)
    setCurrentTime(0)
    setAudioDuration(0)
    setPlaybackSpeed(1)
    if (audioRef.current) {
      audioRef.current.playbackRate = 1
    }
    setIsEditingTitle(false)
    setIsEditingCompany(false)
  }, [selectedMeetingId])

  const togglePlay = () => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true)
      }).catch(err => {
        console.error('Audio play error:', err)
      })
    }
  }

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
    }
  }

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setAudioDuration(audioRef.current.duration)
    }
  }

  const handleAudioEnded = () => {
    setIsPlaying(false)
    setCurrentTime(0)
  }

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value)
    if (audioRef.current) {
      audioRef.current.currentTime = val
      setCurrentTime(val)
    }
  }

  const changeSpeed = (speed: number) => {
    if (audioRef.current) {
      audioRef.current.playbackRate = speed
      setPlaybackSpeed(speed)
    }
  }

  const skipTime = (amount: number) => {
    if (audioRef.current) {
      let nextTime = audioRef.current.currentTime + amount
      if (nextTime < 0) nextTime = 0
      if (nextTime > audioDuration) nextTime = audioDuration
      audioRef.current.currentTime = nextTime
      setCurrentTime(nextTime)
    }
  }

  const loadMeetings = useCallback(async () => {
    const list = await MeetingStorage.getAllMeetings()
    setMeetings(list)
  }, [])

  useEffect(() => {
    loadMeetings()
  }, [loadMeetings, refreshTrigger])

  useEffect(() => {
    if (processingMeeting) {
      setSelectedMeetingId(processingMeeting.id)
    }
  }, [processingMeeting])

  // Hydrate checklist state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('listen-meet-checklists')
    if (saved) {
      try {
        setChecklistState(JSON.parse(saved))
      } catch {
        // Ignore
      }
    }
  }, [])

  const startEditParticipant = (idx: number, name: string, role: string) => {
    setEditingParticipantIdx(idx)
    setEditPartName(name)
    setEditPartRole(role)
  }

  const saveParticipantEdit = async (meetingId: string, idx: number) => {
    const meetingToUpdate = meetings.find(m => m.id === meetingId)
    if (!meetingToUpdate) return

    const prevPartName = meetingToUpdate.summary.participationAnalysis?.[idx]?.participant || ''

    const updatedAnalysis = [...(meetingToUpdate.summary.participationAnalysis || [])]
    if (updatedAnalysis[idx]) {
      updatedAnalysis[idx] = {
        ...updatedAnalysis[idx],
        participant: editPartName,
        role: editPartRole
      }
    }

    let updatedParticipants = [...(meetingToUpdate.summary.participants || [])]
    if (prevPartName) {
      updatedParticipants = updatedParticipants.map(name => name === prevPartName ? editPartName : name)
    }
    if (!updatedParticipants.includes(editPartName) && editPartName) {
      if (prevPartName && updatedParticipants.includes(prevPartName)) {
        updatedParticipants = updatedParticipants.map(name => name === prevPartName ? editPartName : name)
      } else {
        updatedParticipants.push(editPartName)
      }
    }

    // Rename occurrences in transcript, quotes, individual suggestions, action plan, and action items
    let updatedTranscript = meetingToUpdate.summary.transcript
    let updatedQuotes = meetingToUpdate.summary.quotesAndHighlights
    let updatedIndiv = meetingToUpdate.summary.individualDevelopment
    let updatedActionPlan = meetingToUpdate.summary.actionPlan
    let updatedActionItems = meetingToUpdate.summary.actionItems

    if (prevPartName && editPartName) {
      if (updatedTranscript) {
        updatedTranscript = updatedTranscript.replaceAll(prevPartName, editPartName)
      }
      if (updatedQuotes) {
        updatedQuotes = updatedQuotes.map(q => q.author === prevPartName ? { ...q, author: editPartName } : q)
      }
      if (updatedIndiv) {
        updatedIndiv = updatedIndiv.map(i => i.name === prevPartName ? { ...i, name: editPartName } : i)
      }
      if (updatedActionPlan) {
        updatedActionPlan = updatedActionPlan.map(a => a.assignee === prevPartName ? { ...a, assignee: editPartName } : a)
      }
      if (updatedActionItems) {
        updatedActionItems = updatedActionItems.map(item => item.replaceAll(prevPartName, editPartName))
      }
    }

    const updatedMeeting: MeetingRecord = {
      ...meetingToUpdate,
      summary: {
        ...meetingToUpdate.summary,
        participationAnalysis: updatedAnalysis,
        participants: updatedParticipants,
        transcript: updatedTranscript,
        quotesAndHighlights: updatedQuotes,
        individualDevelopment: updatedIndiv,
        actionPlan: updatedActionPlan,
        actionItems: updatedActionItems
      }
    }

    const success = await MeetingStorage.saveMeeting(updatedMeeting)
    if (success) {
      if (prevPartName && prevPartName.trim().toLowerCase() === meName.trim().toLowerCase() && editPartName) {
        setMeName(editPartName)
        localStorage.setItem('listen-meet-me-name', editPartName)
      }
      setMeetings(prev => prev.map(m => m.id === meetingId ? updatedMeeting : m))
      setEditingParticipantIdx(null)
    }
  }

  const cancelParticipantEdit = () => {
    setEditingParticipantIdx(null)
  }

  const handleMarkAsMe = (name: string) => {
    if (meName.trim().toLowerCase() === name.trim().toLowerCase()) {
      setMeName('')
      localStorage.removeItem('listen-meet-me-name')
    } else {
      setMeName(name)
      localStorage.setItem('listen-meet-me-name', name)
    }
  }

  const removeParticipant = async (meetingId: string, idx: number) => {
    const meetingToUpdate = meetings.find(m => m.id === meetingId)
    if (!meetingToUpdate) return

    const partName = meetingToUpdate.summary.participationAnalysis?.[idx]?.participant || ''

    const updatedAnalysis = (meetingToUpdate.summary.participationAnalysis || []).filter((_, i) => i !== idx)
    const updatedParticipants = (meetingToUpdate.summary.participants || []).filter(name => name !== partName)

    let updatedActionPlan = meetingToUpdate.summary.actionPlan
    if (partName && updatedActionPlan) {
      updatedActionPlan = updatedActionPlan.map(a => a.assignee === partName ? { ...a, assignee: 'N/A' } : a)
    }

    const updatedMeeting: MeetingRecord = {
      ...meetingToUpdate,
      summary: {
        ...meetingToUpdate.summary,
        participationAnalysis: updatedAnalysis,
        participants: updatedParticipants,
        actionPlan: updatedActionPlan
      }
    }

    const success = await MeetingStorage.saveMeeting(updatedMeeting)
    if (success) {
      setMeetings(prev => prev.map(m => m.id === meetingId ? updatedMeeting : m))
    }
  }

  const addParticipant = async (meetingId: string) => {
    if (!newPartName.trim()) return

    const meetingToUpdate = meetings.find(m => m.id === meetingId)
    if (!meetingToUpdate) return

    const updatedAnalysis = [...(meetingToUpdate.summary.participationAnalysis || [])]
    updatedAnalysis.push({
      participant: newPartName.trim(),
      role: newPartRole.trim(),
      talkTime: '0%',
      contributions: '',
    })

    const updatedParticipants = [...(meetingToUpdate.summary.participants || [])]
    if (!updatedParticipants.includes(newPartName.trim())) {
      updatedParticipants.push(newPartName.trim())
    }

    const updatedMeeting: MeetingRecord = {
      ...meetingToUpdate,
      summary: {
        ...meetingToUpdate.summary,
        participationAnalysis: updatedAnalysis,
        participants: updatedParticipants
      }
    }

    const success = await MeetingStorage.saveMeeting(updatedMeeting)
    if (success) {
      setMeetings(prev => prev.map(m => m.id === meetingId ? updatedMeeting : m))
      setIsAddingParticipant(false)
      setNewPartName('')
      setNewPartRole('')
    }
  }

  const handleSaveTitle = async () => {
    if (!selectedMeeting) return
    const val = editTitleValue.trim()
    if (!val) return

    const updatedMeeting: MeetingRecord = {
      ...selectedMeeting,
      title: val,
      summary: {
        ...selectedMeeting.summary,
        title: val
      }
    }

    const success = await MeetingStorage.saveMeeting(updatedMeeting)
    if (success) {
      setMeetings(prev => prev.map(m => m.id === selectedMeeting.id ? updatedMeeting : m))
      setIsEditingTitle(false)
    }
  }

  const handleSaveCompany = async () => {
    if (!selectedMeeting) return
    const val = editCompanyValue.trim()

    const updatedMeeting: MeetingRecord = {
      ...selectedMeeting,
      company: val || undefined
    }

    const success = await MeetingStorage.saveMeeting(updatedMeeting)
    if (success) {
      setMeetings(prev => prev.map(m => m.id === selectedMeeting.id ? updatedMeeting : m))
      setIsEditingCompany(false)
    }
  }

  const toggleSectionVisibility = (sectionId: string) => {
    setHiddenSections(prev =>
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    )
  }

  const toggleSectionCollapse = (sectionId: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }))
  }

  const toggleChecklistItem = (meetingId: string, itemKey: string) => {
    const key = `${meetingId}-${itemKey}`
    const next = { ...checklistState, [key]: !checklistState[key] }
    setChecklistState(next)
    localStorage.setItem('listen-meet-checklists', JSON.stringify(next))
  }

  const handleDelete = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: locale === 'en' ? 'Delete Session' : 'Excluir Reunião',
      message: t.history.deleteConfirm,
      onConfirm: async () => {
        await MeetingStorage.deleteMeeting(id)
        if (selectedMeetingId === id) setSelectedMeetingId(null)
        loadMeetings()
      }
    })
  }

  const handleDownload = (meeting: MeetingRecord) => {
    MeetingStorage.downloadMeetingTxt(meeting)
  }

  const handleDownloadMarkdown = (meeting: MeetingRecord) => {
    const { summary } = meeting
    const md = `# Reunião: ${meeting.title}
Data: ${new Date(meeting.date).toLocaleDateString(locale)} | Duração: ${formatDuration(meeting.duration)}
Provedor AI: ${meeting.providerName || 'N/A'} | Modelo: ${meeting.modelName || 'N/A'}

## 📝 Resumo Geral
${summary.summary || summary.overview}

## 🎯 Principais Pontos Discussos
${summary.keyPoints.map(k => `- ${k}`).join('\n')}

## ⚡ Ações e Próximos Passos
${summary.actionItems.map(a => {
  const { cleanAction, responsible } = parseActionResponsibility(a)
  return responsible ? `- **[${responsible}]** ${cleanAction}` : `- ${cleanAction}`
}).join('\n')}

## 👥 Participantes
${summary.participants.map(p => `- ${p}`).join('\n')}

## ⏱️ Linha do Tempo (Fases)
${summary.timeline?.map(t => `- **${t.time} (${t.phase})**: ${t.description}`).join('\n') ?? 'N/A'}
`
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = meeting.filename.replace('.txt', '.md')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const escapeHtml = (text: string) => {
    if (!text) return ''
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }

  const handleDownloadHtml = (meeting: MeetingRecord) => {
    const { summary } = meeting
    const title = escapeHtml(meeting.title)
    const keyPointsHtml = summary.keyPoints.map(k => `<li>${escapeHtml(k)}</li>`).join('')
    const actionItemsHtml = summary.actionItems.map(a => {
      const { cleanAction, responsible } = parseActionResponsibility(a)
      return responsible 
        ? `<li><span class="resp-badge">${escapeHtml(responsible)}</span> ${escapeHtml(cleanAction)}</li>`
        : `<li>${escapeHtml(cleanAction)}</li>`
    }).join('')
    const participantsHtml = summary.participants.map(p => `<li>${escapeHtml(p)}</li>`).join('')
    const overviewEscaped = escapeHtml(summary.summary || summary.overview).replace(/\n/g, '<br>')
    
    const html = `<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0b0f19; color: #f1f5f9; padding: 2rem; max-width: 800px; margin: 0 auto; line-height: 1.6; }
    h1 { color: #10b981; border-bottom: 2px solid #1f2937; padding-bottom: 0.5rem; }
    h2 { color: #6366f1; margin-top: 2rem; border-bottom: 1px solid #1f2937; padding-bottom: 0.3rem; }
    ul { padding-left: 1.2rem; }
    li { margin-bottom: 0.5rem; }
    .meta { color: #94a3b8; font-size: 0.9rem; margin-bottom: 2rem; display: flex; gap: 1.5rem; flex-wrap: wrap; }
    .overview { background: #111827; padding: 1.2rem; border-radius: 8px; border: 1px solid #1f2937; }
    .resp-badge { background: rgba(99, 102, 241, 0.15); color: #818cf8; border: 1px solid rgba(99, 102, 241, 0.3); padding: 0.1rem 0.4rem; border-radius: 4px; font-size: 0.75rem; font-weight: bold; margin-right: 0.3rem; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <div class="meta">
    <span><strong>Data:</strong> ${new Date(meeting.date).toLocaleDateString(locale)}</span>
    <span><strong>Duração:</strong> ${formatDuration(meeting.duration)}</span>
    <span><strong>IA:</strong> ${escapeHtml(meeting.providerName || 'N/A')} (${escapeHtml(meeting.modelName || 'N/A')})</span>
  </div>
  
  <h2>📝 Resumo Geral</h2>
  <div class="overview">
    <p>${overviewEscaped}</p>
  </div>

  <h2>👥 Participantes</h2>
  <ul>${participantsHtml}</ul>

  <h2>🎯 Principais Pontos Discussos</h2>
  <ul>${keyPointsHtml}</ul>

  <h2>⚡ Ações e Próximos Passos</h2>
  <ul>${actionItemsHtml}</ul>
</body>
</html>`

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = meeting.filename.replace('.txt', '.html')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handlePrint = () => {
    window.print()
  }

  const handleCopySummary = (meeting: MeetingRecord) => {
    const { summary } = meeting
    const text = `Reunião: ${meeting.title}
Data: ${new Date(meeting.date).toLocaleDateString(locale)} | Duração: ${formatDuration(meeting.duration)}

Resumo:
${summary.summary || summary.overview}

Participantes:
${summary.participants.join(', ')}

Ações:
${summary.actionItems.map(a => {
  const { cleanAction, responsible } = parseActionResponsibility(a)
  return responsible ? `• [${responsible}] ${cleanAction}` : `• ${cleanAction}`
}).join('\n')}
`
    navigator.clipboard.writeText(text).then(() => {
      setConfirmModal({
        isOpen: true,
        title: locale === 'en' ? 'Success' : 'Sucesso',
        message: locale === 'en' ? 'Executive summary copied to clipboard!' : 'Minuta da reunião copiada para a área de transferência!',
        onConfirm: () => {}
      })
    }).catch(err => {
      console.error('Failed to copy text: ', err)
    })
  }

  const saveNotionConfig = () => {
    localStorage.setItem('listen-meet-notion-token', notionToken)
    localStorage.setItem('listen-meet-notion-db', notionDb)
    setConfirmModal({
      isOpen: true,
      title: locale === 'en' ? 'Notion Saved' : 'Notion Salvo',
      message: locale === 'en' ? 'Notion credentials saved locally.' : 'Credenciais do Notion salvas localmente.',
      onConfirm: () => {}
    })
  }

  const saveSlackConfig = () => {
    localStorage.setItem('listen-meet-slack-webhook', slackWebhook)
    setConfirmModal({
      isOpen: true,
      title: locale === 'en' ? 'Slack Saved' : 'Slack Salvo',
      message: locale === 'en' ? 'Slack Webhook URL saved locally.' : 'Slack Webhook URL salva localmente.',
      onConfirm: () => {}
    })
  }

  const saveJiraConfig = () => {
    localStorage.setItem('listen-meet-jira-token', jiraToken)
    localStorage.setItem('listen-meet-jira-domain', jiraDomain)
    localStorage.setItem('listen-meet-jira-key', jiraKey)
    localStorage.setItem('listen-meet-jira-email', jiraEmail)
    setConfirmModal({
      isOpen: true,
      title: locale === 'en' ? 'Jira Saved' : 'Jira Salvo',
      message: locale === 'en' ? 'Jira credentials saved locally.' : 'Credenciais do Jira salvas localmente.',
      onConfirm: () => {}
    })
  }

  const handleSyncNotion = async () => {
    if (!selectedMeeting) return
    if (!notionToken || !notionDb) {
      setConfirmModal({
        isOpen: true,
        title: locale === 'en' ? 'Missing Config' : 'Configuração Ausente',
        message: locale === 'en' ? 'Please configure Notion Token and Database ID first.' : 'Por favor, configure o Token do Notion e ID do Banco de Dados primeiro.',
        onConfirm: () => {}
      })
      return
    }

    setIsSyncingNotion(true)
    setSyncStatusNotion(locale === 'en' ? 'Connecting to Notion API...' : 'Conectando com a API do Notion...')

    try {
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Client-ID': getClientId()
        },
        body: JSON.stringify({
          type: 'notion',
          payload: {
            token: notionToken,
            databaseId: notionDb,
            meeting: selectedMeeting
          }
        })
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || 'Erro na resposta do servidor proxy.')
      }

      setConfirmModal({
        isOpen: true,
        title: locale === 'en' ? 'Success' : 'Sucesso',
        message: locale === 'en'
          ? 'Meeting summary successfully synchronized to Notion!'
          : 'Resumo da reunião sincronizado com sucesso no Notion!',
        onConfirm: () => {}
      })
    } catch (err: any) {
      console.error(err)
      setConfirmModal({
        isOpen: true,
        title: locale === 'en' ? 'Error' : 'Erro',
        message: locale === 'en'
          ? `Failed to sync with Notion: ${err.message}`
          : `Falha ao sincronizar com o Notion: ${err.message}`,
        onConfirm: () => {}
      })
    } finally {
      setIsSyncingNotion(false)
      setSyncStatusNotion('')
    }
  }

  const handleSyncSlack = async (meeting: MeetingRecord) => {
    if (!slackWebhook) {
      setConfirmModal({
        isOpen: true,
        title: locale === 'en' ? 'Missing Config' : 'Configuração Ausente',
        message: locale === 'en' ? 'Please configure Slack Webhook URL first.' : 'Por favor, configure a URL de Webhook do Slack primeiro.',
        onConfirm: () => {}
      })
      return
    }

    setIsSyncingSlack(true)
    setSyncStatusSlack(locale === 'en' ? 'Sending summary to Slack...' : 'Enviando resumo para o Slack...')

    try {
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Client-ID': getClientId()
        },
        body: JSON.stringify({
          type: 'slack',
          payload: {
            webhookUrl: slackWebhook,
            meeting
          }
        })
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || 'Erro na resposta do servidor proxy.')
      }

      setConfirmModal({
        isOpen: true,
        title: locale === 'en' ? 'Sent' : 'Enviado',
        message: locale === 'en' ? 'Meeting summary sent to Slack channel!' : 'Resumo da reunião enviado para o canal do Slack!',
        onConfirm: () => {}
      })
    } catch (err: any) {
      console.error(err)
      setConfirmModal({
        isOpen: true,
        title: locale === 'en' ? 'Error' : 'Erro',
        message: locale === 'en'
          ? `Failed to send to Slack: ${err.message}`
          : `Falha ao enviar para o Slack: ${err.message}`,
        onConfirm: () => {}
      })
    } finally {
      setIsSyncingSlack(false)
      setSyncStatusSlack('')
    }
  }

  const handleSyncJira = async (meeting: MeetingRecord) => {
    if (!jiraToken || !jiraDomain || !jiraKey || !jiraEmail) {
      setConfirmModal({
        isOpen: true,
        title: locale === 'en' ? 'Missing Config' : 'Configuração Ausente',
        message: locale === 'en' ? 'Please configure Jira Domain, Project Key, Email, and API Token.' : 'Por favor, preencha o Domínio, Chave do Projeto, Email e Token de API do Jira.',
        onConfirm: () => {}
      })
      return
    }

    setIsSyncingJira(true)
    setSyncStatusJira(locale === 'en' ? 'Connecting to Jira Cloud...' : 'Conectando com o Jira Cloud...')

    try {
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Client-ID': getClientId()
        },
        body: JSON.stringify({
          type: 'jira',
          payload: {
            domain: jiraDomain,
            projectKey: jiraKey,
            email: jiraEmail,
            token: jiraToken,
            meeting
          }
        })
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || 'Erro na resposta do servidor proxy.')
      }

      const totalActions = meeting.summary.actionItems.length
      setConfirmModal({
        isOpen: true,
        title: locale === 'en' ? 'Jira Synced' : 'Jira Sincronizado',
        message: locale === 'en'
          ? `Successfully created ${totalActions} tasks in Jira under project ${jiraKey}!`
          : `Sucesso! Criadas ${totalActions} tarefas no Jira sob o projeto ${jiraKey}!`,
        onConfirm: () => {}
      })
    } catch (err: any) {
      console.error(err)
      setConfirmModal({
        isOpen: true,
        title: locale === 'en' ? 'Error' : 'Erro',
        message: locale === 'en'
          ? `Failed to sync with Jira: ${err.message}`
          : `Falha ao sincronizar com o Jira: ${err.message}`,
        onConfirm: () => {}
      })
    } finally {
      setIsSyncingJira(false)
      setSyncStatusJira('')
    }
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatDashboardTime = (seconds: number) => {
    const minsTotal = Math.round(seconds / 60)
    const hours = Math.floor(minsTotal / 60)
    const mins = minsTotal % 60
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const isToday = date.toDateString() === referenceDate.toDateString()
    const isYesterday = date.toDateString() === new Date(referenceDate.getTime() - 24 * 60 * 60 * 1000).toDateString()

    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    const timeStr = `${hours}:${minutes}`
    const connector = locale === 'en' ? ' at ' : ' às '

    if (isToday) return `${t.history.filters.today}${connector}${timeStr}`
    if (isYesterday) return `${t.history.yesterday}${connector}${timeStr}`

    const dateStr = date.toLocaleDateString(locale === 'en' ? 'en-US' : 'pt-BR', {
      day: '2-digit',
      month: 'short',
      year: date.getFullYear() !== referenceDate.getFullYear() ? 'numeric' : undefined,
    })

    return `${dateStr}${connector}${timeStr}`
  }

  const dashboardMeetings = useMemo(() => {
    const now = new Date(referenceDate)
    return meetings.filter(meeting => {
      // 1. Company filter
      const matchesCompany = selectedCompanyFilter === 'all' 
        ? true 
        : selectedCompanyFilter === 'none'
          ? !meeting.company
          : meeting.company === selectedCompanyFilter
      if (!matchesCompany) return false

      // 2. Time range filter
      const mDate = new Date(meeting.date)
      if (dashboardTimeRange === '7days') {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        sevenDaysAgo.setHours(0, 0, 0, 0)
        return mDate >= sevenDaysAgo
      } else if (dashboardTimeRange === '30days') {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        thirtyDaysAgo.setHours(0, 0, 0, 0)
        return mDate >= thirtyDaysAgo
      }
      return true // 'all'
    })
  }, [meetings, selectedCompanyFilter, dashboardTimeRange, referenceDate])

  const comparisonMeetings = useMemo(() => {
    if (dashboardTimeRange === 'all') return []
    const now = new Date(referenceDate)

    return meetings.filter(meeting => {
      // 1. Company filter
      const matchesCompany = selectedCompanyFilter === 'all' 
        ? true 
        : selectedCompanyFilter === 'none'
          ? !meeting.company
          : meeting.company === selectedCompanyFilter
      if (!matchesCompany) return false

      // 2. Time range filter (previous period)
      const mDate = new Date(meeting.date)
      if (dashboardTimeRange === '7days') {
        const start = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
        start.setHours(0, 0, 0, 0)
        const end = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        end.setHours(0, 0, 0, 0)
        return mDate >= start && mDate < end
      } else { // 30days
        const start = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)
        start.setHours(0, 0, 0, 0)
        const end = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        end.setHours(0, 0, 0, 0)
        return mDate >= start && mDate < end
      }
    })
  }, [meetings, selectedCompanyFilter, dashboardTimeRange, referenceDate])

  // Total productive/unproductive time across all filtered meetings
  const timeTotals = useMemo(() => {
    let totalProd = 0
    let totalUnprod = 0
    
    dashboardMeetings.forEach(meeting => {
      let efficiency = 80 // default
      if (meeting.summary.metrics?.efficiency) {
        const parsed = parseInt(meeting.summary.metrics.efficiency)
        if (!isNaN(parsed)) {
          efficiency = parsed
        }
      }
      
      const prod = meeting.duration * (efficiency / 100)
      const unprod = meeting.duration * (1 - efficiency / 100)
      
      totalProd += prod
      totalUnprod += unprod
    })
    
    return {
      productive: totalProd,
      unproductive: totalUnprod,
      total: totalProd + totalUnprod
    }
  }, [dashboardMeetings])

  const comparisonTotalTime = useMemo(() => {
    return comparisonMeetings.reduce((acc, m) => acc + m.duration, 0)
  }, [comparisonMeetings])

  const trendMetrics = useMemo(() => {
    if (dashboardTimeRange === 'all') return null
    
    const currentDuration = timeTotals.total
    const prevDuration = comparisonTotalTime
    
    const durationDelta = prevDuration > 0
      ? Math.round(((currentDuration - prevDuration) / prevDuration) * 100)
      : currentDuration > 0 ? 100 : 0
      
    const currentCount = dashboardMeetings.length
    const prevCount = comparisonMeetings.length
    
    const countDelta = prevCount > 0
      ? Math.round(((currentCount - prevCount) / prevCount) * 100)
      : currentCount > 0 ? 100 : 0

    return {
      durationDelta,
      countDelta,
      hasPrevData: prevCount > 0 || prevDuration > 0
    }
  }, [dashboardMeetings.length, comparisonMeetings.length, timeTotals.total, comparisonTotalTime, dashboardTimeRange])

  // Helper function to check if meeting is in selected day/week/month column
  const isMeetingInDayFilter = useCallback((meeting: MeetingRecord, filterKey: string) => {
    const mDate = new Date(meeting.date)
    const now = new Date(referenceDate)
    
    if (dashboardTimeRange === '7days') {
      return mDate.toDateString() === filterKey
    } else if (dashboardTimeRange === '30days') {
      const diffTime = now.getTime() - mDate.getTime()
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
      
      let weekIndex = -1
      if (diffDays >= 0 && diffDays < 7) {
        weekIndex = 3
      } else if (diffDays >= 7 && diffDays < 14) {
        weekIndex = 2
      } else if (diffDays >= 14 && diffDays < 21) {
        weekIndex = 1
      } else if (diffDays >= 21 && diffDays < 30) {
        weekIndex = 0
      }
      
      return `week-${weekIndex + 1}` === filterKey
    } else {
      const mYear = mDate.getFullYear()
      const mMonth = mDate.getMonth()
      return `month-${mYear}-${mMonth}` === filterKey
    }
  }, [dashboardTimeRange, referenceDate])

  // Dashboard Aggregates
  const totalMinutes = Math.floor(dashboardMeetings.reduce((acc, meeting) => acc + meeting.duration, 0) / 60)
  const totalDecisions = dashboardMeetings.reduce((acc, meeting) => acc + (meeting.summary.metrics?.decisionsCount ?? 0), 0)
  const totalActions = dashboardMeetings.reduce((acc, meeting) => acc + meeting.summary.actionItems.length, 0)
  
  const efficiencyValues = dashboardMeetings
    .map((meeting) => parsePercentage(meeting.summary.metrics?.efficiency))
    .filter((value): value is number => value !== null)
  const averageEfficiency = efficiencyValues.length > 0
    ? `${Math.round(efficiencyValues.reduce((acc, value) => acc + value, 0) / efficiencyValues.length)}%`
    : null
  
  const qualityValues = dashboardMeetings
    .map((meeting) => meeting.summary.meetingQualityScore)
    .filter((value): value is number => typeof value === 'number')
  const averageQuality = qualityValues.length > 0
    ? `${Math.round(qualityValues.reduce((acc, value) => acc + value, 0) / qualityValues.length)}%`
    : null

  const hotTopics = useMemo(() => {
    const counts: Record<string, number> = {}
    dashboardMeetings.forEach((m) => {
      if (m.summary.topicBreakdown && m.summary.topicBreakdown.length > 0) {
        m.summary.topicBreakdown.forEach((tb) => {
          counts[tb.topic] = (counts[tb.topic] || 0) + 1
        })
      } else if (m.summary.topics && m.summary.topics.length > 0) {
        m.summary.topics.forEach((t) => {
          counts[t] = (counts[t] || 0) + 1
        })
      }
    })
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }, [dashboardMeetings])

  const uniqueCompanies = useMemo(() => {
    return Array.from(
      new Set(meetings.map((m) => m.company).filter(Boolean) as string[])
    ).sort()
  }, [meetings])

  const weekMeetings = useMemo(() => {
    const weekAgo = new Date(referenceDate.getTime() - 7 * 24 * 60 * 60 * 1000)
    return meetings.filter((meeting) => {
      const isRecent = new Date(meeting.date) >= weekAgo
      const matchesCompany = selectedCompanyFilter === 'all' 
        || (selectedCompanyFilter === 'none' ? !meeting.company : meeting.company === selectedCompanyFilter)
      return isRecent && matchesCompany
    }).length
  }, [meetings, selectedCompanyFilter, referenceDate])

  // Master action list (for dashboard)
  const masterActions = useMemo(() => {
    return dashboardMeetings.flatMap((meeting) => 
      meeting.summary.actionItems.map((action, idx) => ({
        meetingId: meeting.id,
        meetingTitle: meeting.summary.title,
        meetingDate: meeting.date,
        text: action,
        key: `${meeting.id}-action-${idx}`
      }))
    )
  }, [dashboardMeetings])

  const masterActionsDone = masterActions.filter(a => checklistState[a.key]).length

  // Filter master actions specifically assigned to "Me"
  const myActions = useMemo(() => {
    if (!meName) return []
    return masterActions.filter((action) => {
      // 1. Direct match with responsible in brackets
      const { responsible } = parseActionResponsibility(action.text)
      if (responsible) {
        const lowerRes = responsible.toLowerCase()
        return lowerRes === meName.toLowerCase() || lowerRes === 'eu' || lowerRes === 'me'
      }

      // 2. Lookup actionPlan match in the meeting
      const meeting = meetings.find(m => m.id === action.meetingId)
      if (meeting?.summary.actionPlan) {
        const matchingPlanItem = meeting.summary.actionPlan.find(plan => 
          plan.task.toLowerCase().includes(action.text.toLowerCase()) || 
          action.text.toLowerCase().includes(plan.task.toLowerCase())
        )
        if (matchingPlanItem?.assignee) {
          const lowerAssignee = matchingPlanItem.assignee.toLowerCase()
          return lowerAssignee === meName.toLowerCase() || lowerAssignee === 'eu' || lowerAssignee === 'me'
        }
      }

      // 3. Last fallback: text contains user name
      return action.text.toLowerCase().includes(meName.toLowerCase())
    })
  }, [masterActions, meName, meetings])

  const myActionsDone = useMemo(() => {
    return myActions.filter(a => checklistState[a.key]).length
  }, [myActions, checklistState])

  // Filtered master actions to be displayed on the dashboard
  const displayedMasterActions = useMemo(() => {
    let actions = dashboardFilterMyTasks && meName ? myActions : masterActions
    if (selectedDayFilter) {
      actions = actions.filter(action => {
        const meeting = dashboardMeetings.find(m => m.id === action.meetingId)
        if (!meeting) return false
        return isMeetingInDayFilter(meeting, selectedDayFilter)
      })
    }
    return actions
  }, [masterActions, myActions, dashboardFilterMyTasks, meName, selectedDayFilter, dashboardMeetings, isMeetingInDayFilter])

  // Categorized meeting types duration/count breakdown
  const categoryTimeBreakdown = useMemo(() => {
    const stats: Record<string, { duration: number; count: number }> = {}
    
    dashboardMeetings.forEach((m) => {
      const type = m.summary.tags?.meetingType || (locale === 'en' ? 'General' : 'Geral')
      if (!stats[type]) {
        stats[type] = { duration: 0, count: 0 }
      }
      stats[type].duration += m.duration
      stats[type].count += 1
    })
    
    const totalDuration = Object.values(stats).reduce((acc, curr) => acc + curr.duration, 0)
    
    return Object.entries(stats)
      .map(([name, data]) => ({
        name,
        duration: data.duration,
        count: data.count,
        percentage: totalDuration > 0 ? Math.round((data.duration / totalDuration) * 100) : 0
      }))
      .sort((a, b) => b.duration - a.duration)
  }, [dashboardMeetings, locale])

  // Focus & risks details
  const focusMetrics = useMemo(() => {
    let totalFocus = 0
    let focusCount = 0
    const allRisks: Array<{ risk: string; impact: string; meetingTitle: string }> = []
    
    dashboardMeetings.forEach(m => {
      if (m.summary.meetingEfficiencyAnalysis?.focusScore !== undefined) {
        totalFocus += m.summary.meetingEfficiencyAnalysis.focusScore
        focusCount++
      } else {
        let efficiency = 80
        if (m.summary.metrics?.efficiency) {
          const parsed = parseInt(m.summary.metrics.efficiency)
          if (!isNaN(parsed)) efficiency = parsed
        }
        totalFocus += efficiency
        focusCount++
      }
      
      if (m.summary.risksAndBlockers && m.summary.risksAndBlockers.length > 0) {
        m.summary.risksAndBlockers.forEach(rb => {
          allRisks.push({
            risk: rb.risk,
            impact: rb.impact || 'N/A',
            meetingTitle: m.summary.title
          })
        })
      }
    })
    
    const avgFocus = focusCount > 0 ? Math.round(totalFocus / focusCount) : 75
    return {
      avgFocus,
      risks: allRisks.slice(0, 5)
    }
  }, [dashboardMeetings])

  const weeklyTimeStats = useMemo(() => {
    const stats: Array<{
      label: string
      dateStr: string
      productive: number
      unproductive: number
      total: number
      key: string
    }> = []
    
    const now = new Date(referenceDate)
    
    if (dashboardTimeRange === '7days') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
        const dayOfWeek = d.getDay()
        let label = ''
        if (locale === 'en') {
          const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
          label = days[dayOfWeek]
        } else {
          const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
          label = days[dayOfWeek]
        }
        stats.push({
          label,
          dateStr: d.toLocaleDateString(locale === 'en' ? 'en-US' : 'pt-BR', { day: 'numeric', month: 'short' }),
          productive: 0,
          unproductive: 0,
          total: 0,
          key: d.toDateString(),
        })
      }
      
      dashboardMeetings.forEach(meeting => {
        const mDate = new Date(meeting.date)
        const dateStr = mDate.toDateString()
        const statItem = stats.find(item => item.key === dateStr)
        if (statItem) {
          let efficiency = 80
          if (meeting.summary.metrics?.efficiency) {
            const parsed = parseInt(meeting.summary.metrics.efficiency)
            if (!isNaN(parsed)) efficiency = parsed
          }
          const prod = meeting.duration * (efficiency / 100)
          const unprod = meeting.duration * (1 - efficiency / 100)
          statItem.productive += prod
          statItem.unproductive += unprod
          statItem.total += meeting.duration
        }
      })
    } else if (dashboardTimeRange === '30days') {
      for (let i = 3; i >= 0; i--) {
        const startDay = i * 7 + 6
        const endDay = i * 7
        const dStart = new Date(now.getTime() - startDay * 24 * 60 * 60 * 1000)
        const dEnd = new Date(now.getTime() - endDay * 24 * 60 * 60 * 1000)
        
        const label = locale === 'en' ? `Wk ${4 - i}` : `Sem ${4 - i}`
        const rangeStr = `${dStart.getDate()}/${dStart.getMonth() + 1} - ${dEnd.getDate()}/${dEnd.getMonth() + 1}`
        
        stats.push({
          label,
          dateStr: rangeStr,
          productive: 0,
          unproductive: 0,
          total: 0,
          key: `week-${4 - i}`,
        })
      }
      
      dashboardMeetings.forEach(meeting => {
        const mDate = new Date(meeting.date)
        const diffTime = now.getTime() - mDate.getTime()
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
        
        let weekIndex = -1
        if (diffDays >= 0 && diffDays < 7) {
          weekIndex = 3
        } else if (diffDays >= 7 && diffDays < 14) {
          weekIndex = 2
        } else if (diffDays >= 14 && diffDays < 21) {
          weekIndex = 1
        } else if (diffDays >= 21 && diffDays < 30) {
          weekIndex = 0
        }
        
        if (weekIndex >= 0 && weekIndex < 4) {
          let efficiency = 80
          if (meeting.summary.metrics?.efficiency) {
            const parsed = parseInt(meeting.summary.metrics.efficiency)
            if (!isNaN(parsed)) efficiency = parsed
          }
          const prod = meeting.duration * (efficiency / 100)
          const unprod = meeting.duration * (1 - efficiency / 100)
          
          stats[weekIndex].productive += prod
          stats[weekIndex].unproductive += unprod
          stats[weekIndex].total += meeting.duration
        }
      })
    } else {
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const monthIndex = d.getMonth()
        let label = ''
        if (locale === 'en') {
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
          label = months[monthIndex]
        } else {
          const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
          label = months[monthIndex]
        }
        stats.push({
          label,
          dateStr: `${d.getFullYear()}`,
          productive: 0,
          unproductive: 0,
          total: 0,
          key: `month-${d.getFullYear()}-${monthIndex}`,
        })
      }
      
      dashboardMeetings.forEach(meeting => {
        const mDate = new Date(meeting.date)
        const mYear = mDate.getFullYear()
        const mMonth = mDate.getMonth()
        
        const key = `month-${mYear}-${mMonth}`
        const statItem = stats.find(item => item.key === key)
        if (statItem) {
          let efficiency = 80
          if (meeting.summary.metrics?.efficiency) {
            const parsed = parseInt(meeting.summary.metrics.efficiency)
            if (!isNaN(parsed)) efficiency = parsed
          }
          const prod = meeting.duration * (efficiency / 100)
          const unprod = meeting.duration * (1 - efficiency / 100)
          
          statItem.productive += prod
          statItem.unproductive += unprod
          statItem.total += meeting.duration
        }
      })
    }
    
    return stats
  }, [dashboardMeetings, dashboardTimeRange, locale, referenceDate])

  // Custom categorizations (Daily and 1:1 detectors)
  const meetingType = selectedMeeting?.summary.tags?.meetingType || ''
  const isDaily = meetingType.toLowerCase().includes('daily') || meetingType.toLowerCase().includes('scrum') || meetingType.toLowerCase().includes('diári')
  const isOneOnOne = meetingType.toLowerCase().includes('1:1') || meetingType.toLowerCase().includes('1-on-1') || meetingType.toLowerCase().includes('one-on-one')

  if (meetings.length === 0) {
    return (
      <div className="rounded-xl border border-[color:var(--studio-border)] bg-[var(--studio-card)] glass-card p-10 text-center text-[var(--studio-text)] shadow-xl shadow-black/10">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-xl border border-[color:var(--studio-border)] bg-[var(--studio-panel)]">
          <MaterialIcon name="description" className="text-3xl text-[var(--studio-secondary)]" />
        </div>
        <h3 className="mb-2 text-lg font-semibold">{t.history.emptyTitle}</h3>
        <p className="mx-auto mb-6 max-w-md text-sm text-[var(--studio-muted)]">
          {t.history.emptyDescription}
        </p>
        <Button onClick={onNewRecording} className="gap-2 bg-[var(--studio-primary)] text-zinc-950 font-semibold hover:opacity-90 cursor-pointer">
          <MaterialIcon name="play_circle" className="text-base" filled />
          {t.history.newRecording}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-5 text-[var(--studio-text)]">
      {/* Control bar */}
      <section className="flex flex-col gap-4 rounded-xl border border-[color:var(--studio-border)] bg-[var(--studio-panel)] glass-panel p-5 shadow-xl shadow-black/10 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--studio-primary)]">{t.history.titleEyebrow}</p>
          <h2 className="mt-1 text-xl font-semibold text-[var(--studio-text)]">{t.history.title}</h2>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row items-stretch sm:items-center">
          {/* Mode Switcher */}
          <div className="grid grid-cols-2 gap-1 rounded-lg border border-[color:var(--studio-border)] bg-[var(--studio-panel-strong)] p-1 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('reader')}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-md py-1.5 px-3 text-xs font-semibold cursor-pointer transition-all duration-300",
                viewMode === 'reader'
                  ? "bg-[var(--studio-primary-soft)] text-[var(--studio-text)] shadow-[inset_0_0_0_1px_var(--studio-primary-border)]"
                  : "text-[var(--studio-muted)] hover:bg-[var(--studio-panel)]"
              )}
            >
              <MaterialIcon name="article" className="text-sm" />
              <span>{locale === 'en' ? 'Reader' : 'Leitura'}</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('dashboard')}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-md py-1.5 px-3 text-xs font-semibold cursor-pointer transition-all duration-300",
                viewMode === 'dashboard'
                  ? "bg-[var(--studio-secondary-soft)] text-[var(--studio-text)] shadow-[inset_0_0_0_1px_var(--studio-secondary-border)]"
                  : "text-[var(--studio-muted)] hover:bg-[var(--studio-panel)]"
              )}
            >
              <MaterialIcon name="bar_chart" className="text-sm" />
              <span>Dashboard</span>
            </button>
          </div>

          <div className="relative min-w-0 sm:w-56">
            <MaterialIcon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-base text-[var(--studio-subtle)]" />
            <Input
              placeholder={t.history.searchPlaceholder}
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="border-[color:var(--studio-border)] bg-[var(--studio-panel-strong)] pl-10 text-[var(--studio-text)] placeholder:text-[var(--studio-subtle)]"
            />
          </div>

          {/* Company Filter Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 border-[color:var(--studio-border)] bg-[var(--studio-panel-strong)] text-[var(--studio-text)] hover:bg-[var(--studio-card-alt)] hover:text-[var(--studio-text)]">
                <MaterialIcon name="business" className="text-base" />
                <span>
                  {selectedCompanyFilter === 'all' 
                    ? (locale === 'en' ? 'All Companies' : 'Todas as Empresas') 
                    : selectedCompanyFilter === 'none'
                      ? (locale === 'en' ? 'Unassigned' : 'Sem Empresa')
                      : selectedCompanyFilter}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="max-h-60 overflow-y-auto">
              <DropdownMenuItem onClick={() => setSelectedCompanyFilter('all')}>
                {locale === 'en' ? 'All Companies' : 'Todas as Empresas'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSelectedCompanyFilter('none')}>
                {locale === 'en' ? 'Unassigned' : 'Sem Empresa'}
              </DropdownMenuItem>
              {uniqueCompanies.map((c) => (
                <DropdownMenuItem key={c} onClick={() => setSelectedCompanyFilter(c)}>
                  {c}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 border-[color:var(--studio-border)] bg-[var(--studio-panel-strong)] text-[var(--studio-text)] hover:bg-[var(--studio-card-alt)] hover:text-[var(--studio-text)]">
                <MaterialIcon name="filter_list" className="text-base" />
                {filter === 'all' ? t.history.filters.all : filter === 'today' ? t.history.filters.today : filter === 'week' ? t.history.filters.week : t.history.filters.month}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setFilter('all')}>{t.history.filters.allMeetings}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter('today')}>{t.history.filters.today}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter('week')}>{t.history.filters.week}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter('month')}>{t.history.filters.month}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button onClick={onNewRecording} className="gap-2 bg-[var(--studio-primary)] text-zinc-950 font-semibold hover:opacity-90 cursor-pointer">
            <MaterialIcon name="play_circle" className="text-base" filled />
            {t.history.newRecording}
          </Button>
        </div>
      </section>

      {/* Operational History Metrics (always visible) */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <div className="rounded-xl border border-[color:var(--studio-border)] bg-[var(--studio-card)] glass-card p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--studio-subtle)]">{t.history.sessions}</p>
          <p className="mt-2 font-mono text-2xl font-semibold text-[var(--studio-text)]">
            {meetings.length} {meetings.length === 1 ? t.history.sessionSingular : t.history.sessionPlural}
          </p>
        </div>
        <div className="rounded-xl border border-[color:var(--studio-border)] bg-[var(--studio-card)] glass-card p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--studio-subtle)]">{t.history.totalTime}</p>
          <p className="mt-2 font-mono text-2xl font-semibold text-[var(--studio-text)]">{totalMinutes}min</p>
        </div>
        <div className="rounded-xl border border-[color:var(--studio-border)] bg-[var(--studio-card)] glass-card p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--studio-subtle)]">{t.history.thisWeek}</p>
          <p className="mt-2 font-mono text-2xl font-semibold text-[var(--studio-text)]">{weekMeetings}</p>
        </div>
        <div className="rounded-xl border border-[color:var(--studio-border)] bg-[var(--studio-card)] glass-card p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--studio-subtle)]">{t.history.decisions}</p>
          <p className="mt-2 font-mono text-2xl font-semibold text-[var(--studio-text)]">{t.history.decisionCount(totalDecisions)}</p>
        </div>
        <div className="rounded-xl border border-[color:var(--studio-border)] bg-[var(--studio-card)] glass-card p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--studio-subtle)]">{t.history.actions}</p>
          <p className="mt-2 font-mono text-2xl font-semibold text-[var(--studio-text)]">{t.history.actionCount(totalActions)}</p>
          {averageEfficiency && (
            <p className="mt-1 text-xs text-[var(--studio-subtle)]">{t.history.averageEfficiency(averageEfficiency)}</p>
          )}
        </div>
        <div className="rounded-xl border border-[color:var(--studio-border)] bg-[var(--studio-card)] glass-card p-4 relative group overflow-hidden">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--studio-subtle)]">
            {locale === 'en' ? 'My Tasks' : 'Minhas Tarefas'}
          </p>
          {meName ? (
            <>
              <p className="mt-2 font-mono text-2xl font-semibold text-[var(--studio-text)]">
                {myActionsDone}/{myActions.length}
              </p>
              <div className="mt-2 h-1.5 w-full bg-[var(--studio-panel-strong)]/60 rounded-full overflow-hidden border border-[var(--studio-border)]/30">
                <div 
                  className="h-full bg-[var(--studio-primary)] rounded-full transition-all duration-500" 
                  style={{ width: `${myActions.length > 0 ? (myActionsDone / myActions.length) * 100 : 0}%` }}
                />
              </div>
              <p className="mt-1.5 text-[10px] text-[var(--studio-subtle)] truncate">
                {locale === 'en' ? `Profile: ${meName}` : `Perfil: ${meName}`}
              </p>
            </>
          ) : (
            <div className="mt-2 flex flex-col justify-center h-[calc(100%-1.5rem)]">
              <p className="text-xs text-[var(--studio-muted)] italic leading-tight">
                {locale === 'en' ? 'No active profile.' : 'Nenhum perfil.'}
              </p>
              <p className="text-[9px] text-[var(--studio-subtle)] leading-tight mt-1">
                {locale === 'en' ? 'Mark "Este sou eu" in any meeting participants tab' : 'Marque "Este sou eu" na aba de presença da ata'}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* RENDER VIEW MODE: DASHBOARD */}
      {viewMode === 'dashboard' ? (
        <div className="space-y-6">
          {/* Time Range Selector & Dashboard Summary */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[color:var(--studio-border)] pb-4">
            <div>
              <h2 className="text-lg font-semibold text-[var(--studio-text)]">
                {locale === 'en' ? 'Performance & Productivity Analytics' : 'Análise de Desempenho e Produtividade'}
              </h2>
              <p className="text-xs text-[var(--studio-muted)]">
                {locale === 'en' 
                  ? 'Consolidated metrics of time, engagement, and task tracking' 
                  : 'Métricas consolidadas de tempo, engajamento e acompanhamento de tarefas'}
              </p>
            </div>
            
            {/* Time Range Switcher */}
            <div className="flex items-center gap-1 rounded-lg border border-[color:var(--studio-border)] bg-[var(--studio-panel-strong)] p-1 self-start sm:self-auto shadow-inner">
              {(['7days', '30days', 'all'] as const).map((range) => {
                const isActive = dashboardTimeRange === range
                const label = range === '7days' 
                  ? (locale === 'en' ? '7 Days' : '7 Dias') 
                  : range === '30days' 
                    ? (locale === 'en' ? '30 Days' : '30 Dias') 
                    : (locale === 'en' ? 'All Time' : 'Tudo')
                
                return (
                  <button
                    key={range}
                    type="button"
                    onClick={() => changeTimeRange(range)}
                    className={cn(
                      "rounded-md py-1 px-3 text-[11px] font-bold cursor-pointer transition-all duration-300",
                      isActive
                        ? "bg-[var(--studio-primary)] text-zinc-950 shadow-sm"
                        : "text-[var(--studio-muted)] hover:text-[var(--studio-text)] hover:bg-[var(--studio-panel)]"
                    )}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Dashboard Cards Grid (3 Columns on Large Screens) */}
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {/* Card 1: Task Tracker */}
            <article className="rounded-xl border border-[color:var(--studio-border)] bg-[var(--studio-card)] glass-card p-5 dashboard-grid-glow flex flex-col h-[350px]">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-[color:var(--studio-border)] pb-3 shrink-0">
                <div className="flex items-center gap-2">
                  <MaterialIcon name="checklist" className="text-base text-[var(--studio-secondary)]" />
                  <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--studio-text)]">
                    {locale === 'en' ? 'Task Tracker' : 'Evolução de Tarefas'}
                  </h3>
                </div>
                
                {/* Active Filter Indication */}
                {selectedDayFilter && (
                  <button
                    onClick={() => setSelectedDayFilter(null)}
                    className="flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[9px] text-emerald-400 font-bold transition-all hover:bg-emerald-500/20 cursor-pointer"
                  >
                    <span>
                      {dashboardTimeRange === '7days' ? (locale === 'en' ? 'Filtered Day' : 'Dia Filtrado') : 
                       dashboardTimeRange === '30days' ? (locale === 'en' ? 'Filtered Week' : 'Semana Filtrada') : 
                       (locale === 'en' ? 'Filtered Month' : 'Mês Filtrado')}
                    </span>
                    <MaterialIcon name="close" className="text-[10px]" />
                  </button>
                )}

                <div className="flex items-center gap-2">
                  {meName && (
                    <button
                      onClick={() => setDashboardFilterMyTasks(prev => !prev)}
                      className={cn(
                        "text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded border flex items-center gap-0.5 cursor-pointer transition-all",
                        dashboardFilterMyTasks
                          ? "bg-[var(--studio-primary)] border-[var(--studio-primary)] text-zinc-950"
                          : "border-[var(--studio-border)] text-[var(--studio-muted)] hover:text-[var(--studio-text)]"
                      )}
                    >
                      <MaterialIcon name="person" className="text-[9px]" filled={dashboardFilterMyTasks} />
                      {locale === 'en' ? 'My Tasks' : 'Minhas Tarefas'}
                    </button>
                  )}
                  <span className="rounded-full bg-[var(--studio-secondary-soft)] px-2 py-0.5 text-xs text-[var(--studio-secondary)] font-medium">
                    {displayedMasterActions.length}
                  </span>
                </div>
              </div>

              {displayedMasterActions.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-sm text-[var(--studio-muted)]">
                  {locale === 'en' ? 'No actions identified yet.' : 'Nenhuma tarefa identificada ainda.'}
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                  {displayedMasterActions.map((action) => {
                    const isDone = checklistState[action.key] || false
                    return (
                      <div 
                        key={action.key} 
                        className={cn(
                          "flex items-start gap-2.5 rounded-lg p-2.5 border border-[color:var(--studio-border)]/50 bg-[var(--studio-panel)]/40 transition-colors",
                          isDone && "bg-emerald-500/5 border-emerald-500/10"
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => toggleChecklistItem(action.meetingId, `action-${action.key.split('-action-')[1]}`)}
                          className={cn(
                            "mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border transition-colors cursor-pointer",
                            isDone 
                              ? "bg-[var(--studio-primary)] border-[var(--studio-primary)] text-zinc-950" 
                              : "border-[var(--studio-subtle)] hover:border-[var(--studio-secondary)]"
                          )}
                        >
                          {isDone && <MaterialIcon name="check" className="text-[10px] font-bold" />}
                        </button>
                        <div className="min-w-0 flex-1">
                          <p className={cn("text-xs text-[var(--studio-text)] leading-tight", isDone && "line-through text-[var(--studio-muted)]")}>
                            {action.text}
                          </p>
                          <div className="mt-1 flex flex-wrap gap-1.5 items-center text-[9px] text-[var(--studio-subtle)]">
                            <span className="truncate max-w-[120px] font-medium text-[var(--studio-secondary)]">
                              {action.meetingTitle}
                            </span>
                            <span>•</span>
                            <span>{formatDate(action.meetingDate)}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </article>

            {/* Card 2: Weekly/Monthly Time Spent */}
            <article className="rounded-xl border border-[color:var(--studio-border)] bg-[var(--studio-card)] glass-card p-5 dashboard-radial-glow flex flex-col h-[350px]">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-[color:var(--studio-border)] pb-3 shrink-0">
                <div className="flex items-center gap-2">
                  <MaterialIcon name="pending_actions" className="text-base text-[var(--studio-primary)]" />
                  <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--studio-text)]">
                    {dashboardTimeRange === '7days' 
                      ? (locale === 'en' ? 'Weekly Time Spent' : 'Tempo na Semana')
                      : dashboardTimeRange === '30days'
                        ? (locale === 'en' ? 'Monthly Time Spent' : 'Tempo no Mês')
                        : (locale === 'en' ? 'Lifetime Time Spent' : 'Tempo Acumulado')}
                  </h3>
                </div>
                <span className="rounded-full bg-[var(--studio-primary-soft)] border border-[var(--studio-primary-border)] px-2 py-0.5 text-xs text-[var(--studio-primary)] font-semibold">
                  {dashboardTimeRange === '7days' 
                    ? (locale === 'en' ? 'Last 7 Days' : 'Últimos 7 Dias') 
                    : dashboardTimeRange === '30days'
                      ? (locale === 'en' ? 'Last 30 Days' : 'Últimos 30 Dias')
                      : (locale === 'en' ? 'All Time' : 'Todo o Histórico')}
                </span>
              </div>

              <div className="flex-1 flex flex-col justify-between">
                {/* Total Stats comparative bar */}
                <div className="space-y-1.5 shrink-0">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      {locale === 'en' ? 'Prod:' : 'Prod:'}{' '}
                      {formatDashboardTime(timeTotals.productive)} ({timeTotals.total > 0 ? Math.round((timeTotals.productive / timeTotals.total) * 100) : 0}%)
                    </span>
                    <span className="text-red-400 font-semibold flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                      {locale === 'en' ? 'Improd:' : 'Improd:'}{' '}
                      {formatDashboardTime(timeTotals.unproductive)} ({timeTotals.total > 0 ? Math.round((timeTotals.unproductive / timeTotals.total) * 100) : 0}%)
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-[var(--studio-panel-strong)] rounded-full overflow-hidden border border-[color:var(--studio-border)]/50 flex">
                    {timeTotals.total > 0 ? (
                      <>
                        <div 
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                          style={{ width: `${(timeTotals.productive / timeTotals.total) * 100}%` }}
                        />
                        <div 
                          className="h-full bg-gradient-to-r from-red-500 to-amber-500 transition-all duration-500"
                          style={{ width: `${(timeTotals.unproductive / timeTotals.total) * 100}%` }}
                        />
                      </>
                    ) : (
                      <div className="h-full w-full bg-zinc-800 opacity-40" />
                    )}
                  </div>
                </div>

                {/* Day-by-day vertical bars */}
                <div className="relative flex-1 mt-4 flex flex-col justify-end">
                  {/* Grid Lines for reference (Y Axis) */}
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-7 pt-2 opacity-5">
                    <div className="border-t border-dashed border-white w-full" />
                    <div className="border-t border-dashed border-white w-full" />
                    <div className="border-t border-dashed border-white w-full" />
                  </div>

                  <div className="grid grid-cols-7 gap-1.5 items-end h-28 relative z-10">
                    {(() => {
                      const maxDayTotal = Math.max(...weeklyTimeStats.map(s => s.total), 1)
                      return weeklyTimeStats.map((stat, idx) => {
                        const hasMeetings = stat.total > 0
                        const pctProd = hasMeetings ? (stat.productive / stat.total) * 100 : 0
                        const pctUnprod = hasMeetings ? (stat.unproductive / stat.total) * 100 : 0
                        const isFiltered = selectedDayFilter === stat.key
                        
                        return (
                          <div 
                            key={idx} 
                            onClick={() => {
                              if (hasMeetings) {
                                setSelectedDayFilter(prev => prev === stat.key ? null : stat.key)
                              }
                            }}
                            className="flex flex-col items-center gap-1 h-full justify-end cursor-pointer group relative"
                          >
                            {/* Detailed Tooltip */}
                            <div className="absolute bottom-full mb-1.5 hidden group-hover:block z-20 w-40 bg-[var(--studio-panel-strong)] border border-[color:var(--studio-border)] rounded-lg p-2 text-[9px] text-[var(--studio-text)] shadow-xl leading-relaxed">
                              <p className="font-bold text-zinc-200 border-b border-[color:var(--studio-border)] pb-1 mb-1">{stat.label} ({stat.dateStr})</p>
                              <p className="text-emerald-400 flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                {locale === 'en' ? 'Productive:' : 'Produtivo:'} <strong>{formatDashboardTime(stat.productive)}</strong>
                              </p>
                              <p className="text-red-400 flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                                {locale === 'en' ? 'Unproductive:' : 'Improdutivo:'} <strong>{formatDashboardTime(stat.unproductive)}</strong>
                              </p>
                              <p className="mt-0.5 border-t border-[color:var(--studio-border)]/50 pt-0.5 font-bold text-[var(--studio-secondary)] flex justify-between">
                                <span>Total:</span>
                                <span>{formatDashboardTime(stat.total)}</span>
                              </p>
                            </div>

                            {/* Column Stacked Bar */}
                            <div className="w-full flex-1 flex flex-col justify-end">
                              {hasMeetings ? (
                                <div 
                                  className={cn(
                                    "w-full bg-[var(--studio-panel-strong)] rounded-t flex flex-col overflow-hidden border transition-all duration-300",
                                    isFiltered
                                      ? "border-[var(--studio-primary)] shadow-glow-primary scale-105"
                                      : "border-[color:var(--studio-border)]/50 group-hover:border-[var(--studio-primary-border)]"
                                  )}
                                  style={{ height: `${(stat.total / maxDayTotal) * 100}%` }}
                                >
                                  {/* Unproductive at top */}
                                  <div 
                                    className="w-full bg-gradient-to-b from-red-500/80 to-amber-500/80" 
                                    style={{ height: `${pctUnprod}%` }}
                                  />
                                  {/* Productive at bottom */}
                                  <div 
                                    className="w-full bg-gradient-to-b from-emerald-500 to-teal-400" 
                                    style={{ height: `${pctProd}%` }}
                                  />
                                </div>
                              ) : (
                                <div className="h-1 w-1 rounded-full bg-zinc-800 opacity-45 mx-auto" />
                              )}
                            </div>

                            {/* Label */}
                            <span className={cn(
                              "text-[8px] font-bold transition-colors select-none",
                              isFiltered ? "text-[var(--studio-primary)]" : "text-[var(--studio-muted)] group-hover:text-[var(--studio-text)]"
                            )}>
                              {stat.label}
                            </span>
                          </div>
                        )
                      })
                    })()}
                  </div>
                </div>

                {/* Comparative period trend metrics */}
                {trendMetrics && trendMetrics.hasPrevData && (
                  <div className="flex items-center justify-between text-[9px] text-[var(--studio-muted)] pt-2 mt-2 border-t border-[color:var(--studio-border)]/30 shrink-0">
                    <span className="flex items-center gap-0.5">
                      <MaterialIcon name="history" className="text-[10px]" />
                      {locale === 'en' ? 'vs. prev period:' : 'vs. anterior:'}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className={cn(
                        "font-bold flex items-center",
                        trendMetrics.durationDelta <= 0 ? "text-emerald-400" : "text-amber-400"
                      )}>
                        <MaterialIcon name={trendMetrics.durationDelta <= 0 ? "arrow_downward" : "arrow_upward"} className="text-[9px]" />
                        {Math.abs(trendMetrics.durationDelta)}% {locale === 'en' ? 'time' : 'tempo'}
                      </span>
                      <span>•</span>
                      <span className={cn(
                        "font-bold flex items-center",
                        trendMetrics.countDelta <= 0 ? "text-emerald-400" : "text-amber-400"
                      )}>
                        <MaterialIcon name={trendMetrics.countDelta <= 0 ? "arrow_downward" : "arrow_upward"} className="text-[9px]" />
                        {Math.abs(trendMetrics.countDelta)}% {locale === 'en' ? 'reuns' : 'reuns'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </article>

            {/* Card 3: Focus & Waste Analysis */}
            <article className="rounded-xl border border-[color:var(--studio-border)] bg-[var(--studio-card)] glass-card p-5 dashboard-radial-glow flex flex-col h-[350px]">
              <div className="mb-4 flex items-center justify-between border-b border-[color:var(--studio-border)] pb-3 shrink-0">
                <div className="flex items-center gap-2">
                  <MaterialIcon name="psychology" className="text-base text-[var(--studio-primary)]" />
                  <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--studio-text)]">
                    {locale === 'en' ? 'Focus & Waste Analysis' : 'Foco e Desperdício'}
                  </h3>
                </div>
                <span className="rounded-full bg-[var(--studio-primary-soft)] border border-[var(--studio-primary-border)] px-2 py-0.5 text-xs text-[var(--studio-primary)] font-semibold">
                  {focusMetrics.avgFocus}% Focus
                </span>
              </div>
              
              <div className="flex-1 flex flex-col justify-between overflow-hidden">
                {/* Focus Score progress bar */}
                <div className="space-y-1.5 shrink-0">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-[var(--studio-text)]">
                      {locale === 'en' ? 'Average Focus Score' : 'Score de Foco Médio'}
                    </span>
                    <span className="text-[var(--studio-primary)] font-mono">{focusMetrics.avgFocus}%</span>
                  </div>
                  <div className="h-2 w-full bg-[var(--studio-panel-strong)] rounded-full overflow-hidden border border-[color:var(--studio-border)]/50">
                    <div 
                      className="h-full bg-gradient-to-r from-[var(--studio-primary)] to-emerald-400 rounded-full transition-all duration-500"
                      style={{ width: `${focusMetrics.avgFocus}%` }}
                    />
                  </div>
                  <p className="text-[9px] text-[var(--studio-muted)] leading-tight">
                    {locale === 'en' 
                      ? 'Measures meeting alignment with agenda topics and dialogue concentration.' 
                      : 'Mede o alinhamento das discussões com a pauta e a concentração dos participantes.'}
                  </p>
                </div>

                {/* Risks & Blockers List */}
                <div className="flex-1 flex flex-col justify-end mt-4 overflow-hidden">
                  <h4 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--studio-subtle)] flex items-center gap-1 mb-2 shrink-0">
                    <MaterialIcon name="warning" className="text-xs text-amber-400" />
                    {locale === 'en' ? 'Active Risks & Impediments' : 'Riscos e Impedimentos'}
                  </h4>
                  {focusMetrics.risks.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center border border-dashed border-[color:var(--studio-border)]/40 rounded-lg p-4">
                      <p className="text-xs text-[var(--studio-muted)] italic text-center">
                        {locale === 'en' ? 'No risks detected in this range.' : 'Nenhum risco detectado no período.'}
                      </p>
                    </div>
                  ) : (
                    <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                      {focusMetrics.risks.map((r, i) => (
                        <div key={i} className="rounded border border-amber-500/10 bg-amber-500/5 p-2 text-[10px] flex flex-col gap-0.5">
                          <div className="flex items-center justify-between font-bold text-amber-400">
                            <span className="truncate max-w-[150px]">{r.risk}</span>
                            <span className="text-[7px] px-1 rounded bg-amber-500/20 text-amber-300 uppercase shrink-0">{r.impact}</span>
                          </div>
                          <p className="text-[8px] text-[var(--studio-subtle)] truncate">{r.meetingTitle}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </article>

            {/* Card 4: Meeting Categories */}
            <article className="rounded-xl border border-[color:var(--studio-border)] bg-[var(--studio-card)] glass-card p-5 dashboard-radial-glow flex flex-col h-[350px]">
              <div className="mb-4 flex items-center justify-between border-b border-[color:var(--studio-border)] pb-3 shrink-0">
                <div className="flex items-center gap-2">
                  <MaterialIcon name="category" className="text-base text-[var(--studio-primary)]" />
                  <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--studio-text)]">
                    {locale === 'en' ? 'Meeting Categories' : 'Distribuição de Reuniões'}
                  </h3>
                </div>
              </div>

              {categoryTimeBreakdown.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-sm text-[var(--studio-muted)]">
                  {locale === 'en' ? 'No category data.' : 'Sem dados de categorias.'}
                </div>
              ) : (
                <div className="flex-1 flex flex-col justify-between overflow-hidden">
                  {/* Category breakdown bar charts */}
                  <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                    {categoryTimeBreakdown.map((stat, index) => {
                      const isTargetType = stat.name.toLowerCase().includes('daily') || stat.name.toLowerCase().includes('1:1')
                      const colorClass = isTargetType ? 'from-[var(--studio-primary)] to-emerald-400' : 'from-[var(--studio-secondary)] to-violet-400'
                      
                      return (
                        <div key={stat.name} className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-semibold">
                            <span className="text-[var(--studio-text)] flex items-center gap-1 shrink-0 truncate max-w-[120px]">
                              <span className={cn("h-2 w-2 rounded-full bg-gradient-to-r shrink-0", colorClass)} />
                              {stat.name}
                            </span>
                            <span className="text-[var(--studio-muted)] font-mono text-[10px] text-right truncate">
                              {formatDashboardTime(stat.duration)} • {stat.count} {locale === 'en' ? 'sessions' : 'sessões'} ({stat.percentage}%)
                            </span>
                          </div>
                          <div className="h-2 w-full bg-[var(--studio-panel-strong)] rounded-full overflow-hidden border border-[color:var(--studio-border)]/50">
                            <div 
                              className={cn("h-full bg-gradient-to-r rounded-full transition-all duration-500", colorClass)}
                              style={{ width: `${stat.percentage}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Summary insight note */}
                  <div className="rounded-lg bg-[var(--studio-panel)] p-3 border border-[color:var(--studio-border)] shrink-0 mt-3">
                    <h4 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--studio-text)] mb-1 flex items-center gap-1">
                      <MaterialIcon name="psychology" className="text-xs text-[var(--studio-primary)]" />
                      {locale === 'en' ? 'AI Health Insight' : 'Insight de Produtividade'}
                    </h4>
                    <p className="text-[10px] text-[var(--studio-muted)] leading-tight">
                      {locale === 'en' 
                        ? `Focus on ${categoryTimeBreakdown[0]?.name || 'General'} meetings. Efficiency average: ${averageEfficiency || 'N/A'}. Decisions count: ${totalDecisions}.` 
                        : `Foco predominante em "${categoryTimeBreakdown[0]?.name || 'Geral'}". Eficiência geral média de ${averageEfficiency || 'N/A'}. Total de ${totalDecisions} decisões.`
                      }
                    </p>
                  </div>
                </div>
              )}
            </article>

            {/* Card 5: Quality Index */}
            <article className="rounded-xl border border-[color:var(--studio-border)] bg-[var(--studio-card)] glass-card p-5 dashboard-radial-glow flex flex-col h-[350px]">
              <div className="mb-4 flex items-center justify-between border-b border-[color:var(--studio-border)] pb-3 shrink-0">
                <div className="flex items-center gap-2">
                  <MaterialIcon name="analytics" className="text-base text-[var(--studio-secondary)]" />
                  <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--studio-text)]">
                    {locale === 'en' ? 'Quality Index' : 'Índice de Qualidade'}
                  </h3>
                </div>
              </div>
              
              <div className="flex-1 flex flex-col items-center justify-center">
                {/* Average Quality Gauge */}
                <div className="flex flex-col items-center justify-center text-center p-4 border border-[color:var(--studio-border)]/40 rounded-xl bg-[var(--studio-panel)]/30 w-full max-w-[180px]">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--studio-subtle)] mb-2.5">
                    {locale === 'en' ? 'Avg Quality' : 'Média Geral'}
                  </span>
                  
                  <div className="relative flex items-center justify-center h-24 w-24">
                    <svg className="absolute transform -rotate-90 w-full h-full" viewBox="0 0 100 100">
                      <circle 
                        cx="50" cy="50" r="40" 
                        stroke="rgba(15,23,42,0.06)" strokeWidth="8" fill="transparent" 
                        className="dark:stroke-white/5"
                      />
                      <circle 
                        cx="50" cy="50" r="40" 
                        stroke="var(--studio-secondary)" strokeWidth="8" fill="transparent" 
                        strokeDasharray={`${2 * Math.PI * 40}`}
                        strokeDashoffset={`${2 * Math.PI * 40 * (1 - (parseInt(averageQuality || '75') / 100))}`}
                        className="transition-all duration-1000"
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="text-lg font-bold font-mono text-[var(--studio-text)]">
                      {averageQuality || '75%'}
                    </div>
                  </div>
                </div>
              </div>
            </article>

            {/* Card 6: Hot Topics */}
            <article className="rounded-xl border border-[color:var(--studio-border)] bg-[var(--studio-card)] glass-card p-5 dashboard-radial-glow flex flex-col h-[350px]">
              <div className="mb-4 flex items-center justify-between border-b border-[color:var(--studio-border)] pb-3 shrink-0">
                <div className="flex items-center gap-2">
                  <MaterialIcon name="tag" className="text-base text-[var(--studio-primary)]" />
                  <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--studio-text)]">
                    {locale === 'en' ? 'Hot Topics' : 'Tópicos Quentes'}
                  </h3>
                </div>
              </div>
              
              <div className="flex-1 flex flex-col justify-between overflow-hidden">
                <h4 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--studio-subtle)] mb-2 shrink-0">
                  {locale === 'en' ? 'Most Discussed Topics' : 'Nuvem de Tópicos Recorrentes'}
                </h4>
                {hotTopics.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center">
                    <p className="text-xs text-[var(--studio-muted)] italic">
                      {locale === 'en' ? 'No topics analyzed yet.' : 'Nenhum tópico analisado ainda.'}
                    </p>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto flex flex-wrap gap-1.5 p-3 rounded-lg border border-[color:var(--studio-border)] bg-[var(--studio-panel)]/20 items-center content-center">
                    {hotTopics.slice(0, 10).map((topic, idx) => {
                      const sizes = ['text-xs font-semibold px-2 py-1', 'text-[11px] font-medium px-1.5 py-0.5', 'text-[10px] px-1 py-0.5']
                      const sizeClass = idx < 2 ? sizes[0] : idx < 5 ? sizes[1] : sizes[2]
                      const variantColors = [
                        'bg-[var(--studio-primary-soft)] border-[var(--studio-primary-border)] text-[var(--studio-primary)] shadow-glow-primary',
                        'bg-[var(--studio-secondary-soft)] border-[var(--studio-secondary-border)] text-[var(--studio-secondary)] shadow-glow-secondary',
                        'bg-cyan-500/5 border-cyan-500/20 text-cyan-400',
                        'bg-amber-500/5 border-amber-500/20 text-amber-400',
                        'bg-zinc-500/5 border-zinc-500/20 text-[var(--studio-text)]'
                      ]
                      const colorClass = variantColors[idx % variantColors.length]
                      
                      return (
                        <span 
                          key={topic.name} 
                          className={cn(
                            "rounded border transition-all duration-300 hover:scale-105 select-none",
                            sizeClass,
                            colorClass
                          )}
                          title={`${topic.count} ${topic.count === 1 ? 'mencionada' : 'mencionadas'}`}
                        >
                          {topic.name}
                          <span className="ml-1 font-mono text-[8px] opacity-65">(+{topic.count})</span>
                        </span>
                      )
                    })}
                  </div>
                )}
              </div>
            </article>
          </div>
        </div>
      ) : (
        /* RENDER VIEW MODE: READER (LIST + DETAIL TAB PANEL) */
        <div className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
          {/* Left panel: list of meetings */}
          <div className="space-y-3">
            {processingMeeting && (
              <article
                className={cn(
                  "rounded-xl border p-4 transition-all duration-300 cursor-pointer hover:border-[color:var(--studio-primary-border)] hover:bg-[var(--studio-panel)]/40",
                  selectedMeetingId === processingMeeting.id 
                    ? "border-[color:var(--studio-primary-border)] bg-[var(--studio-panel)] shadow-glow-primary" 
                    : "border-[color:var(--studio-border)] bg-[var(--studio-card)]/60 animate-pulse"
                )}
                onClick={() => setSelectedMeetingId(processingMeeting.id)}
              >
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-semibold text-[var(--studio-text)] flex items-center gap-2">
                      <MaterialIcon name="sync" className="animate-spin text-base text-[var(--studio-primary)]" />
                      {processingMeeting.title}
                    </h3>
                    <p className="mt-1 text-xs text-[var(--studio-muted)]">
                      {locale === 'en' ? 'AI is analyzing and summarizing audio...' : 'IA analisando e resumindo áudio...'}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[var(--studio-subtle)]">
                      <span className="flex items-center gap-1">
                        <MaterialIcon name="calendar_month" className="text-sm" />
                        {formatDate(processingMeeting.date)}
                      </span>
                      <span className="flex items-center gap-1">
                        <MaterialIcon name="schedule" className="text-sm" />
                        {formatDuration(processingMeeting.duration)}
                      </span>
                      <span className="rounded bg-[var(--studio-primary-soft)] border border-[var(--studio-primary-border)] px-1.5 py-0.5 text-[10px] uppercase font-bold tracking-wider text-[var(--studio-primary)]">
                        {locale === 'en' ? 'Processing' : 'Processando'}
                      </span>
                    </div>
                  </div>
                </div>
              </article>
            )}

            {filteredMeetings.map((meeting) => {
              const isSelected = selectedMeeting?.id === meeting.id

              return (
                <article
                  key={meeting.id}
                  className={cn(
                    'rounded-xl border border-[color:var(--studio-border)] bg-[var(--studio-card)] p-4 transition-all duration-300 hover:border-[color:var(--studio-primary-border)] hover:bg-[var(--studio-panel)]/40',
                    isSelected && 'border-[color:var(--studio-primary-border)] bg-[var(--studio-panel)] shadow-glow-primary'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedMeetingId(meeting.id)}
                      className="min-w-0 flex-1 text-left cursor-pointer"
                    >
                      <h3 className="truncate text-sm font-semibold text-[var(--studio-text)] hover:text-[var(--studio-primary)]">
                        {meeting.summary.title}
                      </h3>
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[var(--studio-muted)]">
                        {meeting.summary.overview}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[var(--studio-subtle)]">
                        <span className="flex items-center gap-1">
                          <MaterialIcon name="calendar_month" className="text-sm" />
                          {formatDate(meeting.date)}
                        </span>
                        <span className="flex items-center gap-1">
                          <MaterialIcon name="schedule" className="text-sm" />
                          {formatDuration(meeting.duration)}
                        </span>
                        {meeting.summary.tags?.meetingType && (
                          <span className="rounded bg-[var(--studio-card-alt)] px-1.5 py-0.5 text-[10px] uppercase font-semibold tracking-wider text-[var(--studio-secondary)]">
                            {meeting.summary.tags.meetingType}
                          </span>
                        )}
                      </div>
                    </button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={t.history.actionsMenu(meeting.summary.title)}
                          className="h-8 w-8 p-0 text-[var(--studio-muted)] hover:bg-[var(--studio-panel)] hover:text-[var(--studio-text)] cursor-pointer"
                        >
                          <MaterialIcon name="more_vert" className="text-base" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleDownload(meeting)}>
                          <MaterialIcon name="download" className="mr-2 text-base" />
                          {t.history.downloadTxt}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(meeting.id)} className="text-red-600">
                          <MaterialIcon name="delete" className="mr-2 text-base" />
                          {t.history.delete}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </article>
              )
            })}

            {filteredMeetings.length === 0 && (
              <div className="rounded-xl border border-[color:var(--studio-border)] bg-[var(--studio-card)] py-8 text-center glass-card">
                <p className="text-[var(--studio-muted)] text-sm">
                  {searchTerm ? t.history.noSearchResults(searchTerm) : t.history.noFilterResults}
                </p>
              </div>
            )}
          </div>

          {/* Right panel: reading detail */}
          <article className="min-h-[520px] rounded-xl border border-[color:var(--studio-border)] bg-[var(--studio-card)] glass-card p-5 shadow-xl shadow-black/10 transition-all duration-300">
            {selectedMeeting ? (
              <div className="space-y-4">
                {/* Header */}
                <header className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between border-b border-[color:var(--studio-border)] pb-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--studio-secondary)]">
                        {t.history.readingPanel}
                      </span>
                      {selectedMeeting.summary.tags?.meetingType && (
                        <Badge variant="outline" className="border-[var(--studio-primary-border)] bg-[var(--studio-primary-soft)] text-[var(--studio-text)] uppercase text-[9px] tracking-wider font-bold">
                          {selectedMeeting.summary.tags.meetingType}
                        </Badge>
                      )}
                      {selectedMeeting.summary.tags?.priority && (
                        <Badge variant="outline" className="border-red-500/20 bg-red-500/10 text-red-400 uppercase text-[9px] tracking-wider font-bold">
                          {selectedMeeting.summary.tags.priority}
                        </Badge>
                      )}

                      {/* Company Badge / Inline Editor */}
                      {isEditingCompany ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={editCompanyValue}
                            onChange={(e) => setEditCompanyValue(e.target.value)}
                            className="h-6 bg-[var(--studio-panel)] text-[var(--studio-text)] border border-[color:var(--studio-border)] rounded px-1.5 text-[9px] focus:outline-none focus:border-[var(--studio-primary)] font-semibold"
                            placeholder={locale === 'en' ? 'Company' : 'Empresa'}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveCompany()
                              if (e.key === 'Escape') setIsEditingCompany(false)
                            }}
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={handleSaveCompany}
                            className="h-5 w-5 text-green-400 hover:text-green-300 hover:bg-green-500/10 cursor-pointer"
                          >
                            <MaterialIcon name="check" className="text-[10px]" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setIsEditingCompany(false)}
                            className="h-5 w-5 text-red-400 hover:text-red-300 hover:bg-red-500/10 cursor-pointer"
                          >
                            <MaterialIcon name="close" className="text-[10px]" />
                          </Button>
                        </div>
                      ) : selectedMeeting.company ? (
                        <Badge
                          variant="outline"
                          onClick={() => {
                            setIsEditingCompany(true)
                            setEditCompanyValue(selectedMeeting.company || '')
                          }}
                          className="border-[var(--studio-secondary-border)] bg-[var(--studio-secondary-soft)] text-[var(--studio-text)] uppercase text-[9px] tracking-wider font-bold cursor-pointer hover:opacity-80 transition-all flex items-center gap-1"
                          title={locale === 'en' ? 'Click to edit company' : 'Clique para editar a empresa'}
                        >
                          <MaterialIcon name="business" className="text-[10px]" />
                          {selectedMeeting.company}
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          onClick={() => {
                            setIsEditingCompany(true)
                            setEditCompanyValue('')
                          }}
                          className="border-dashed border-[color:var(--studio-border)] bg-transparent text-[var(--studio-muted)] uppercase text-[9px] tracking-wider font-bold cursor-pointer hover:border-[var(--studio-secondary)] hover:text-[var(--studio-secondary)] transition-all flex items-center gap-1"
                          title={locale === 'en' ? 'Click to associate company' : 'Clique para associar empresa'}
                        >
                          <MaterialIcon name="add" className="text-[10px]" />
                          {locale === 'en' ? 'Associate Company' : 'Associar Empresa'}
                        </Badge>
                      )}
                    </div>

                    {/* Title Editor */}
                    {isEditingTitle ? (
                      <div className="flex items-center gap-2 mt-2 w-full max-w-xl">
                        <input
                          type="text"
                          value={editTitleValue}
                          onChange={(e) => setEditTitleValue(e.target.value)}
                          className="flex-1 bg-[var(--studio-panel)] text-[var(--studio-text)] border border-[color:var(--studio-border)] rounded-lg px-3 py-1.5 text-lg font-bold focus:outline-none focus:border-[var(--studio-primary)]"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveTitle()
                            if (e.key === 'Escape') setIsEditingTitle(false)
                          }}
                        />
                        <Button
                          size="icon"
                          onClick={handleSaveTitle}
                          className="h-9 w-9 rounded-lg bg-[var(--studio-primary)] text-zinc-950 hover:opacity-90 flex items-center justify-center cursor-pointer font-bold shrink-0"
                          title={locale === 'en' ? 'Save Title' : 'Salvar Título'}
                        >
                          <MaterialIcon name="check" className="text-base" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => setIsEditingTitle(false)}
                          className="h-9 w-9 rounded-lg border-[color:var(--studio-border)] bg-[var(--studio-panel)] text-[var(--studio-text)] hover:bg-[var(--studio-card-alt)] flex items-center justify-center cursor-pointer shrink-0"
                          title={locale === 'en' ? 'Cancel' : 'Cancelar'}
                        >
                          <MaterialIcon name="close" className="text-base" />
                        </Button>
                      </div>
                    ) : (
                      <h3 className="text-xl font-bold text-[var(--studio-text)] mt-2 flex items-center gap-2 group">
                        <span>{selectedMeeting.summary.title}</span>
                        <button
                          onClick={() => {
                            setIsEditingTitle(true)
                            setEditTitleValue(selectedMeeting.summary.title || selectedMeeting.title || '')
                          }}
                          className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-[var(--studio-muted)] hover:text-[var(--studio-primary)] transition-all p-1 rounded cursor-pointer"
                          title={locale === 'en' ? 'Edit Title' : 'Editar Título'}
                        >
                          <MaterialIcon name="edit" className="text-sm" />
                        </button>
                      </h3>
                    )}

                    <p className="text-xs text-[var(--studio-subtle)] mt-1">
                      {formatDate(selectedMeeting.date)} • {formatDuration(selectedMeeting.duration)} • {selectedMeeting.providerName} ({selectedMeeting.modelName})
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {onReprocess && selectedMeeting.audioBlob && (
                      <Button
                        onClick={() => onReprocess(selectedMeeting)}
                        variant="outline"
                        className="gap-2 h-9 text-xs border-[color:var(--studio-border)] bg-[var(--studio-panel)] text-[var(--studio-text)] hover:bg-[var(--studio-card-alt)] hover:text-[var(--studio-primary)] hover:border-[var(--studio-primary-border)]/40 cursor-pointer"
                      >
                        <MaterialIcon name="psychology" className="text-base text-[var(--studio-primary)]" />
                        {locale === 'en' ? 'Reprocess with AI' : 'Reprocessar com IA'}
                      </Button>
                    )}

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          className="gap-2 h-9 text-xs border-[color:var(--studio-border)] bg-[var(--studio-panel)] text-[var(--studio-text)] hover:bg-[var(--studio-card-alt)] cursor-pointer"
                        >
                          <MaterialIcon name="share" className="text-base" />
                          {locale === 'en' ? 'Export & Share' : 'Exportar e Compartilhar'}
                          <MaterialIcon name="arrow_drop_down" className="text-sm" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56 border-[color:var(--studio-border)] bg-[var(--studio-card)] text-[var(--studio-text)]">
                        <DropdownMenuItem onClick={() => handleDownload(selectedMeeting)} className="gap-2 cursor-pointer hover:bg-[var(--studio-panel)]">
                          <MaterialIcon name="description" className="text-sm" />
                          {locale === 'en' ? 'Download Text (.txt)' : 'Baixar Texto (.txt)'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDownloadMarkdown(selectedMeeting)} className="gap-2 cursor-pointer hover:bg-[var(--studio-panel)]">
                          <MaterialIcon name="markdown" className="text-sm" />
                          {locale === 'en' ? 'Download Markdown (.md)' : 'Baixar Markdown (.md)'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDownloadHtml(selectedMeeting)} className="gap-2 cursor-pointer hover:bg-[var(--studio-panel)]">
                          <MaterialIcon name="html" className="text-sm" />
                          {locale === 'en' ? 'Download HTML (.html)' : 'Baixar HTML (.html)'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handlePrint()} className="gap-2 cursor-pointer hover:bg-[var(--studio-panel)]">
                          <MaterialIcon name="print" className="text-sm" />
                          {locale === 'en' ? 'Print Report (PDF)' : 'Imprimir Relatório (PDF)'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleCopySummary(selectedMeeting)} className="gap-2 cursor-pointer hover:bg-[var(--studio-panel)]">
                          <MaterialIcon name="content_copy" className="text-sm" />
                          {locale === 'en' ? 'Copy Summary text' : 'Copiar Minuta de Reunião'}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </header>

                {/* Custom Audio Player Card */}
                {audioUrl && (
                  <div className="audio-player mb-6 rounded-xl border border-[color:var(--studio-border)] bg-[var(--studio-panel-strong)] p-4 space-y-3">
                    <audio
                      ref={audioRef}
                      src={audioUrl}
                      onTimeUpdate={handleTimeUpdate}
                      onLoadedMetadata={handleLoadedMetadata}
                      onEnded={handleAudioEnded}
                      className="hidden"
                    />
                    
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--studio-secondary-soft)] text-[var(--studio-secondary)]">
                          <span className="material-symbols-rounded text-base">music_note</span>
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-[var(--studio-text)] truncate">{selectedMeeting.filename.replace('.txt', '.webm')}</p>
                          <p className="text-[10px] text-[var(--studio-muted)] uppercase tracking-wider">{locale === 'en' ? 'Meeting Recording' : 'Gravação da Reunião'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Download Audio Action */}
                        <a
                          href={audioUrl}
                          download={selectedMeeting.filename.replace('.txt', '.webm')}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[color:var(--studio-border)] bg-[var(--studio-panel)] text-[var(--studio-muted)] hover:text-[var(--studio-text)] hover:bg-[var(--studio-card-alt)] transition-colors cursor-pointer"
                          title={locale === 'en' ? 'Download audio' : 'Baixar áudio bruto'}
                        >
                          <span className="material-symbols-rounded text-base">download</span>
                        </a>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => skipTime(-10)}
                          className="h-8 w-8 rounded-full text-[var(--studio-muted)] hover:text-[var(--studio-text)] cursor-pointer"
                        >
                          <span className="material-symbols-rounded text-sm">replay_10</span>
                        </Button>
                        <Button
                          size="icon"
                          onClick={togglePlay}
                          className="h-9 w-9 rounded-full bg-[var(--studio-primary)] text-zinc-950 hover:opacity-90 flex items-center justify-center cursor-pointer font-bold shrink-0"
                        >
                          <span className="material-symbols-rounded material-symbols-filled text-base">{isPlaying ? 'pause' : 'play_arrow'}</span>
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => skipTime(10)}
                          className="h-8 w-8 rounded-full text-[var(--studio-muted)] hover:text-[var(--studio-text)] cursor-pointer"
                        >
                          <span className="material-symbols-rounded text-sm">forward_10</span>
                        </Button>
                      </div>

                      {/* Slider timeline */}
                      <div className="flex-1 flex items-center gap-2 min-w-0">
                        <span className="font-mono text-[10px] text-[var(--studio-muted)] select-none shrink-0 w-8 text-right">
                          {formatDuration(Math.floor(currentTime))}
                        </span>
                        <input
                          type="range"
                          min={0}
                          max={audioDuration || 100}
                          value={currentTime}
                          onChange={handleSeekChange}
                          className="flex-1 h-1 rounded-lg appearance-none cursor-pointer bg-[var(--studio-card-alt)] accent-[var(--studio-primary)] focus:outline-none"
                        />
                        <span className="font-mono text-[10px] text-[var(--studio-muted)] select-none shrink-0 w-8">
                          {formatDuration(Math.floor(audioDuration))}
                        </span>
                      </div>

                      {/* Playback speed selector */}
                      <div className="flex items-center gap-1 shrink-0 bg-[var(--studio-panel)] border border-[color:var(--studio-border)] rounded-lg p-0.5">
                        {([1, 1.25, 1.5, 2] as const).map((speed) => (
                          <button
                            key={speed}
                            onClick={() => changeSpeed(speed)}
                            className={cn(
                              "px-1.5 py-0.5 rounded text-[9px] font-bold transition-all cursor-pointer",
                              playbackSpeed === speed
                                ? "bg-[var(--studio-secondary-soft)] text-[var(--studio-secondary)]"
                                : "text-[var(--studio-muted)] hover:text-[var(--studio-text)]"
                            )}
                          >
                            {speed}x
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab selector */}
                <nav className="flex border-b border-[color:var(--studio-border)] pb-px gap-1">
                  <button
                    type="button"
                    onClick={() => setDetailTab('overview')}
                    className={cn(
                      "pb-3 pt-1 px-3 text-xs font-semibold border-b-2 cursor-pointer transition-all",
                      detailTab === 'overview'
                        ? "border-[var(--studio-primary)] text-[var(--studio-primary)]"
                        : "border-transparent text-[var(--studio-muted)] hover:text-[var(--studio-text)]"
                    )}
                  >
                    {locale === 'en' ? 'Overview' : 'Resumo Geral'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDetailTab('actions')}
                    className={cn(
                      "pb-3 pt-1 px-3 text-xs font-semibold border-b-2 cursor-pointer transition-all",
                      detailTab === 'actions'
                        ? "border-[var(--studio-primary)] text-[var(--studio-primary)]"
                        : "border-transparent text-[var(--studio-muted)] hover:text-[var(--studio-text)]"
                    )}
                  >
                    {isDaily ? (locale === 'en' ? 'Scrum Board' : 'Checklist Daily') : (locale === 'en' ? 'Actions & Tasks' : 'Ações e Tarefas')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDetailTab('metrics')}
                    className={cn(
                      "pb-3 pt-1 px-3 text-xs font-semibold border-b-2 cursor-pointer transition-all",
                      detailTab === 'metrics'
                        ? "border-[var(--studio-primary)] text-[var(--studio-primary)]"
                        : "border-transparent text-[var(--studio-muted)] hover:text-[var(--studio-text)]"
                    )}
                  >
                    {locale === 'en' ? 'Metrics & Participation' : 'Participação e Métricas'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDetailTab('transcript')}
                    className={cn(
                      "pb-3 pt-1 px-3 text-xs font-semibold border-b-2 cursor-pointer transition-all",
                      detailTab === 'transcript'
                        ? "border-[var(--studio-primary)] text-[var(--studio-primary)]"
                        : "border-transparent text-[var(--studio-muted)] hover:text-[var(--studio-text)]"
                    )}
                  >
                    {locale === 'en' ? 'Transcript' : 'Transcrição'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDetailTab('integrations')}
                    className={cn(
                      "pb-3 pt-1 px-3 text-xs font-semibold border-b-2 cursor-pointer transition-all",
                      detailTab === 'integrations'
                        ? "border-[var(--studio-primary)] text-[var(--studio-primary)]"
                        : "border-transparent text-[var(--studio-muted)] hover:text-[var(--studio-text)]"
                    )}
                  >
                    {locale === 'en' ? 'Integrations' : 'Integrações'}
                  </button>
                </nav>

                {/* TAB CONTENT: OVERVIEW */}
                {detailTab === 'overview' && (() => {
                  const ALL_SECTIONS = [
                    { id: 'summary', label: locale === 'en' ? 'Executive Summary' : 'Resumo Executivo', icon: 'description' },
                    { id: 'summaryOneLine', label: locale === 'en' ? 'One-Sentence Summary' : 'Resumo em Uma Sentença', icon: 'bolt' },
                    { id: 'timeline', label: t.history.timeline, icon: 'timeline' },
                    { id: 'agendaAlignment', label: locale === 'en' ? 'Agenda & Objectives' : 'Pauta e Objetivos', icon: 'rule' },
                    { id: 'criticalDecisions', label: locale === 'en' ? 'Critical Decisions' : 'Decisões Críticas', icon: 'gavel' },
                    { id: 'actionPlan', label: locale === 'en' ? 'Detailed Action Plan' : 'Plano de Ação Detalhado', icon: 'playlist_add_check' },
                    { id: 'risksAndBlockers', label: locale === 'en' ? 'Riscos e Impedimentos' : 'Riscos e Impedimentos', icon: 'warning' },
                    { id: 'roadmap', label: locale === 'en' ? 'Roadmap & Cronograma' : 'Roadmap e Cronograma', icon: 'calendar_today' },
                    { id: 'tags', label: t.history.categories, icon: 'sell' },
                    { id: 'technicalGlossary', label: locale === 'en' ? 'Technical Glossary' : 'Glossário Técnico', icon: 'translate' },
                    { id: 'toolsMentioned', label: locale === 'en' ? 'Systems & Tools' : 'Ferramentas e Links', icon: 'link' },
                    { id: 'openQuestions', label: locale === 'en' ? 'Open Questions' : 'Perguntas em Aberto', icon: 'help_outline' },
                    { id: 'consensusAnalysis', label: locale === 'en' ? 'Consensus Analysis' : 'Nível de Consenso', icon: 'handshake' },
                    { id: 'meetingEfficiencyAnalysis', label: locale === 'en' ? 'Time Efficiency' : 'Eficiência de Tempo', icon: 'hourglass_empty' },
                    { id: 'quotesAndHighlights', label: locale === 'en' ? 'Key Quotes' : 'Citações em Destaque', icon: 'format_quote' },
                    { id: 'overallSentiment', label: locale === 'en' ? 'Climate & Sentiment' : 'Clima e Sentimento', icon: 'mood' },
                    { id: 'conversationalMetrics', label: locale === 'en' ? 'Voice Metrics' : 'Métricas de Voz', icon: 'settings_voice' },
                    { id: 'priorityMatrix', label: locale === 'en' ? 'Eisenhower Matrix' : 'Matriz Eisenhower', icon: 'grid_view' },
                    { id: 'nextAgenda', label: locale === 'en' ? 'Suggested Next Agenda' : 'Pauta Próxima Reunião', icon: 'next_plan' },
                    { id: 'individualDevelopment', label: locale === 'en' ? 'Individual Feedback' : 'Feedback Individual', icon: 'psychology' },
                    { id: 'topicBreakdown', label: locale === 'en' ? 'Time Allocation' : 'Alocação de Tempo', icon: 'pie_chart' },
                    { id: 'energyAndHumor', label: locale === 'en' ? 'Energy Fluctuation' : 'Flutuação de Energia', icon: 'insights' },
                    { id: 'meetingQualityScore', label: locale === 'en' ? 'Quality Score' : 'Índice de Qualidade', icon: 'verified' }
                  ]

                  return (
                    <div className="space-y-4 pt-2">
                      {/* 1:1 Special Summary Header */}
                      {isOneOnOne && (
                        <div className="rounded-lg border border-[var(--studio-secondary-border)] bg-[var(--studio-secondary-soft)] p-4">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--studio-secondary)] flex items-center gap-1">
                            <MaterialIcon name="person" className="text-base" />
                            {locale === 'en' ? '1:1 Collaborator Profile' : 'Painel do Colaborador (1:1)'}
                          </h4>
                          <p className="text-sm font-semibold text-[var(--studio-text)] mt-2">
                            {locale === 'en' ? 'Discussion focus & growth targets' : 'Foco de desenvolvimento discutido nesta sessão'}
                          </p>
                          <ul className="mt-2 space-y-1 text-xs text-[var(--studio-muted)]">
                            <li>• <strong>Sentimento:</strong> {selectedMeeting.summary.insights?.sentiment || 'Neutro'}</li>
                            <li>• <strong>Resultado:</strong> {selectedMeeting.summary.insights?.outcome || 'Alinhado'}</li>
                          </ul>
                        </div>
                      )}

                      {/* Visibility Configuration Bar */}
                      <div className="flex items-center justify-between bg-[var(--studio-panel)]/40 p-3 rounded-lg border border-[color:var(--studio-border)] mb-4">
                        <div className="flex items-center gap-2">
                          <MaterialIcon name="analytics" className="text-[var(--studio-primary)] text-sm" />
                          <span className="text-[11px] font-semibold text-[var(--studio-text)]">
                            {locale === 'en' ? 'Super Report Panel (21 Analytical Categories)' : 'Painel de Super Relatório (21 Categorias Analíticas)'}
                          </span>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs border-[color:var(--studio-border)] bg-[var(--studio-panel-strong)] text-[var(--studio-text)] hover:bg-[var(--studio-card-alt)] cursor-pointer gap-1.5"
                            >
                              <MaterialIcon name="visibility" className="text-xs" />
                              {locale === 'en' ? 'Visibility' : 'Visibilidade'}
                              <span className="rounded-full bg-[var(--studio-primary)] text-zinc-950 font-bold px-1.5 py-0.5 text-[10px]">
                                {21 - hiddenSections.length}
                              </span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-64 max-h-[380px] overflow-y-auto border-[color:var(--studio-border)] bg-[var(--studio-card)] text-[var(--studio-text)] shadow-xl">
                            <div className="px-2 py-1.5 border-b border-[color:var(--studio-border)] flex items-center justify-between">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--studio-muted)]">
                                {locale === 'en' ? 'Show/Hide Sections' : 'Exibir/Ocultar Seções'}
                              </span>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => setHiddenSections([])}
                                  className="text-[9px] font-bold text-[var(--studio-primary)] hover:underline cursor-pointer"
                                >
                                  {locale === 'en' ? 'All' : 'Todas'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setHiddenSections(ALL_SECTIONS.map(s => s.id))}
                                  className="text-[9px] font-bold text-red-400 hover:underline cursor-pointer"
                                >
                                  {locale === 'en' ? 'None' : 'Nenhuma'}
                                </button>
                              </div>
                            </div>
                            {ALL_SECTIONS.map((sec) => {
                              const isVisible = !hiddenSections.includes(sec.id)
                              return (
                                <DropdownMenuItem
                                  key={sec.id}
                                  onClick={(e) => {
                                    e.preventDefault()
                                    toggleSectionVisibility(sec.id)
                                  }}
                                  className="gap-2 cursor-pointer hover:bg-[var(--studio-panel)] flex items-center justify-between py-1 px-2"
                                >
                                  <div className="flex items-center gap-2">
                                    <MaterialIcon name={sec.icon} className="text-xs text-[var(--studio-muted)]" />
                                    <span className="text-xs">{sec.label}</span>
                                  </div>
                                  {isVisible ? (
                                    <MaterialIcon name="check_box" className="text-base text-[var(--studio-primary)]" />
                                  ) : (
                                    <MaterialIcon name="check_box_outline_blank" className="text-base text-[var(--studio-muted)]" />
                                  )}
                                </DropdownMenuItem>
                              )
                            })}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* 21 Collapsible Sections List */}
                      <div className="space-y-3">
                        {ALL_SECTIONS.map((sec) => {
                          if (hiddenSections.includes(sec.id)) return null

                          // Check if data is present for this section before rendering
                          const hasData = checkSectionData(selectedMeeting.summary, sec.id)
                          if (!hasData) return null

                          const isCollapsed = collapsedSections[sec.id] || false

                          return (
                            <div key={sec.id} className="rounded-lg border border-[var(--studio-border)] bg-[var(--studio-card-alt)] overflow-hidden shadow-sm transition-all duration-300">
                              {/* Header */}
                              <div 
                                onClick={() => toggleSectionCollapse(sec.id)}
                                className="flex items-center justify-between p-3 bg-[var(--studio-panel)]/30 cursor-pointer hover:bg-[var(--studio-panel)]/60 select-none"
                              >
                                <div className="flex items-center gap-2">
                                  <MaterialIcon name={sec.icon} className="text-xs text-[var(--studio-primary)]" />
                                  <h4 className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--studio-text)]">
                                    {sec.label}
                                  </h4>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      toggleSectionVisibility(sec.id)
                                    }}
                                    className="text-[var(--studio-muted)] hover:text-red-400 p-1 cursor-pointer transition-colors"
                                    title={locale === 'en' ? 'Hide category' : 'Ocultar categoria'}
                                  >
                                    <MaterialIcon name="visibility_off" className="text-[10px]" />
                                  </button>
                                  <MaterialIcon name={isCollapsed ? "expand_more" : "expand_less"} className="text-xs text-[var(--studio-muted)]" />
                                </div>
                              </div>

                              {/* Content */}
                              {!isCollapsed && (
                                <div className="p-4 bg-[var(--studio-card)]/50 border-t border-[var(--studio-border)]/40 space-y-3">
                                  {renderSectionContent(selectedMeeting, sec.id, locale, meName, filterMyTasks, setFilterMyTasks)}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })()}

                {/* TAB CONTENT: ACTIONS & CHECKLISTS (WITH SCROUM/DAILY & 1:1 CUSTOMIZATIONS) */}
                {detailTab === 'actions' && (
                  <div className="space-y-4 pt-2">
                    {/* Decisions block at the top of the actions tab */}
                    {selectedMeeting.summary.decisions && selectedMeeting.summary.decisions.length > 0 && (
                      <div className="rounded-lg border border-[var(--studio-secondary-border)] bg-[var(--studio-secondary-soft)]/50 p-4 space-y-2 mb-2">
                        <h4 className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--studio-secondary)] flex items-center gap-1.5">
                          <MaterialIcon name="gavel" className="text-base" />
                          {locale === 'en' ? 'Key Decisions Agreed' : 'Decisões em Destaque'}
                        </h4>
                        <ul className="space-y-1.5 mt-2">
                          {selectedMeeting.summary.decisions.map((decision, index) => (
                            <li key={index} className="flex items-start gap-2 text-sm text-[var(--studio-text)]">
                              <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[var(--studio-secondary)]" />
                              <span>{decision}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Daily Scrum Layout */}
                    {isDaily ? (
                      <div className="space-y-4">
                        <div className="rounded-lg border border-[var(--studio-primary-border)] bg-[var(--studio-primary-soft)] p-4">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--studio-primary)] flex items-center gap-1.5">
                            <MaterialIcon name="route" className="text-base" />
                            {locale === 'en' ? 'Daily Work Tracker' : 'Acompanhamento Scrum (Daily)'}
                          </h4>
                          <p className="text-xs text-[var(--studio-muted)] mt-1">
                            {locale === 'en' 
                              ? 'Interactive list of scrum tasks extracted from this meeting. States are saved locally.'
                              : 'Lista interativa de tarefas e impedimentos extraídos desta reunião. O progresso é salvo localmente.'
                            }
                          </p>
                        </div>

                        <div className="flex items-center justify-between gap-2 border-t border-[var(--studio-border)]/40 pt-3">
                          <p className="text-[11px] text-[var(--studio-muted)]">
                            {locale === 'en' ? 'Track task completions and blockages.' : 'Monitore a conclusão de tarefas e impedimentos.'}
                          </p>
                          {meName && (
                            <button
                              type="button"
                              onClick={() => setFilterMyTasks(prev => !prev)}
                              className={cn(
                                "text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded border flex items-center gap-1 cursor-pointer transition-all",
                                filterMyTasks
                                  ? "bg-[var(--studio-primary)] border-[var(--studio-primary)] text-zinc-950"
                                  : "border-[var(--studio-border)] text-[var(--studio-muted)] hover:text-[var(--studio-text)]"
                              )}
                            >
                              <MaterialIcon name="person" className="text-[10px]" filled={filterMyTasks} />
                              {locale === 'en' ? 'My Tasks Only' : 'Apenas Minhas Tarefas'}
                            </button>
                          )}
                        </div>

                        {(() => {
                          const displayedActions = selectedMeeting.summary.actionItems
                            .map((action, originalIndex) => ({ action, originalIndex }))
                            .filter(({ action }) => {
                              if (!filterMyTasks || !meName) return true
                              const { responsible } = parseActionResponsibility(action)
                              return (
                                (responsible && responsible.toLowerCase() === meName.toLowerCase()) ||
                                (!responsible && action.toLowerCase().includes(meName.toLowerCase())) ||
                                (responsible && responsible.toLowerCase() === 'eu') ||
                                (responsible && responsible.toLowerCase() === 'me')
                              )
                            })

                          if (displayedActions.length === 0) {
                            return (
                              <p className="text-sm text-[var(--studio-muted)] italic py-4 text-center">
                                {locale === 'en' ? 'No sprint actions found matching filter.' : 'Nenhuma tarefa correspondente encontrada.'}
                              </p>
                            )
                          }

                          return (
                            <div className="space-y-2.5">
                              {displayedActions.map(({ action, originalIndex }) => {
                                const itemKey = `daily-${originalIndex}`
                                const isCompleted = checklistState[`${selectedMeeting.id}-${itemKey}`] || false
                                
                                const { cleanAction, responsible } = parseActionResponsibility(action)
                                
                                // Detect potential blockers/impediments dynamically
                                const isBlocker = cleanAction.toLowerCase().includes('impedimento') || 
                                                  cleanAction.toLowerCase().includes('bloque') || 
                                                  cleanAction.toLowerCase().includes('trava') || 
                                                  cleanAction.toLowerCase().includes('block')

                                return (
                                  <div 
                                    key={originalIndex} 
                                    className={cn(
                                      "flex items-start gap-3 rounded-lg border p-3 bg-[var(--studio-panel)]/40 transition-all duration-300",
                                      isCompleted 
                                        ? "border-emerald-500/10 bg-emerald-500/5 opacity-80" 
                                        : isBlocker 
                                          ? "border-red-500/20 bg-red-500/5 shadow-inner" 
                                          : "border-[color:var(--studio-border)]"
                                    )}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => toggleChecklistItem(selectedMeeting.id, itemKey)}
                                      className={cn(
                                        "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors cursor-pointer",
                                        isCompleted 
                                          ? "bg-[var(--studio-primary)] border-[var(--studio-primary)] text-zinc-950" 
                                          : "border-[var(--studio-subtle)] hover:border-[var(--studio-secondary)]"
                                      )}
                                    >
                                      {isCompleted && <MaterialIcon name="check" className="text-[11px] font-bold" />}
                                    </button>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <p className={cn("text-sm text-[var(--studio-text)] leading-tight font-medium", isCompleted && "line-through text-[var(--studio-muted)]")}>
                                          {cleanAction}
                                        </p>
                                        {responsible && (
                                          <Badge className="bg-[var(--studio-secondary-soft)] border-[var(--studio-secondary-border)] text-[var(--studio-secondary)] uppercase text-[8px] font-bold shrink-0">
                                            {responsible}
                                          </Badge>
                                        )}
                                        {isBlocker && !isCompleted && (
                                          <Badge variant="outline" className="border-red-500/20 bg-red-500/15 text-red-400 uppercase text-[8px] font-bold shrink-0">
                                            {locale === 'en' ? 'Blocker' : 'Bloqueio'}
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )
                        })()}
                      </div>
                    ) : (
                      /* Standard Action Items Layout */
                      <div className="space-y-4">
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--studio-subtle)]">
                              {locale === 'en' ? 'Action Items Checklist' : 'Ações e Próximos Passos'}
                            </h4>
                            {meName && (
                              <button
                                type="button"
                                onClick={() => setFilterMyTasks(prev => !prev)}
                                className={cn(
                                  "text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded border flex items-center gap-1 cursor-pointer transition-all",
                                  filterMyTasks
                                    ? "bg-[var(--studio-primary)] border-[var(--studio-primary)] text-zinc-950"
                                    : "border-[var(--studio-border)] text-[var(--studio-muted)] hover:text-[var(--studio-text)]"
                                )}
                              >
                                <MaterialIcon name="person" className="text-[10px]" filled={filterMyTasks} />
                                {locale === 'en' ? 'My Tasks Only' : 'Apenas Minhas Tarefas'}
                              </button>
                            )}
                          </div>

                          {(() => {
                            const displayedActions = selectedMeeting.summary.actionItems
                              .map((action, originalIndex) => ({ action, originalIndex }))
                              .filter(({ action }) => {
                                if (!filterMyTasks || !meName) return true
                                const { responsible } = parseActionResponsibility(action)
                                return (
                                  (responsible && responsible.toLowerCase() === meName.toLowerCase()) ||
                                  (!responsible && action.toLowerCase().includes(meName.toLowerCase())) ||
                                  (responsible && responsible.toLowerCase() === 'eu') ||
                                  (responsible && responsible.toLowerCase() === 'me')
                                )
                              })

                            if (displayedActions.length === 0) {
                              return (
                                <p className="text-sm text-[var(--studio-muted)] italic py-2">
                                  {locale === 'en' ? 'No actionable tasks found matching filter.' : 'Nenhuma tarefa correspondente encontrada.'}
                                </p>
                              )
                            }

                            return (
                              <div className="space-y-2">
                                {displayedActions.map(({ action, originalIndex }) => {
                                  const itemKey = `standard-${originalIndex}`
                                  const isCompleted = checklistState[`${selectedMeeting.id}-${itemKey}`] || false
                                  
                                  const { cleanAction, responsible } = parseActionResponsibility(action)
                                  
                                  return (
                                    <div 
                                      key={originalIndex} 
                                      className={cn(
                                        "flex items-start gap-3 rounded-lg border border-[color:var(--studio-border)] bg-[var(--studio-panel)]/40 p-3 transition-colors",
                                        isCompleted && "bg-emerald-500/5 border-emerald-500/10 opacity-70"
                                      )}
                                    >
                                      <button
                                        type="button"
                                        onClick={() => toggleChecklistItem(selectedMeeting.id, itemKey)}
                                        className={cn(
                                          "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors cursor-pointer",
                                          isCompleted 
                                            ? "bg-[var(--studio-primary)] border-[var(--studio-primary)] text-zinc-950" 
                                            : "border-[var(--studio-subtle)] hover:border-[var(--studio-secondary)]"
                                        )}
                                      >
                                        {isCompleted && <MaterialIcon name="check" className="text-[11px] font-bold" />}
                                      </button>
                                      <span className={cn("text-sm text-[var(--studio-text)] leading-tight flex flex-wrap items-center gap-2", isCompleted && "line-through text-[var(--studio-muted)]")}>
                                        <span>{cleanAction}</span>
                                        {responsible && (
                                          <Badge className="bg-[var(--studio-secondary-soft)] border-[var(--studio-secondary-border)] text-[var(--studio-secondary)] uppercase text-[8px] font-bold shrink-0">
                                            {responsible}
                                          </Badge>
                                        )}
                                      </span>
                                    </div>
                                  )
                                })}
                              </div>
                            )
                          })()}
                        </div>
                        {selectedMeeting.summary.keyPoints.length > 0 && (
                          <div className="border-t border-[color:var(--studio-border)] pt-4">
                            <h4 className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--studio-subtle)] mb-3">{t.history.keyPoints}</h4>
                            <ul className="space-y-2 bg-[var(--studio-panel)]/30 p-4 rounded-lg border border-[color:var(--studio-border)]/60">
                              {selectedMeeting.summary.keyPoints.map((point, index) => (
                                <li key={index} className="flex items-start gap-2.5 text-sm text-[var(--studio-muted)]">
                                  <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[var(--studio-secondary)]" />
                                  {point}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB CONTENT: METRICS & PARTICIPATION (SVG CHARTS) */}
                {detailTab === 'metrics' && (
                  <div className="space-y-5 pt-2">
                    {/* SVG Efficiency, Quality and Engagement gauges */}
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="rounded-lg border border-[color:var(--studio-border)] bg-[var(--studio-panel)]/30 p-4 flex flex-col items-center justify-center text-center">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--studio-subtle)] mb-3">
                          {t.history.efficiency}
                        </span>
                        
                        {/* Dynamic SVG Circular gauge */}
                        <div className="relative flex items-center justify-center h-28 w-28">
                          <svg className="absolute transform -rotate-90 w-full h-full" viewBox="0 0 100 100">
                            <circle 
                              cx="50" cy="50" r="40" 
                              stroke="rgba(15,23,42,0.06)" strokeWidth="8" fill="transparent" 
                              className="dark:stroke-white/5"
                            />
                            <circle 
                              cx="50" cy="50" r="40" 
                              stroke="var(--studio-primary)" strokeWidth="8" fill="transparent" 
                              strokeDasharray={`${2 * Math.PI * 40}`}
                              strokeDashoffset={`${2 * Math.PI * 40 * (1 - (parsePercentage(selectedMeeting.summary.metrics?.efficiency) || 75) / 100)}`}
                              className="transition-all duration-1000"
                              strokeLinecap="round"
                            />
                          </svg>
                          <div className="text-xl font-bold font-mono text-[var(--studio-text)]">
                            {selectedMeeting.summary.metrics?.efficiency || '75%'}
                          </div>
                        </div>
                      </div>

                      <div className="rounded-lg border border-[color:var(--studio-border)] bg-[var(--studio-panel)]/30 p-4 flex flex-col items-center justify-center text-center">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--studio-subtle)] mb-3">
                          {locale === 'en' ? 'Meeting Quality' : 'Qualidade da Reunião'}
                        </span>
                        
                        {/* Dynamic SVG Circular gauge for Quality */}
                        <div className="relative flex items-center justify-center h-28 w-28">
                          <svg className="absolute transform -rotate-90 w-full h-full" viewBox="0 0 100 100">
                            <circle 
                              cx="50" cy="50" r="40" 
                              stroke="rgba(15,23,42,0.06)" strokeWidth="8" fill="transparent" 
                              className="dark:stroke-white/5"
                            />
                            <circle 
                              cx="50" cy="50" r="40" 
                              stroke="var(--studio-secondary)" strokeWidth="8" fill="transparent" 
                              strokeDasharray={`${2 * Math.PI * 40}`}
                              strokeDashoffset={`${2 * Math.PI * 40 * (1 - (selectedMeeting.summary.meetingQualityScore || 75) / 100)}`}
                              className="transition-all duration-1000"
                              strokeLinecap="round"
                            />
                          </svg>
                          <div className="text-xl font-bold font-mono text-[var(--studio-text)]">
                            {selectedMeeting.summary.meetingQualityScore || 75}%
                          </div>
                        </div>
                      </div>

                      <div className="rounded-lg border border-[color:var(--studio-border)] bg-[var(--studio-panel)]/30 p-4 flex flex-col items-center justify-center text-center">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--studio-subtle)] mb-3">
                          {locale === 'en' ? 'Engagement Level' : 'Nível de Engajamento'}
                        </span>
                        <div className="rounded-full bg-[var(--studio-secondary-soft)] border border-[var(--studio-secondary-border)] text-[var(--studio-secondary)] px-4 py-2 font-bold text-sm shadow-glow-secondary mt-4">
                          {selectedMeeting.summary.metrics?.engagement || selectedMeeting.summary.insights?.engagement || 'Alto'}
                        </div>
                        <p className="text-[10px] text-[var(--studio-muted)] mt-4 uppercase tracking-[0.1em]">
                          {t.history.decisions}: <strong className="text-[var(--studio-text)]">{selectedMeeting.summary.metrics?.decisionsCount ?? selectedMeeting.summary.decisions?.length ?? 0}</strong>
                        </p>
                      </div>
                    </div>

                    {/* Participation Analysis - Horizontal Progress Bars */}
                    <div className="border-t border-[color:var(--studio-border)] pt-4 space-y-4">
                      <h4 className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--studio-subtle)]">
                        {t.history.participationAnalysis}
                      </h4>
                      
                      <div className="grid gap-4 bg-[var(--studio-panel)]/40 p-4 rounded-lg border border-[color:var(--studio-border)]">
                        {selectedMeeting.summary.participationAnalysis && selectedMeeting.summary.participationAnalysis.length > 0 ? (
                          selectedMeeting.summary.participationAnalysis.map((participant, index) => {
                            const pct = parsePercentage(participant.talkTime) || 0
                            const colors = [
                              'from-[var(--studio-primary)] to-emerald-400',
                              'from-[var(--studio-secondary)] to-violet-500',
                              'from-cyan-400 to-blue-500',
                              'from-amber-400 to-orange-500'
                            ]
                            const colorClass = colors[index % colors.length]
                            const isEditingThis = editingParticipantIdx === index

                            if (isEditingThis) {
                              return (
                                <div key={index} className="space-y-3 bg-[var(--studio-card-alt)] p-3 rounded-lg border border-[var(--studio-border)]">
                                  <div className="space-y-2">
                                    <div>
                                      <label className="text-[10px] text-[var(--studio-muted)] uppercase font-semibold">{locale === 'en' ? 'Name' : 'Nome'}</label>
                                      <input
                                        type="text"
                                        className="w-full text-xs rounded border border-[var(--studio-border)] bg-[var(--studio-bg)] text-[var(--studio-text)] px-2 py-1.5 focus:outline-none focus:border-[var(--studio-primary)]"
                                        value={editPartName}
                                        onChange={e => setEditPartName(e.target.value)}
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[10px] text-[var(--studio-muted)] uppercase font-semibold">{locale === 'en' ? 'Role/Job title' : 'Cargo/Função'}</label>
                                      <input
                                        type="text"
                                        className="w-full text-xs rounded border border-[var(--studio-border)] bg-[var(--studio-bg)] text-[var(--studio-text)] px-2 py-1.5 focus:outline-none focus:border-[var(--studio-primary)]"
                                        value={editPartRole}
                                        onChange={e => setEditPartRole(e.target.value)}
                                      />
                                    </div>
                                  </div>
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={cancelParticipantEdit}
                                      className="text-xs h-7 px-2 cursor-pointer"
                                    >
                                      {locale === 'en' ? 'Cancel' : 'Cancelar'}
                                    </Button>
                                    <Button
                                      size="sm"
                                      onClick={() => saveParticipantEdit(selectedMeeting.id, index)}
                                      className="text-xs h-7 px-2 bg-[var(--studio-primary)] text-zinc-950 hover:opacity-90 cursor-pointer"
                                    >
                                      {locale === 'en' ? 'Save' : 'Salvar'}
                                    </Button>
                                  </div>
                                </div>
                              )
                            }

                            // Calculate dynamic participant metrics
                            const pName = participant.participant.trim().toLowerCase()
                            const pTasks = selectedMeeting.summary.actionPlan?.filter(
                              a => a.assignee?.trim().toLowerCase() === pName
                            ) || []
                            const pFeedback = selectedMeeting.summary.individualDevelopment?.find(
                              i => i.name?.trim().toLowerCase() === pName
                            )
                            
                            let engagementLabel = locale === 'en' ? 'Spectator' : 'Espectador'
                            let engagementColor = 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                            
                            if (pct > 40) {
                              engagementLabel = locale === 'en' ? 'High Speaker' : 'Alta Fala'
                              engagementColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-glow-emerald/10'
                            } else if (pct >= 15) {
                              engagementLabel = locale === 'en' ? 'Balanced' : 'Equilibrado'
                              engagementColor = 'bg-[var(--studio-primary-soft)] text-[var(--studio-primary)] border-[var(--studio-primary-border)]'
                            } else if (pct > 0) {
                              engagementLabel = locale === 'en' ? 'Active Listener' : 'Ouvinte Ativo'
                              engagementColor = 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                            }

                             const isMe = !!(meName && participant.participant.trim().toLowerCase() === meName.trim().toLowerCase())

                             return (
                              <div key={`${participant.participant}-${index}`} className="p-3 bg-[var(--studio-panel)]/30 rounded-lg border border-[var(--studio-border)]/60 space-y-2 group/part hover:border-[var(--studio-border)] transition-all duration-300">
                                <div className="flex items-start justify-between">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <span className="font-semibold text-[var(--studio-text)] flex items-center gap-1.5">
                                        <span className="text-[var(--studio-muted)] font-medium flex items-center gap-1">
                                          {participant.participant}
                                          {isMe && (
                                            <span className="bg-[var(--studio-primary)]/10 text-[var(--studio-primary)] border border-[var(--studio-primary-border)]/50 rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider scale-90">
                                              {locale === 'en' ? 'Me' : 'Eu'}
                                            </span>
                                          )}
                                        </span>
                                        {participant.role && (
                                          <span className="rounded bg-[var(--studio-card-alt)] px-1 py-0.5 text-[9px] uppercase tracking-wider font-semibold text-[var(--studio-subtle)] scale-90 border border-[var(--studio-border)]/50">
                                            {participant.role}
                                          </span>
                                        )}
                                      </span>
                                      
                                      <div className="opacity-0 group-hover/part:opacity-100 flex items-center gap-1 transition-opacity">
                                        <button
                                          type="button"
                                          onClick={() => handleMarkAsMe(participant.participant)}
                                          className={cn(
                                            "cursor-pointer p-0.5 transition-colors",
                                            isMe 
                                              ? "text-[var(--studio-primary)] hover:text-red-400" 
                                              : "text-[var(--studio-muted)] hover:text-[var(--studio-primary)]"
                                          )}
                                          title={isMe 
                                            ? (locale === 'en' ? 'Unmark as Me' : 'Desmarcar como Eu')
                                            : (locale === 'en' ? 'Mark as Me' : 'Este sou eu')
                                          }
                                        >
                                          <MaterialIcon name="person" className="text-[10px]" filled={isMe} />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => startEditParticipant(index, participant.participant, participant.role || '')}
                                          className="text-[var(--studio-muted)] hover:text-[var(--studio-text)] cursor-pointer p-0.5"
                                          title={locale === 'en' ? 'Edit participant' : 'Editar orador'}
                                        >
                                          <MaterialIcon name="edit" className="text-[10px]" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => removeParticipant(selectedMeeting.id, index)}
                                          className="text-red-400 hover:text-red-500 cursor-pointer p-0.5"
                                          title={locale === 'en' ? 'Remove participant' : 'Remover orador'}
                                        >
                                          <MaterialIcon name="delete" className="text-[10px]" />
                                        </button>
                                      </div>
                                    </div>
                                    
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <span className={cn("text-[9px] px-1.5 py-0.5 rounded font-semibold border uppercase", engagementColor)}>
                                        {engagementLabel}
                                      </span>
                                      
                                      {pTasks.length > 0 ? (
                                        <span className="text-[9px] px-1.5 py-0.5 rounded font-semibold bg-violet-500/10 text-violet-400 border border-violet-500/20 flex items-center gap-1 uppercase">
                                          <span className="material-symbols-rounded text-[10px]">task_alt</span>
                                          {pTasks.length} {pTasks.length === 1 ? (locale === 'en' ? 'task' : 'tarefa') : (locale === 'en' ? 'tasks' : 'tarefas')}
                                        </span>
                                      ) : (
                                        <span className="text-[9px] px-1.5 py-0.5 rounded font-semibold bg-zinc-500/5 text-[var(--studio-subtle)] border border-[var(--studio-border)]/50 flex items-center gap-1 uppercase">
                                          <span className="material-symbols-rounded text-[10px]">check</span>
                                          {locale === 'en' ? 'No tasks' : 'Sem tarefas'}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  
                                  <div className="text-right">
                                    <span className="font-mono text-sm text-[var(--studio-primary)] font-bold">{participant.talkTime}</span>
                                    <p className="text-[8px] uppercase tracking-wider text-[var(--studio-subtle)]">{locale === 'en' ? 'Talk Time' : 'Tempo Falado'}</p>
                                  </div>
                                </div>
                                
                                <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--studio-panel-strong)]/60 border border-[color:var(--studio-border)]/30">
                                  <div 
                                    className={cn("h-full rounded-full bg-gradient-to-r", colorClass)} 
                                    style={{ width: `${pct}%` }} 
                                  />
                                </div>
                                
                                {participant.contributions && (
                                  <p className="text-[11px] text-[var(--studio-subtle)] leading-relaxed mt-1">
                                    <strong className="text-[var(--studio-muted)] font-semibold">{locale === 'en' ? 'Key Contributions: ' : 'Contribuições: '}</strong> 
                                    {participant.contributions}
                                  </p>
                                )}
                                
                                {pFeedback && (
                                  <div className="mt-2 bg-[var(--studio-secondary-soft)]/5 border-l-2 border-[var(--studio-secondary)] p-2 rounded-r text-[10px] text-[var(--studio-muted)] leading-relaxed italic">
                                    <div className="flex items-center gap-1 text-[var(--studio-secondary)] font-semibold not-italic uppercase tracking-wider text-[8px] mb-0.5">
                                      <span className="material-symbols-rounded text-[10px]">tips_and_updates</span>
                                      {locale === 'en' ? 'Development Plan' : 'Plano de Desenvolvimento'}
                                    </div>
                                    &quot;{pFeedback.suggestion}&quot;
                                  </div>
                                )}
                              </div>
                            )
                          })
                        ) : (
                          <p className="text-xs text-[var(--studio-muted)] italic">{locale === 'en' ? 'No speaker analysis available.' : 'Sem análise de oradores.'}</p>
                        )}

                        {isAddingParticipant ? (
                          <div className="space-y-3 bg-[var(--studio-card-alt)] p-3 rounded-lg border border-[var(--studio-border)] mt-2">
                            <div className="space-y-2">
                              <div>
                                <label className="text-[10px] text-[var(--studio-muted)] uppercase font-semibold">{locale === 'en' ? 'Name' : 'Nome'}</label>
                                <input
                                  type="text"
                                  className="w-full text-xs rounded border border-[var(--studio-border)] bg-[var(--studio-bg)] text-[var(--studio-text)] px-2 py-1.5 focus:outline-none focus:border-[var(--studio-primary)]"
                                  value={newPartName}
                                  onChange={e => setNewPartName(e.target.value)}
                                  placeholder={locale === 'en' ? 'John Doe' : 'Nome do participante'}
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-[var(--studio-muted)] uppercase font-semibold">{locale === 'en' ? 'Role/Job title' : 'Cargo/Função'}</label>
                                <input
                                  type="text"
                                  className="w-full text-xs rounded border border-[var(--studio-border)] bg-[var(--studio-bg)] text-[var(--studio-text)] px-2 py-1.5 focus:outline-none focus:border-[var(--studio-primary)]"
                                  value={newPartRole}
                                  onChange={e => setNewPartRole(e.target.value)}
                                  placeholder={locale === 'en' ? 'Ex: Developer' : 'Ex: Desenvolvedor'}
                                />
                              </div>
                            </div>
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setIsAddingParticipant(false)}
                                className="text-xs h-7 px-2 cursor-pointer"
                              >
                                {locale === 'en' ? 'Cancel' : 'Cancelar'}
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => addParticipant(selectedMeeting.id)}
                                className="text-xs h-7 px-2 bg-[var(--studio-primary)] text-zinc-950 hover:opacity-90 cursor-pointer"
                              >
                                {locale === 'en' ? 'Add' : 'Adicionar'}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsAddingParticipant(true)}
                            className="w-full mt-2 gap-1.5 border-dashed text-xs py-2 bg-transparent text-[var(--studio-muted)] hover:text-[var(--studio-text)] cursor-pointer"
                          >
                            <MaterialIcon name="person_add" className="text-sm" />
                            {locale === 'en' ? 'Add Participant' : 'Adicionar Participante'}
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Topic Distribution */}
                    {selectedMeeting.summary.topicBreakdown && selectedMeeting.summary.topicBreakdown.length > 0 && (
                      <div className="border-t border-[color:var(--studio-border)] pt-4 space-y-3">
                        <h4 className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--studio-subtle)]">
                          {locale === 'en' ? 'Topic Distribution' : 'Distribuição de Tópicos'}
                        </h4>
                        <div className="space-y-3 bg-[var(--studio-panel)]/40 p-4 rounded-lg border border-[color:var(--studio-border)]">
                          <div className="flex h-3 w-full overflow-hidden rounded-full bg-[var(--studio-panel-strong)] border border-[color:var(--studio-border)]/40">
                            {selectedMeeting.summary.topicBreakdown.map((item, idx) => {
                              const colors = [
                                'bg-[var(--studio-primary)]',
                                'bg-[var(--studio-secondary)]',
                                'bg-cyan-500',
                                'bg-amber-500',
                                'bg-indigo-500',
                                'bg-rose-500'
                              ]
                              const colorClass = colors[idx % colors.length]
                              return (
                                <div 
                                  key={idx}
                                  className={cn("h-full", colorClass)}
                                  style={{ width: `${item.percentage}%` }}
                                  title={`${item.topic}: ${item.percentage}%`}
                                />
                              )
                            })}
                          </div>
                          <div className="grid gap-2 grid-cols-2 sm:grid-cols-3">
                            {selectedMeeting.summary.topicBreakdown.map((item, idx) => {
                              const colors = [
                                'bg-[var(--studio-primary)]',
                                'bg-[var(--studio-secondary)]',
                                'bg-cyan-500',
                                'bg-amber-500',
                                'bg-indigo-500',
                                'bg-rose-500'
                              ]
                              const colorClass = colors[idx % colors.length]
                              return (
                                <div key={idx} className="flex items-center gap-2 text-xs">
                                  <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", colorClass)} />
                                  <span className="text-[var(--studio-muted)] truncate" title={item.topic}>{item.topic}</span>
                                  <span className="font-mono font-semibold text-[var(--studio-text)] ml-auto">{item.percentage}%</span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Sentiment Timeline */}
                    {selectedMeeting.summary.sentimentTimeline && selectedMeeting.summary.sentimentTimeline.length > 0 && (
                      <div className="border-t border-[color:var(--studio-border)] pt-4 space-y-3">
                        <h4 className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--studio-subtle)]">
                          {locale === 'en' ? 'Sentiment Timeline' : 'Evolução do Sentimento'}
                        </h4>
                        <div className="bg-[var(--studio-panel)]/40 p-4 rounded-lg border border-[color:var(--studio-border)]">
                          <div className="relative flex flex-col md:flex-row justify-between gap-4 md:gap-2">
                            <div className="absolute top-4 left-4 right-4 hidden md:block h-0.5 bg-[color:var(--studio-border)] -z-0" />
                            
                            {selectedMeeting.summary.sentimentTimeline.map((item, idx) => {
                              const colors = getSentimentColor(item.sentiment)
                              return (
                                <div key={idx} className="relative z-10 flex md:flex-col items-center gap-3 md:gap-1.5 flex-1 text-left md:text-center">
                                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--studio-panel-strong)] border-2 border-[color:var(--studio-border)] shadow-sm">
                                    <span className={cn("h-3 w-3 rounded-full animate-pulse", colors.dot)} />
                                  </div>
                                  
                                  <div className="space-y-0.5 min-w-0">
                                    <p className="text-xs font-semibold text-[var(--studio-text)] truncate" title={item.phase}>
                                      {item.phase}
                                    </p>
                                    <span className={cn(
                                      "inline-block rounded-full px-2 py-0.5 text-[10px] font-bold border",
                                      colors.text, colors.bg, colors.border
                                    )}>
                                      {item.sentiment}
                                    </span>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedMeeting.summary.insights && (
                      <div className="border-t border-[color:var(--studio-border)] pt-4">
                        <h4 className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--studio-subtle)] mb-3">{t.history.aiInsights}</h4>
                        <dl className="grid gap-3 grid-cols-3">
                          <div className="rounded-md bg-[var(--studio-panel)] p-3 border border-[color:var(--studio-border)]">
                            <dt className="text-xs text-[var(--studio-subtle)]">{t.history.sentiment}</dt>
                            <dd className="mt-1 text-sm font-semibold text-[var(--studio-text)]">{selectedMeeting.summary.insights.sentiment}</dd>
                          </div>
                          <div className="rounded-md bg-[var(--studio-panel)] p-3 border border-[color:var(--studio-border)]">
                            <dt className="text-xs text-[var(--studio-subtle)]">{t.history.engagement}</dt>
                            <dd className="mt-1 text-sm font-semibold text-[var(--studio-text)]">{selectedMeeting.summary.insights.engagement}</dd>
                          </div>
                          <div className="rounded-md bg-[var(--studio-panel)] p-3 border border-[color:var(--studio-border)]">
                            <dt className="text-xs text-[var(--studio-subtle)]">{t.history.outcome}</dt>
                            <dd className="mt-1 text-sm font-semibold text-[var(--studio-text)]">{selectedMeeting.summary.insights.outcome}</dd>
                          </div>
                        </dl>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB CONTENT: TRANSCRIPT */}
                {detailTab === 'transcript' && (
                  <div className="pt-2">
                    <h4 className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--studio-subtle)] mb-3">{t.history.completeTranscript}</h4>
                    {selectedMeeting.summary.transcript ? (
                      <div className="max-h-96 overflow-y-auto rounded-lg border border-[color:var(--studio-border)] bg-[var(--studio-panel-strong)]/80 p-4 font-mono text-sm leading-relaxed text-[var(--studio-muted)] select-text">
                        <p className="whitespace-pre-wrap">{selectedMeeting.summary.transcript}</p>
                      </div>
                    ) : (
                      <p className="text-sm text-[var(--studio-muted)] italic">{locale === 'en' ? 'Transcript text is unavailable.' : 'Texto da transcrição não disponível.'}</p>
                    )}
                  </div>
                )}

                {/* TAB CONTENT: INTEGRATIONS */}
                {detailTab === 'integrations' && (
                  <div className="pt-2 space-y-6">
                    <h4 className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--studio-subtle)] mb-3 text-left">
                      {locale === 'en' ? 'Productivity Integrations' : 'Integrações de Produtividade'}
                    </h4>
                    
                    <div className="grid gap-6 md:grid-cols-3">
                      {/* Notion Integration Card */}
                      <div className="rounded-xl border border-[color:var(--studio-border)] bg-[var(--studio-panel)] p-4 space-y-4 flex flex-col justify-between text-left">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-800 text-zinc-200">
                                <span className="material-symbols-rounded text-sm">book</span>
                              </span>
                              <span className="text-sm font-semibold text-[var(--studio-text)]">Notion</span>
                            </div>
                            {notionToken && notionDb && (
                              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-400 border border-emerald-500/20">
                                {locale === 'en' ? 'Active' : 'Ativo'}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[var(--studio-muted)] leading-relaxed">
                            {locale === 'en' ? 'Sync meeting summaries and action items to a Notion Database.' : 'Sincronize resumos e ações de reuniões em um banco de dados do Notion.'}
                          </p>
                          <div className="space-y-2 pt-2">
                            <input
                              type="password"
                              placeholder="Notion Integration Token"
                              value={notionToken}
                              onChange={(e) => setNotionToken(e.target.value)}
                              className="w-full text-xs rounded-md border border-[color:var(--studio-border)] bg-[var(--studio-panel-strong)] px-2 py-1.5 text-[var(--studio-text)] placeholder:text-[var(--studio-subtle)] focus:outline-none focus:border-[var(--studio-primary)]"
                            />
                            <input
                              type="text"
                              placeholder="Database ID"
                              value={notionDb}
                              onChange={(e) => setNotionDb(e.target.value)}
                              className="w-full text-xs rounded-md border border-[color:var(--studio-border)] bg-[var(--studio-panel-strong)] px-2 py-1.5 text-[var(--studio-text)] placeholder:text-[var(--studio-subtle)] focus:outline-none focus:border-[var(--studio-primary)]"
                            />
                          </div>
                        </div>
                        <div className="space-y-2 pt-4">
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={saveNotionConfig} className="flex-1 text-[10px] h-7 cursor-pointer border-[color:var(--studio-border)]">
                              {locale === 'en' ? 'Save Keys' : 'Salvar Chaves'}
                            </Button>
                            <Button
                              size="sm"
                              disabled={isSyncingNotion}
                              onClick={handleSyncNotion}
                              className="flex-1 bg-[var(--studio-primary)] text-zinc-950 text-[10px] font-semibold h-7 cursor-pointer"
                            >
                              {isSyncingNotion ? (
                                <div className="flex items-center gap-1 justify-center">
                                  <span className="material-symbols-rounded animate-spin text-[10px]">progress_activity</span>
                                  {locale === 'en' ? 'Syncing...' : 'Sincronizando...'}
                                </div>
                              ) : (
                                locale === 'en' ? 'Sync now' : 'Sincronizar'
                              )}
                            </Button>
                          </div>
                          {isSyncingNotion && syncStatusNotion && (
                            <p className="text-[10px] text-amber-400 italic animate-pulse mt-1 text-center">{syncStatusNotion}</p>
                          )}
                        </div>
                      </div>

                      {/* Slack Integration Card */}
                      <div className="rounded-xl border border-[color:var(--studio-border)] bg-[var(--studio-panel)] p-4 space-y-4 flex flex-col justify-between text-left">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-pink-500/10 text-pink-400">
                                <span className="material-symbols-rounded text-sm">chat</span>
                              </span>
                              <span className="text-sm font-semibold text-[var(--studio-text)]">Slack</span>
                            </div>
                            {slackWebhook && (
                              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-400 border border-emerald-500/20">
                                {locale === 'en' ? 'Active' : 'Ativo'}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[var(--studio-muted)] leading-relaxed">
                            {locale === 'en' ? 'Send structured meeting summaries directly to your Slack channel.' : 'Envie a minuta da reunião diretamente para o canal do Slack da equipe.'}
                          </p>
                          <div className="pt-2">
                            <input
                              type="text"
                              placeholder="Slack Incoming Webhook URL"
                              value={slackWebhook}
                              onChange={(e) => setSlackWebhook(e.target.value)}
                              className="w-full text-xs rounded-md border border-[color:var(--studio-border)] bg-[var(--studio-panel-strong)] px-2 py-1.5 text-[var(--studio-text)] placeholder:text-[var(--studio-subtle)] focus:outline-none focus:border-[var(--studio-primary)]"
                            />
                          </div>
                        </div>
                        <div className="space-y-2 pt-4">
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={saveSlackConfig} className="flex-1 text-[10px] h-7 cursor-pointer border-[color:var(--studio-border)]">
                              {locale === 'en' ? 'Save URL' : 'Salvar URL'}
                            </Button>
                            <Button
                              size="sm"
                              disabled={isSyncingSlack}
                              onClick={() => handleSyncSlack(selectedMeeting)}
                              className="flex-1 bg-[var(--studio-primary)] text-zinc-950 text-[10px] font-semibold h-7 cursor-pointer"
                            >
                              {isSyncingSlack ? (
                                <div className="flex items-center gap-1 justify-center">
                                  <span className="material-symbols-rounded animate-spin text-[10px]">progress_activity</span>
                                  {locale === 'en' ? 'Sending...' : 'Enviando...'}
                                </div>
                              ) : (
                                locale === 'en' ? 'Send summary' : 'Enviar minuta'
                              )}
                            </Button>
                          </div>
                          {isSyncingSlack && syncStatusSlack && (
                            <p className="text-[10px] text-amber-400 italic animate-pulse mt-1 text-center">{syncStatusSlack}</p>
                          )}
                        </div>
                      </div>

                      {/* Jira Integration Card */}
                      <div className="rounded-xl border border-[color:var(--studio-border)] bg-[var(--studio-panel)] p-4 space-y-4 flex flex-col justify-between text-left">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600/10 text-blue-400">
                                <span className="material-symbols-rounded text-sm">view_kanban</span>
                              </span>
                              <span className="text-sm font-semibold text-[var(--studio-text)]">Jira</span>
                            </div>
                            {jiraToken && jiraDomain && jiraKey && jiraEmail && (
                              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-400 border border-emerald-500/20">
                                {locale === 'en' ? 'Active' : 'Ativo'}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[var(--studio-muted)] leading-relaxed">
                            {locale === 'en' ? 'Convert action items into Jira tasks under your project.' : 'Converta itens de ação da reunião em issues (Tasks) de desenvolvimento no Jira.'}
                          </p>
                          <div className="space-y-2 pt-2">
                            <input
                              type="text"
                              placeholder="Atlassian Domain (e.g. myco.atlassian.net)"
                              value={jiraDomain}
                              onChange={(e) => setJiraDomain(e.target.value)}
                              className="w-full text-xs rounded-md border border-[color:var(--studio-border)] bg-[var(--studio-panel-strong)] px-2 py-1.5 text-[var(--studio-text)] placeholder:text-[var(--studio-subtle)] focus:outline-none focus:border-[var(--studio-primary)]"
                            />
                            <div className="space-y-2">
                              <input
                                type="text"
                                placeholder="Jira Email"
                                value={jiraEmail}
                                onChange={(e) => setJiraEmail(e.target.value)}
                                className="w-full text-xs rounded-md border border-[color:var(--studio-border)] bg-[var(--studio-panel-strong)] px-2 py-1.5 text-[var(--studio-text)] placeholder:text-[var(--studio-subtle)] focus:outline-none focus:border-[var(--studio-primary)]"
                              />
                              <div className="grid grid-cols-2 gap-2">
                                <input
                                  type="text"
                                  placeholder="Project Key"
                                  value={jiraKey}
                                  onChange={(e) => setJiraKey(e.target.value)}
                                  className="w-full text-xs rounded-md border border-[color:var(--studio-border)] bg-[var(--studio-panel-strong)] px-2 py-1.5 text-[var(--studio-text)] placeholder:text-[var(--studio-subtle)] focus:outline-none focus:border-[var(--studio-primary)]"
                                />
                                <input
                                  type="password"
                                  placeholder="API Token / Pwd"
                                  value={jiraToken}
                                  onChange={(e) => setJiraToken(e.target.value)}
                                  className="w-full text-xs rounded-md border border-[color:var(--studio-border)] bg-[var(--studio-panel-strong)] px-2 py-1.5 text-[var(--studio-text)] placeholder:text-[var(--studio-subtle)] focus:outline-none focus:border-[var(--studio-primary)]"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2 pt-4">
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={saveJiraConfig} className="flex-1 text-[10px] h-7 cursor-pointer border-[color:var(--studio-border)]">
                              {locale === 'en' ? 'Save Keys' : 'Salvar Chaves'}
                            </Button>
                            <Button
                              size="sm"
                              disabled={isSyncingJira}
                              onClick={() => handleSyncJira(selectedMeeting)}
                              className="flex-1 bg-[var(--studio-primary)] text-zinc-950 text-[10px] font-semibold h-7 cursor-pointer"
                            >
                              {isSyncingJira ? (
                                <div className="flex items-center gap-1 justify-center">
                                  <span className="material-symbols-rounded animate-spin text-[10px]">progress_activity</span>
                                  {locale === 'en' ? 'Syncing...' : 'Sincronizando...'}
                                </div>
                              ) : (
                                locale === 'en' ? 'Create tasks' : 'Criar tarefas'
                              )}
                            </Button>
                          </div>
                          {isSyncingJira && syncStatusJira && (
                            <p className="text-[10px] text-amber-400 italic animate-pulse mt-1 text-center">{syncStatusJira}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : selectedMeetingId === processingMeeting?.id ? (
              <div className="flex flex-col items-center justify-center text-center p-8 mt-12 space-y-4">
                <div className="relative flex items-center justify-center h-16 w-16">
                  <div className="absolute inset-0 rounded-full border-4 border-[color:var(--studio-border)] opacity-35" />
                  <div className="absolute inset-0 rounded-full border-4 border-t-[var(--studio-primary)] animate-spin animate-duration-1000" />
                  <MaterialIcon name="psychology" className="text-3xl text-[var(--studio-primary)] animate-pulse" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-base font-semibold text-[var(--studio-text)]">
                    {locale === 'en' ? 'Processing Meeting Summary' : 'Processando Resumo da Reunião'}
                  </h4>
                  <p className="text-xs text-[var(--studio-muted)] max-w-sm leading-relaxed">
                    {locale === 'en' 
                      ? 'AI is currently analyzing the audio track, transcribing speakers, drafting decisions and extracting structural action items. This will take a few moments...'
                      : 'A IA está analisando a faixa de áudio, transcrevendo os oradores, redigindo decisões e extraindo tarefas de ação estruturadas. Isso levará alguns instantes...'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-12 text-center text-sm text-[var(--studio-muted)]">
                {t.history.selectMeeting}
              </div>
            )}
          </article>
        </div>
      )}

      {confirmModal && confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-xl border border-[color:var(--studio-border)] bg-[var(--studio-card)] glass-card p-6 shadow-2xl shadow-black/40 text-[var(--studio-text)] animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-red-500/20 bg-red-500/10 text-red-400">
                <MaterialIcon name="delete" className="text-xl" />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <h3 className="text-base font-semibold leading-none tracking-tight">
                  {confirmModal.title}
                </h3>
                <p className="text-sm text-[var(--studio-muted)] leading-relaxed">
                  {confirmModal.message}
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setConfirmModal(null)}
                className="border-[color:var(--studio-border)] bg-[var(--studio-panel)] hover:bg-[var(--studio-card-alt)] cursor-pointer"
              >
                {locale === 'en' ? 'Cancel' : 'Cancelar'}
              </Button>
              <Button 
                onClick={() => {
                  confirmModal.onConfirm()
                  setConfirmModal(null)
                }}
                className="bg-red-600 text-white font-semibold hover:bg-red-700 cursor-pointer"
              >
                {locale === 'en' ? 'Delete' : 'Excluir'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function checkSectionData(summary: any, sectionId: string): boolean {
  if (!summary) return false
  switch (sectionId) {
    case 'summary':
      return !!(summary.summary || summary.overview)
    case 'timeline':
      return !!(summary.timeline && summary.timeline.length > 0)
    case 'summaryOneLine':
      return !!summary.summaryOneLine
    case 'agendaAlignment':
      return !!summary.agendaAlignment && (
        (summary.agendaAlignment.achieved && summary.agendaAlignment.achieved.length > 0) ||
        (summary.agendaAlignment.pending && summary.agendaAlignment.pending.length > 0)
      )
    case 'criticalDecisions':
      return !!(
        (summary.criticalDecisions && summary.criticalDecisions.length > 0) ||
        (summary.decisions && summary.decisions.length > 0)
      )
    case 'actionPlan':
      return !!(
        (summary.actionPlan && summary.actionPlan.length > 0) ||
        (summary.actionItems && summary.actionItems.length > 0)
      )
    case 'risksAndBlockers':
      return !!(summary.risksAndBlockers && summary.risksAndBlockers.length > 0)
    case 'roadmap':
      return !!(summary.roadmap && summary.roadmap.length > 0)
    case 'tags':
      return !!summary.tags
    case 'technicalGlossary':
      return !!(summary.technicalGlossary && summary.technicalGlossary.length > 0)
    case 'toolsMentioned':
      return !!(summary.toolsMentioned && summary.toolsMentioned.length > 0)
    case 'openQuestions':
      return !!(summary.openQuestions && summary.openQuestions.length > 0)
    case 'consensusAnalysis':
      return !!summary.consensusAnalysis
    case 'meetingEfficiencyAnalysis':
      return !!summary.meetingEfficiencyAnalysis
    case 'quotesAndHighlights':
      return !!(summary.quotesAndHighlights && summary.quotesAndHighlights.length > 0)
    case 'overallSentiment':
      return !!(summary.overallSentiment || (summary.insights && summary.insights.sentiment))
    case 'conversationalMetrics':
      return !!summary.conversationalMetrics
    case 'priorityMatrix':
      return !!summary.priorityMatrix && (
        (summary.priorityMatrix.urgentImportant && summary.priorityMatrix.urgentImportant.length > 0) ||
        (summary.priorityMatrix.urgentNotImportant && summary.priorityMatrix.urgentNotImportant.length > 0) ||
        (summary.priorityMatrix.notUrgentImportant && summary.priorityMatrix.notUrgentImportant.length > 0) ||
        (summary.priorityMatrix.notUrgentNotImportant && summary.priorityMatrix.notUrgentNotImportant.length > 0)
      )
    case 'nextAgenda':
      return !!(summary.nextAgenda && summary.nextAgenda.length > 0)
    case 'individualDevelopment':
      return !!(summary.individualDevelopment && summary.individualDevelopment.length > 0)
    case 'topicBreakdown':
      return !!(summary.topicBreakdown && summary.topicBreakdown.length > 0)
    case 'energyAndHumor':
      return !!summary.energyAndHumor
    case 'meetingQualityScore':
      return summary.meetingQualityScore !== undefined
    default:
      return false
  }
}

function renderSectionContent(
  selectedMeeting: MeetingRecord,
  sectionId: string,
  locale: string,
  meName: string,
  filterMyTasks: boolean,
  setFilterMyTasks: React.Dispatch<React.SetStateAction<boolean>>
): React.ReactNode {
  const summary = selectedMeeting.summary
  if (!summary) return null
  const t = getMessages(locale as any)

  switch (sectionId) {
    case 'summary':
      return (
        <p className="text-xs leading-relaxed text-[var(--studio-muted)]">
          {summary.summary || summary.overview}
        </p>
      )
    case 'timeline':
      return summary.timeline && summary.timeline.length > 0 ? (
        <ol className="relative border-l border-[color:var(--studio-border)] ml-3 pl-4 space-y-4 text-xs">
          {summary.timeline.map((item: any, idx: number) => (
            <li key={`${item.phase}-${idx}`} className="relative">
              <span className="absolute -left-6 top-1 flex h-3 w-3 items-center justify-center rounded-full bg-[var(--studio-primary)] ring-4 ring-[var(--studio-bg)]" />
              <time className="text-[10px] font-mono font-semibold uppercase tracking-[0.12em] text-[var(--studio-primary)]">
                {item.time}
              </time>
              <h5 className="text-sm font-semibold text-[var(--studio-text)] mt-0.5">{item.phase}</h5>
              <p className="text-xs text-[var(--studio-muted)] mt-0.5 leading-relaxed">{item.description}</p>
            </li>
          ))}
        </ol>
      ) : null
    case 'summaryOneLine':
      return (
        <div className="border-l-2 border-[var(--studio-primary)] bg-[var(--studio-primary-soft)]/20 p-3 rounded-r-md italic text-xs text-[var(--studio-text)]">
          &quot;{summary.summaryOneLine}&quot;
        </div>
      )
    case 'agendaAlignment':
      return summary.agendaAlignment ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="bg-emerald-500/5 border border-emerald-500/10 p-2.5 rounded">
            <h5 className="font-semibold text-emerald-400 flex items-center gap-1 mb-1.5">
              <span className="material-symbols-rounded text-sm">check_circle</span>
              {locale === 'en' ? 'Objectives Achieved' : 'Alcançado'}
            </h5>
            <ul className="space-y-1 text-[var(--studio-muted)]">
              {summary.agendaAlignment.achieved && summary.agendaAlignment.achieved.length > 0 ? (
                summary.agendaAlignment.achieved.map((item: string, i: number) => (
                  <li key={i} className="flex items-start gap-1">
                    <span>•</span> <span>{item}</span>
                  </li>
                ))
              ) : (
                <li className="italic text-[10px]">Nenhum</li>
              )}
            </ul>
          </div>
          <div className="bg-amber-500/5 border border-amber-500/10 p-2.5 rounded">
            <h5 className="font-semibold text-amber-400 flex items-center gap-1 mb-1.5">
              <span className="material-symbols-rounded text-sm">pending</span>
              {locale === 'en' ? 'Pending/Postponed' : 'Pendente/Adiado'}
            </h5>
            <ul className="space-y-1 text-[var(--studio-muted)]">
              {summary.agendaAlignment.pending && summary.agendaAlignment.pending.length > 0 ? (
                summary.agendaAlignment.pending.map((item: string, i: number) => (
                  <li key={i} className="flex items-start gap-1">
                    <span>•</span> <span>{item}</span>
                  </li>
                ))
              ) : (
                <li className="italic text-[10px]">Nenhum</li>
              )}
            </ul>
          </div>
        </div>
      ) : null

    case 'criticalDecisions':
      return (summary.criticalDecisions && summary.criticalDecisions.length > 0) ? (
        <div className="space-y-2 text-xs">
          {summary.criticalDecisions.map((dec: any, i: number) => (
            <div key={i} className="p-2 bg-[var(--studio-panel)]/40 rounded border border-[var(--studio-border)]">
              <p className="font-semibold text-[var(--studio-text)] flex items-start gap-1.5">
                <span className="text-[var(--studio-secondary)] font-bold">{i + 1}.</span>
                {dec.decision}
              </p>
              {dec.rationale && (
                <p className="text-[10px] text-[var(--studio-muted)] mt-0.5 ml-4 italic">
                  <strong>Racional:</strong> {dec.rationale}
                </p>
              )}
            </div>
          ))}
        </div>
      ) : summary.decisions && summary.decisions.length > 0 ? (
        <ul className="space-y-1 text-xs text-[var(--studio-muted)]">
          {summary.decisions.map((dec: string, i: number) => (
            <li key={i} className="flex items-start gap-1.5">
              <span className="text-[var(--studio-secondary)]">•</span>
              <span>{dec}</span>
            </li>
          ))}
        </ul>
      ) : null

    case 'actionPlan':
      const displayedActionPlan = (summary.actionPlan || []).filter((act: any) => {
        if (!filterMyTasks || !meName) return true
        const assignee = act.assignee || ''
        return (
          assignee.toLowerCase() === meName.toLowerCase() ||
          assignee.toLowerCase() === 'eu' ||
          assignee.toLowerCase() === 'me'
        )
      })

      return (summary.actionPlan && summary.actionPlan.length > 0) ? (
        <div className="space-y-3">
          {meName && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setFilterMyTasks(prev => !prev)}
                className={cn(
                  "text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded border flex items-center gap-1 cursor-pointer transition-all",
                  filterMyTasks
                    ? "bg-[var(--studio-primary)] border-[var(--studio-primary)] text-zinc-950"
                    : "border-[var(--studio-border)] text-[var(--studio-muted)] hover:text-[var(--studio-text)]"
                )}
              >
                <MaterialIcon name="person" className="text-[10px]" filled={filterMyTasks} />
                {locale === 'en' ? 'My Tasks Only' : 'Apenas Minhas Tarefas'}
              </button>
            </div>
          )}

          {displayedActionPlan.length === 0 ? (
            <p className="text-xs text-[var(--studio-muted)] italic py-2 text-center">
              {locale === 'en' ? 'No tasks found for you.' : 'Nenhuma tarefa encontrada para você.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="border-b border-[var(--studio-border)] text-[var(--studio-subtle)] font-semibold">
                    <th className="py-1.5 pr-2">{locale === 'en' ? 'Task' : 'Tarefa'}</th>
                    <th className="py-1.5 px-2">{locale === 'en' ? 'Owner' : 'Responsável'}</th>
                    <th className="py-1.5 px-2">{locale === 'en' ? 'Deadline' : 'Prazo'}</th>
                    <th className="py-1.5 pl-2 text-right">{locale === 'en' ? 'Priority' : 'Prioridade'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--studio-border)]/40">
                  {displayedActionPlan.map((act: any, i: number) => (
                    <tr key={i} className="text-[var(--studio-muted)] hover:text-[var(--studio-text)]">
                      <td className="py-1.5 pr-2 font-medium">{act.task}</td>
                      <td className="py-1.5 px-2">
                        <span className="bg-[var(--studio-panel)] px-1.5 py-0.5 rounded text-[10px]">
                          {act.assignee}
                        </span>
                      </td>
                      <td className="py-1.5 px-2 font-mono text-[10px]">{act.deadline}</td>
                      <td className="py-1.5 pl-2 text-right">
                        <span className={cn(
                          "text-[9px] uppercase px-1 rounded font-bold",
                          act.priority === 'Alta' || act.priority === 'High' ? "text-red-400 bg-red-400/10" :
                          act.priority === 'Baixa' || act.priority === 'Low' ? "text-zinc-400 bg-zinc-400/10" : "text-amber-400 bg-amber-400/10"
                        )}>
                          {act.priority}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : summary.actionItems && summary.actionItems.length > 0 ? (
        <ul className="space-y-1 text-xs text-[var(--studio-muted)]">
          {summary.actionItems.map((act: string, i: number) => (
            <li key={i} className="flex items-start gap-1.5">
              <span>•</span>
              <span>{act}</span>
            </li>
          ))}
        </ul>
      ) : null

    case 'risksAndBlockers':
      return summary.risksAndBlockers && summary.risksAndBlockers.length > 0 ? (
        <div className="space-y-2 text-xs">
          {summary.risksAndBlockers.map((risk: any, i: number) => (
            <div key={i} className="p-2.5 bg-red-500/5 rounded border border-red-500/10 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[var(--studio-text)] flex items-center gap-1.5">
                  <span className="material-symbols-rounded text-red-400 text-sm">warning</span>
                  {risk.risk}
                </span>
                <span className={cn(
                  "text-[9px] px-1 rounded uppercase font-bold",
                  risk.impact === 'Alto' || risk.impact === 'High' ? "text-red-400 bg-red-400/10" : "text-amber-400 bg-amber-400/10"
                )}>
                  {risk.impact}
                </span>
              </div>
              <p className="text-[10px] text-[var(--studio-muted)] ml-5">
                <strong>Mitigação:</strong> {risk.mitigation}
              </p>
            </div>
          ))}
        </div>
      ) : null

    case 'roadmap':
      return summary.roadmap && summary.roadmap.length > 0 ? (
        <div className="relative border-l border-[var(--studio-border)] ml-2 pl-4 space-y-3 text-xs">
          {summary.roadmap.map((rm: any, i: number) => (
            <div key={i} className="relative">
              <span className="absolute -left-6 top-0.5 h-3.5 w-3.5 rounded-full bg-[var(--studio-secondary)] ring-4 ring-[var(--studio-bg)] flex items-center justify-center">
                <span className="text-[8px] font-bold text-zinc-950">{i + 1}</span>
              </span>
              <div className="flex items-baseline justify-between gap-2">
                <h5 className="font-semibold text-[var(--studio-text)]">{rm.milestone}</h5>
                <span className="text-[9px] font-mono text-[var(--studio-subtle)] shrink-0">{rm.date}</span>
              </div>
            </div>
          ))}
        </div>
      ) : null

    case 'tags':
      return summary.tags ? (
        <dl className="grid gap-3 grid-cols-3 text-xs">
          <div className="rounded-md bg-[var(--studio-panel)]/40 p-2.5 border border-[color:var(--studio-border)]">
            <dt className="text-[10px] text-[var(--studio-subtle)]">{t.history.meetingType}</dt>
            <dd className="mt-0.5 font-semibold text-[var(--studio-text)]">{summary.tags.meetingType}</dd>
          </div>
          <div className="rounded-md bg-[var(--studio-panel)]/40 p-2.5 border border-[color:var(--studio-border)]">
            <dt className="text-[10px] text-[var(--studio-subtle)]">{t.history.priority}</dt>
            <dd className="mt-0.5 font-semibold text-[var(--studio-text)]">{summary.tags.priority}</dd>
          </div>
          <div className="rounded-md bg-[var(--studio-panel)]/40 p-2.5 border border-[color:var(--studio-border)]">
            <dt className="text-[10px] text-[var(--studio-subtle)]">{t.history.status}</dt>
            <dd className="mt-0.5 font-semibold text-[var(--studio-text)]">{summary.tags.status}</dd>
          </div>
        </dl>
      ) : null

    case 'technicalGlossary':
      return summary.technicalGlossary && summary.technicalGlossary.length > 0 ? (
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
          {summary.technicalGlossary.map((gloss: any, i: number) => (
            <div key={i} className="p-2 bg-[var(--studio-panel)]/40 rounded border border-[var(--studio-border)]">
              <dt className="font-bold text-[var(--studio-primary)]">{gloss.term}</dt>
              <dd className="text-[10px] text-[var(--studio-muted)] mt-0.5 leading-relaxed">{gloss.definition}</dd>
            </div>
          ))}
        </dl>
      ) : null

    case 'toolsMentioned':
      return summary.toolsMentioned && summary.toolsMentioned.length > 0 ? (
        <div className="space-y-1.5 text-xs">
          {summary.toolsMentioned.map((tool: any, i: number) => (
            <div key={i} className="flex items-start gap-2">
              <span className="bg-[var(--studio-panel-strong)] px-1.5 py-0.5 rounded text-[var(--studio-primary)] font-mono text-[9px] flex items-center gap-1 shrink-0 mt-0.5">
                <span className="material-symbols-rounded text-xs">settings_ethernet</span>
                {tool.tool}
              </span>
              <span className="text-[var(--studio-muted)] leading-normal">{tool.context}</span>
            </div>
          ))}
        </div>
      ) : null

    case 'openQuestions':
      return summary.openQuestions && summary.openQuestions.length > 0 ? (
        <ul className="space-y-1.5 text-xs text-[var(--studio-muted)]">
          {summary.openQuestions.map((q: string, i: number) => (
            <li key={i} className="flex items-start gap-2 bg-amber-500/5 p-2 rounded border border-amber-500/10 text-amber-300">
              <span className="material-symbols-rounded text-sm shrink-0 mt-0.5">help_outline</span>
              <span>{q}</span>
            </li>
          ))}
        </ul>
      ) : null

    case 'consensusAnalysis':
      return summary.consensusAnalysis ? (
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2 text-[var(--studio-muted)]">
            <span>{locale === 'en' ? 'Consensus Level:' : 'Nível de Consenso:'}</span>
            <span className={cn(
              "font-bold uppercase px-1.5 py-0.5 rounded text-[10px]",
              summary.consensusAnalysis.level === 'Alto' || summary.consensusAnalysis.level === 'High' ? "text-emerald-400 bg-emerald-400/10" :
              summary.consensusAnalysis.level === 'Baixo' || summary.consensusAnalysis.level === 'Low' ? "text-red-400 bg-red-400/10" : "text-amber-400 bg-amber-400/10"
            )}>
              {summary.consensusAnalysis.level}
            </span>
          </div>
          {summary.consensusAnalysis.disagreements && summary.consensusAnalysis.disagreements.length > 0 && (
            <div className="p-2.5 bg-[var(--studio-panel)]/40 rounded border border-[var(--studio-border)]">
              <h5 className="text-[10px] font-semibold text-[var(--studio-text)] uppercase tracking-wider mb-1">
                {locale === 'en' ? 'Points of Debate / Disagreement' : 'Pontos de Debate / Discordância'}
              </h5>
              <ul className="space-y-0.5 list-disc pl-4 text-[var(--studio-muted)]">
                {summary.consensusAnalysis.disagreements.map((dis: string, i: number) => (
                  <li key={i}>{dis}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : null

    case 'meetingEfficiencyAnalysis':
      return summary.meetingEfficiencyAnalysis ? (
        <div className="space-y-2.5 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[var(--studio-panel)]/40 p-2 rounded border border-[var(--studio-border)] text-center">
              <span className="text-[9px] text-[var(--studio-subtle)] uppercase tracking-wider">{locale === 'en' ? 'Focus Score' : 'Foco na Pauta'}</span>
              <p className="text-lg font-bold font-mono text-[var(--studio-primary)] mt-0.5">{summary.meetingEfficiencyAnalysis.focusScore || 85}%</p>
            </div>
            <div className="bg-[var(--studio-panel)]/40 p-2 rounded border border-[var(--studio-border)] text-center">
              <span className="text-[9px] text-[var(--studio-subtle)] uppercase tracking-wider">{locale === 'en' ? 'Time Wasted' : 'Tempo Desperdiçado'}</span>
              <p className="text-lg font-bold font-mono text-amber-400 mt-0.5">{summary.meetingEfficiencyAnalysis.timeWasted || '15%'}</p>
            </div>
          </div>
          {summary.meetingEfficiencyAnalysis.focusDetails && (
            <p className="text-xs text-[var(--studio-muted)] leading-relaxed italic">
              {summary.meetingEfficiencyAnalysis.focusDetails}
            </p>
          )}
        </div>
      ) : null

    case 'quotesAndHighlights':
      return summary.quotesAndHighlights && summary.quotesAndHighlights.length > 0 ? (
        <div className="space-y-2">
          {summary.quotesAndHighlights.map((qh: any, i: number) => (
            <figure key={i} className="border-l-2 border-[var(--studio-secondary)] pl-2.5 py-0.5 text-xs">
              <blockquote className="italic text-[var(--studio-text)]">
                &quot;{qh.quote}&quot;
              </blockquote>
              <figcaption className="text-[9px] text-[var(--studio-muted)] mt-0.5">
                — {qh.author}
              </figcaption>
            </figure>
          ))}
        </div>
      ) : null

    case 'overallSentiment':
      return (summary.overallSentiment || (summary.insights && summary.insights.sentiment)) ? (
        <div className="flex items-center gap-2.5 p-2.5 bg-[var(--studio-panel)]/40 rounded border border-[var(--studio-border)] text-xs">
          <span className="material-symbols-rounded text-xl text-[var(--studio-primary)] shrink-0">mood</span>
          <p className="text-[var(--studio-muted)] leading-relaxed">
            {summary.overallSentiment || summary.insights?.sentiment}
          </p>
        </div>
      ) : null

    case 'conversationalMetrics':
      return summary.conversationalMetrics ? (
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="p-2 bg-[var(--studio-panel)]/40 rounded border border-[var(--studio-border)] text-center">
            <span className="text-[8px] text-[var(--studio-subtle)] uppercase tracking-wider">{locale === 'en' ? 'Silence %' : 'Silêncio'}</span>
            <p className="text-xs font-mono font-bold text-[var(--studio-text)] mt-0.5">{summary.conversationalMetrics.silenceTime || 'N/A'}</p>
          </div>
          <div className="p-2 bg-[var(--studio-panel)]/40 rounded border border-[var(--studio-border)] text-center">
            <span className="text-[8px] text-[var(--studio-subtle)] uppercase tracking-wider">{locale === 'en' ? 'Speed' : 'Velocidade'}</span>
            <p className="text-xs font-bold text-[var(--studio-text)] mt-0.5">{summary.conversationalMetrics.speed || 'N/A'}</p>
          </div>
          <div className="p-2 bg-[var(--studio-panel)]/40 rounded border border-[var(--studio-border)] text-center">
            <span className="text-[8px] text-[var(--studio-subtle)] uppercase tracking-wider">{locale === 'en' ? 'Pauses' : 'Pausas'}</span>
            <p className="text-xs font-mono font-bold text-[var(--studio-text)] mt-0.5">{summary.conversationalMetrics.pausesCount ?? 0}</p>
          </div>
        </div>
      ) : null

    case 'priorityMatrix':
      return summary.priorityMatrix ? (
        <div className="grid grid-cols-2 gap-2 text-[9px] text-[var(--studio-muted)]">
          <div className="p-2 bg-red-500/5 rounded border border-red-500/10 min-h-[50px]">
            <span className="font-bold text-red-400 uppercase">{locale === 'en' ? 'Urgent & Important' : 'Urgente & Importante'}</span>
            <ul className="mt-1 space-y-0.5">
              {summary.priorityMatrix.urgentImportant && summary.priorityMatrix.urgentImportant.length > 0 ? (
                summary.priorityMatrix.urgentImportant.map((item: string, i: number) => <li key={i}>• {item}</li>)
              ) : (
                <li>-</li>
              )}
            </ul>
          </div>
          <div className="p-2 bg-amber-500/5 rounded border border-amber-500/10 min-h-[50px]">
            <span className="font-bold text-amber-400 uppercase">{locale === 'en' ? 'Not Urgent & Important' : 'Não Urgente & Importante'}</span>
            <ul className="mt-1 space-y-0.5">
              {summary.priorityMatrix.notUrgentImportant && summary.priorityMatrix.notUrgentImportant.length > 0 ? (
                summary.priorityMatrix.notUrgentImportant.map((item: string, i: number) => <li key={i}>• {item}</li>)
              ) : (
                <li>-</li>
              )}
            </ul>
          </div>
          <div className="p-2 bg-blue-500/5 rounded border border-blue-500/10 min-h-[50px]">
            <span className="font-bold text-blue-400 uppercase">{locale === 'en' ? 'Urgent & Not Important' : 'Urgente & Não Importante'}</span>
            <ul className="mt-1 space-y-0.5">
              {summary.priorityMatrix.urgentNotImportant && summary.priorityMatrix.urgentNotImportant.length > 0 ? (
                summary.priorityMatrix.urgentNotImportant.map((item: string, i: number) => <li key={i}>• {item}</li>)
              ) : (
                <li>-</li>
              )}
            </ul>
          </div>
          <div className="p-2 bg-zinc-500/5 rounded border border-zinc-500/10 min-h-[50px]">
            <span className="font-bold text-zinc-400 uppercase">{locale === 'en' ? 'Not Urgent & Not Important' : 'Não Urgente & Não Importante'}</span>
            <ul className="mt-1 space-y-0.5">
              {summary.priorityMatrix.notUrgentNotImportant && summary.priorityMatrix.notUrgentNotImportant.length > 0 ? (
                summary.priorityMatrix.notUrgentNotImportant.map((item: string, i: number) => <li key={i}>• {item}</li>)
              ) : (
                <li>-</li>
              )}
            </ul>
          </div>
        </div>
      ) : null

    case 'nextAgenda':
      return summary.nextAgenda && summary.nextAgenda.length > 0 ? (
        <ul className="space-y-1 text-xs text-[var(--studio-muted)]">
          {summary.nextAgenda.map((item: string, i: number) => (
            <li key={i} className="flex items-start gap-1.5">
              <span className="material-symbols-rounded text-sm text-[var(--studio-primary)] shrink-0">arrow_forward</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : null

    case 'individualDevelopment':
      return summary.individualDevelopment && summary.individualDevelopment.length > 0 ? (
        <div className="space-y-2 text-xs">
          {summary.individualDevelopment.map((idv: any, i: number) => (
            <div key={i} className="p-2.5 bg-[var(--studio-panel)]/40 rounded border border-[var(--studio-border)]">
              <span className="font-semibold text-[var(--studio-text)]">{idv.name}</span>
              <p className="text-[10px] text-[var(--studio-muted)] mt-0.5 italic">
                {idv.suggestion}
              </p>
            </div>
          ))}
        </div>
      ) : null

    case 'topicBreakdown':
      return summary.topicBreakdown && summary.topicBreakdown.length > 0 ? (
        <div className="space-y-2 text-xs">
          {summary.topicBreakdown.map((tb: any, i: number) => (
            <div key={i} className="space-y-1">
              <div className="flex items-center justify-between text-[11px] text-[var(--studio-muted)]">
                <span>{tb.topic}</span>
                <span className="font-semibold font-mono">{tb.percentage}%</span>
              </div>
              <div className="h-1.5 w-full bg-[var(--studio-panel-strong)] rounded-full overflow-hidden">
                <div className="h-full bg-[var(--studio-primary)] rounded-full" style={{ width: `${tb.percentage}%` }} />
              </div>
            </div>
          ))}
        </div>
      ) : null

    case 'energyAndHumor':
      return summary.energyAndHumor ? (
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="p-2 bg-[var(--studio-panel)]/40 rounded border border-[var(--studio-border)]">
            <span className="text-[8px] text-[var(--studio-subtle)] uppercase tracking-wider">{locale === 'en' ? 'Start' : 'Início'}</span>
            <p className="font-bold mt-0.5 text-[var(--studio-text)]">{summary.energyAndHumor.startingEnergy}</p>
          </div>
          <div className="p-2 bg-[var(--studio-panel)]/40 rounded border border-[var(--studio-border)]">
            <span className="text-[8px] text-[var(--studio-subtle)] uppercase tracking-wider">{locale === 'en' ? 'Peak' : 'Pico'}</span>
            <p className="font-bold mt-0.5 text-[var(--studio-primary)]">{summary.energyAndHumor.peakEnergy}</p>
          </div>
          <div className="p-2 bg-[var(--studio-panel)]/40 rounded border border-[var(--studio-border)]">
            <span className="text-[8px] text-[var(--studio-subtle)] uppercase tracking-wider">{locale === 'en' ? 'End' : 'Fim'}</span>
            <p className="font-bold mt-0.5 text-[var(--studio-text)]">{summary.energyAndHumor.endingEnergy}</p>
          </div>
        </div>
      ) : null

    case 'meetingQualityScore':
      return summary.meetingQualityScore !== undefined ? (
        <div className="flex items-center gap-3 bg-[var(--studio-panel)]/40 p-2.5 rounded border border-[var(--studio-border)] text-xs">
          <div className="relative h-10 w-10 flex-shrink-0 flex items-center justify-center">
            <svg className="absolute top-0 left-0 w-full h-full transform -rotate-90">
              <circle cx="20" cy="20" r="16" stroke="var(--studio-border)" strokeWidth="2.5" fill="transparent" />
              <circle
                cx="20"
                cy="20"
                r="16"
                stroke="var(--studio-primary)"
                strokeWidth="2.5"
                fill="transparent"
                strokeDasharray={`${2 * Math.PI * 16}`}
                strokeDashoffset={`${2 * Math.PI * 16 * (1 - (summary.meetingQualityScore || 75) / 100)}`}
              />
            </svg>
            <span className="text-[10px] font-bold font-mono text-[var(--studio-primary)]">{summary.meetingQualityScore}</span>
          </div>
          <div>
            <p className="font-semibold text-[var(--studio-text)]">
              {(summary.meetingQualityScore || 75) >= 80 ? (locale === 'en' ? 'Highly Productive' : 'Reunião Excelente') :
               (summary.meetingQualityScore || 75) >= 60 ? (locale === 'en' ? 'Moderately Productive' : 'Produtividade Média') : (locale === 'en' ? 'Needs Improvement' : 'Reunião Pouco Eficiente')}
            </p>
            <p className="text-[9px] text-[var(--studio-muted)] mt-0.5">
              {locale === 'en' ? 'Based on focus and action item clear definition.' : 'Medido com base no foco, decisões e clareza de ações.'}
            </p>
          </div>
        </div>
      ) : null

    default:
      return null
  }
}
