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
import { useBackendStatus } from './hooks/useBackendStatus'
import { useFailureSimulation } from './hooks/useFailureSimulation'
import { useLiveData } from './hooks/useLiveData'
import { UnitDetailPanel } from './panels/UnitDetailPanel'
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
  const [isLiveMode, setIsLiveMode] = useState(false)
  const liveData = useLiveData()

  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null)

  // Simulation panel: collapsed by default, opened with play button
  const [simOpen, setSimOpen] = useState(false)
  const [simScenario, setSimScenario] = useState('DEMO')

  // Stats panel: toggled independently
  const [statsOpen, setStatsOpen] = useState(false)

  // Backend live data
  const { rooms: backendRooms, connected: backendConnected, scenarios } = useBackendStatus()

  // Auto-select the first room when backend connects
  const mainBackendRoom = useMemo(
    () => backendRooms.find((r) => r.heatPumps.length > 0) ?? null,
    [backendRooms],
  )

  const simulation = useFailureSimulation()

  const currentDevices = isLiveMode && liveData.devices.length > 0
    ? liveData.devices
    : simulation.devices

  const currentRooms = simulation.rooms

  useEffect(() => {
    if (
      simulation.status.phase === 'idle' ||
      simulation.status.phase === 'normal' ||
      simulation.status.phase === 'occupancy-adaptation'
    ) {
      return
    }
    if (simulation.status.targetDeviceId) {
      setSelectedDeviceId(simulation.status.targetDeviceId)
    }
  }, [simulation.status.phase, simulation.status.targetDeviceId])

  // Close stats panel if backend disconnects
  useEffect(() => {
    if (!backendConnected) setStatsOpen(false)
  }, [backendConnected])

  const handleReset = () => {
    setSelectedDeviceId(null)
    simulation.reset()
  }

  // Status colour for the stats toggle button
  const statsStatusColor = (() => {
    if (!mainBackendRoom) return '#4fc3f7'
    const rank: Record<string, number> = { error: 3, warning: 2, active: 1, idle: 0 }
    const worst = mainBackendRoom.heatPumps.reduce(
      (w, hp) => rank[hp.status] > rank[w] ? hp.status : w, 'idle'
    )
    return worst === 'error' ? '#ef5350' : worst === 'warning' ? '#ffa726' : worst === 'active' ? '#00e676' : '#4fc3f7'
  })()

  return (
    <div className="app-shell">
      <TopBar />

      {/* Toolbar */}
      <div style={{
        padding: '7px 16px', display: 'flex', gap: '12px', alignItems: 'center',
        background: 'rgba(0,0,0,0.22)', borderBottom: '1px solid rgba(255,255,255,0.08)',
        flexWrap: 'wrap',
      }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
          <input
            type="checkbox"
            checked={isLiveMode}
            onChange={(e) => setIsLiveMode(e.target.checked)}
          />
          Live Data Mode {liveData.isLoading && isLiveMode ? '(Loading…)' : ''}
        </label>

        {isLiveMode && liveData.error && (
          <span style={{ color: '#ff6b6b', fontSize: '12px' }}>
            Error connecting to simulation API
          </span>
        )}

        {backendConnected && (
          <span style={{
            marginLeft: 'auto', fontSize: 10, color: '#00e676',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%', background: '#00e676',
              boxShadow: '0 0 6px #00e676', display: 'inline-block',
            }} />
            Backend connected
          </span>
        )}
      </div>

      <main className="map-stage">
        <CampusCanvas
          rooms={currentRooms}
          devices={currentDevices}
          activeFloor="all"
          selectedDeviceId={selectedDeviceId}
          onSelectDevice={setSelectedDeviceId}
          onCloseDevice={() => setSelectedDeviceId(null)}
        />

        {/* Room condition legend */}
        <section className="map-legend glass-panel">
          <span className="section-eyebrow">Room condition</span>
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

        {/* Simulation: play button when closed, full panel when open */}
        {simOpen ? (
          <FailureSimulationPanel
            status={simulation.status}
            onStepToNextPhase={simulation.stepToNextPhase}
            onReset={handleReset}
            onDismiss={() => setSimOpen(false)}
            scenarios={scenarios}
            selectedScenario={simScenario}
            onSelectScenario={setSimScenario}
          />
        ) : (
          <button
            type="button"
            onClick={() => setSimOpen(true)}
            style={{
              position: 'absolute', bottom: 112, left: 18,
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '8px 14px', borderRadius: 8,
              border: '1px solid rgba(56,189,248,0.28)',
              background: 'rgba(8,15,32,0.88)',
              color: '#38bdf8', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', backdropFilter: 'blur(10px)',
              transition: 'all 0.15s',
              boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
            }}
          >
            <span style={{
              width: 0, height: 0,
              borderTop: '5px solid transparent',
              borderBottom: '5px solid transparent',
              borderLeft: '9px solid #38bdf8',
              display: 'inline-block',
            }} />
            Demo scenario
          </button>
        )}

        <div className="scene-instructions">
          <span>Drag</span> rotate
          <span>Scroll</span> zoom
          <span>Shift + drag</span> pan
          <span>Tap a device</span> inspect
        </div>

        {/* Stats toggle button — bottom right, only when backend is connected */}
        {backendConnected && mainBackendRoom && (
          <button
            type="button"
            onClick={() => setStatsOpen((o) => !o)}
            style={{
              position: 'absolute', bottom: 112, right: 18,
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '8px 14px', borderRadius: 8,
              border: `1px solid ${statsOpen ? statsStatusColor : 'rgba(79,195,247,0.28)'}`,
              background: statsOpen ? `${statsStatusColor}14` : 'rgba(8,15,32,0.88)',
              color: statsOpen ? statsStatusColor : '#4fc3f7',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              backdropFilter: 'blur(10px)', transition: 'all 0.15s',
              boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
            }}
          >
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: statsStatusColor, display: 'inline-block',
              boxShadow: statsOpen ? `0 0 6px ${statsStatusColor}` : 'none',
            }} />
            {mainBackendRoom.name}
            <span style={{ opacity: 0.6, fontSize: 10 }}>
              {statsOpen ? '✕' : '▸ stats'}
            </span>
          </button>
        )}

        {/* Stats panel overlay */}
        {statsOpen && mainBackendRoom && (
          <div className="udp-overlay">
            <UnitDetailPanel
              key={mainBackendRoom.id}
              room={mainBackendRoom}
              onClose={() => setStatsOpen(false)}
            />
          </div>
        )}

        {/* Sidebar — only when stats panel is closed */}
        {!statsOpen && (
          <CampusSidebar
            rooms={currentRooms}
            devices={currentDevices}
            selectedDeviceId={selectedDeviceId}
            buildingTelemetry={simulation.buildingTelemetry}
            weatherForecast={
              isLiveMode && liveData.weatherForecast.length > 0
                ? liveData.weatherForecast
                : mockWeatherForecast
            }
            roomEvents={
              isLiveMode && liveData.roomEvents.length > 0
                ? liveData.roomEvents
                : mockRoomEvents
            }
            controlDecisions={simulation.controlDecisions}
            roomLoadHeatmap={roomLoadHeatmap}
            onSelectDevice={setSelectedDeviceId}
            onClearSelection={() => setSelectedDeviceId(null)}
          />
        )}

        <ControlTimeline actions={plannedActions} />
      </main>
    </div>
  )
}

export default App
