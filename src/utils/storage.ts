import {
  buildAllMeetingsTxt,
  buildMeetingTxt,
  type MeetingRecord,
} from '@/lib/meeting-summary'

export type { MeetingRecord } from '@/lib/meeting-summary'

export class MeetingStorage {
  private static STORAGE_KEY = 'listen-meet-recordings'
  private static MAX_RECORDINGS = 50
  private static DB_NAME = 'listen-meet-db'
  private static STORE_NAME = 'meetings'
  private static DB_VERSION = 1
  private static migrationPromise: Promise<void> | null = null

  private static isIndexedDBSupported(): boolean {
    return typeof window !== 'undefined' && !!window.indexedDB
  }

  private static getDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          db.createObjectStore(this.STORE_NAME, { keyPath: 'id' })
        }
      }
    })
  }

  private static async checkAndMigrateLegacy(): Promise<void> {
    if (!this.isIndexedDBSupported()) return

    if (this.migrationPromise) {
      return this.migrationPromise
    }

    this.migrationPromise = (async () => {
      try {
        const legacyData = localStorage.getItem(this.STORAGE_KEY)
        if (legacyData) {
          const legacyMeetings = JSON.parse(legacyData) as MeetingRecord[]
          if (legacyMeetings && legacyMeetings.length > 0) {
            const db = await this.getDB()
            const tx = db.transaction(this.STORE_NAME, 'readwrite')
            const store = tx.objectStore(this.STORE_NAME)
            
            for (const meeting of legacyMeetings) {
              store.put(meeting)
            }

            await new Promise<void>((resolve, reject) => {
              tx.oncomplete = () => resolve()
              tx.onerror = () => reject(tx.error)
            })
            
            console.log(`Successfully migrated ${legacyMeetings.length} meetings to IndexedDB.`)
          }
          localStorage.removeItem(this.STORAGE_KEY)
        }
      } catch (error) {
        console.error('Error migrating legacy meetings:', error)
      }
    })()

    return this.migrationPromise
  }

  // Fallback storage methods (localStorage)
  private static saveMeetingLocalStorage(meeting: MeetingRecord): boolean {
    try {
      const recordings = this.getAllMeetingsLocalStorage()
      
      // Check if duplicate ID exists, delete it first
      const filtered = recordings.filter(r => r.id !== meeting.id)
      filtered.unshift(meeting)
      
      if (filtered.length > this.MAX_RECORDINGS) {
        filtered.splice(this.MAX_RECORDINGS)
      }
      
      // Store without audio blob for localStorage
      const recordingsToStore = filtered.map(r => ({
        ...r,
        audioBlob: undefined
      }))
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(recordingsToStore))
      return true
    } catch (error) {
      console.error('Error saving to localStorage:', error)
      return false
    }
  }

  private static getAllMeetingsLocalStorage(): MeetingRecord[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      if (!stored) return []
      
      const recordings = JSON.parse(stored)
      return recordings.sort((a: MeetingRecord, b: MeetingRecord) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      )
    } catch (error) {
      console.error('Error loading from localStorage:', error)
      return []
    }
  }

  private static deleteMeetingLocalStorage(id: string): void {
    try {
      const meetings = this.getAllMeetingsLocalStorage()
      const filtered = meetings.filter(m => m.id !== id)
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered))
    } catch (error) {
      console.error('Error deleting from localStorage:', error)
    }
  }

  // Public Async API (IndexedDB with automatic fallbacks)
  static async saveMeeting(meeting: MeetingRecord): Promise<boolean> {
    await this.checkAndMigrateLegacy()

    if (!this.isIndexedDBSupported()) {
      return this.saveMeetingLocalStorage(meeting)
    }

    try {
      const db = await this.getDB()
      
      // Get all meetings to cap list size
      const all = await this.getAllMeetingsFromDB(db)
      
      // Remove item if it already exists (updating)
      const filtered = all.filter(m => m.id !== meeting.id)
      filtered.unshift(meeting)
      
      if (filtered.length > this.MAX_RECORDINGS) {
        const toDelete = filtered.slice(this.MAX_RECORDINGS)
        const deleteTx = db.transaction(this.STORE_NAME, 'readwrite')
        const deleteStore = deleteTx.objectStore(this.STORE_NAME)
        for (const item of toDelete) {
          deleteStore.delete(item.id)
        }
        await new Promise<void>((res, rej) => {
          deleteTx.oncomplete = () => res()
          deleteTx.onerror = () => rej(deleteTx.error)
        })
      }

      const tx = db.transaction(this.STORE_NAME, 'readwrite')
      const store = tx.objectStore(this.STORE_NAME)
      store.put(meeting)
      
      return new Promise<boolean>((resolve) => {
        tx.oncomplete = () => resolve(true)
        tx.onerror = () => {
          console.error('IndexedDB put error, falling back to localStorage:', tx.error)
          resolve(this.saveMeetingLocalStorage(meeting))
        }
      })
    } catch (error) {
      console.error('Error saving meeting in IndexedDB, falling back to localStorage:', error)
      return this.saveMeetingLocalStorage(meeting)
    }
  }

  private static getAllMeetingsFromDB(db: IDBDatabase): Promise<MeetingRecord[]> {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.STORE_NAME, 'readonly')
      const store = tx.objectStore(this.STORE_NAME)
      const request = store.getAll()
      request.onsuccess = () => {
        const results = request.result || []
        results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        resolve(results)
      }
      request.onerror = () => reject(request.error)
    })
  }

  static async getAllMeetings(): Promise<MeetingRecord[]> {
    await this.checkAndMigrateLegacy()

    if (!this.isIndexedDBSupported()) {
      return this.getAllMeetingsLocalStorage()
    }

    try {
      const db = await this.getDB()
      return await this.getAllMeetingsFromDB(db)
    } catch (error) {
      console.error('Error loading meetings from IndexedDB, falling back to localStorage:', error)
      return this.getAllMeetingsLocalStorage()
    }
  }

  static async getMeeting(id: string): Promise<MeetingRecord | null> {
    await this.checkAndMigrateLegacy()

    if (!this.isIndexedDBSupported()) {
      const meetings = this.getAllMeetingsLocalStorage()
      return meetings.find(m => m.id === id) || null
    }

    try {
      const db = await this.getDB()
      return await new Promise<MeetingRecord | null>((resolve) => {
        const tx = db.transaction(this.STORE_NAME, 'readonly')
        const store = tx.objectStore(this.STORE_NAME)
        const request = store.get(id)
        request.onsuccess = () => resolve(request.result || null)
        request.onerror = () => {
          console.warn('IndexedDB get error, falling back to localStorage:', request.error)
          const meetings = this.getAllMeetingsLocalStorage()
          resolve(meetings.find(m => m.id === id) || null)
        }
      })
    } catch (error) {
      console.error('Error loading meeting from IndexedDB, falling back to localStorage:', error)
      const meetings = this.getAllMeetingsLocalStorage()
      return meetings.find(m => m.id === id) || null
    }
  }

  static async deleteMeeting(id: string): Promise<void> {
    await this.checkAndMigrateLegacy()

    if (!this.isIndexedDBSupported()) {
      this.deleteMeetingLocalStorage(id)
      return
    }

    try {
      const db = await this.getDB()
      return await new Promise<void>((resolve) => {
        const tx = db.transaction(this.STORE_NAME, 'readwrite')
        const store = tx.objectStore(this.STORE_NAME)
        const request = store.delete(id)
        request.onsuccess = () => resolve()
        request.onerror = () => {
          console.warn('IndexedDB delete error, falling back to localStorage:', request.error)
          this.deleteMeetingLocalStorage(id)
          resolve()
        }
      })
    } catch (error) {
      console.error('Error deleting meeting from IndexedDB, falling back to localStorage:', error)
      this.deleteMeetingLocalStorage(id)
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

  static async exportAllMeetings(): Promise<void> {
    const meetings = await this.getAllMeetings()
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

  static async getStorageStats(): Promise<{ count: number; sizeKB: number }> {
    if (!this.isIndexedDBSupported()) {
      try {
        const data = localStorage.getItem(this.STORAGE_KEY) || ''
        return {
          count: this.getAllMeetingsLocalStorage().length,
          sizeKB: Math.round(new Blob([data]).size / 1024)
        }
      } catch {
        return { count: 0, sizeKB: 0 }
      }
    }

    try {
      const db = await this.getDB()
      const meetings = await this.getAllMeetingsFromDB(db)
      
      let totalBytes = 0
      for (const m of meetings) {
        const recordStr = JSON.stringify({ ...m, audioBlob: undefined })
        totalBytes += new Blob([recordStr]).size
        if (m.audioBlob) {
          totalBytes += m.audioBlob.size
        }
      }

      return {
        count: meetings.length,
        sizeKB: Math.round(totalBytes / 1024)
      }
    } catch {
      try {
        const data = localStorage.getItem(this.STORAGE_KEY) || ''
        return {
          count: this.getAllMeetingsLocalStorage().length,
          sizeKB: Math.round(new Blob([data]).size / 1024)
        }
      } catch {
        return { count: 0, sizeKB: 0 }
      }
    }
  }
}
