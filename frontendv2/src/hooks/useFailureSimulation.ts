import {
  useCallback,
  useMemo,
  useState,
} from 'react'
import {
  buildFailureSimulationFrame,
  FAILURE_SIMULATION_DURATION_SECONDS,
} from '../simulation/failureScenario'

const PHASE_STARTS = [1, 8, 16, 22, 31, 38, 44, 50, 58]

export function useFailureSimulation() {
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  const frame = useMemo(
    () => buildFailureSimulationFrame(elapsedSeconds),
    [elapsedSeconds],
  )

  const stepToNextPhase = useCallback(() => {
    setElapsedSeconds((current) => {
      const next = PHASE_STARTS.find((s) => s > current)
      return next ?? FAILURE_SIMULATION_DURATION_SECONDS
    })
  }, [])

  const reset = useCallback(() => {
    setElapsedSeconds(0)
  }, [])

  return {
    ...frame,
    elapsedSeconds,
    reset,
    stepToNextPhase,
  }
}
