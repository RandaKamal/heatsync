import type {
  OperationalStatus,
  TechnologyType,
} from '../types/campus'

export const STATUS_COLORS: Record<OperationalStatus, string> = {
  normal: '#2dd4bf',
  warming: '#38bdf8',
  'at-risk': '#f59e0b',
  fault: '#ef4444',
  offline: '#64748b',
  standby: '#94a3b8',
}

export const STATUS_LABELS: Record<OperationalStatus, string> = {
  normal: 'Normal',
  warming: 'Warming',
  'at-risk': 'At risk',
  fault: 'Fault',
  offline: 'Offline',
  standby: 'Standby',
}

export const TECHNOLOGY_LABELS: Record<TechnologyType, string> = {
  'heat-pump': 'Heat pump',
  'air-handler': 'Air-handling unit',
  thermostat: 'Thermostat / sensor',
}

export const TECHNOLOGY_ABBREVIATIONS: Record<
  TechnologyType,
  string
> = {
  'heat-pump': 'HP',
  'air-handler': 'AHU',
  thermostat: 'T',
}
