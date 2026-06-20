import { useCallback, useEffect, useState } from 'react'
import { CampusCanvas } from './components/scene/CampusCanvas'
import { CampusSidebar } from './components/ui/CampusSidebar'
import { ControlTimeline } from './components/ui/ControlTimeline'
import { FailureSimulationPanel } from './components/ui/FailureSimulationPanel'
import { OptimizeModal } from './components/ui/OptimizeModal'
import type { OptimizeSuggestion } from './components/ui/OptimizeModal'
import { PokesPanel } from './components/ui/PokesPanel'
import { RoomDetailsPanel } from './components/ui/RoomDetailsPanel'
import { TechnicianPanel } from './components/ui/TechnicianPanel'
import type { Alert, Notification } from './components/ui/TechnicianPanel'
import { TopBar } from './components/ui/TopBar'
import {
  plannedActions,
  roomLoadHeatmap,
  weatherForecast as mockWeatherForecast,
} from './data/mockCampus'
import { useFailureSimulation } from './hooks/useFailureSimulation'
import {
  applyOptimization,
  contactTechnician,
  createScheduleEvent,
  fetchAnomalyAlerts,
  fetchEnergyWindows,
  fetchImpactByDevice,
  fetchImpactSummary,
  fetchNotifications,
  fetchOptimizeSuggestion,
  fetchSchedule,
  type DeviceImpact,
  type EnergyWindow,
  type SavingsTotals,
} from './api/client'
import type { RoomEvent } from './types/campus'
import { STATUS_COLORS, STATUS_LABELS } from './utils/status'

const legendStatuses = ['normal', 'warming', 'at-risk', 'fault', 'standby'] as const

