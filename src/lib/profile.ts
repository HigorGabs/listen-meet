'use client'

export interface Collaborator {
  id: string
  name: string
  role: string
  company: string
}

export interface UserProfile {
  name: string
  avatar?: string // base64 string
  avatarColor?: string // gradient preset class
  rolesByCompany: Record<string, string> // companyName -> role
  companies: string[]
  collaborators: Collaborator[]
  defaultCompany?: string
  defaultTemplate?: 'default' | 'daily' | 'oneOnOne'
}

export const PROFILE_STORAGE_KEY = 'listen-meet-profile-data'
export const LEGACY_ME_NAME_KEY = 'listen-meet-me-name'

export const AVATAR_GRADIENTS = [
  'from-violet-600 to-indigo-600 shadow-indigo-500/30',
  'from-emerald-500 to-teal-600 shadow-teal-500/30',
  'from-pink-500 to-rose-600 shadow-rose-500/30',
  'from-amber-400 to-orange-500 shadow-orange-500/30',
  'from-sky-400 to-blue-600 shadow-blue-500/30',
  'from-fuchsia-600 to-purple-600 shadow-purple-500/30',
]

export const DEFAULT_PROFILE: UserProfile = {
  name: '',
  avatarColor: AVATAR_GRADIENTS[0],
  rolesByCompany: {},
  companies: ['Listen'],
  collaborators: [],
  defaultCompany: 'Listen',
  defaultTemplate: 'default',
}

/**
 * Loads the user profile from local storage, handles legacy migrations if needed
 */
export function getProfile(): UserProfile {
  if (typeof window === 'undefined') return DEFAULT_PROFILE

  try {
    const stored = localStorage.getItem(PROFILE_STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored) as UserProfile
      
      // Ensure arrays and objects exist in loaded profile
      return {
        ...DEFAULT_PROFILE,
        ...parsed,
        rolesByCompany: parsed.rolesByCompany || {},
        companies: parsed.companies || ['Listen'],
        collaborators: parsed.collaborators || [],
      }
    }

    // Try migration from legacy me name
    const legacyMeName = localStorage.getItem(LEGACY_ME_NAME_KEY)
    if (legacyMeName) {
      const migrated = {
        ...DEFAULT_PROFILE,
        name: legacyMeName,
      }
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(migrated))
      return migrated
    }

    return DEFAULT_PROFILE
  } catch (error) {
    console.error('Failed to parse user profile settings:', error)
    return DEFAULT_PROFILE
  }
}

/**
 * Saves the user profile to local storage and keeps legacy me-name key synced
 */
export function saveProfile(profile: UserProfile): boolean {
  if (typeof window === 'undefined') return false

  try {
    // Keep arrays clean
    const cleanedProfile: UserProfile = {
      ...profile,
      companies: Array.from(new Set(profile.companies.filter(Boolean))).sort(),
      collaborators: profile.collaborators.map(c => ({
        ...c,
        name: c.name.trim(),
        role: c.role.trim(),
        company: c.company || 'outros',
      })),
    }

    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(cleanedProfile))

    // Keep legacy name key in sync for backwards compatibility with MeetingsList.tsx
    if (cleanedProfile.name) {
      localStorage.setItem(LEGACY_ME_NAME_KEY, cleanedProfile.name)
    } else {
      localStorage.removeItem(LEGACY_ME_NAME_KEY)
    }

    return true
  } catch (error) {
    console.error('Failed to save user profile settings:', error)
    return false
  }
}
