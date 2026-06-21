import type {
  BuildingTelemetryPoint,
  ClimateDevice,
  ControlDecision,
  Room,
} from '../types/campus'

export type FailureSimulationPhase =
  | 'idle'
  | 'normal'
  | 'occupancy-adaptation'
  | 'transient-disturbance'
  | 'fault-developing'
  | 'detecting'
  | 'warning'
  | 'mitigation'
  | 'recovery'
  | 'complete'

export type SimulationSeverity =
  | 'none'
  | 'information'
  | 'warning'
  | 'critical'
  | 'recovering'
  | 'resolved'

export interface DetectionEvidence {
  label: string
  observed: string
  expected: string
  state: 'normal' | 'warning' | 'critical'
}

export interface SimulationLogEntry {
  second: number
  title: string
  detail: string
  type: 'normal' | 'decision' | 'warning' | 'action' | 'resolved'
}

export interface FailureSimulationStatus {
  phase: FailureSimulationPhase
  title: string
  narrative: string
  elapsedSeconds: number
  durationSeconds: number
  progressPct: number
  severity: SimulationSeverity
  detectionConfidencePct: number
  predictedReadinessDelayMinutes: number
  targetDeviceId: string | null
  targetRoomId: string | null
  recommendedAction: string | null
  mitigationAction: string | null
  evidence: DetectionEvidence[]
  log: SimulationLogEntry[]
}

export interface FailureSimulationFrame {
  rooms: Room[]
  devices: ClimateDevice[]
  buildingTelemetry: BuildingTelemetryPoint[]
  controlDecisions: ControlDecision[]
  status: FailureSimulationStatus
}
