export type Vector3Tuple = [number, number, number]

export type OperationalStatus =
  | 'normal'
  | 'warming'
  | 'at-risk'
  | 'fault'
  | 'offline'
  | 'standby'

export type TechnologyType =
  | 'orion-mobile-rooftop'
  | 'room-sensor'

export type OrionModel =
  | 'ORIO 025'
  | 'ORIO 039'
  | 'ORIO 047'

export type OperatingMode =
  | 'heating'
  | 'cooling'
  | 'ventilation'
  | 'defrost'
  | 'standby'

export type FloorLevel = 0 | 1 | 'external'
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
  humidityPct: number
  occupancy: number
  capacity: number
  forecastOccupancy: number
  nextEvent: string
  servedBy: string[]
}

export interface DeviceTelemetryPoint {
  time: string
  indoorTempC: number
  targetTempC: number
  outdoorTempC: number
  powerKw: number
  occupancy: number
  airflowM3h: number
}

export interface RuntimeHeatmapCell {
  day: string
  hour: string
  runtimePct: number
  mode: OperatingMode
}

export interface ClimateDevice {
  id: string
  name: string
  technology: TechnologyType
  model?: OrionModel
  manufacturer: string
  floor: FloorLevel
  position: Vector3Tuple
  status: OperationalStatus
  operatingMode: OperatingMode
  currentPowerKw: number
  energyTodayKwh: number
  runtimeTodayMinutes: number
  compressorRuntimeMinutes: number
  efficiencyCop: number | null
  healthScore: number
  servedRoomIds: string[]
  setpointCelsius: number
  lastUpdated: string

  nominalCoolingCapacityKw?: number
  nominalHeatingCapacityKw?: number
  ratedCoolingInputKw?: number
  ratedHeatingInputKw?: number
  airflowM3h?: number
  staticPressurePa?: number
  freshAirRatioPct?: number
  supplyFanSpeedPct?: number
  refrigerant?: string
  compressorType?: string
  controlInterface?: string
  automaticDefrost?: boolean

  features: string[]
  history: DeviceTelemetryPoint[]
  runtimeHeatmap: RuntimeHeatmapCell[]
  alert?: string
  recommendedAction?: string
  influencingFactors: string[]
}

export interface PlannedAction {
  id: string
  time: string
  label: string
  location: string
  type: 'start' | 'reduce' | 'inspect' | 'stop'
}

export interface WeatherForecastPoint {
  time: string
  condition: string
  temperatureC: number
  feelsLikeC: number
  windKph: number
  humidityPct: number
  solarWm2: number
}

export interface BuildingTelemetryPoint {
  time: string
  actualPowerKw: number
  baselinePowerKw: number
  averageIndoorTempC: number
  outdoorTempC: number
  totalOccupancy: number
}

export interface RoomEvent {
  id: string
  roomId: string
  title: string
  start: string
  end: string
  expectedStudents: number
}

export interface ControlDecision {
  id: string
  time: string
  roomId: string
  deviceId: string
  action: string
  reason: string
  status: 'planned' | 'active' | 'completed' | 'blocked'
}

export interface RoomLoadHeatmapCell {
  roomId: string
  time: string
  loadPct: number
}
