import { useEffect, useMemo, useReducer, useRef } from 'react'
import type { AppView } from '../components/ui/TopBar'
import { buildingTelemetry as baseBuildingTelemetry } from '../data/mockCampus'
import {
  applyOverridesToFrame,
  buildIncidentControlDecisions,
  buildIncidentRoomAndDeviceOverrides,
  getBaselineCampusFrame,
  getIncidentStateForStage,
} from '../simulation/incident/incidentDerivation'
import { DEVICE_ROLE_MAP, STAGE_DURATIONS_SECONDS, STAGE_ORDER } from '../simulation/incident/incidentScenario'
import type { FaultSimulationStage, IncidentCardActionLog } from '../simulation/incident/incidentTypes'

const DEFAULT_ACTION_LOG: IncidentCardActionLog = {
  acknowledged: false,
  serviceTicketCreated: false,
  technicianNotified: false,
  deviceMarkedUnavailable: false,
  deviceReturnedToService: false,
}

interface ReplayState {
  stageIndex: number
  secondsIntoStage: number
  playing: boolean
  speed: 1 | 2
  presenterCuesOn: boolean
  actionLog: IncidentCardActionLog
}

const initialReplayState: ReplayState = {
  stageIndex: 0,
  secondsIntoStage: 0,
  playing: false,
  speed: 1,
  presenterCuesOn: true,
  actionLog: DEFAULT_ACTION_LOG,
}

type ReplayAction =
  | { type: 'tick' }
  | { type: 'play' }
  | { type: 'pause' }
  | { type: 'next' }
  | { type: 'previous' }
  | { type: 'reset' }
  | { type: 'replay' }
  | { type: 'setSpeed'; speed: 1 | 2 }
  | { type: 'togglePresenterCues' }
  | { type: 'acknowledgeIncident' }
  | { type: 'createServiceTicket' }
  | { type: 'markTechnicianNotified' }
  | { type: 'markDeviceUnavailable' }
  | { type: 'returnDeviceToService' }

function clampStageIndex(index: number): number {
  return Math.min(Math.max(index, 0), STAGE_ORDER.length - 1)
}

export function incidentReplayReducer(state: ReplayState, action: ReplayAction): ReplayState {
  switch (action.type) {
    case 'tick': {
      if (!state.playing) return state
      const currentStage = STAGE_ORDER[state.stageIndex]
      const duration = STAGE_DURATIONS_SECONDS[currentStage]
      const nextSeconds = state.secondsIntoStage + state.speed
      if (nextSeconds < duration) {
        return { ...state, secondsIntoStage: nextSeconds }
      }
      const remainder = nextSeconds - duration
      const nextIndex = state.stageIndex + 1
      if (nextIndex >= STAGE_ORDER.length) {
        return { ...state, secondsIntoStage: duration, playing: false }
      }
      return { ...state, stageIndex: nextIndex, secondsIntoStage: remainder }
    }
    case 'play':
      return { ...state, playing: true }
    case 'pause':
      return { ...state, playing: false }
    case 'next':
      return { ...state, stageIndex: clampStageIndex(state.stageIndex + 1), secondsIntoStage: 0 }
    case 'previous':
      return { ...state, stageIndex: clampStageIndex(state.stageIndex - 1), secondsIntoStage: 0 }
    case 'reset':
      return { ...initialReplayState, presenterCuesOn: state.presenterCuesOn, speed: state.speed }
    case 'replay':
      return { ...initialReplayState, presenterCuesOn: state.presenterCuesOn, speed: state.speed, playing: true }
    case 'setSpeed':
      return { ...state, speed: action.speed }
    case 'togglePresenterCues':
      return { ...state, presenterCuesOn: !state.presenterCuesOn }
    case 'acknowledgeIncident':
      return { ...state, actionLog: { ...state.actionLog, acknowledged: true } }
    case 'createServiceTicket':
      return { ...state, actionLog: { ...state.actionLog, serviceTicketCreated: true } }
    case 'markTechnicianNotified':
      return { ...state, actionLog: { ...state.actionLog, technicianNotified: true } }
    case 'markDeviceUnavailable':
      return { ...state, actionLog: { ...state.actionLog, deviceMarkedUnavailable: true } }
    case 'returnDeviceToService':
      return { ...state, actionLog: { ...state.actionLog, deviceReturnedToService: true } }
    default:
      return state
  }
}

