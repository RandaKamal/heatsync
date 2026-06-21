import type { BuildingParameters, ThermalParameters, OccupancyParameters, ComfortParameters } from '../types/buildingProfile'

export function validateBuildingParams(params: BuildingParameters): Record<string, string> {
  const errors: Record<string, string> = {}
  if (params.floorAreaM2 <= 0) {
    errors.floorAreaM2 = 'Floor area must be greater than 0'
  }
  if (params.volumeM3 <= 0) {
    errors.volumeM3 = 'Volume must be greater than 0'
  }
  return errors
}

export function validateThermalParams(params: ThermalParameters): Record<string, string> {
  const errors: Record<string, string> = {}
  if (params.thermalTimeConstantHours <= 0) {
    errors.thermalTimeConstantHours = 'Thermal time constant must be greater than 0'
  }
  if (params.estimatedHeatRetentionHours <= 0) {
    errors.estimatedHeatRetentionHours = 'Heat retention must be greater than 0'
  }
  if (params.heatingRateCPerHour <= 0) {
    errors.heatingRateCPerHour = 'Heating rate must be greater than 0'
  }
  if (params.coolingRateCPerHour <= 0) {
    errors.coolingRateCPerHour = 'Cooling rate must be greater than 0'
  }
  if (params.envelopeResistanceIndex <= 0) {
    errors.envelopeResistanceIndex = 'Envelope resistance index must be greater than 0'
  }
  if (params.effectiveThermalCapacityIndex <= 0) {
    errors.effectiveThermalCapacityIndex = 'Thermal capacity index must be greater than 0'
  }
  if (params.heatingEfficiencyIndex <= 0) {
    errors.heatingEfficiencyIndex = 'Heating efficiency index must be greater than 0'
  }
  if (params.coolingEfficiencyIndex <= 0) {
    errors.coolingEfficiencyIndex = 'Cooling efficiency index must be greater than 0'
  }
  return errors
}

export function validateOccupancyParams(params: OccupancyParameters): Record<string, string> {
  const errors: Record<string, string> = {}
  if (params.typicalOccupancy <= 0) {
    errors.typicalOccupancy = 'Typical occupancy must be greater than 0'
  }
  if (params.maximumOccupancy <= 0) {
    errors.maximumOccupancy = 'Maximum occupancy must be greater than 0'
  }
  if (params.typicalOccupancy > params.maximumOccupancy) {
    errors.typicalOccupancy = 'Typical occupancy cannot exceed maximum occupancy'
  }
  if (params.sensibleHeatGainWPerPerson <= 0) {
    errors.sensibleHeatGainWPerPerson = 'Sensible heat gain must be greater than 0'
  }
  return errors
}

export function validateComfortParams(params: ComfortParameters): Record<string, string> {
  const errors: Record<string, string> = {}
  if (params.heatingComfortMinC >= params.heatingComfortMaxC) {
    errors.heatingComfortMinC = 'Heating min must be less than heating max'
  }
  if (params.coolingComfortMinC > params.coolingComfortMaxC) {
    errors.coolingComfortMinC = 'Cooling min must be less than or equal to cooling max'
  }
  if (params.humidityMinPercent < 0 || params.humidityMinPercent > 100) {
    errors.humidityMinPercent = 'Humidity min must be between 0 and 100'
  }
  if (params.humidityMaxPercent < 0 || params.humidityMaxPercent > 100) {
    errors.humidityMaxPercent = 'Humidity max must be between 0 and 100'
  }
  if (params.humidityMinPercent >= params.humidityMaxPercent) {
    errors.humidityMinPercent = 'Humidity min must be less than humidity max'
  }
  return errors
}
