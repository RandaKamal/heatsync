import { useState, useEffect, useRef } from 'react'

const EMPTY_STATS = {
  savings: { kwh: { today: 0 }, co2: { today: 0 }, eur: { today: 0 } },
  weather: { temp: 0, condition: '—', humidity: 0 },
  activeUnits: 0,
  totalUnits:  0,
  alerts:      0,
}

function applyDrift(rooms) {
  return rooms.map(room => ({
    ...room,
    temperature: {
      ...room.temperature,
      current: parseFloat(
        Math.max(10, Math.min(35,
          room.temperature.current + (Math.random() - 0.5) * 0.06
        )).toFixed(1)
      ),
    },
    heatPumps: room.heatPumps.map(unit => ({
      ...unit,
      power: {
        ...unit.power,
        current: parseFloat(
          Math.max(0, Math.min(unit.power.max,
            unit.power.current + (Math.random() - 0.5) * 0.12
          )).toFixed(1)
        ),
      },
    })),
  }))
}

function collectAlertIds(rooms) {
  const ids = new Set()
  rooms.forEach(room =>
    room.heatPumps?.forEach(unit =>
      unit.anomalies?.forEach(a => { if (!a.resolved) ids.add(a.id) })
    )
  )
  return ids
}

function collectActiveAlerts(rooms) {
  const alerts = []
  rooms.forEach(room =>
    room.heatPumps?.forEach(unit =>
      unit.anomalies?.forEach(a => {
        if (!a.resolved) alerts.push({
          ...a,
          roomName: room.name,
          roomId:   room.id,
          unitId:   unit.id,
          deviceId: unit.deviceId,
        })
      })
    )
  )
  return alerts
}

export function useBackendStatus() {
  const [rooms,      setRooms]      = useState([])
  const [stats,      setStats]      = useState(EMPTY_STATS)
  const [connected,  setConnected]  = useState(false)
  const [newAlerts,  setNewAlerts]  = useState([])   // toasts queue
  const [allAlerts,  setAllAlerts]  = useState([])   // full active list

  const seenIds   = useRef(new Set())
  const firstPoll = useRef(true)

  useEffect(() => {
    let live = true

    const poll = async () => {
      try {
        const ctrl  = new AbortController()
        const timer = setTimeout(() => ctrl.abort(), 3000)
        const res   = await fetch('http://localhost:5001/api/status', { signal: ctrl.signal })
        clearTimeout(timer)

        if (!live) return
        if (res.ok) {
          const data = await res.json()
          const nextRooms = data.rooms ?? []
          setRooms(nextRooms)

          if (data.savings || data.weather || data.stats) {
            setStats(prev => ({
              ...prev,
              ...(data.stats ?? {}),
              savings: data.savings ?? prev.savings,
              weather: data.weather
                ? { temp: data.weather.temp, condition: data.weather.condition, humidity: data.weather.humidity }
                : prev.weather,
            }))
          }
          setConnected(true)

          // ── Alert detection ──────────────────────────────────────────────
          const active     = collectActiveAlerts(nextRooms)
          const currentIds = collectAlertIds(nextRooms)
          setAllAlerts(active)

          // Keep badge count in sync with what's actually in the panel
          setStats(prev => ({ ...prev, alerts: active.length }))

          if (!firstPoll.current) {
            const fresh = active.filter(a => !seenIds.current.has(a.id))
            if (fresh.length > 0) setNewAlerts(prev => [...prev, ...fresh])
          }

          seenIds.current = currentIds
          firstPoll.current = false
        } else {
          throw new Error('non-ok')
        }
      } catch {
        if (!live) return
        setConnected(false)
        setRooms(prev => applyDrift(prev))
      }
    }

    poll()
    const id = setInterval(poll, 5000)
    return () => { live = false; clearInterval(id) }
  }, [])

  const dismissToast = (alertId) =>
    setNewAlerts(prev => prev.filter(a => a.id !== alertId))

  return { rooms, stats, connected, newAlerts, allAlerts, dismissToast }
}
