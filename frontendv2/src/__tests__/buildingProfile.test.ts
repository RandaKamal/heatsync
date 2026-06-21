import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { BUILDING_PROFILES } from '../data/buildingProfiles'
import { validateOccupancyParams, validateComfortParams } from '../utils/profileValidation'
import { saveProfileState, loadProfileState, clearProfileState } from '../utils/profileStorage'
import { stageAfter, stageFromProgress } from '../utils/profileCalibration'
import { calcLeadMinutes } from '../utils/eventLeadTime'
import type { ProfileState } from '../types/buildingProfile'

// ── localStorage mock ─────────────────────────────────────────────────────────
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
  }
})()

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
})

// ── 1. All 3 profiles present ─────────────────────────────────────────────────
describe('BUILDING_PROFILES', () => {
  it('has all 3 profiles', () => {
    expect(BUILDING_PROFILES).toHaveLength(3)
  })

  it('includes temporary-lecture-hall', () => {
    expect(BUILDING_PROFILES.find((p) => p.id === 'temporary-lecture-hall')).toBeDefined()
  })

  it('includes event-tent', () => {
    expect(BUILDING_PROFILES.find((p) => p.id === 'event-tent')).toBeDefined()
  })

  it('includes temporary-office', () => {
    expect(BUILDING_PROFILES.find((p) => p.id === 'temporary-office')).toBeDefined()
  })

  // ── 2. Each profile has required fields ────────────────────────────────────
  it.each(BUILDING_PROFILES)('profile $id has required fields', (profile) => {
    expect(profile.id).toBeTruthy()
    expect(profile.name).toBeTruthy()
    expect(profile.description).toBeTruthy()
    expect(profile.icon).toBeTruthy()
    expect(profile.building).toBeDefined()
    expect(profile.thermal).toBeDefined()
    expect(profile.occupancy).toBeDefined()
    expect(profile.comfort).toBeDefined()
    expect(profile.calibration).toBeDefined()
    expect(typeof profile.calibration.initialConfidencePercent).toBe('number')
    expect(typeof profile.calibration.recommendedCalibrationHours).toBe('number')
  })
})

// ── 3-4. Occupancy validation ─────────────────────────────────────────────────
describe('validateOccupancyParams', () => {
  const base = BUILDING_PROFILES[0].occupancy

  it('returns error when typicalOccupancy > maximumOccupancy', () => {
    const errors = validateOccupancyParams({
      ...base,
      typicalOccupancy: 300,
      maximumOccupancy: 100,
    })
    expect(errors.typicalOccupancy).toBeTruthy()
  })

  it('returns no error for valid occupancy params', () => {
    const errors = validateOccupancyParams(base)
    expect(Object.keys(errors)).toHaveLength(0)
  })
})

// ── 5-6. Comfort validation ───────────────────────────────────────────────────
describe('validateComfortParams', () => {
  const base = BUILDING_PROFILES[0].comfort

  it('returns error when heatingComfortMinC >= heatingComfortMaxC', () => {
    const errors = validateComfortParams({
      ...base,
      heatingComfortMinC: 23,
      heatingComfortMaxC: 21,
    })
    expect(errors.heatingComfortMinC).toBeTruthy()
  })

  it('returns error when coolingComfortMinC > coolingComfortMaxC', () => {
    const errors = validateComfortParams({
      ...base,
      coolingComfortMinC: 27,
      coolingComfortMaxC: 25,
    })
    expect(errors.coolingComfortMinC).toBeTruthy()
  })

  it('returns no error for valid comfort params', () => {
    const errors = validateComfortParams(base)
    expect(Object.keys(errors)).toHaveLength(0)
  })
})

