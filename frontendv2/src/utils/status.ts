import type {
  OperatingMode,
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
  warming: 'Conditioning',
  'at-risk': 'At risk',
  fault: 'Fault',
  offline: 'Offline',
  standby: 'Standby',
}

export const TECHNOLOGY_LABELS: Record<TechnologyType, string> = {
  'ihl-heat-pump': 'HELOT IHL Heat Pump',
  'room-sensor': 'Room climate sensor',
}

export const TECHNOLOGY_ABBREVIATIONS: Record<
  TechnologyType,
  string
> = {
  'ihl-heat-pump': 'HP',
  'room-sensor': 'S',
}

export const MODE_LABELS: Record<OperatingMode, string> = {
  heating: 'Heating',
  cooling: 'Cooling',
  ventilation: 'Ventilation',
  defrost: 'Automatic defrost',
  standby: 'Standby',
}