/**
 * Owns the one shared incident state machine for the Fault Simulation and
 * Incident Replay feature. `view` is the app's existing Customer/LB
 * Energy/Building Profile mode — `activeMode` is derived from it (clamped to
 * the last non-profile value while parked in Building Profile, since that
 * view unmounts the incident UI entirely but must not reset the replay).
 */
export function useIncidentReplay(view: AppView) {
  const [state, dispatch] = useReducer(incidentReplayReducer, initialReplayState)

  const lastNonProfileModeRef = useRef<'customer' | 'lb-energy'>('customer')
  if (view !== 'profile') {
    lastNonProfileModeRef.current = view === 'service' ? 'lb-energy' : 'customer'
  }
  const activeMode = lastNonProfileModeRef.current

  useEffect(() => {
    if (!state.playing) return
    const id = setInterval(() => dispatch({ type: 'tick' }), 1000)
    return () => clearInterval(id)
  }, [state.playing])

  const currentStage: FaultSimulationStage = STAGE_ORDER[state.stageIndex]

  const incidentState = useMemo(
    () =>
      getIncidentStateForStage(currentStage, {
        secondsIntoStage: state.secondsIntoStage,
        activeMode,
        actionLog: state.actionLog,
      }),
    [currentStage, state.secondsIntoStage, activeMode, state.actionLog],
  )

  const { rooms, devices } = useMemo(() => {
    const baseline = getBaselineCampusFrame()
    const overrides = buildIncidentRoomAndDeviceOverrides(currentStage)
    return applyOverridesToFrame(baseline, overrides)
  }, [currentStage])

  const controlDecisions = useMemo(() => buildIncidentControlDecisions(currentStage), [currentStage])

  const controls = useMemo(
    () => ({
      play: () => dispatch({ type: 'play' }),
      pause: () => dispatch({ type: 'pause' }),
      next: () => dispatch({ type: 'next' }),
      previous: () => dispatch({ type: 'previous' }),
      reset: () => dispatch({ type: 'reset' }),
      replay: () => dispatch({ type: 'replay' }),
      setSpeed: (speed: 1 | 2) => dispatch({ type: 'setSpeed', speed }),
      togglePresenterCues: () => dispatch({ type: 'togglePresenterCues' }),
      acknowledgeIncident: () => dispatch({ type: 'acknowledgeIncident' }),
      createServiceTicket: () => dispatch({ type: 'createServiceTicket' }),
      markTechnicianNotified: () => dispatch({ type: 'markTechnicianNotified' }),
      markDeviceUnavailable: () => dispatch({ type: 'markDeviceUnavailable' }),
      returnDeviceToService: () => dispatch({ type: 'returnDeviceToService' }),
    }),
    [],
  )

  return {
    rooms,
    devices,
    buildingTelemetry: baseBuildingTelemetry,
    controlDecisions,
    incidentState,
    currentStage,
    stageIndex: state.stageIndex,
    stageCount: STAGE_ORDER.length,
    secondsIntoStage: state.secondsIntoStage,
    presenterCuesOn: state.presenterCuesOn,
    presenterCue: incidentState.presenterCue,
    speed: state.speed,
    playing: state.playing,
    /** Mock-campus device id for the affected unit — for 3D-scene selection, distinct from incidentState.affectedDeviceId (the real historical UUID). */
    affectedMockDeviceId: DEVICE_ROLE_MAP['device-1'],
    controls,
  }
}
