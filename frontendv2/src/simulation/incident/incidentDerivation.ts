import {
  climateDevices as baseClimateDevices,
  controlDecisions as baseControlDecisions,
  rooms as baseRooms,
} from '../../data/mockCampus'
import type { ClimateDevice, ControlDecision, OperationalStatus, Room } from '../../types/campus'
import { decodeErrorRegisters } from '../../utils/errorRegisters'
import {
  DEMO_EVENT,
  DEVICE_1_HISTORICAL,
  DEVICE_4_HISTORICAL,
  DEVICE_ROLE_MAP,
  INCIDENT_CARD_ID,
  INCIDENT_ROOM_ID,
  ORIGINAL_CALIBRATION_CONFIDENCE_PERCENT,
  ORIGINAL_CAPACITY_PERCENT,
  SCENARIO,
  STAGE_DURATIONS_SECONDS,
  STAGE_ORDER,
  STAGE_PRESENTER_CUES,
  STAGE_RECOMMENDED_MODE,
  STAGE_STATE_TABLE,
  DIAGNOSIS_FOUR_FACTS,
  TECHNICIAN_RECOMMENDATION,
} from './incidentScenario'
import type {
  CrossDeviceComparisonRow,
  DeviceSimulationStatus,
  FaultSimulationStage,
  IncidentCardActionLog,
  IncidentDeviceRole,
  SharedIncidentState,
} from './incidentTypes'

// ── Baseline campus frame (clone-only, no phase logic) ────────────────────────
//
// Lifted from the old simulation/failureScenario.ts's clone helpers, which
// were correct — only the phase-mutation logic that referenced now-deleted
// rooms/devices was buggy and has been dropped.

function cloneRooms(): Room[] {
  return baseRooms.map((room) => ({ ...room, servedBy: [...room.servedBy] }))
}

function cloneDevices(): ClimateDevice[] {
  return baseClimateDevices.map((device) => ({
    ...device,
    servedRoomIds: [...device.servedRoomIds],
    features: [...device.features],
    influencingFactors: [...device.influencingFactors],
    history: device.history.map((point) => ({ ...point })),
    runtimeHeatmap: device.runtimeHeatmap.map((cell) => ({ ...cell })),
  }))
}

export function getBaselineCampusFrame(): { rooms: Room[]; devices: ClimateDevice[] } {
  return { rooms: cloneRooms(), devices: cloneDevices() }
}

// ── Merge helper ──────────────────────────────────────────────────────────────

export interface CampusOverrides {
  roomOverride: Partial<Room> & { id: string }
  deviceOverrides: Record<string, Partial<ClimateDevice>>
}

export function applyOverridesToFrame(
  baseline: { rooms: Room[]; devices: ClimateDevice[] },
  overrides: CampusOverrides,
): { rooms: Room[]; devices: ClimateDevice[] } {
  const rooms = baseline.rooms.map((room) =>
    room.id === overrides.roomOverride.id ? { ...room, ...overrides.roomOverride } : room,
  )
  const devices = baseline.devices.map((device) => {
    const override = overrides.deviceOverrides[device.id]
    return override ? { ...device, ...override } : device
  })
  return { rooms, devices }
}

// ── Device/room override derivation ───────────────────────────────────────────

function mapDeviceStatusToOperationalStatus(status: DeviceSimulationStatus): OperationalStatus {
  switch (status) {
    case 'healthy':
      return 'normal'
    case 'under-investigation':
      return 'at-risk'
    case 'unavailable':
      return 'fault'
    case 'compensating':
      return 'warming'
    default:
      return 'normal'
  }
}

function mapComfortToRoomStatus(comfort: SharedIncidentState['roomComfortStatus']): OperationalStatus {
  if (comfort === 'at-risk' || comfort === 'below-range' || comfort === 'above-range') {
    return 'at-risk'
  }
  return 'normal'
}

