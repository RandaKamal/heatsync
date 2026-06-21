import { useState, useEffect, useCallback } from 'react'
import type { ProfileState, BuildingParameters, ThermalParameters, OccupancyParameters, ComfortParameters } from '../types/buildingProfile'
import { BUILDING_PROFILES, DEFAULT_PROFILE_ID, CALIBRATION_ADJUSTMENTS } from '../data/buildingProfiles'
import { saveProfileState, loadProfileState } from '../utils/profileStorage'
import { stageFromProgress } from '../utils/profileCalibration'

function buildDefaultState(profileId: string): ProfileState {
  const profile = BUILDING_PROFILES.find((p) => p.id === profileId) ?? BUILDING_PROFILES[0]
  const state: ProfileState = {
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
  return state
}

function getInitialState(): ProfileState {
  const stored = loadProfileState()
  if (stored) {
    // Migrate old stored state that may not have wizardStep/scheduleImported
    const partial = stored as Partial<ProfileState> & Omit<ProfileState, 'wizardStep' | 'scheduleImported'>
    const migrated: ProfileState = {
      ...stored,
      wizardStep: partial.wizardStep ?? 'selecting',
      scheduleImported: partial.scheduleImported ?? false,
    }
    return migrated
  }
  return buildDefaultState(DEFAULT_PROFILE_ID)
}

export function useProfileState() {
  const [state, setState] = useState<ProfileState>(getInitialState)

  // Persist to localStorage on every state change
  useEffect(() => {
    saveProfileState(state)
  }, [state])

  // Calibration demo timer
  useEffect(() => {
    const { stage, paused } = state.calibration
    if (stage === 'not-started' || stage === 'ready' || paused) return

    const id = setInterval(() => {
      setState((prev) => {
        if (
          prev.calibration.stage === 'not-started' ||
          prev.calibration.stage === 'ready' ||
          prev.calibration.paused
        ) {
          return prev
        }
        const newProgress = Math.min(prev.calibration.progressPercent + 1, 100)
        const profile = BUILDING_PROFILES.find((p) => p.id === prev.activeProfileId)
        const initConf = profile?.calibration.initialConfidencePercent ?? 50
        const newConf = Math.round(initConf + 30 * newProgress / 100)

        if (newProgress >= 100) {
          const adjustments = CALIBRATION_ADJUSTMENTS[prev.activeProfileId] ?? {}
          return {
            ...prev,
            siteValues: {
              ...prev.siteValues,
              thermal: { ...prev.siteValues.thermal, ...adjustments },
            },
            calibration: {
              ...prev.calibration,
              stage: 'ready',
              progressPercent: 100,
              confidencePercent: newConf,
              completedAt: new Date().toISOString(),
              paused: false,
            },
          }
        }

        return {
          ...prev,
          calibration: {
            ...prev.calibration,
            stage: stageFromProgress(newProgress),
            progressPercent: newProgress,
            confidencePercent: newConf,
          },
        }
      })
    }, 100)

    return () => clearInterval(id)
  }, [state.calibration.stage, state.calibration.paused])

  const activeProfile = BUILDING_PROFILES.find((p) => p.id === state.activeProfileId) ?? BUILDING_PROFILES[0]

  // selectProfile: just update the active profile, stay on current wizard step
  const selectProfile = useCallback((profileId: string) => {
    const profile = BUILDING_PROFILES.find((p) => p.id === profileId) ?? BUILDING_PROFILES[0]
    setState((prev) => ({
      ...prev,
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
    }))
  }, [])

  const updateSiteValues = useCallback(
    (updates: {
      building?: Partial<BuildingParameters>
      thermal?: Partial<ThermalParameters>
      occupancy?: Partial<OccupancyParameters>
      comfort?: Partial<ComfortParameters>
    }) => {
      setState((prev) => ({
        ...prev,
        siteValues: {
          building: updates.building
            ? { ...prev.siteValues.building, ...updates.building }
            : prev.siteValues.building,
          thermal: updates.thermal
            ? { ...prev.siteValues.thermal, ...updates.thermal }
            : prev.siteValues.thermal,
          occupancy: updates.occupancy
            ? { ...prev.siteValues.occupancy, ...updates.occupancy }
            : prev.siteValues.occupancy,
          comfort: updates.comfort
            ? { ...prev.siteValues.comfort, ...updates.comfort }
            : prev.siteValues.comfort,
        },
      }))
    },
    [],
  )

  const resetToArchetype = useCallback(() => {
    setState((prev) => {
      const profile = BUILDING_PROFILES.find((p) => p.id === prev.activeProfileId) ?? BUILDING_PROFILES[0]
      return {
        ...prev,
        siteValues: {
          building: { ...profile.building },
          thermal: { ...profile.thermal },
          occupancy: { ...profile.occupancy },
          comfort: { ...profile.comfort },
        },
      }
    })
  }, [])

  const startCalibration = useCallback(() => {
    setState((prev) => ({
      ...prev,
      calibration: {
        ...prev.calibration,
        stage: 'baseline-observation',
        progressPercent: 0,
        startedAt: new Date().toISOString(),
        paused: false,
      },
    }))
  }, [])

  const pauseCalibration = useCallback(() => {
    setState((prev) => ({
      ...prev,
      calibration: {
        ...prev.calibration,
        paused: !prev.calibration.paused,
      },
    }))
  }, [])

  const restartCalibration = useCallback(() => {
    setState((prev) => {
      const profile = BUILDING_PROFILES.find((p) => p.id === prev.activeProfileId) ?? BUILDING_PROFILES[0]
      return {
        ...prev,
        siteValues: {
          ...prev.siteValues,
          thermal: { ...profile.thermal },
        },
        calibration: {
          stage: 'not-started',
          progressPercent: 0,
          confidencePercent: profile.calibration.initialConfidencePercent,
          paused: false,
        },
      }
    })
  }, [])

  const skipToComplete = useCallback(() => {
    setState((prev) => {
      const profile = BUILDING_PROFILES.find((p) => p.id === prev.activeProfileId) ?? BUILDING_PROFILES[0]
      const adjustments = CALIBRATION_ADJUSTMENTS[prev.activeProfileId] ?? {}
      const initConf = profile.calibration.initialConfidencePercent
      const newConf = Math.round(initConf + 30)
      return {
        ...prev,
        siteValues: {
          ...prev.siteValues,
          thermal: { ...prev.siteValues.thermal, ...adjustments },
        },
        calibration: {
          stage: 'ready',
          progressPercent: 100,
          confidencePercent: newConf,
          startedAt: prev.calibration.startedAt ?? new Date().toISOString(),
          completedAt: new Date().toISOString(),
          paused: false,
        },
      }
    })
  }, [])

  // ── Wizard actions ─────────────────────────────────────────────────────────

  const confirmProfile = useCallback(() => {
    setState((prev) => ({ ...prev, wizardStep: 'calibrating' }))
  }, [])

  const importSchedule = useCallback(() => {
    setState((prev) => ({ ...prev, scheduleImported: true, wizardStep: 'commissioned' }))
  }, [])

  const backToSelection = useCallback(() => {
    setState((prev) => {
      const profile = BUILDING_PROFILES.find((p) => p.id === prev.activeProfileId) ?? BUILDING_PROFILES[0]
      return buildDefaultState(profile.id)
    })
  }, [])

  return {
    state,
    activeProfile,
    selectProfile,
    updateSiteValues,
    resetToArchetype,
    startCalibration,
    pauseCalibration,
    restartCalibration,
    skipToComplete,
    confirmProfile,
    importSchedule,
    backToSelection,
  }
}
