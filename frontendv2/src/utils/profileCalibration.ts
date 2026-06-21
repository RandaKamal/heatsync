import type { CalibrationStage } from '../types/buildingProfile'

export const STAGE_LABELS: Record<CalibrationStage, string> = {
  'not-started': 'Not started',
  'baseline-observation': 'Observe baseline',
  'controlled-heating': 'Apply controlled heating',
  'thermal-decay': 'Measure thermal decay',
  'parameter-fitting': 'Fit site-specific parameters',
  'ready': 'Complete',
}

export const STAGE_DESCRIPTIONS: Record<CalibrationStage, string> = {
  'not-started': 'Calibration has not started yet. Press Start to begin the process.',
  'baseline-observation': 'Monitoring the building at rest to establish a thermal baseline without active heating.',
  'controlled-heating': 'Applying a known, constant heat input to measure how the space responds.',
  'thermal-decay': 'Heating has stopped. Measuring how quickly the space loses heat to the environment.',
  'parameter-fitting': 'Analysing collected data to fit site-specific thermal model parameters.',
  'ready': 'Calibration is complete. Site-specific parameters are now active.',
}

export function stageAfter(current: CalibrationStage): CalibrationStage {
  const order: CalibrationStage[] = [
    'not-started',
    'baseline-observation',
    'controlled-heating',
    'thermal-decay',
    'parameter-fitting',
    'ready',
  ]
  const i = order.indexOf(current)
  return order[Math.min(i + 1, order.length - 1)]
}

export function stageFromProgress(p: number): CalibrationStage {
  if (p <= 0) return 'baseline-observation'
  if (p < 25) return 'baseline-observation'
  if (p < 50) return 'controlled-heating'
  if (p < 75) return 'thermal-decay'
  if (p < 100) return 'parameter-fitting'
  return 'ready'
}