// ── 7-10. Persistence ─────────────────────────────────────────────────────────
describe('profileStorage', () => {
  const profile = BUILDING_PROFILES[0]
  const mockState: ProfileState = {
    activeProfileId: profile.id,
    siteValues: {
      building: { ...profile.building },
      thermal: { ...profile.thermal },
      occupancy: { ...profile.occupancy },
      comfort: { ...profile.comfort },
    },
    calibration: {
      stage: 'not-started',
      progressPercent: 0,
      confidencePercent: profile.calibration.initialConfidencePercent,
      paused: false,
    },
    wizardStep: 'selecting',
    scheduleImported: false,
  }

  beforeEach(() => {
    localStorageMock.clear()
  })

  afterEach(() => {
    localStorageMock.clear()
  })

  it('save and load returns the same activeProfileId', () => {
    saveProfileState(mockState)
    const loaded = loadProfileState()
    expect(loaded?.activeProfileId).toBe(profile.id)
  })

  it('returns null when key missing', () => {
    const result = loadProfileState()
    expect(result).toBeNull()
  })

  it('returns null for malformed JSON', () => {
    localStorage.setItem('heatsync-building-profile-v1', 'not{valid json')
    const result = loadProfileState()
    expect(result).toBeNull()
  })

  it('returns null when required fields missing', () => {
    localStorage.setItem('heatsync-building-profile-v1', JSON.stringify({ foo: 'bar' }))
    const result = loadProfileState()
    expect(result).toBeNull()
  })
})

// ── 11-13. stageAfter ─────────────────────────────────────────────────────────
describe('stageAfter', () => {
  it('baseline-observation → controlled-heating', () => {
    expect(stageAfter('baseline-observation')).toBe('controlled-heating')
  })

  it('advances through all stages in order', () => {
    expect(stageAfter('not-started')).toBe('baseline-observation')
    expect(stageAfter('baseline-observation')).toBe('controlled-heating')
    expect(stageAfter('controlled-heating')).toBe('thermal-decay')
    expect(stageAfter('thermal-decay')).toBe('parameter-fitting')
    expect(stageAfter('parameter-fitting')).toBe('ready')
  })

  it('ready stays at ready', () => {
    expect(stageAfter('ready')).toBe('ready')
  })
})

// ── 14-17. calcLeadMinutes ────────────────────────────────────────────────────
describe('calcLeadMinutes', () => {
  it('lower confidence yields higher lead time (within clamp range)', () => {
    // Use params that keep both results well below 120 to avoid clamping collision
    const highConf = calcLeadMinutes({
      currentTempC: 20,
      targetTempC: 21,
      heatingRateCPerHour: 1.8,
      confidencePercent: 90,
      heatingEfficiencyIndex: 0.76,
    })
    const lowConf = calcLeadMinutes({
      currentTempC: 20,
      targetTempC: 21,
      heatingRateCPerHour: 1.8,
      confidencePercent: 10,
      heatingEfficiencyIndex: 0.76,
    })
    expect(lowConf).toBeGreaterThan(highConf)
  })

  it('returns 10 when already at or above target temperature', () => {
    const result = calcLeadMinutes({
      currentTempC: 22,
      targetTempC: 21,
      heatingRateCPerHour: 1.8,
      confidencePercent: 85,
      heatingEfficiencyIndex: 0.76,
    })
    expect(result).toBe(10)
  })

  it('clamps to 120 max for very cold rooms', () => {
    const result = calcLeadMinutes({
      currentTempC: -10,
      targetTempC: 21,
      heatingRateCPerHour: 0.5,
      confidencePercent: 5,
      heatingEfficiencyIndex: 0.3,
    })
    expect(result).toBe(120)
  })

  it('clamps to 5 min minimum', () => {
    // Very fast heating, very close to target, very high confidence and efficiency
    const result = calcLeadMinutes({
      currentTempC: 20.99,
      targetTempC: 21,
      heatingRateCPerHour: 100,
      confidencePercent: 100,
      heatingEfficiencyIndex: 1.0,
    })
    expect(result).toBe(5)
  })

  it('stageFromProgress maps 0 to baseline-observation', () => {
    expect(stageFromProgress(0)).toBe('baseline-observation')
  })

  it('stageFromProgress maps 100 to ready', () => {
    expect(stageFromProgress(100)).toBe('ready')
  })
})
