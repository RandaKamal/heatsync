import type {
  ClimateDevice,
  WeatherForecastPoint,
  RoomEvent,
} from '../types/campus'
import type { OptimizeSuggestion } from '../components/ui/OptimizeModal'
import type { Alert, Notification } from '../components/ui/TechnicianPanel'

export interface DeviceImpact {
  device_id: string
  device_name: string
  energy_saved_kwh: number
  cost_saved_eur: number
  co2_saved_kg: number
}

export interface SavingsTotals {
  energy_saved_kwh: number
  cost_saved_eur: number
  co2_saved_kg: number
}

export interface EnergyWindow {
  eventId: string
  roomId: string
  title: string
  preheatStart: string
  eventStart: string
  eventEnd: string
  windDownTime: string
  leadMinutes: number
  windDownBufferMin: number
  predictedMode: string
  setpointCelsius: number
  outdoorTempCelsius: number
}

// ── Existing endpoints ────────────────────────────────────────────────────────

export async function fetchDevices(): Promise<ClimateDevice[]> {
  const response = await fetch('/api/devices')
  if (!response.ok) throw new Error('Failed to fetch devices')
  const data = await response.json()
  return data.map((d: any) => ({
    id: d.device_id,
    name: d.name || d.label || d.device_id,
    technology: d.technology || 'orion-mobile-rooftop',
    manufacturer: d.manufacturer || 'Unknown',
    floor: d.floor !== undefined ? d.floor : 'external',
    position: [d.position?.x || 0, d.position?.y || 0, d.position?.z || 0],
    status: d.status || 'normal',
    operatingMode: d.operating_mode || 'standby',
    currentPowerKw: d.current_power_kw || 0,
    energyTodayKwh: d.energy_today_kwh || 0,
    runtimeTodayMinutes: d.runtime_today_minutes || 0,
    compressorRuntimeMinutes: d.compressor_runtime_minutes || 0,
    efficiencyCop: d.efficiency_cop || null,
    healthScore: d.health_score || 100,
    servedRoomIds: d.served_room_ids || [],
    setpointCelsius: d.setpoint_celsius || 21,
    lastUpdated: d.last_updated || 'just now',
    features: d.features || [],
    history: d.history || [],
    runtimeHeatmap: d.runtimeHeatmap || [],
    influencingFactors: d.influencingFactors || [],
    alert: d.alert,
    recommendedAction: d.recommendedAction,
  }))
}

export async function fetchWeatherForecast(): Promise<WeatherForecastPoint[]> {
  const response = await fetch('/api/weather/forecast')
  if (!response.ok) throw new Error('Failed to fetch weather forecast')
  const data = await response.json()
  return (data.hourly || []).slice(0, 6).map((p: any) => ({
    time: p.time?.slice(11, 16) ?? '',
    condition: p.hvac_mode ?? 'Clear',
    temperatureC: p.temperature_2m ?? 0,
    feelsLikeC: p.apparent_temperature ?? 0,
    windKph: (p.wind_speed_10m ?? 0) * 3.6,
    humidityPct: p.relative_humidity_2m ?? 0,
    solarWm2: 0,
  }))
}

export async function fetchImpactByDevice(): Promise<DeviceImpact[]> {
  const response = await fetch('/api/impact/by-device')
  if (!response.ok) throw new Error('Failed to fetch device impact')
  return response.json()
}

export async function fetchImpactSummary(): Promise<{ total: SavingsTotals }> {
  const response = await fetch('/api/impact/summary')
  if (!response.ok) throw new Error('Failed to fetch impact summary')
  return response.json()
}

// ── Schedule endpoints (new) ──────────────────────────────────────────────────

export async function fetchSchedule(roomId?: string): Promise<RoomEvent[]> {
  const url = roomId ? `/api/schedules?roomId=${roomId}` : '/api/schedules'
  const response = await fetch(url)
  if (!response.ok) throw new Error('Failed to fetch schedule')
  const data: any[] = await response.json()
  // Normalise snake_case → camelCase
  return data.map((e) => ({
    id:               e.id,
    roomId:           e.roomId,
    title:            e.title,
    start:            e.start,
    end:              e.end,
    expectedStudents: e.expectedStudents ?? e.expected_students ?? 50,
    day:              e.day,
    recurrence:       e.recurrence,
  }))
}

export async function createScheduleEvent(event: Omit<RoomEvent, 'id'>): Promise<RoomEvent> {
  const response = await fetch('/api/schedules', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      roomId:           event.roomId,
      title:            event.title,
      start:            event.start,
      end:              event.end,
      expectedStudents: event.expectedStudents,
      day:              event.day,
      recurrence:       event.recurrence ?? 'once',
    }),
  })
  if (!response.ok) throw new Error('Failed to create event')
  return response.json()
}

export async function deleteScheduleEvent(eventId: string): Promise<void> {
  const response = await fetch(`/api/schedules/${eventId}`, { method: 'DELETE' })
  if (!response.ok) throw new Error('Failed to delete event')
}

export async function fetchEnergyWindows(): Promise<EnergyWindow[]> {
  const response = await fetch('/api/schedules/energy-windows')
  if (!response.ok) throw new Error('Failed to fetch energy windows')
  const data = await response.json()
  return data.windows ?? []
}

// ── Optimization endpoints (new) ──────────────────────────────────────────────

export async function fetchOptimizeSuggestion(): Promise<OptimizeSuggestion | null> {
  const response = await fetch('/api/optimization/suggest')
  if (!response.ok) throw new Error('Failed to fetch optimization suggestion')
  const data = await response.json()
  return data.suggestion ?? null
}

export async function applyOptimization(suggestion: OptimizeSuggestion): Promise<void> {
  const response = await fetch('/api/optimization/apply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      moveEventId: suggestion.moveEventId,
      toRoomId:    suggestion.toRoomId,
    }),
  })
  if (!response.ok) throw new Error('Failed to apply optimization')
}

// ── Anomaly / technician endpoints (extended) ─────────────────────────────────

export async function fetchAnomalyAlerts(window = 'heating'): Promise<Alert[]> {
  const response = await fetch(`/api/anomaly/alerts?window=${window}`)
  if (!response.ok) throw new Error('Failed to fetch anomaly alerts')
  const data = await response.json()
  return data.alerts ?? []
}

export async function contactTechnician(alert: Alert): Promise<Notification> {
  const response = await fetch('/api/anomaly/contact-technician', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      deviceId:  alert.device_id ?? '',
      unitId:    alert.device_name ?? alert.device_id ?? '',
      roomName:  'Main Space',
      severity:  alert.severity,
      alertType: alert.type,
      message:   alert.message,
    }),
  })
  if (!response.ok) throw new Error('Failed to send technician notification')
  const data = await response.json()
  return data.notification
}

export async function fetchNotifications(): Promise<Notification[]> {
  const response = await fetch('/api/anomaly/notifications')
  if (!response.ok) throw new Error('Failed to fetch notifications')
  return response.json()
}
