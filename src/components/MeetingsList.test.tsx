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
})
