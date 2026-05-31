import {
  buildAllMeetingsTxt,
  buildMeetingTxt,
  type MeetingRecord,
} from '@/lib/meeting-summary'

export type { MeetingRecord } from '@/lib/meeting-summary'

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
    } catch (error) {
      console.error('Error deleting meeting:', error)
    }
  }

  static downloadMeetingTxt(meeting: MeetingRecord): void {
    const content = buildMeetingTxt(meeting)

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
    const allContent = buildAllMeetingsTxt(meetings)

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
