import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MeetingsList } from './MeetingsList'
import { MeetingStorage } from '@/utils/storage'

vi.mock('@/utils/storage', async () => {
  const actual = await vi.importActual<typeof import('@/utils/storage')>('@/utils/storage')
  return {
    ...actual,
    MeetingStorage: {
      getAllMeetings: vi.fn(),
      deleteMeeting: vi.fn(),
      downloadMeetingTxt: vi.fn(),
    },
  }
})

const mockMeetingStorage = vi.mocked(MeetingStorage)

const meeting = {
  id: 'meeting-1',
  title: 'Reunião de Produto',
  date: new Date().toISOString(),
  duration: 245,
  filename: 'reuniao.txt',
  summary: {
    title: 'Reunião de Produto',
    overview: 'Discussão sobre prioridades do trimestre.',
    summary: 'Time definiu prioridades e próximos passos.',
    keyPoints: ['Priorizar onboarding'],
    actionItems: ['Higor revisar backlog'],
    participants: ['Higor', 'Ana'],
    topics: ['Produto'],
  },
}

const richMeeting = {
  ...meeting,
  id: 'meeting-rich',
  summary: {
    ...meeting.summary,
    metrics: {
      efficiency: '82%',
      engagement: 'Alto',
      decisionsCount: 4,
    },
    timeline: [
      {
        phase: 'Abertura',
        description: 'Contexto do problema e alinhamento inicial.',
        time: '0-5min',
      },
      {
        phase: 'Decisões',
        description: 'Definição dos próximos passos.',
        time: '20-25min',
      },
    ],
    tags: {
      meetingType: 'Planejamento',
      priority: 'Alta',
      status: 'Concluída',
    },
    insights: {
      sentiment: 'Produtiva',
      engagement: 'Colaborativo',
      outcome: 'Decisões claras',
    },
    participationAnalysis: [
      {
        participant: 'Higor',
        talkTime: '55%',
        contributions: 'Priorizou o backlog',
        role: 'Facilitador',
      },
    ],
    transcript: 'Transcrição completa com decisões e próximos passos.',
  },
}

describe('MeetingsList', () => {
  beforeEach(() => {
    mockMeetingStorage.getAllMeetings.mockReturnValue([])
  })

  it('renders a studio empty state with a recording action', () => {
    render(<MeetingsList onNewRecording={vi.fn()} />)

    expect(screen.getByText('Nenhuma reunião no console')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /gravar nova reunião/i })).toBeInTheDocument()
  })

  it('renders the empty state in English when requested', () => {
    render(<MeetingsList locale="en" onNewRecording={vi.fn()} />)

    expect(screen.getByText('No meetings in the console')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /record new meeting/i })).toBeInTheDocument()
  })

  it('renders operational history metrics and expands meeting details', async () => {
    mockMeetingStorage.getAllMeetings.mockReturnValue([meeting])

    render(<MeetingsList onNewRecording={vi.fn()} />)

    expect(screen.getByText('Arquivo inteligente')).toBeInTheDocument()
    expect(screen.getByText('Painel de leitura')).toBeInTheDocument()
    expect(screen.getByText('Reunião de Produto')).toBeInTheDocument()
    expect(screen.getByText('1 sessão')).toBeInTheDocument()
    expect(screen.getByText('Priorizar onboarding')).toBeInTheDocument()
    expect(screen.getByText('Higor revisar backlog')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /ações da reunião reunião de produto/i })).toBeInTheDocument()

    await userEvent.click(screen.getByText('Reunião de Produto'))

    expect(screen.getByText('Priorizar onboarding')).toBeInTheDocument()
    expect(screen.getByText('Higor revisar backlog')).toBeInTheDocument()
  })

  it('renders the rich meeting insights saved by the audio processor', () => {
    mockMeetingStorage.getAllMeetings.mockReturnValue([richMeeting])

    render(<MeetingsList onNewRecording={vi.fn()} />)

    expect(screen.getByText('4 decisões')).toBeInTheDocument()
    expect(screen.getByText('1 ação')).toBeInTheDocument()
    expect(screen.getByText('Timeline da reunião')).toBeInTheDocument()
    expect(screen.getByText('Abertura')).toBeInTheDocument()
    expect(screen.getByText('Contexto do problema e alinhamento inicial.')).toBeInTheDocument()
    expect(screen.getByText('Categorias')).toBeInTheDocument()
    expect(screen.getByText('Planejamento')).toBeInTheDocument()
    expect(screen.getByText('Insights da IA')).toBeInTheDocument()
    expect(screen.getByText('Produtiva')).toBeInTheDocument()
    expect(screen.getByText('Análise de participação')).toBeInTheDocument()
    expect(screen.getByText('Priorizou o backlog')).toBeInTheDocument()
    expect(screen.getByText('Transcrição completa')).toBeInTheDocument()
    expect(screen.getByText('Transcrição completa com decisões e próximos passos.')).toBeInTheDocument()
  })
})
