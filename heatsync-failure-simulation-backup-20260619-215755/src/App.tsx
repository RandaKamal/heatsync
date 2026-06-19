import { useMemo, useState } from 'react'
import { CampusCanvas } from './components/scene/CampusCanvas'
import { CampusSidebar } from './components/ui/CampusSidebar'
import { ControlTimeline } from './components/ui/ControlTimeline'
import { TopBar } from './components/ui/TopBar'
import {
  buildingTelemetry,
  climateDevices,
  controlDecisions,
  plannedActions,
  roomEvents,
  roomLoadHeatmap,
  rooms,
  weatherForecast,
} from './data/mockCampus'
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

  const selectedDevice = useMemo(
    () =>
      climateDevices.find(
        (device) => device.id === selectedDeviceId,
      ) ?? null,
    [selectedDeviceId],
  )

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

  return (
    <div className="app-shell">
      <TopBar
        activeFloor={activeFloor}
        onFloorChange={handleFloorChange}
      />

      <main className="map-stage">
        <CampusCanvas
          rooms={rooms}
          devices={climateDevices}
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

        <div className="scene-instructions">
          <span>Drag</span> rotate
          <span>Scroll</span> zoom
          <span>Shift + drag</span> pan
          <span>Tap a device</span> inspect
        </div>

        <CampusSidebar
          rooms={rooms}
          devices={climateDevices}
          selectedDeviceId={selectedDeviceId}
          buildingTelemetry={buildingTelemetry}
          weatherForecast={weatherForecast}
          roomEvents={roomEvents}
          controlDecisions={controlDecisions}
          roomLoadHeatmap={roomLoadHeatmap}
          onSelectDevice={setSelectedDeviceId}
          onClearSelection={() => setSelectedDeviceId(null)}
        />

        <ControlTimeline actions={plannedActions} />
      </main>
    </div>
  )
}

export default App
