import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  buildFailureSimulationFrame,
  FAILURE_SIMULATION_DURATION_SECONDS,
} from '../simulation/failureScenario'

export type SimulationSpeed = 1 | 2 | 4

export function useFailureSimulation() {
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [speed, setSpeed] = useState<SimulationSpeed>(1)

  useEffect(() => {
    if (!isRunning || isPaused) {
      return
    }

    const timer = window.setInterval(() => {
      setElapsedSeconds((current) => {
        const next = current + 1

        if (
          next >= FAILURE_SIMULATION_DURATION_SECONDS
        ) {
          window.clearInterval(timer)
          setIsRunning(false)
          setIsPaused(false)
          return FAILURE_SIMULATION_DURATION_SECONDS
        }

        return next
      })
    }, 1000 / speed)

    return () => window.clearInterval(timer)
  }, [isRunning, isPaused, speed])

  const frame = useMemo(
    () => buildFailureSimulationFrame(elapsedSeconds),
    [elapsedSeconds],
  )

  const play = useCallback(() => {
    setElapsedSeconds((current) =>
      current >= FAILURE_SIMULATION_DURATION_SECONDS
        ? 0
        : current,
    )
    setIsRunning(true)
    setIsPaused(false)
  }, [])

  const pause = useCallback(() => {
    setIsPaused(true)
  }, [])

  const resume = useCallback(() => {
    setIsRunning(true)
    setIsPaused(false)
  }, [])

  const restart = useCallback(() => {
    setElapsedSeconds(0)
    setIsRunning(true)
    setIsPaused(false)
  }, [])

  const reset = useCallback(() => {
    setElapsedSeconds(0)
    setIsRunning(false)
    setIsPaused(false)
  }, [])

  return {
    ...frame,
    elapsedSeconds,
    isRunning,
    isPaused,
    speed,
    setSpeed,
    play,
    pause,
    resume,
    restart,
    reset,
  }
}
