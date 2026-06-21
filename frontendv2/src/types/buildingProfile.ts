export type InsulationLevel = 'low' | 'medium' | 'medium-high' | 'high'
export type AirLeakageLevel = 'low' | 'medium' | 'high'
export type ThermalMassLevel = 'low' | 'medium' | 'high'
export type ActivityType = 'seated' | 'light' | 'mixed' | 'active'

export interface BuildingParameters {
  floorAreaM2: number
  volumeM3: number
  insulationLevel: InsulationLevel
  airLeakageLevel: AirLeakageLevel
  thermalMassLevel: ThermalMassLevel
}

export interface ThermalParameters {
  thermalTimeConstantHours: number
  estimatedHeatRetentionHours: number
  heatingRateCPerHour: number
  coolingRateCPerHour: number
  envelopeResistanceIndex: number
  effectiveThermalCapacityIndex: number
  heatingEfficiencyIndex: number
  coolingEfficiencyIndex: number
}

export interface OccupancyParameters {
  typicalOccupancy: number
  maximumOccupancy: number
  activityType: ActivityType
  sensibleHeatGainWPerPerson: number
  doorOpeningIntensity: AirLeakageLevel
}

export interface ComfortParameters {
  heatingComfortMinC: number
  heatingComfortMaxC: number
  coolingComfortMinC: number
  coolingComfortMaxC: number
  humidityMinPercent: number
  humidityMaxPercent: number
  co2WarningPpm: number
}

export interface CalibrationSettings {
  recommendedCalibrationHours: number
  initialConfidencePercent: number
}

export interface BuildingProfile {
  id: string
  name: string
  description: string
  icon: string
  building: BuildingParameters
  thermal: ThermalParameters
  occupancy: OccupancyParameters
  comfort: ComfortParameters
  calibration: CalibrationSettings
}

export type CalibrationStage =
  | 'not-started'
  | 'baseline-observation'
  | 'controlled-heating'
  | 'thermal-decay'
  | 'parameter-fitting'
  | 'ready'

export interface CalibrationState {
  stage: CalibrationStage
  progressPercent: number
  confidencePercent: number
  startedAt?: string
  completedAt?: string
  paused: boolean
}

export type WizardStep = 'selecting' | 'calibrating' | 'scheduling' | 'commissioned'

export interface ProfileState {
  activeProfileId: string
  siteValues: {
    building: BuildingParameters
    thermal: ThermalParameters
    occupancy: OccupancyParameters
    comfort: ComfortParameters
  }
  calibration: CalibrationState
  wizardStep: WizardStep
  scheduleImported: boolean
}
