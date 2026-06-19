export type Vector3Tuple = [number, number, number]

export type OperationalStatus =
  | 'normal'
  | 'warming'
  | 'at-risk'
  | 'fault'
  | 'offline'
  | 'standby'

export type TechnologyType =
  | 'heat-pump'
  | 'air-handler'
  | 'thermostat'

export type FloorLevel = 0 | 1 | 'roof'
export type FloorFilter = 'all' | 0 | 1

export interface Room {
  id: string
  name: string
  floor: 0 | 1
  position: Vector3Tuple
  size: Vector3Tuple
  status: OperationalStatus
  currentTemperature: number
  targetTemperature: number
  occupancy: number
  capacity: number
  nextEvent: string
  servedBy: string[]
}

export interface ClimateDevice {
  id: string
  name: string
  technology: TechnologyType
  floor: FloorLevel
  position: Vector3Tuple
  status: OperationalStatus
  currentPowerKw: number
  energyTodayKwh: number
  runtimeTodayMinutes: number
  efficiencyCop: number | null
  healthScore: number
  servedRoomIds: string[]
  setpointCelsius: number
  lastUpdated: string
  alert?: string
  recommendedAction?: string
}

export interface PlannedAction {
  id: string
  time: string
  label: string
  location: string
  type: 'start' | 'reduce' | 'inspect' | 'stop'
}
