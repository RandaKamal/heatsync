export type FaultSimulationStage =
  | 'customer-normal-operation'
  | 'customer-degraded-status'
  | 'lb-energy-signal-analysis'
  | 'lb-energy-cross-device-check'
  | 'lb-energy-fault-classification'
  | 'lb-energy-load-rebalancing'
  | 'customer-comfort-protection'
  | 'lb-energy-technician-handoff'
  | 'customer-service-confirmation'
  | 'shared-incident-summary'
  | 'complete'

export type IncidentDeviceRole = 'device-1' | 'device-2' | 'device-3' | 'device-4'

export type DeviceSimulationStatus =
  | 'healthy'
  | 'unavailable' // removed from allocation (Device 1 once degraded)
  | 'compensating' // peers picking up extra load
  | 'under-investigation'

export interface CapacityImpact {
  /** Copy-only label for the demo narrative — never imported from data/buildingProfiles.ts */
  profileLabel: string
  capacityBeforePercent: number
  capacityAfterPercent: number
  calibrationConfidenceBeforePercent: number
  calibrationConfidenceAfterPercent: number
  note: string
}

export interface IncidentCardActionLog {
  acknowledged: boolean
  serviceTicketCreated: boolean
  technicianNotified: boolean
  deviceMarkedUnavailable: boolean
  deviceReturnedToService: boolean
}

export interface SharedIncidentState {
  simulationStage: FaultSimulationStage
  /** eventStartUtc + cumulative stage seconds — never derived from Date.now() */
  replayTimeUtc: string
  activeMode: 'customer' | 'lb-energy'
  affectedDeviceId: string
  deviceStatuses: Record<IncidentDeviceRole, DeviceSimulationStatus>
  capacityAvailablePercent: number
  loadAllocation: Record<IncidentDeviceRole, number>
  roomComfortStatus: 'below-range' | 'inside-range' | 'above-range' | 'at-risk'
  eventContinuity: 'expected-to-continue' | 'at-risk' | 'cannot-be-guaranteed'
  diagnosisStatus: 'not-started' | 'analysing' | 'classified' | 'technician-confirmation-required'
  serviceStatus: 'not-created' | 'prepared' | 'created' | 'technician-notified'
  operationalProfileImpact: CapacityImpact
  /** 'HS-2026-0330-001', constant for this scenario */
  incidentCardId: string
  actionLog: IncidentCardActionLog
  roomTemperatureC: number
  /** '4 of 4' | '3 of 4' */
  availableDevicesLabel: string
  leadTimeMinutes: number
  presenterCue: string
}

export interface HistoricalDeviceSnapshot {
  classification: 'historical'
  timestamp: string
  deviceId: string
  deviceName: string
  roomTemperatureC: number
  supplyTemperatureC: number
  returnTemperatureC: number
  heatingRequired: boolean
  coolingRequired: boolean
  compressorActive: boolean
  lowPressureBar: number
  highPressureBar: number
  alarmActive: boolean
  errorRegisters: string
}

export interface CrossDeviceComparisonRow {
  signal: string
  device1: string
  device4: string
}

export interface ScenarioMetadata {
  id: string
  title: string
  subtitle: string
  source: string
  sourceWindow: string
  replayDate: string
  eventStartUtc: string
  eventStartLocal: string
  faultObservedUtc: string
  affectedDeviceId: string
  affectedDeviceName: string
}