function buildDeviceOverride(role: IncidentDeviceRole, status: DeviceSimulationStatus): Partial<ClimateDevice> {
  const operationalStatus = mapDeviceStatusToOperationalStatus(status)

  if (role === 'device-1') {
    if (status === 'healthy') {
      return {
        status: operationalStatus,
        healthScore: 92,
        alert: undefined,
        recommendedAction: undefined,
        influencingFactors: ['Operating within expected thermal model'],
      }
    }
    if (status === 'under-investigation') {
      return {
        status: operationalStatus,
        healthScore: 70,
        alert: 'HeatSync is reviewing a diagnostic inconsistency on this unit.',
        recommendedAction: undefined,
        influencingFactors: [
          'Heating is requested but compressor activity has not been confirmed',
          'Cross-device comparison with healthy peers is in progress',
        ],
      }
    }
    // unavailable / compensating-irrelevant for device-1, which is never "compensating"
    return {
      status: operationalStatus,
      healthScore: 40,
      compressorRuntimeMinutes: 0,
      alert: 'Suspected Circuit 1 low-pressure fault. Technician confirmation required.',
      recommendedAction: TECHNICIAN_RECOMMENDATION,
      influencingFactors: DIAGNOSIS_FOUR_FACTS,
    }
  }

  // Devices 2-4 (healthy peers / compensating units)
  if (status === 'compensating') {
    return {
      status: operationalStatus,
      alert: undefined,
      recommendedAction: undefined,
      influencingFactors: [
        "Redistributed share of Device 1's heating demand",
        'Operating within safe capacity',
      ],
    }
  }
  return {
    status: 'normal',
    alert: undefined,
    recommendedAction: undefined,
    influencingFactors: ['Operating within expected thermal model'],
  }
}

export function buildIncidentRoomAndDeviceOverrides(stage: FaultSimulationStage): CampusOverrides {
  const row = STAGE_STATE_TABLE[stage]
  const deviceOverrides: Record<string, Partial<ClimateDevice>> = {}

  for (const role of Object.keys(DEVICE_ROLE_MAP) as IncidentDeviceRole[]) {
    const deviceId = DEVICE_ROLE_MAP[role]
    deviceOverrides[deviceId] = buildDeviceOverride(role, row.deviceStatuses[role])
  }

  return {
    roomOverride: {
      id: INCIDENT_ROOM_ID,
      currentTemperature: row.roomTemperatureC,
      status: mapComfortToRoomStatus(row.roomComfortStatus),
    },
    deviceOverrides,
  }
}

// ── Shared incident state derivation ──────────────────────────────────────────

const DEFAULT_ACTION_LOG: IncidentCardActionLog = {
  acknowledged: false,
  serviceTicketCreated: false,
  technicianNotified: false,
  deviceMarkedUnavailable: false,
  deviceReturnedToService: false,
}

function computeReplayTimeUtc(stage: FaultSimulationStage, secondsIntoStage: number): string {
  const stageStartOffset = STAGE_ORDER.slice(0, STAGE_ORDER.indexOf(stage)).reduce(
    (total, s) => total + STAGE_DURATIONS_SECONDS[s],
    0,
  )
  const totalElapsedSeconds = stageStartOffset + Math.max(0, secondsIntoStage)
  const eventStartMs = new Date(SCENARIO.eventStartUtc).getTime()
  return new Date(eventStartMs + totalElapsedSeconds * 1000).toISOString()
}

export interface IncidentStateOptions {
  secondsIntoStage?: number
  activeMode?: 'customer' | 'lb-energy'
  actionLog?: IncidentCardActionLog
}

export function getIncidentStateForStage(
  stage: FaultSimulationStage,
  options: IncidentStateOptions = {},
): SharedIncidentState {
  const row = STAGE_STATE_TABLE[stage]
  const secondsIntoStage = options.secondsIntoStage ?? 0
  const activeMode = options.activeMode ?? STAGE_RECOMMENDED_MODE[stage]
  const actionLog = options.actionLog ?? DEFAULT_ACTION_LOG

  return {
    simulationStage: stage,
    replayTimeUtc: computeReplayTimeUtc(stage, secondsIntoStage),
    activeMode,
    affectedDeviceId: SCENARIO.affectedDeviceId,
    deviceStatuses: row.deviceStatuses,
    capacityAvailablePercent: row.capacityAvailablePercent,
    loadAllocation: row.loadAllocation,
    roomComfortStatus: row.roomComfortStatus,
    eventContinuity: row.eventContinuity,
    diagnosisStatus: row.diagnosisStatus,
    serviceStatus: row.serviceStatus,
    operationalProfileImpact: {
      profileLabel: DEMO_EVENT.profileLabel,
      capacityBeforePercent: ORIGINAL_CAPACITY_PERCENT,
      capacityAfterPercent: row.capacityAvailablePercent,
      calibrationConfidenceBeforePercent: ORIGINAL_CALIBRATION_CONFIDENCE_PERCENT,
      calibrationConfidenceAfterPercent: row.calibrationConfidenceAfterPercent,
      note:
        'Updates only the current site-specific operational profile — the original Temporary Lecture Hall archetype defaults are unchanged.',
    },
    incidentCardId: INCIDENT_CARD_ID,
    actionLog,
    roomTemperatureC: row.roomTemperatureC,
    availableDevicesLabel: row.availableDevicesLabel,
    leadTimeMinutes: row.leadTimeMinutes,
    presenterCue: STAGE_PRESENTER_CUES[stage],
  }
}

