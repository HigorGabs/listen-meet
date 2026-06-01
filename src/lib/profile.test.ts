import { describe, expect, it, beforeEach } from 'vitest'
import {
  getProfile,
  saveProfile,
  DEFAULT_PROFILE,
  PROFILE_STORAGE_KEY,
  LEGACY_ME_NAME_KEY,
  UserProfile,
} from './profile'

describe('profile utilities', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns default profile if nothing is stored', () => {
    const profile = getProfile()
    expect(profile).toEqual(DEFAULT_PROFILE)
  })

  it('saves and retrieves user profile correctly', () => {
    const customProfile: UserProfile = {
      name: 'Higor Dev',
      avatar: 'data:image/jpeg;base64,123',
      avatarColor: 'from-pink-500 to-rose-600',
      rolesByCompany: {
        Listen: 'Tech Lead',
        Google: 'PO',
      },
      companies: ['Listen', 'Google'],
      collaborators: [
        {
          id: '1',
          name: 'Ana PO',
          role: 'PO',
          company: 'Listen',
        },
      ],
      defaultCompany: 'Listen',
      defaultTemplate: 'daily',
    }

    const saved = saveProfile(customProfile)
    expect(saved).toBe(true)

    const loaded = getProfile()
    expect(loaded.name).toBe('Higor Dev')
    expect(loaded.avatar).toBe('data:image/jpeg;base64,123')
    expect(loaded.rolesByCompany.Google).toBe('PO')
    expect(loaded.companies).toContain('Google')
    expect(loaded.collaborators[0].name).toBe('Ana PO')
    expect(loaded.defaultTemplate).toBe('daily')
  })

  it('migrates legacy me-name to profile successfully', () => {
    localStorage.setItem(LEGACY_ME_NAME_KEY, 'Legacy User')

    const loaded = getProfile()
    expect(loaded.name).toBe('Legacy User')
    expect(loaded.companies).toContain('Listen')
    
    // Should have saved migrated profile to profile storage key
    const rawStored = localStorage.getItem(PROFILE_STORAGE_KEY)
    expect(rawStored).not.toBeNull()
    const parsed = JSON.parse(rawStored!)
    expect(parsed.name).toBe('Legacy User')
  })

  it('syncs legacy me-name key on saving profile', () => {
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      name: 'New Name Sync',
    }

    saveProfile(profile)
    expect(localStorage.getItem(LEGACY_ME_NAME_KEY)).toBe('New Name Sync')

    profile.name = ''
    saveProfile(profile)
    expect(localStorage.getItem(LEGACY_ME_NAME_KEY)).toBeNull()
  })
})
