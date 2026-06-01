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

const advancedMetricsMeeting = {
  ...richMeeting,
  id: 'meeting-advanced',
  summary: {
    ...richMeeting.summary,
    decisions: ['Decidido refatorar o layout', 'Aprovado deploy na sexta-feira'],
    topicBreakdown: [
      { topic: 'Design System', percentage: 60 },
      { topic: 'Infraestrutura', percentage: 40 },
    ],
    sentimentTimeline: [
      { phase: 'Abertura', sentiment: 'Focado' },
      { phase: 'Fechamento', sentiment: 'Produtivo' },
    ],
    actionItems: [
      'Refatorar a lateral do console [Responsável: Higor Dev]',
      'Configurar vitest em ambiente CI [Responsável: Ana]',
    ],
  },
}

describe('MeetingsList', () => {
  beforeEach(() => {
    mockMeetingStorage.getAllMeetings.mockResolvedValue([])
  })

  it('renders a studio empty state with a recording action', async () => {
    render(<MeetingsList onNewRecording={vi.fn()} />)

    expect(await screen.findByText('Nenhuma reunião no console')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /gravar nova reunião/i })).toBeInTheDocument()
  })

  it('renders the empty state in English when requested', async () => {
    render(<MeetingsList locale="en" onNewRecording={vi.fn()} />)

    expect(await screen.findByText('No meetings in the console')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /record new meeting/i })).toBeInTheDocument()
  })

  it('renders operational history metrics and expands meeting details', async () => {
    mockMeetingStorage.getAllMeetings.mockResolvedValue([meeting])

    render(<MeetingsList onNewRecording={vi.fn()} />)

    expect(await screen.findByText('Arquivo inteligente')).toBeInTheDocument()
    expect(screen.getByText('Painel de leitura')).toBeInTheDocument()
    expect(screen.getAllByText('Reunião de Produto')[0]).toBeInTheDocument()
    expect(screen.getByText('1 sessão')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /ações da reunião reunião de produto/i })).toBeInTheDocument()

    // Switch to actions tab to view tasks
    await userEvent.click(screen.getByRole('button', { name: /ações e tarefas/i }))
    expect(screen.getByText('Priorizar onboarding')).toBeInTheDocument()
    expect(screen.getByText('Higor revisar backlog')).toBeInTheDocument()

    await userEvent.click(screen.getAllByText('Reunião de Produto')[0])

    expect(screen.getByText('Priorizar onboarding')).toBeInTheDocument()
    expect(screen.getByText('Higor revisar backlog')).toBeInTheDocument()
  })

  it('renders the rich meeting insights saved by the audio processor', async () => {
    mockMeetingStorage.getAllMeetings.mockResolvedValue([richMeeting])

    render(<MeetingsList onNewRecording={vi.fn()} />)

    expect(await screen.findByText('4 decisões')).toBeInTheDocument()
    expect(screen.getByText('1 ação')).toBeInTheDocument()
    expect(screen.getByText('Timeline da reunião')).toBeInTheDocument()
    expect(screen.getByText('Abertura')).toBeInTheDocument()
    expect(screen.getByText('Contexto do problema e alinhamento inicial.')).toBeInTheDocument()
    expect(screen.getByText('Categorias')).toBeInTheDocument()
    expect(screen.getAllByText('Planejamento')[0]).toBeInTheDocument()

    // Switch to metrics tab to view AI Insights, Sentiment and Participation Analysis
    await userEvent.click(screen.getByRole('button', { name: /participação e métricas/i }))
    expect(screen.getByText('Insights da IA')).toBeInTheDocument()
    expect(screen.getByText('Produtiva')).toBeInTheDocument()
    expect(screen.getByText('Análise de participação')).toBeInTheDocument()
    expect(screen.getByText('Priorizou o backlog')).toBeInTheDocument()

    // Switch to transcript tab to view transcript
    await userEvent.click(screen.getByRole('button', { name: /transcrição/i }))
    expect(screen.getByText('Transcrição completa')).toBeInTheDocument()
    expect(screen.getByText('Transcrição completa com decisões e próximos passos.')).toBeInTheDocument()
  })

  it('renders the advanced AI analytics metrics (decisions, topic breakdown, sentiment progression and responsible badges)', async () => {
    mockMeetingStorage.getAllMeetings.mockResolvedValue([advancedMetricsMeeting])

    render(<MeetingsList onNewRecording={vi.fn()} />)

    // Expand the meeting details
    const elements = await screen.findAllByText('Reunião de Produto')
    await userEvent.click(elements[0])

    // Switch to actions tab
    await userEvent.click(screen.getByRole('button', { name: /ações e tarefas/i }))

    // Assert decisions are present
    expect(screen.getByText('Decisões em Destaque')).toBeInTheDocument()
    expect(screen.getByText('Decidido refatorar o layout')).toBeInTheDocument()
    expect(screen.getByText('Aprovado deploy na sexta-feira')).toBeInTheDocument()

    // Assert clean action items (without brackets) and responsible badges are present
    expect(screen.getByText('Refatorar a lateral do console')).toBeInTheDocument()
    expect(screen.getByText('Higor Dev')).toBeInTheDocument()
    expect(screen.getByText('Configurar vitest em ambiente CI')).toBeInTheDocument()
    expect(screen.getByText('Ana')).toBeInTheDocument()

    // Switch to metrics tab
    await userEvent.click(screen.getByRole('button', { name: /participação e métricas/i }))

    // Assert topic breakdown is present
    expect(screen.getByText('Distribuição de Tópicos')).toBeInTheDocument()
    expect(screen.getByText('Design System')).toBeInTheDocument()
    expect(screen.getByText('Infraestrutura')).toBeInTheDocument()

    // Assert sentiment timeline is present
    expect(screen.getByText('Evolução do Sentimento')).toBeInTheDocument()
    expect(screen.getByText('Focado')).toBeInTheDocument()
    expect(screen.getByText('Fechamento')).toBeInTheDocument()
    expect(screen.getByText('Produtivo')).toBeInTheDocument()
  })

  it('allows editing participant name and role and propagates changes across meeting summary fields', async () => {
    mockMeetingStorage.saveMeeting = vi.fn().mockResolvedValue(true)
    mockMeetingStorage.getAllMeetings.mockResolvedValue([advancedMetricsMeeting])

    render(<MeetingsList onNewRecording={vi.fn()} />)

    // Expand the meeting details
    const elements = await screen.findAllByText('Reunião de Produto')
    await userEvent.click(elements[0])

    // Switch to metrics tab
    await userEvent.click(screen.getByRole('button', { name: /participação e métricas/i }))

    // Assert participant is visible
    expect(screen.getByText('Higor')).toBeInTheDocument()

    // Trigger edit mode
    const editBtn = screen.getByTitle('Editar orador')
    await userEvent.click(editBtn)

    // Query the inputs by display value
    const nameInput = screen.getByDisplayValue('Higor')
    const roleInput = screen.getByDisplayValue('Facilitador')

    // Change name and role
    await userEvent.clear(nameInput)
    await userEvent.type(nameInput, 'Higor Dev')
    await userEvent.clear(roleInput)
    await userEvent.type(roleInput, 'Tech Lead')

    // Save changes
    const saveBtn = screen.getByRole('button', { name: 'Salvar' })
    await userEvent.click(saveBtn)

    // Assert storage save was called with the updated name
    expect(mockMeetingStorage.saveMeeting).toHaveBeenCalled()
    const saved = mockMeetingStorage.saveMeeting.mock.calls[0][0]
    expect(saved.summary.participationAnalysis?.[0]?.participant).toBe('Higor Dev')
    expect(saved.summary.participationAnalysis?.[0]?.role).toBe('Tech Lead')
    expect(saved.summary.participants).toContain('Higor Dev')
  })

  it('filters meeting list by selected company and updates dashboard analytics', async () => {
    const meetingA = {
      ...meeting,
      id: 'meeting-a',
      title: 'Meeting Alpha',
      company: 'Company A',
      summary: {
        ...meeting.summary,
        title: 'Meeting Alpha',
        actionItems: ['Tarefa Alpha 1', 'Tarefa Alpha 2'],
      }
    }
    const meetingB = {
      ...meeting,
      id: 'meeting-b',
      title: 'Meeting Beta',
      company: 'Company B',
      summary: {
        ...meeting.summary,
        title: 'Meeting Beta',
        actionItems: ['Tarefa Beta 1'],
      }
    }

    mockMeetingStorage.getAllMeetings.mockResolvedValue([meetingA, meetingB])

    render(<MeetingsList onNewRecording={vi.fn()} />)

    // Wait for meetings to render
    const elementsAlpha = await screen.findAllByText('Meeting Alpha')
    expect(elementsAlpha[0]).toBeInTheDocument()
    
    const elementsBeta = await screen.findAllByText('Meeting Beta')
    expect(elementsBeta[0]).toBeInTheDocument()

    // Open company filter dropdown
    const filterBtn = screen.getByRole('button', { name: /todas as empresas/i })
    await userEvent.click(filterBtn)

    // Select Company A
    const companyAOption = screen.getByRole('menuitem', { name: 'Company A' })
    await userEvent.click(companyAOption)

    // Assert meeting list filtered
    expect(screen.getAllByText('Meeting Alpha')[0]).toBeInTheDocument()
    expect(screen.queryByText('Meeting Beta')).not.toBeInTheDocument()

    // Open company filter dropdown again
    const updatedFilterBtn = screen.getByRole('button', { name: 'Company A' })
    await userEvent.click(updatedFilterBtn)

    // Select Without Company / Sem Empresa
    const noneOption = screen.getByRole('menuitem', { name: /sem empresa/i })
    await userEvent.click(noneOption)

    // Assert both are hidden since both have companies
    expect(screen.queryByText('Meeting Alpha')).not.toBeInTheDocument()
    expect(screen.queryByText('Meeting Beta')).not.toBeInTheDocument()
  })

  it('allows inline editing of meeting title and company and persists to storage', async () => {
    mockMeetingStorage.saveMeeting = vi.fn().mockResolvedValue(true)
    const initialMeeting = {
      ...meeting,
      id: 'meeting-edit-test',
      title: 'Initial Title',
      company: undefined,
      summary: {
        ...meeting.summary,
        title: 'Initial Title',
      }
    }

    mockMeetingStorage.getAllMeetings.mockResolvedValue([initialMeeting])

    render(<MeetingsList onNewRecording={vi.fn()} />)

    // Select the meeting
    const elements = await screen.findAllByText('Initial Title')
    await userEvent.click(elements[0])

    // Trigger Title Edit
    const editTitleBtn = screen.getByTitle('Editar Título')
    await userEvent.click(editTitleBtn)

    // Change title and save
    const titleInput = screen.getByDisplayValue('Initial Title')
    await userEvent.clear(titleInput)
    await userEvent.type(titleInput, 'Super Awesome Title')
    
    // Save via Enter key
    await userEvent.keyboard('{Enter}')

    expect(mockMeetingStorage.saveMeeting).toHaveBeenCalled()
    expect(mockMeetingStorage.saveMeeting.mock.calls[0][0].title).toBe('Super Awesome Title')
    expect(mockMeetingStorage.saveMeeting.mock.calls[0][0].summary.title).toBe('Super Awesome Title')

    // Reset mock calls for next edit
    vi.mocked(mockMeetingStorage.saveMeeting).mockClear()

    // Trigger Company Associate
    const assocCompanyBadge = screen.getByTitle('Clique para associar empresa')
    await userEvent.click(assocCompanyBadge)

    // Change company name and save
    const companyInput = screen.getByPlaceholderText('Empresa')
    await userEvent.type(companyInput, 'My New Company')

    // Save via Enter key
    await userEvent.keyboard('{Enter}')

    expect(mockMeetingStorage.saveMeeting).toHaveBeenCalled()
    expect(mockMeetingStorage.saveMeeting.mock.calls[0][0].company).toBe('My New Company')
  })

  it('allows marking a participant as Me and filters tasks correctly on the checklist and dashboard', async () => {
    mockMeetingStorage.getAllMeetings.mockResolvedValue([advancedMetricsMeeting])
    
    render(<MeetingsList onNewRecording={vi.fn()} />)
    
    // Wait for meetings to load
    const elements = await screen.findAllByText('Reunião de Produto')
    expect(elements[0]).toBeInTheDocument()

    // Check that 'Minhas Tarefas' card says 'Nenhum perfil' or similar initially
    expect(screen.getByText(/nenhum perfil/i)).toBeInTheDocument()

    // Expand the meeting details
    await userEvent.click(elements[0])

    // Switch to metrics tab
    await userEvent.click(screen.getByRole('button', { name: /participação e métricas/i }))

    // Mark 'Higor' as 'Me' by clicking the person icon
    const personIconBtn = screen.getByTitle('Este sou eu')
    await userEvent.click(personIconBtn)

    // Verify Me badge appears next to Higor
    expect(screen.getByText('Eu')).toBeInTheDocument()

    // Switch to Dashboard
    await userEvent.click(screen.getByRole('button', { name: /dashboard/i }))

    // Now 'Minhas Tarefas' card should show stats (e.g. 0/1 or 0/2)
    expect(screen.getByText('Perfil: Higor')).toBeInTheDocument()

    // Filter dashboard tasks
    const myTasksFilterBtn = screen.getByRole('button', { name: /minhas tarefas/i })
    await userEvent.click(myTasksFilterBtn)

    // Switch back to reader view
    await userEvent.click(screen.getByRole('button', { name: /leitura/i }))

    // Switch to actions tab
    await userEvent.click(screen.getByRole('button', { name: /ações e tarefas/i }))

    // Verify task filter button exists on standard checklist
    const actionsFilterBtn = screen.getByRole('button', { name: /apenas minhas tarefas/i })
    expect(actionsFilterBtn).toBeInTheDocument()
    await userEvent.click(actionsFilterBtn)
  })
})