// ── Standalone formulas (kept separate so tests can assert them directly) ────

/**
 * Illustrative demand allocation, not a live measurement.
 *
 * Conceptually: allocatedShare = healthyDeviceWeight / sumOfHealthyDeviceWeights,
 * where healthyDeviceWeight = healthScore * availableCapacity * efficiencyScore.
 * The real mock health scores for the three healthy peer devices (96/95/94 in
 * mockCampus.ts) are nearly equal, so a literal computation from them would
 * produce a near-even ~33/33/33 split, not the asymmetric 30/30/40 split this
 * scenario calls for. The split below is fixture narrative data illustrating
 * the concept, not a live computation against mockCampus.ts health scores.
 */
export function calculateLoadAllocation(stage: FaultSimulationStage): Record<IncidentDeviceRole, number> {
  return STAGE_STATE_TABLE[stage].loadAllocation
}

export function calculateCapacityAdjustedLeadMinutes(
  originalMinutes: number,
  availableCapacityFraction: number,
): number {
  return Math.round(originalMinutes / availableCapacityFraction)
}

/**
 * Stage-aware control-decision overlay. Returns the baseline mockCampus
 * control decisions with at most two synthetic entries prepended describing
 * the simulated HeatSync response — never claimed as historical.
 */
export function buildIncidentControlDecisions(stage: FaultSimulationStage): ControlDecision[] {
  const row = STAGE_STATE_TABLE[stage]
  const decisions: ControlDecision[] = [...baseControlDecisions]

  if (row.diagnosisStatus === 'technician-confirmation-required') {
    decisions.unshift({
      id: 'incident-device1-unavailable',
      time: 'Incident',
      roomId: INCIDENT_ROOM_ID,
      deviceId: DEVICE_ROLE_MAP['device-1'],
      action: 'Remove Device 1 from active demand allocation',
      reason: 'Suspected Circuit 1 low-pressure fault — technician confirmation required.',
      status: row.serviceStatus === 'not-created' ? 'active' : 'completed',
    })
  }

  if (row.serviceStatus !== 'not-created') {
    decisions.unshift({
      id: 'incident-rebalance',
      time: 'Incident',
      roomId: INCIDENT_ROOM_ID,
      deviceId: DEVICE_ROLE_MAP['device-2'],
      action: 'Redistribute heating demand across Devices 2-4 (simulated)',
      reason: 'Simulated HeatSync response to maintain the comfort envelope with reduced capacity.',
      status: row.serviceStatus === 'technician-notified' ? 'completed' : 'active',
    })
  }

  return decisions
}

export function buildCrossDeviceComparison(): CrossDeviceComparisonRow[] {
  const device1Alarms = decodeErrorRegisters(DEVICE_1_HISTORICAL.errorRegisters)
  const device4Alarms = decodeErrorRegisters(DEVICE_4_HISTORICAL.errorRegisters)

  return [
    {
      signal: 'Heating requested',
      device1: DEVICE_1_HISTORICAL.heatingRequired ? 'Yes' : 'No',
      device4: DEVICE_4_HISTORICAL.heatingRequired ? 'Yes' : 'No',
    },
    {
      signal: 'Compressor active',
      device1: DEVICE_1_HISTORICAL.compressorActive ? 'Yes' : 'No',
      device4: DEVICE_4_HISTORICAL.compressorActive ? 'Yes' : 'No',
    },
    {
      signal: 'Low pressure',
      device1: `${DEVICE_1_HISTORICAL.lowPressureBar} bar`,
      device4: `${DEVICE_4_HISTORICAL.lowPressureBar} bar`,
    },
    {
      signal: 'High pressure',
      device1: `${DEVICE_1_HISTORICAL.highPressureBar} bar`,
      device4: `${DEVICE_4_HISTORICAL.highPressureBar} bar`,
    },
    {
      signal: 'Register fault',
      device1: device1Alarms.length > 0 ? 'Present' : 'None',
      device4: device4Alarms.length > 0 ? 'Present' : 'None',
    },
    {
      signal: 'Alarm flag',
      device1: DEVICE_1_HISTORICAL.alarmActive ? 'On' : 'Off',
      device4: DEVICE_4_HISTORICAL.alarmActive ? 'On' : 'Off',
    },
  ]
}
