/**
 * Lead time calculation utilities.
 *
 * Formula (clamped to [5, 120] minutes):
 *   tempDelta  = targetTempC - currentTempC
 *   if tempDelta <= 0  → 10 min (already at or above target)
 *   baseMinutes = (tempDelta / heatingRateCPerHour) * 60
 *   confidenceFactor = 1 + (1 - confidencePercent / 100) * 0.5
 *   leadMinutes = baseMinutes * confidenceFactor * (1 / heatingEfficiencyIndex)
 *   clamped to [5, 120]
 */

export interface LeadTimeParams {
  currentTempC: number
  targetTempC: number
  heatingRateCPerHour: number
  confidencePercent: number
  heatingEfficiencyIndex: number
}

export function calcLeadMinutes(params: LeadTimeParams): number {
  const { currentTempC, targetTempC, heatingRateCPerHour, confidencePercent, heatingEfficiencyIndex } = params
  const tempDelta = targetTempC - currentTempC
  if (tempDelta <= 0) return 10
  const baseMinutes = (tempDelta / heatingRateCPerHour) * 60
  const confidenceFactor = 1 + (1 - confidencePercent / 100) * 0.5
  const efficiency = heatingEfficiencyIndex > 0 ? heatingEfficiencyIndex : 1
  const lead = baseMinutes * confidenceFactor * (1 / efficiency)
  return Math.round(Math.min(120, Math.max(5, lead)))
}

export function genericLeadMinutes(): number {
  return 90
}

export interface EnergySavingsResult {
  savedKwh: number
  savedEur: number
  savedCo2Kg: number
}

/**
 * Estimate energy saved by starting earlier only when needed vs always starting 90 min early.
 *
 * @param genericMinutes - generic lead time (always 90)
 * @param actualMinutes  - the calculated lead time
 * @param activeDevices  - number of devices running
 * @param avgKwPerDevice - average kW per device
 */
export function estimatedEnergySaved(
  genericMinutes: number,
  actualMinutes: number,
  activeDevices: number,
  avgKwPerDevice: number,
): EnergySavingsResult {
  const minutesSaved = Math.max(0, genericMinutes - actualMinutes)
  const hoursSaved = minutesSaved / 60
  const savedKwh = hoursSaved * activeDevices * avgKwPerDevice
  const savedEur = savedKwh * 0.25   // €0.25/kWh estimate
  const savedCo2Kg = savedKwh * 0.233 // 233 gCO2/kWh EU grid average
  return {
    savedKwh: Math.round(savedKwh * 100) / 100,
    savedEur: Math.round(savedEur * 100) / 100,
    savedCo2Kg: Math.round(savedCo2Kg * 100) / 100,
  }
}