function App() {
  // ── UI state ─────────────────────────────────────────────────────────────
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null)
  const [selectedRoomId, setSelectedRoomId]     = useState<string | null>(null)
  const [pokesOpen, setPokesOpen]               = useState(false)
  const [simOpen, setSimOpen]                   = useState(false)
  const [optimizeOpen, setOptimizeOpen]         = useState(false)
  const [techOpen, setTechOpen]                 = useState(false)

  // ── Impact data (from backend) ────────────────────────────────────────────
  const [impactByDevice, setImpactByDevice] = useState<DeviceImpact[]>([])
  const [impactTotal, setImpactTotal]       = useState<SavingsTotals>({
    energy_saved_kwh: 0, cost_saved_eur: 0, co2_saved_kg: 0,
  })

  // ── Schedule (synced with backend) ────────────────────────────────────────
  const [roomEvents, setRoomEvents]       = useState<RoomEvent[]>([])
  const [energyWindows, setEnergyWindows] = useState<EnergyWindow[]>([])

  // ── Optimization ──────────────────────────────────────────────────────────
  const [optimizeSuggestion, setOptimizeSuggestion] = useState<OptimizeSuggestion | null>(null)
  const [optimizeLoading, setOptimizeLoading]       = useState(false)

  // ── Technician / anomaly ──────────────────────────────────────────────────
  const [anomalyAlerts, setAnomalyAlerts]     = useState<Alert[]>([])
  const [notifications, setNotifications]     = useState<Notification[]>([])

  const simulation = useFailureSimulation()
  const currentDevices = simulation.devices
  const currentRooms   = simulation.rooms

  // ── Initial data fetch ────────────────────────────────────────────────────
  useEffect(() => {
    fetchImpactByDevice().then(setImpactByDevice).catch(console.error)
    fetchImpactSummary().then((s) => setImpactTotal(s.total)).catch(console.error)

    // Load schedule from backend (replaces mockCampus roomEvents)
    fetchSchedule()
      .then(setRoomEvents)
      .catch(() => setRoomEvents([]))  // degrade to empty if backend down

    // Load energy windows
    fetchEnergyWindows().then(setEnergyWindows).catch(console.error)

    // Load anomaly alerts (heating window has more data for demo)
    fetchAnomalyAlerts('heating').then(setAnomalyAlerts).catch(console.error)

    // Load existing notification log
    fetchNotifications().then(setNotifications).catch(console.error)
  }, [])

  // ── Simulation auto-selects devices ──────────────────────────────────────
  useEffect(() => {
    if (
      simulation.status.phase === 'idle' ||
      simulation.status.phase === 'normal' ||
      simulation.status.phase === 'occupancy-adaptation'
    ) return
    if (simulation.status.targetDeviceId) {
      setSelectedDeviceId(simulation.status.targetDeviceId)
      setSelectedRoomId(null)
    }
  }, [simulation.status.phase, simulation.status.targetDeviceId])

  // ── Selection handlers ────────────────────────────────────────────────────
  const handleSelectDevice = (id: string) => {
    setSelectedDeviceId(id); setSelectedRoomId(null); setPokesOpen(false)
  }
  const handleSelectRoom = (id: string) => {
    setSelectedRoomId(id); setSelectedDeviceId(null); setPokesOpen(false)
  }
  const handleClearSelection = () => {
    setSelectedDeviceId(null); setSelectedRoomId(null)
  }
  const handleReset = () => { handleClearSelection(); simulation.reset() }

  // ── Event management (synced to backend) ─────────────────────────────────
  const handleAddEvent = useCallback(async (event: RoomEvent) => {
    // Optimistic update
    setRoomEvents((prev) => [...prev, event])
    try {
      const saved = await createScheduleEvent(event)
      // Replace optimistic entry with server-assigned id
      setRoomEvents((prev) => prev.map((e) => (e.id === event.id ? saved : e)))
      // Refresh energy windows after new event
      fetchEnergyWindows().then(setEnergyWindows).catch(console.error)
    } catch {
      // Roll back if save fails
      setRoomEvents((prev) => prev.filter((e) => e.id !== event.id))
    }
  }, [])

  // ── Optimize schedule ─────────────────────────────────────────────────────
  const handleOpenOptimize = async () => {
    setOptimizeOpen(true)
    setOptimizeLoading(true)
    try {
      const s = await fetchOptimizeSuggestion()
      setOptimizeSuggestion(s)
    } catch {
      setOptimizeSuggestion(null)
    } finally {
      setOptimizeLoading(false)
    }
  }

  const handleAcceptOptimize = async (suggestion: OptimizeSuggestion) => {
    await applyOptimization(suggestion)
    // Reflect the move locally
    setRoomEvents((prev) =>
      prev.map((e) =>
        e.id === suggestion.moveEventId ? { ...e, roomId: suggestion.toRoomId } : e
      )
    )
    setOptimizeOpen(false)
    setOptimizeSuggestion(null)
    // Refresh energy windows
    fetchEnergyWindows().then(setEnergyWindows).catch(console.error)
  }

  const handleRejectOptimize = () => {
    setOptimizeOpen(false); setOptimizeSuggestion(null)
  }

  // ── Technician contact ────────────────────────────────────────────────────
  const handleContactTechnician = async (alert: Alert) => {
    const notification = await contactTechnician(alert)
    setNotifications((prev) => [...prev, notification])
  }

  // ── Derived values ────────────────────────────────────────────────────────
  const roomSavings: SavingsTotals = impactByDevice.length
    ? impactByDevice.reduce(
        (acc, d) => ({
          energy_saved_kwh: acc.energy_saved_kwh + d.energy_saved_kwh,
          cost_saved_eur:   acc.cost_saved_eur   + d.cost_saved_eur,
          co2_saved_kg:     acc.co2_saved_kg     + d.co2_saved_kg,
        }),
        { energy_saved_kwh: 0, cost_saved_eur: 0, co2_saved_kg: 0 },
      )
    : impactTotal

  const selectedRoom = selectedRoomId
    ? currentRooms.find((r) => r.id === selectedRoomId) ?? null
    : null

  const roomEnergyWindows = selectedRoom
    ? energyWindows.filter((w) => w.roomId === selectedRoom.id)
    : []

  // Critical alert count for technician badge
  const criticalAlertCount = anomalyAlerts.filter(
    (a) => a.severity === 'critical' || a.severity === 'warning'
  ).length

  return (
    <div className="app-shell">
      <TopBar
        onBadgesClick={() => setPokesOpen((v) => !v)}
        onOptimizeClick={handleOpenOptimize}
        onTechnicianClick={() => setTechOpen((v) => !v)}
        alertCount={criticalAlertCount}
      />

      <main className="map-stage">
        <CampusCanvas
          rooms={currentRooms}
          devices={currentDevices}
          activeFloor="all"
          onSelectDevice={handleSelectDevice}
          onSelectRoom={handleSelectRoom}
        />

        {!selectedRoom && (
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
        )}

        {selectedRoom && (
          <RoomDetailsPanel
            room={selectedRoom}
            events={roomEvents}
            savings={roomSavings}
            energyWindows={roomEnergyWindows}
            onClose={handleClearSelection}
            onAddEvent={handleAddEvent}
          />
        )}

        {pokesOpen && (
          <PokesPanel totals={impactTotal} onClose={() => setPokesOpen(false)} />
        )}

        {optimizeOpen && (
          <OptimizeModal
            suggestion={optimizeSuggestion}
            loading={optimizeLoading}
            onAccept={handleAcceptOptimize}
            onReject={handleRejectOptimize}
            onClose={handleRejectOptimize}
          />
        )}

        {techOpen && (
          <TechnicianPanel
            alerts={anomalyAlerts}
            notifications={notifications}
            onContactTechnician={handleContactTechnician}
            onClose={() => setTechOpen(false)}
          />
        )}

        {simOpen ? (
          <FailureSimulationPanel
            status={simulation.status}
            onStepToNextPhase={simulation.stepToNextPhase}
            onReset={handleReset}
            onDismiss={() => setSimOpen(false)}
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
              transition: 'all 0.15s', boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
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

        <CampusSidebar
          rooms={currentRooms}
          devices={currentDevices}
          selectedDeviceId={selectedDeviceId}
          buildingTelemetry={simulation.buildingTelemetry}
          weatherForecast={mockWeatherForecast}
          roomEvents={roomEvents}
          controlDecisions={simulation.controlDecisions}
          roomLoadHeatmap={roomLoadHeatmap}
          impactByDevice={impactByDevice}
          onSelectDevice={handleSelectDevice}
          onClearSelection={handleClearSelection}
        />

        <ControlTimeline actions={plannedActions} />
      </main>
    </div>
  )
}

export default App
