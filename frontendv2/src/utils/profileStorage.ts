import type { ProfileState } from '../types/buildingProfile'

const STORAGE_KEY = 'heatsync-building-profile-v1'

export function saveProfileState(state: ProfileState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // silent fail
  }
}

export function loadProfileState(): ProfileState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (
      parsed === null ||
      typeof parsed !== 'object' ||
      !('activeProfileId' in parsed) ||
      !('siteValues' in parsed) ||
      !('calibration' in parsed)
    ) {
      return null
    }
    const state = parsed as ProfileState
    if (
      typeof state.activeProfileId !== 'string' ||
      state.siteValues === null ||
      typeof state.siteValues !== 'object' ||
      state.calibration === null ||
      typeof state.calibration !== 'object'
    ) {
      return null
    }
    return state
  } catch {
    return null
  }
}

export function clearProfileState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // silent fail
  }
}
