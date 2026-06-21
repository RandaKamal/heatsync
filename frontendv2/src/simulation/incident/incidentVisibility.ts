import { decodeErrorRegisters, type DecodedAlarm } from '../../utils/errorRegisters'
import { buildCrossDeviceComparison } from './incidentDerivation'
import {
  DEMO_EVENT,
  DEVICE_1_HISTORICAL,
  DEVICE_4_HISTORICAL,
  DIAGNOSIS_FOUR_FACTS,
  DIAGNOSIS_TEXT,
  TECHNICIAN_RECOMMENDATION,
} from './incidentScenario'
import type {
  CapacityImpact,
  CrossDeviceComparisonRow,
  FaultSimulationStage,
  HistoricalDeviceSnapshot,
  IncidentCardActionLog,
  IncidentDeviceRole,
  SharedIncidentState,
} from './incidentTypes'

/**
 * Everything the customer is allowed to see. Deliberately excludes raw
 * registers, pressures, the alarm flag and the load-allocation breakdown —
 * the customer gets a plain-language operational summary only.
 */
export interface CustomerVisibleSummary {
  stage: FaultSimulationStage
  eventTitle: string
  eventStartLocal: string
  expectedAttendance: number
  roomTemperatureC: number
  comfortMinC: number
  comfortMaxC: number
  roomComfortStatus: SharedIncidentState['roomComfortStatus']
  availableDevicesLabel: string
  eventContinuity: SharedIncidentState['eventContinuity']
  profileLabel: string
  calibrationConfidencePercent: number
  lbEnergyInformed: boolean
  operatorActionRequired: boolean
  operatorActionText: string
  otherRoomsAtRisk: boolean
  presenterCue: string
}

export function getCustomerVisibleSummary(state: SharedIncidentState): CustomerVisibleSummary {
  const operatorActionRequired = state.eventContinuity === 'cannot-be-guaranteed'

  return {
    stage: state.simulationStage,
    eventTitle: DEMO_EVENT.title,
    eventStartLocal: DEMO_EVENT.startLocal,
    expectedAttendance: DEMO_EVENT.expectedAttendance,
    roomTemperatureC: state.roomTemperatureC,
    comfortMinC: DEMO_EVENT.comfortMinC,
    comfortMaxC: DEMO_EVENT.comfortMaxC,
    roomComfortStatus: state.roomComfortStatus,
    availableDevicesLabel: state.availableDevicesLabel,
    eventContinuity: state.eventContinuity,
    profileLabel: state.operationalProfileImpact.profileLabel,
    calibrationConfidencePercent: state.operationalProfileImpact.calibrationConfidenceAfterPercent,
    lbEnergyInformed: state.serviceStatus !== 'not-created',
    operatorActionRequired,
    operatorActionText: operatorActionRequired
      ? 'Contact LB Energy support — comfort cannot be guaranteed with current capacity.'
      : 'No action is required from the facility operator.',
    otherRoomsAtRisk: false,
    presenterCue: state.presenterCue,
  }
}

/**
 * Everything LB Energy is allowed to see: raw historical signals, decoded
 * registers, cross-device evidence, allocation, profile impact and the
 * service workflow.
 */
export interface LbEnergyVisibleSummary {
  stage: FaultSimulationStage
  affectedDeviceId: string
  affectedDeviceName: string
  diagnosisStatus: SharedIncidentState['diagnosisStatus']
  diagnosisText: string
  diagnosisFacts: string[]
  historicalDevice1: HistoricalDeviceSnapshot
  historicalDevice4: HistoricalDeviceSnapshot
  decodedRegisterDevice1: DecodedAlarm[]
  crossDeviceComparison: CrossDeviceComparisonRow[]
  loadAllocation: Record<IncidentDeviceRole, number>
  capacityAvailablePercent: number
  availableDevicesLabel: string
  leadTimeMinutes: number
  operationalProfileImpact: CapacityImpact
  incidentCardId: string
  actionLog: IncidentCardActionLog
  technicianRecommendation: string
  presenterCue: string
}

export function getLbEnergyVisibleSummary(state: SharedIncidentState): LbEnergyVisibleSummary {
  return {
    stage: state.simulationStage,
    affectedDeviceId: state.affectedDeviceId,
    affectedDeviceName: DEVICE_1_HISTORICAL.deviceName,
    diagnosisStatus: state.diagnosisStatus,
    diagnosisText: DIAGNOSIS_TEXT,
    diagnosisFacts: DIAGNOSIS_FOUR_FACTS,
    historicalDevice1: DEVICE_1_HISTORICAL,
    historicalDevice4: DEVICE_4_HISTORICAL,
    decodedRegisterDevice1: decodeErrorRegisters(DEVICE_1_HISTORICAL.errorRegisters),
    crossDeviceComparison: buildCrossDeviceComparison(),
    loadAllocation: state.loadAllocation,
    capacityAvailablePercent: state.capacityAvailablePercent,
    availableDevicesLabel: state.availableDevicesLabel,
    leadTimeMinutes: state.leadTimeMinutes,
    operationalProfileImpact: state.operationalProfileImpact,
    incidentCardId: state.incidentCardId,
    actionLog: state.actionLog,
    technicianRecommendation: TECHNICIAN_RECOMMENDATION,
    presenterCue: state.presenterCue,
  }
}
