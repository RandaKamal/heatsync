import { useState } from 'react'
import TopBar from './components/TopBar'
import BuildingViewer from './building3d/BuildingViewer'
import UnitDetailPanel from './panels/UnitDetailPanel'
import AlertsPanel from './components/AlertsPanel'
import AlertToastStack from './components/AlertToast'
import { useBackendStatus } from './hooks/useBackendStatus'


function BottomBar({ stats }) {
  return (
    <footer className="bottombar">
      <div className="bottombar-metric">
        <div className="bottombar-metric-icon" style={{ background: 'rgba(0,114,255,0.15)' }}>
          <span style={{ fontSize: 14 }}>⚡</span>
        </div>
        <div>
          <div className="bottombar-metric-value" style={{ color: '#4fc3f7' }}>
            {stats.savings.kwh.today} kWh
          </div>
          <div className="bottombar-metric-label">Saved Today</div>
        </div>
      </div>

      <div className="bottombar-metric">
        <div className="bottombar-metric-icon" style={{ background: 'rgba(0,230,118,0.12)' }}>
          <span style={{ fontSize: 14 }}>🌿</span>
        </div>
        <div>
          <div className="bottombar-metric-value" style={{ color: '#00e676' }}>
            {stats.savings.co2.today} kg
          </div>
          <div className="bottombar-metric-label">CO₂ Avoided</div>
        </div>
      </div>

      <div className="bottombar-metric">
        <div className="bottombar-metric-icon" style={{ background: 'rgba(255,215,0,0.1)' }}>
          <span style={{ fontSize: 14 }}>€</span>
        </div>
        <div>
          <div className="bottombar-metric-value" style={{ color: '#ffd700' }}>
            € {stats.savings.eur.today}
          </div>
          <div className="bottombar-metric-label">Cost Saved</div>
        </div>
      </div>

      <div className="bottombar-metric">
        <div className="bottombar-metric-icon" style={{ background: 'rgba(79,195,247,0.1)' }}>
          <span style={{ fontSize: 14 }}>🏢</span>
        </div>
        <div>
          <div className="bottombar-metric-value">6 / 6</div>
          <div className="bottombar-metric-label">Halls Online</div>
        </div>
      </div>

      <div className="bottombar-metric">
        <div className="bottombar-metric-icon" style={{ background: 'rgba(79,195,247,0.1)' }}>
          <span style={{ fontSize: 14 }}>📡</span>
        </div>
        <div>
          <div className="bottombar-metric-value">
            {stats.activeUnits} / {stats.totalUnits}
          </div>
          <div className="bottombar-metric-label">IHL Units Active</div>
        </div>
      </div>

      <div className="bottombar-hint">
        <span>Click a rooftop unit · scroll to zoom inside</span>
      </div>
    </footer>
  )
}

export default function App() {
  const { rooms, stats, newAlerts, allAlerts, dismissToast } = useBackendStatus()
  const [selectedUnit,    setSelectedUnit]    = useState(null)
  const [selectedRoom,    setSelectedRoom]    = useState(null)
  const [alertsPanelOpen, setAlertsPanelOpen] = useState(false)

  const handleSelect = (unit, room) => {
    if (selectedUnit?.id === unit.id) {
      setSelectedUnit(null)
      setSelectedRoom(null)
    } else {
      setSelectedUnit(unit)
      setSelectedRoom(room)
    }
  }

  const handleClose = () => {
    setSelectedUnit(null)
    setSelectedRoom(null)
  }

  // When a unit is selected, find its latest data from live rooms
  const liveRoom = selectedRoom
    ? rooms.find(r => r.id === selectedRoom.id) ?? selectedRoom
    : null
  const liveUnit = liveRoom && selectedUnit
    ? liveRoom.heatPumps.find(u => u.id === selectedUnit.id) ?? selectedUnit
    : null

  return (
    <div className="app">
      <TopBar stats={stats} onAlertsClick={() => setAlertsPanelOpen(true)} />

      <div className="main-area">
        <div className="viewer-wrap">
          <BuildingViewer
            rooms={rooms}
            onUnitSelect={handleSelect}
            selectedUnitId={selectedUnit?.id}
          />
        </div>

        {liveUnit && liveRoom && (
          <UnitDetailPanel
            key={liveUnit.id}
            unit={liveUnit}
            room={liveRoom}
            onClose={handleClose}
          />
        )}
      </div>

      <BottomBar stats={stats} />

      {alertsPanelOpen && (
        <AlertsPanel
          alerts={allAlerts}
          onClose={() => setAlertsPanelOpen(false)}
        />
      )}

      <AlertToastStack alerts={newAlerts} onDismiss={dismissToast} />
    </div>
  )
}
