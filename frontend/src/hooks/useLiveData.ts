import { useState, useEffect } from 'react'
import { ClimateDevice, RoomEvent, WeatherForecastPoint } from '../types/campus'
import { fetchDevices, fetchWeatherForecast, fetchSchedule } from '../api/client'

export function useLiveData() {
  const [devices, setDevices] = useState<ClimateDevice[]>([])
  const [weatherForecast, setWeatherForecast] = useState<WeatherForecastPoint[]>([])
  const [roomEvents, setRoomEvents] = useState<RoomEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let mounted = true

    async function loadData() {
      try {
        setIsLoading(true)
        const [devs, weather, events] = await Promise.all([
          fetchDevices(),
          fetchWeatherForecast(),
          fetchSchedule()
        ])
        
        if (mounted) {
          setDevices(devs)
          setWeatherForecast(weather)
          // Combine heating and cooling events for now
          setRoomEvents(events)
          setError(null)
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Unknown error'))
        }
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    loadData()
    // Optional: add interval for polling if needed
    // const interval = setInterval(loadData, 60000)
    // return () => { mounted = false; clearInterval(interval) }
    
    return () => { mounted = false }
  }, [])

  return { devices, weatherForecast, roomEvents, isLoading, error }
}
