import type {
  DeviceSimulationStatus,
  FaultSimulationStage,
  HistoricalDeviceSnapshot,
  IncidentDeviceRole,
  ScenarioMetadata,
  SharedIncidentState,
} from './incidentTypes'

// ── Scenario metadata (spec §2, verbatim) ─────────────────────────────────────

export const SCENARIO: ScenarioMetadata = {
  id: 'hidden-low-pressure-fault',
  title: 'Hidden Low-Pressure Fault',
  subtitle:
    'Device 1 requests heating, but its compressor remains inactive while a low-pressure register is present without an active alarm flag.',
  source: 'IHL Heat Pump Research Dataset',
  sourceWindow: 'heating',
  replayDate: '2026-03-30',
  eventStartUtc: '2026-03-30T04:30:00Z',
  eventStartLocal: '2026-03-30T06:30:00+02:00',
  faultObservedUtc: '2026-03-30T04:30:29Z',
  affectedDeviceId: 'bdaf0e14-2cd1-43c8-b9ea-b3c90309f773',
  affectedDeviceName: 'Device 1',
}

/**
 * Demo narrative context mapped onto the real recorded time window.
 * Copied as literal constants — intentionally NOT imported live from
 * mockCampus.roomEvents, so this fixture stays stable even if the mock
 * campus schedule changes independently.
 */
export const DEMO_EVENT = {
  title: 'Morning Thermodynamics Lecture',
  startLocal: '06:30',
  expectedAttendance: 120,
  comfortMinC: 19.5,
  comfortMaxC: 22.0,
  profileLabel: 'Temporary Lecture Hall',
}

// ── Historical evidence (spec §3, verbatim — never mutated by stage logic) ───

export const DEVICE_1_HISTORICAL: HistoricalDeviceSnapshot = {
  classification: 'historical',
  timestamp: '2026-03-30T04:30:29Z',
  deviceId: 'bdaf0e14-2cd1-43c8-b9ea-b3c90309f773',
  deviceName: 'Device 1',
  roomTemperatureC: 18.8,
  supplyTemperatureC: 60.0,
  returnTemperatureC: 20.8,
  heatingRequired: true,
  coolingRequired: false,
  compressorActive: false,
  lowPressureBar: 7.3,
  highPressureBar: 7.3,
  alarmActive: false,
  errorRegisters: '0,64,0,0',
}

export const DEVICE_4_HISTORICAL: HistoricalDeviceSnapshot = {
  classification: 'historical',
  timestamp: '2026-03-30T04:30:29Z',
  deviceId: '930f3621-05df-4574-9270-9d994c5b716c',
  deviceName: 'Device 4',
  roomTemperatureC: 18.8,
  supplyTemperatureC: 36.2,
  returnTemperatureC: 20.4,
  heatingRequired: true,
  coolingRequired: false,
  compressorActive: true,
  lowPressureBar: 5.5,
  highPressureBar: 21.1,
  alarmActive: false,
  errorRegisters: '0,0,0,0',
}

export const DIAGNOSIS_FOUR_FACTS: string[] = [
  'Register 1902, bit 6 is active',
  'The ordinary alarm flag remains false',
  'Heating is requested while the compressor remains inactive',
  "Device 1's pressure behaviour differs clearly from the active peer device",
]

export const DIAGNOSIS_TEXT = 'Suspected Circuit 1 low-pressure fault. Technician confirmation required.'

export const TECHNICIAN_RECOMMENDATION =
  'Inspect the refrigerant circuit, pressure sensing and compressor availability according to authorized HELOT service procedures.'

// ── Device role mapping — single source of truth ─────────────────────────────
//
// The incident is told through real mock-campus room G01 ("Lecture Hall A"),
// which already has exactly 4 served devices and a matching "Thermodynamics"
// lecture event. ORION-02 has the lowest baseline health score of the four,
// making it the most natural pick for "Device 1" (the affected unit).

export const DEVICE_ROLE_MAP: Record<IncidentDeviceRole, string> = {
  'device-1': 'ORION-02',
  'device-2': 'ORION-01',
  'device-3': 'HP-3',
  'device-4': 'HP-4',
}

export const INCIDENT_ROOM_ID = 'G01'

export const INCIDENT_CARD_ID = 'HS-2026-0330-001'

// ── Stage order + durations (sum to 80s at 1x, within the 75-90s requirement) ─

