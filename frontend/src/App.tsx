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
  roomEvents as mockRoomEvents,
  roomLoadHeatmap,
  weatherForecast as mockWeatherForecast,
} from './data/mockCampus'
import { useFailureSimulation } from './hooks/useFailureSimulation'
import { useLiveData } from './hooks/useLiveData'
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

  const [isLiveMode, setIsLiveMode] = useState(false)
  const liveData = useLiveData()

  const [selectedDeviceId, setSelectedDeviceId] =
    useState<string | null>(null)

  const simulation = useFailureSimulation()

  const currentDevices = isLiveMode && liveData.devices.length > 0
    ? liveData.devices
    : simulation.devices

  const currentRooms = simulation.rooms

  const selectedDevice = useMemo(
    () =>
      currentDevices.find(
        (device) => device.id === selectedDeviceId,
      ) ?? null,
    [currentDevices, selectedDeviceId],
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
      
      <div style={{ padding: '8px 16px', display: 'flex', gap: '16px', alignItems: 'center', background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
          <input 
            type="checkbox" 
            checked={isLiveMode} 
            onChange={(e) => setIsLiveMode(e.target.checked)} 
          />
          Live Data Mode {liveData.isLoading && isLiveMode ? '(Loading...)' : ''}
        </label>
        {isLiveMode && liveData.error && (
          <span style={{ color: '#ff6b6b', fontSize: '14px' }}>
            Error connecting to API (backend might not be running)
          </span>
        )}
      </div>

      <main className="map-stage">
        <CampusCanvas
          rooms={currentRooms}
          devices={currentDevices}
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
          rooms={currentRooms}
          devices={currentDevices}
          selectedDeviceId={selectedDeviceId}
          buildingTelemetry={
            simulation.buildingTelemetry
          }
          weatherForecast={isLiveMode && liveData.weatherForecast.length > 0 ? liveData.weatherForecast : mockWeatherForecast}
          roomEvents={isLiveMode && liveData.roomEvents.length > 0 ? liveData.roomEvents : mockRoomEvents}
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
