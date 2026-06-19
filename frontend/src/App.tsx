import {
  useEffect,
  useMemo,
  useState,
} from 'react'
import { CampusCanvas } from './components/scene/CampusCanvas'
import { CampusSidebar } from './components/ui/CampusSidebar'
import { ControlTimeline } from './components/ui/ControlTimeline'
import { FailureSimulationPanel } from './components/ui/FailureSimulationPanel'
import { TopBar } from './components/ui/TopBar'
import {
  plannedActions,
  roomEvents,
  roomLoadHeatmap,
  weatherForecast,
} from './data/mockCampus'
import { useFailureSimulation } from './hooks/useFailureSimulation'
import type { FloorFilter } from './types/campus'
import {
  STATUS_COLORS,
  STATUS_LABELS,
} from './utils/status'

const legendStatuses = [
  'normal',
  'warming',
  'at-risk',
  'fault',
  'standby',
] as const

function App() {
  const [activeFloor, setActiveFloor] =
    useState<FloorFilter>('all')

  const [selectedDeviceId, setSelectedDeviceId] =
    useState<string | null>(null)

  const simulation = useFailureSimulation()

  const selectedDevice = useMemo(
    () =>
      simulation.devices.find(
        (device) => device.id === selectedDeviceId,
      ) ?? null,
    [simulation.devices, selectedDeviceId],
  )

  useEffect(() => {
    if (
      simulation.status.phase === 'idle' ||
      simulation.status.phase === 'normal' ||
      simulation.status.phase === 'occupancy-adaptation'
    ) {
      return
    }

    if (simulation.status.targetDeviceId) {
      setSelectedDeviceId(
        simulation.status.targetDeviceId,
      )
    }
  }, [
    simulation.status.phase,
    simulation.status.targetDeviceId,
  ])

  const handleFloorChange = (floor: FloorFilter) => {
    setActiveFloor(floor)

    if (
      selectedDevice &&
      selectedDevice.floor !== 'external' &&
      floor !== 'all' &&
      selectedDevice.floor !== floor
    ) {
      setSelectedDeviceId(null)
    }
  }

  const handlePlay = () => {
    setSelectedDeviceId(null)
    simulation.play()
  }

  const handleRestart = () => {
    setSelectedDeviceId(null)
    simulation.restart()
  }

  const handleReset = () => {
    setSelectedDeviceId(null)
    simulation.reset()
  }

  return (
    <div className="app-shell">
      <TopBar
        activeFloor={activeFloor}
        onFloorChange={handleFloorChange}
      />

      <main className="map-stage">
        <CampusCanvas
          rooms={simulation.rooms}
          devices={simulation.devices}
          activeFloor={activeFloor}
          selectedDeviceId={selectedDeviceId}
          onSelectDevice={setSelectedDeviceId}
          onCloseDevice={() => setSelectedDeviceId(null)}
        />

        <section className="map-legend glass-panel">
          <span className="section-eyebrow">
            Room condition
          </span>

          <div className="legend-list">
            {legendStatuses.map((status) => (
              <div className="legend-item" key={status}>
                <span
                  className="legend-swatch"
                  style={{
                    background: STATUS_COLORS[status],
                    boxShadow: `0 0 12px ${STATUS_COLORS[status]}66`,
                  }}
                />
                {STATUS_LABELS[status]}
              </div>
            ))}
          </div>
        </section>

        <FailureSimulationPanel
          status={simulation.status}
          isRunning={simulation.isRunning}
          isPaused={simulation.isPaused}
          speed={simulation.speed}
          onSpeedChange={simulation.setSpeed}
          onPlay={handlePlay}
          onPause={simulation.pause}
          onResume={simulation.resume}
          onRestart={handleRestart}
          onReset={handleReset}
        />

        <div className="scene-instructions">
          <span>Drag</span> rotate
          <span>Scroll</span> zoom
          <span>Shift + drag</span> pan
          <span>Tap a device</span> inspect
        </div>

        <CampusSidebar
          rooms={simulation.rooms}
          devices={simulation.devices}
          selectedDeviceId={selectedDeviceId}
          buildingTelemetry={
            simulation.buildingTelemetry
          }
          weatherForecast={weatherForecast}
          roomEvents={roomEvents}
          controlDecisions={
            simulation.controlDecisions
          }
          roomLoadHeatmap={roomLoadHeatmap}
          onSelectDevice={setSelectedDeviceId}
          onClearSelection={() =>
            setSelectedDeviceId(null)
          }
        />

        <ControlTimeline actions={plannedActions} />
      </main>
    </div>
  )
}

export default App
