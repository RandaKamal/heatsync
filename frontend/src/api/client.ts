import type {
  ClimateDevice,
  Room,
  WeatherForecastPoint,
  RoomEvent,
} from '../types/campus'

export async function fetchDevices(): Promise<ClimateDevice[]> {
  const response = await fetch('/api/devices')
  if (!response.ok) {
    throw new Error('Failed to fetch devices')
  }
  const data = await response.json()
  // Ensure the backend structure is mapped if necessary.
  // The backend seems to return a list of devices that we might need to map to ClimateDevice.
  return data.map((d: any) => ({
    id: d.device_id,
    name: d.name || d.device_id,
    technology: d.technology || 'orion-mobile-rooftop',
    manufacturer: d.manufacturer || 'Unknown',
    floor: d.floor !== undefined ? d.floor : 'external',
    position: [
      d.position?.x || 0,
      d.position?.y || 0,
      d.position?.z || 0,
    ],
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
  if (!response.ok) {
    throw new Error('Failed to fetch weather forecast')
  }
  const data = await response.json()
  // Assuming the backend returns an array of daily/hourly points
  return (data.forecast || []).map((p: any) => ({
    time: p.time,
    condition: p.condition || 'Clear',
    temperatureC: p.temperatureC || 0,
    feelsLikeC: p.feelsLikeC || 0,
    windKph: p.windKph || 0,
    humidityPct: p.humidityPct || 0,
    solarWm2: p.solarWm2 || 0,
  }))
}

export async function fetchSpaceEvents(): Promise<{ heating: RoomEvent[], cooling: RoomEvent[] }> {
  const response = await fetch('/api/spaces/events')
  if (!response.ok) {
    throw new Error('Failed to fetch space events')
  }
  const data = await response.json()
  return data
}
