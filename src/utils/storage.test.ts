import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MeetingStorage, type MeetingRecord } from './storage'

const meeting: MeetingRecord = {
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

describe('MeetingStorage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns true when the meeting is saved locally', async () => {
    const saved = await MeetingStorage.saveMeeting(meeting)
    expect(saved).toBe(true)
    
    const list = await MeetingStorage.getAllMeetings()
    expect(list).toHaveLength(1)
  })

  it('returns false when local storage rejects the write', async () => {
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded')
    })
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    const saved = await MeetingStorage.saveMeeting(meeting)
    expect(saved).toBe(false)
  })
})
