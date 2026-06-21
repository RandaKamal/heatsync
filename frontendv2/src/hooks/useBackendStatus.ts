import { useEffect, useRef, useState } from 'react'

export interface BackendHeatPump {
  id: string
  deviceId: string
  name: string
  model: string
  status: string
  position: number[]
  power: { current: number; max: number }
  runtime: string
  mode: string
  temperature: { supply: number; return: number }
  airFlow: { supply: number; return: number }
  humidity: number
  co2Ppm: number
  rawErrorRegisters: string
  savings: { kwh: number; co2: number; eur: number }
  anomalies: Array<{
    id: string
    severity: string
    type: string
    message: string
    time: string
    resolved: boolean
  }>
}

export interface BackendRoom {
  id: string
  name: string
  status: string
  temperature: { current: number; target: number; outside: number }
  occupancy: { current: number; max: number }
  advice?: {
    occupancyStatus: string
    minutesToOccupied: number | null
    etaMinutes: number | null
    etaLabel: string
    etaSource: string
    efficiency: string
    efficiencyNote: string
    recommendation: string
    needsHeat: boolean
    needsCool: boolean
  }
  heatPumps: BackendHeatPump[]
  tempHistory: Array<{ time: string; temp: number; target: number; outside: number }>
  energyHistory: Array<{ day: string; actual: number; baseline: number }>
  anomalies: Array<{ id: string; severity: string; type: string; message: string; time: string; resolved: boolean }>
}

export interface BackendStats {
  savings: { kwh: { today: number; total: number }; co2: { today: number; total: number }; eur: { today: number; total: number } }
  weather: { temp: number; condition: string; humidity: number }
  activeUnits: number
  totalUnits: number
  alerts: number
}

export interface AnomalyScenario {
  type: string
  label: string
  severity: string
  count: number
  sample?: { message: string; device_name: string; timestamp: string }
}

const EMPTY_STATS: BackendStats = {
  savings: { kwh: { today: 0, total: 0 }, co2: { today: 0, total: 0 }, eur: { today: 0, total: 0 } },
  weather: { temp: 0, condition: '—', humidity: 0 },
  activeUnits: 0,
  totalUnits: 0,
  alerts: 0,
}

const TYPE_LABELS: Record<string, string> = {
  ACTIVE_ALARM: 'Active Alarm',
  ERROR_REGISTER: 'Error Register',
  PRESSURE_ANOMALY: 'Pressure Anomaly',
  SUPPLY_RETURN_COLLAPSE: 'Supply/Return Collapse',
}

const API = 'http://localhost:5001/api'

export function useBackendStatus() {
  const [rooms, setRooms] = useState<BackendRoom[]>([])
  const [stats, setStats] = useState<BackendStats>(EMPTY_STATS)
  const [connected, setConnected] = useState(false)
  const [scenarios, setScenarios] = useState<AnomalyScenario[]>([])
  const liveRef = useRef(true)

  useEffect(() => {
    liveRef.current = true

    const poll = async () => {
      try {
        const ctrl = new AbortController()
        const timer = setTimeout(() => ctrl.abort(), 3000)
        const res = await fetch(`${API}/status`, { signal: ctrl.signal })
        clearTimeout(timer)
        if (!liveRef.current) return
        if (res.ok) {
          const data = await res.json()
          setRooms(data.rooms ?? [])
          if (data.savings || data.weather || data.stats) {
            setStats({
              savings: data.savings ?? EMPTY_STATS.savings,
              weather: data.weather
                ? { temp: data.weather.temp, condition: data.weather.condition, humidity: data.weather.humidity }
                : EMPTY_STATS.weather,
              activeUnits: data.stats?.activeUnits ?? 0,
              totalUnits: data.stats?.totalUnits ?? 0,
              alerts: data.stats?.alerts ?? 0,
            })
          }
          setConnected(true)
        } else {
          throw new Error('non-ok')
        }
      } catch {
        if (!liveRef.current) return
        setConnected(false)
      }
    }

    const fetchScenarios = async () => {
      try {
        const res = await fetch(`${API}/anomaly/alerts?window=heating`)
        if (!res.ok) return
        const data = await res.json()
        const alerts: Array<{ type: string; severity: string; message: string; device_name: string; timestamp: string }> =
          data.alerts ?? []
        const map: Record<string, AnomalyScenario> = {}
        for (const a of alerts) {
          if (!map[a.type]) {
            map[a.type] = {
              type: a.type,
              label: TYPE_LABELS[a.type] ?? a.type,
              severity: a.severity,
              count: 0,
              sample: { message: a.message, device_name: a.device_name, timestamp: a.timestamp },
            }
          }
          map[a.type].count++
        }
        setScenarios(Object.values(map))
      } catch {
        // silent
      }
    }

    poll()
    fetchScenarios()
    const id = setInterval(poll, 5000)
    return () => {
      liveRef.current = false
      clearInterval(id)
    }
  }, [])

  return { rooms, stats, connected, scenarios }
}