export const STAGE_ORDER: FaultSimulationStage[] = [
  'customer-normal-operation',
  'customer-degraded-status',
  'lb-energy-signal-analysis',
  'lb-energy-cross-device-check',
  'lb-energy-fault-classification',
  'lb-energy-load-rebalancing',
  'customer-comfort-protection',
  'lb-energy-technician-handoff',
  'customer-service-confirmation',
  'shared-incident-summary',
  'complete',
]

export const STAGE_DURATIONS_SECONDS: Record<FaultSimulationStage, number> = {
  'customer-normal-operation': 6,
  'customer-degraded-status': 8,
  'lb-energy-signal-analysis': 8,
  'lb-energy-cross-device-check': 8,
  'lb-energy-fault-classification': 9,
  'lb-energy-load-rebalancing': 8,
  'customer-comfort-protection': 8,
  'lb-energy-technician-handoff': 7,
  'customer-service-confirmation': 6,
  'shared-incident-summary': 7,
  complete: 5,
}

export const STAGE_RECOMMENDED_MODE: Record<FaultSimulationStage, 'customer' | 'lb-energy'> = {
  'customer-normal-operation': 'customer',
  'customer-degraded-status': 'customer',
  'lb-energy-signal-analysis': 'lb-energy',
  'lb-energy-cross-device-check': 'lb-energy',
  'lb-energy-fault-classification': 'lb-energy',
  'lb-energy-load-rebalancing': 'lb-energy',
  'customer-comfort-protection': 'customer',
  'lb-energy-technician-handoff': 'lb-energy',
  'customer-service-confirmation': 'customer',
  'shared-incident-summary': 'customer',
  complete: 'customer',
}

export const STAGE_PRESENTER_CUES: Record<FaultSimulationStage, string> = {
  'customer-normal-operation':
    'This is what the customer sees: one room, one event and one comfort status — not four machines and hundreds of signals.',
  'customer-degraded-status':
    'A unit begins behaving abnormally, but the customer is not asked to diagnose a refrigerant circuit.',
  'lb-energy-signal-analysis':
    'The same incident now opens in LB Energy View, where the technical evidence becomes visible.',
  'lb-energy-cross-device-check':
    'HeatSync compares the unit with the other machines in the same environment, so it can distinguish an unusual reading from unusual building conditions.',
  'lb-energy-fault-classification':
    'The ordinary alarm flag is still off, but register 1902, bit 6 reports a low-pressure condition.',
  'lb-energy-load-rebalancing':
    'The unreliable unit is removed from the simulated demand plan, and the remaining devices receive only the load required to restore comfort.',
  'customer-comfort-protection':
    'Back in Customer View, all of that complexity becomes one clear message: the event can continue and LB Energy is handling the incident.',
  'lb-energy-technician-handoff':
    'The system also changes its next prediction. It no longer assumes that four devices will be available.',
  'customer-service-confirmation':
    'Customer View protects attention. LB Energy View supports action. Both are powered by the same incident model.',
  'shared-incident-summary':
    'One incident. Two decisions. One coordinated system.',
  complete: 'Replay complete. Press Replay to run again, or Reset to return to stage 1.',
}

// ── Per-stage state value table — ground truth for getIncidentStateForStage ──
//
// Hand-authored to match the plan's approved per-stage table exactly. This is
// the single source of truth for every "key number" the spec requires to be
// exact (room temp, capacity %, lead time, allocation, device statuses, etc).

export type StageStateRow = Pick<
  SharedIncidentState,
  | 'roomTemperatureC'
  | 'roomComfortStatus'
  | 'availableDevicesLabel'
  | 'capacityAvailablePercent'
  | 'leadTimeMinutes'
  | 'diagnosisStatus'
  | 'serviceStatus'
  | 'eventContinuity'
> & {
  loadAllocation: Record<IncidentDeviceRole, number>
  deviceStatuses: Record<IncidentDeviceRole, DeviceSimulationStatus>
  calibrationConfidenceAfterPercent: number
}

const HEALTHY_ALLOCATION: Record<IncidentDeviceRole, number> = {
  'device-1': 25,
  'device-2': 25,
  'device-3': 25,
  'device-4': 25,
}

/**
 * Illustrative demand allocation after Device 1 is removed — not historical
 * measurements. See incidentDerivation.ts's calculateLoadAllocation() for why
 * this is a fixture constant rather than a live healthScore/capacity/
 * efficiency computation (the real mock health scores for devices 2-4 are
 * nearly equal, which would produce a near-even split, not 0/30/30/40).
 */
