'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
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

interface MeetingsListProps {
  onNewRecording?: () => void
  locale?: Locale
}

type DateFilter = 'all' | 'today' | 'week' | 'month'

export function MeetingsList({ onNewRecording, locale = 'pt-BR' }: MeetingsListProps) {
  const t = getMessages(locale)
  const [meetings, setMeetings] = useState<MeetingRecord[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState<DateFilter>('all')
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null)
  const [referenceDate] = useState(() => new Date())

  const loadMeetings = useCallback(() => {
    setMeetings(MeetingStorage.getAllMeetings())
  }, [])

  useEffect(() => {
    loadMeetings()
  }, [loadMeetings])

  const filteredMeetings = useMemo(() => meetings.filter((meeting) => {
    const query = searchTerm.toLowerCase()
    const matchesSearch = meeting.summary.title.toLowerCase().includes(query) ||
      meeting.summary.overview.toLowerCase().includes(query) ||
      meeting.summary.participants.some((participant) => participant.toLowerCase().includes(query))

    if (!matchesSearch) return false

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
  }), [filter, meetings, referenceDate, searchTerm])

  const selectedMeeting = filteredMeetings.find((meeting) => meeting.id === selectedMeetingId) || filteredMeetings[0]

  const handleDelete = (id: string) => {
    const shouldDelete = window.confirm(t.history.deleteConfirm)
    if (!shouldDelete) return

    MeetingStorage.deleteMeeting(id)
    if (selectedMeetingId === id) setSelectedMeetingId(null)
    loadMeetings()
  }

  const handleDownload = (meeting: MeetingRecord) => {
    MeetingStorage.downloadMeetingTxt(meeting)
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const isToday = date.toDateString() === referenceDate.toDateString()
    const isYesterday = date.toDateString() === new Date(referenceDate.getTime() - 24 * 60 * 60 * 1000).toDateString()

    if (isToday) return t.history.filters.today
    if (isYesterday) return t.history.yesterday

    return date.toLocaleDateString(locale === 'en' ? 'en-US' : 'pt-BR', {
      day: '2-digit',
      month: 'short',
      year: date.getFullYear() !== referenceDate.getFullYear() ? 'numeric' : undefined,
    })
  }

  const totalMinutes = Math.floor(meetings.reduce((acc, meeting) => acc + meeting.duration, 0) / 60)
  const weekMeetings = meetings.filter((meeting) => {
    const weekAgo = new Date(referenceDate.getTime() - 7 * 24 * 60 * 60 * 1000)
    return new Date(meeting.date) >= weekAgo
  }).length

  if (meetings.length === 0) {
    return (
      <div className="rounded-lg border border-[color:var(--studio-border)] bg-[var(--studio-card)] p-10 text-center text-[var(--studio-text)] shadow-xl shadow-black/10">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-lg border border-[color:var(--studio-border)] bg-[var(--studio-panel)]">
          <MaterialIcon name="description" className="text-3xl text-[var(--studio-secondary)]" />
        </div>
        <h3 className="mb-2 text-lg font-semibold">{t.history.emptyTitle}</h3>
        <p className="mx-auto mb-6 max-w-md text-sm text-[var(--studio-muted)]">
          {t.history.emptyDescription}
        </p>
        <Button onClick={onNewRecording} className="gap-2 bg-[var(--studio-primary)] text-[#003824] hover:opacity-90">
          <MaterialIcon name="play_circle" className="text-base" filled />
          {t.history.newRecording}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-5 text-[var(--studio-text)]">
      <section className="flex flex-col gap-4 rounded-lg border border-[color:var(--studio-border)] bg-[var(--studio-panel)] p-5 shadow-xl shadow-black/10 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--studio-primary)]">{t.history.titleEyebrow}</p>
          <h2 className="mt-1 text-xl font-semibold text-[var(--studio-text)]">{t.history.title}</h2>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative min-w-0 sm:w-72">
            <MaterialIcon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-base text-[var(--studio-subtle)]" />
            <Input
              placeholder={t.history.searchPlaceholder}
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="border-[color:var(--studio-border)] bg-[var(--studio-panel-strong)] pl-10 text-[var(--studio-text)] placeholder:text-[var(--studio-subtle)]"
            />
          </div>

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

          <Button onClick={onNewRecording} className="gap-2 bg-[var(--studio-primary)] text-[#003824] hover:opacity-90">
            <MaterialIcon name="play_circle" className="text-base" filled />
            {t.history.newRecording}
          </Button>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-[color:var(--studio-border)] bg-[var(--studio-card)] p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--studio-subtle)]">{t.history.sessions}</p>
          <p className="mt-2 font-mono text-2xl font-semibold text-[var(--studio-text)]">
            {meetings.length} {meetings.length === 1 ? t.history.sessionSingular : t.history.sessionPlural}
          </p>
        </div>
        <div className="rounded-lg border border-[color:var(--studio-border)] bg-[var(--studio-card)] p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--studio-subtle)]">{t.history.totalTime}</p>
          <p className="mt-2 font-mono text-2xl font-semibold text-[var(--studio-text)]">{totalMinutes}min</p>
        </div>
        <div className="rounded-lg border border-[color:var(--studio-border)] bg-[var(--studio-card)] p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--studio-subtle)]">{t.history.thisWeek}</p>
          <p className="mt-2 font-mono text-2xl font-semibold text-[var(--studio-text)]">{weekMeetings}</p>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-3">
          {filteredMeetings.map((meeting) => {
            const isSelected = selectedMeeting?.id === meeting.id

            return (
              <article
                key={meeting.id}
                className={cn(
                  'rounded-lg border border-[color:var(--studio-border)] bg-[var(--studio-card)] p-4 transition-colors hover:border-[color:var(--studio-primary-border)]',
                  isSelected && 'border-[color:var(--studio-primary-border)] bg-[var(--studio-card-alt)]'
                )}
              >
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedMeetingId(meeting.id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <h3 className="truncate text-sm font-semibold text-[var(--studio-text)] hover:text-[var(--studio-primary)]">
                      {meeting.summary.title}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--studio-muted)]">
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
                      <span className="flex items-center gap-1">
                        <MaterialIcon name="group" className="text-sm" />
                        {meeting.summary.participants.length}
                      </span>
                    </div>
                  </button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={t.history.actionsMenu(meeting.summary.title)}
                        className="h-8 w-8 p-0 text-[var(--studio-muted)] hover:bg-[var(--studio-panel)] hover:text-[var(--studio-text)]"
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
            <div className="rounded-lg border border-[color:var(--studio-border)] bg-[var(--studio-card)] py-8 text-center">
              <p className="text-[var(--studio-muted)]">
                {searchTerm ? t.history.noSearchResults(searchTerm) : t.history.noFilterResults}
              </p>
            </div>
          )}
        </div>

        <article className="min-h-[520px] rounded-lg border border-[color:var(--studio-border)] bg-[var(--studio-card)] p-5 shadow-xl shadow-black/10">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--studio-secondary)]">{t.history.readingPanel}</p>

          {selectedMeeting ? (
            <div className="mt-4 space-y-5">
              <div>
                <h3 className="text-xl font-semibold text-[var(--studio-text)]">{t.history.reading(selectedMeeting.summary.title)}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--studio-muted)]">{selectedMeeting.summary.summary || selectedMeeting.summary.overview}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-md bg-[var(--studio-panel)] p-3">
                  <MaterialIcon name="schedule" className="mb-2 text-base text-[var(--studio-primary)]" />
                  <p className="text-xs text-[var(--studio-subtle)]">{t.history.duration}</p>
                  <p className="text-sm font-semibold text-[var(--studio-text)]">{formatDuration(selectedMeeting.duration)}</p>
                </div>
                <div className="rounded-md bg-[var(--studio-panel)] p-3">
                  <MaterialIcon name="group" className="mb-2 text-base text-[var(--studio-secondary)]" />
                  <p className="text-xs text-[var(--studio-subtle)]">{t.history.participants}</p>
                  <p className="text-sm font-semibold text-[var(--studio-text)]">{selectedMeeting.summary.participants.length}</p>
                </div>
                <div className="rounded-md bg-[var(--studio-panel)] p-3">
                  <MaterialIcon name="sell" className="mb-2 text-base text-[#b8a7ff]" />
                  <p className="text-xs text-[var(--studio-subtle)]">{t.history.topics}</p>
                  <p className="text-sm font-semibold text-[var(--studio-text)]">{selectedMeeting.summary.topics.length}</p>
                </div>
              </div>

              {selectedMeeting.summary.keyPoints.length > 0 && (
                <section>
                  <h4 className="mb-3 text-sm font-semibold text-[var(--studio-text)]">{t.history.keyPoints}</h4>
                  <ul className="space-y-2">
                    {selectedMeeting.summary.keyPoints.map((point) => (
                      <li key={point} className="flex items-start gap-2 text-sm text-[var(--studio-muted)]">
                        <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[var(--studio-primary)]" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {selectedMeeting.summary.actionItems.length > 0 && (
                <section>
                  <h4 className="mb-3 text-sm font-semibold text-[var(--studio-text)]">{t.history.actions}</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedMeeting.summary.actionItems.map((action) => (
                      <Badge key={action} variant="outline" className="border-[color:var(--studio-primary-border)] bg-[var(--studio-primary-soft)] text-[var(--studio-text)]">
                        {action}
                      </Badge>
                    ))}
                  </div>
                </section>
              )}

              {selectedMeeting.summary.topics.length > 0 && (
                <section>
                  <h4 className="mb-3 text-sm font-semibold text-[var(--studio-text)]">{t.history.topics}</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedMeeting.summary.topics.map((topic) => (
                      <Badge key={topic} variant="secondary" className="bg-[var(--studio-panel)] text-xs text-[var(--studio-text)]">
                        {topic}
                      </Badge>
                    ))}
                  </div>
                </section>
              )}

              {selectedMeeting.summary.metrics && (
                <section>
                  <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--studio-text)]">
                    <MaterialIcon name="bar_chart" className="text-base" />
                    {t.history.metrics}
                  </h4>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-md bg-[var(--studio-panel)] p-3">
                      <p className="text-xs text-[var(--studio-subtle)]">{t.history.efficiency}</p>
                      <p className="mt-1 font-medium text-[var(--studio-text)]">{selectedMeeting.summary.metrics.efficiency}</p>
                    </div>
                    <div className="rounded-md bg-[var(--studio-panel)] p-3">
                      <p className="text-xs text-[var(--studio-subtle)]">{t.history.engagement}</p>
                      <p className="mt-1 font-medium text-[var(--studio-text)]">{selectedMeeting.summary.metrics.engagement}</p>
                    </div>
                    <div className="rounded-md bg-[var(--studio-panel)] p-3">
                      <p className="text-xs text-[var(--studio-subtle)]">{t.history.decisions}</p>
                      <p className="mt-1 font-medium text-[var(--studio-text)]">{selectedMeeting.summary.metrics.decisionsCount}</p>
                    </div>
                  </div>
                </section>
              )}

              <Button
                variant="outline"
                onClick={() => handleDownload(selectedMeeting)}
                className="gap-2 border-[color:var(--studio-border)] bg-[var(--studio-panel)] text-[var(--studio-text)] hover:bg-[var(--studio-card-alt)] hover:text-[var(--studio-text)]"
              >
                <MaterialIcon name="download" className="text-base" />
                {t.history.downloadSummary}
              </Button>
            </div>
          ) : (
            <div className="mt-12 text-center text-sm text-[var(--studio-muted)]">
              {t.history.selectMeeting}
            </div>
          )}
        </article>
      </section>
    </div>
  )
}