const REBALANCED_ALLOCATION: Record<IncidentDeviceRole, number> = {
  'device-1': 0,
  'device-2': 30,
  'device-3': 30,
  'device-4': 40,
}

const ALL_HEALTHY: Record<IncidentDeviceRole, DeviceSimulationStatus> = {
  'device-1': 'healthy',
  'device-2': 'healthy',
  'device-3': 'healthy',
  'device-4': 'healthy',
}

const UNDER_INVESTIGATION: Record<IncidentDeviceRole, DeviceSimulationStatus> = {
  'device-1': 'under-investigation',
  'device-2': 'healthy',
  'device-3': 'healthy',
  'device-4': 'healthy',
}

const UNAVAILABLE_NOT_YET_COMPENSATING: Record<IncidentDeviceRole, DeviceSimulationStatus> = {
  'device-1': 'unavailable',
  'device-2': 'healthy',
  'device-3': 'healthy',
  'device-4': 'healthy',
}

const UNAVAILABLE_COMPENSATING: Record<IncidentDeviceRole, DeviceSimulationStatus> = {
  'device-1': 'unavailable',
  'device-2': 'compensating',
  'device-3': 'compensating',
  'device-4': 'compensating',
}

export const STAGE_STATE_TABLE: Record<FaultSimulationStage, StageStateRow> = {
  'customer-normal-operation': {
    roomTemperatureC: 18.8,
    roomComfortStatus: 'inside-range',
    availableDevicesLabel: '4 of 4',
    capacityAvailablePercent: 100,
    leadTimeMinutes: 48,
    loadAllocation: HEALTHY_ALLOCATION,
    diagnosisStatus: 'not-started',
    serviceStatus: 'not-created',
    deviceStatuses: ALL_HEALTHY,
    eventContinuity: 'expected-to-continue',
    calibrationConfidenceAfterPercent: 84,
  },
  'customer-degraded-status': {
    roomTemperatureC: 18.8,
    roomComfortStatus: 'at-risk',
    availableDevicesLabel: '3 of 4',
    capacityAvailablePercent: 75,
    leadTimeMinutes: 48,
    loadAllocation: HEALTHY_ALLOCATION,
    diagnosisStatus: 'analysing',
    serviceStatus: 'not-created',
    deviceStatuses: UNDER_INVESTIGATION,
    eventContinuity: 'at-risk',
    calibrationConfidenceAfterPercent: 84,
  },
  'lb-energy-signal-analysis': {
    roomTemperatureC: 18.8,
    roomComfortStatus: 'at-risk',
    availableDevicesLabel: '3 of 4',
    capacityAvailablePercent: 75,
    leadTimeMinutes: 48,
    loadAllocation: HEALTHY_ALLOCATION,
    diagnosisStatus: 'analysing',
    serviceStatus: 'not-created',
    deviceStatuses: UNDER_INVESTIGATION,
    eventContinuity: 'at-risk',
    calibrationConfidenceAfterPercent: 84,
  },
  'lb-energy-cross-device-check': {
    roomTemperatureC: 18.8,
    roomComfortStatus: 'at-risk',
    availableDevicesLabel: '3 of 4',
    capacityAvailablePercent: 75,
    leadTimeMinutes: 48,
    loadAllocation: HEALTHY_ALLOCATION,
    diagnosisStatus: 'analysing',
    serviceStatus: 'not-created',
    deviceStatuses: UNDER_INVESTIGATION,
    eventContinuity: 'at-risk',
    calibrationConfidenceAfterPercent: 84,
  },
  'lb-energy-fault-classification': {
    roomTemperatureC: 18.8,
    roomComfortStatus: 'at-risk',
    availableDevicesLabel: '3 of 4',
    capacityAvailablePercent: 75,
    leadTimeMinutes: 48,
    loadAllocation: HEALTHY_ALLOCATION,
    diagnosisStatus: 'technician-confirmation-required',
    serviceStatus: 'not-created',
    deviceStatuses: UNAVAILABLE_NOT_YET_COMPENSATING,
    eventContinuity: 'at-risk',
    calibrationConfidenceAfterPercent: 84,
  },
  'lb-energy-load-rebalancing': {
    roomTemperatureC: 19.2,
    roomComfortStatus: 'at-risk',
    availableDevicesLabel: '3 of 4',
    capacityAvailablePercent: 75,
    leadTimeMinutes: 64,
    loadAllocation: REBALANCED_ALLOCATION,
    diagnosisStatus: 'technician-confirmation-required',
    serviceStatus: 'prepared',
    deviceStatuses: UNAVAILABLE_COMPENSATING,
    eventContinuity: 'at-risk',
    calibrationConfidenceAfterPercent: 80,
  },
  'customer-comfort-protection': {
    roomTemperatureC: 19.6,
    roomComfortStatus: 'inside-range',
    availableDevicesLabel: '3 of 4',
    capacityAvailablePercent: 75,
    leadTimeMinutes: 64,
    loadAllocation: REBALANCED_ALLOCATION,
    diagnosisStatus: 'technician-confirmation-required',
    serviceStatus: 'prepared',
    deviceStatuses: UNAVAILABLE_COMPENSATING,
    eventContinuity: 'expected-to-continue',
    calibrationConfidenceAfterPercent: 78,
  },
  'lb-energy-technician-handoff': {
    roomTemperatureC: 19.6,
    roomComfortStatus: 'inside-range',
    availableDevicesLabel: '3 of 4',
    capacityAvailablePercent: 75,
    leadTimeMinutes: 64,
    loadAllocation: REBALANCED_ALLOCATION,
    diagnosisStatus: 'technician-confirmation-required',
    serviceStatus: 'created',
    deviceStatuses: UNAVAILABLE_COMPENSATING,
    eventContinuity: 'expected-to-continue',
    calibrationConfidenceAfterPercent: 78,
  },
  'customer-service-confirmation': {
    roomTemperatureC: 19.6,
    roomComfortStatus: 'inside-range',
    availableDevicesLabel: '3 of 4',
    capacityAvailablePercent: 75,
    leadTimeMinutes: 64,
    loadAllocation: REBALANCED_ALLOCATION,
    diagnosisStatus: 'technician-confirmation-required',
    serviceStatus: 'technician-notified',
    deviceStatuses: UNAVAILABLE_COMPENSATING,
    eventContinuity: 'expected-to-continue',
    calibrationConfidenceAfterPercent: 78,
  },
  'shared-incident-summary': {
    roomTemperatureC: 19.6,
    roomComfortStatus: 'inside-range',
    availableDevicesLabel: '3 of 4',
    capacityAvailablePercent: 75,
    leadTimeMinutes: 64,
    loadAllocation: REBALANCED_ALLOCATION,
    diagnosisStatus: 'technician-confirmation-required',
    serviceStatus: 'technician-notified',
    deviceStatuses: UNAVAILABLE_COMPENSATING,
    eventContinuity: 'expected-to-continue',
    calibrationConfidenceAfterPercent: 78,
  },
  complete: {
    roomTemperatureC: 19.6,
    roomComfortStatus: 'inside-range',
    availableDevicesLabel: '3 of 4',
    capacityAvailablePercent: 75,
    leadTimeMinutes: 64,
    loadAllocation: REBALANCED_ALLOCATION,
    diagnosisStatus: 'technician-confirmation-required',
    serviceStatus: 'technician-notified',
    deviceStatuses: UNAVAILABLE_COMPENSATING,
    eventContinuity: 'expected-to-continue',
    calibrationConfidenceAfterPercent: 78,
  },
}

export const ORIGINAL_CALIBRATION_CONFIDENCE_PERCENT = 84
export const ORIGINAL_CAPACITY_PERCENT = 100
export const ORIGINAL_LEAD_TIME_MINUTES = 48

export const STAGE_LABELS: Record<FaultSimulationStage, string> = {
  'customer-normal-operation': 'Normal operation',
  'customer-degraded-status': 'Degraded but controlled',
  'lb-energy-signal-analysis': 'Hidden signal analysis',
  'lb-energy-cross-device-check': 'Cross-device consistency check',
  'lb-energy-fault-classification': 'Explainable classification',
  'lb-energy-load-rebalancing': 'Coordinated response',
  'customer-comfort-protection': 'Comfort protection',
  'lb-energy-technician-handoff': 'Technician handoff',
  'customer-service-confirmation': 'Service confirmation',
  'shared-incident-summary': 'Incident summary',
  complete: 'Replay complete',
}
