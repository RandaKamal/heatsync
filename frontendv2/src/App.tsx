import { useCallback, useEffect, useState } from 'react'
import { CampusCanvas } from './components/scene/CampusCanvas'
import { CampusSidebar } from './components/ui/CampusSidebar'
import { ControlTimeline } from './components/ui/ControlTimeline'
import { CustomerIncidentPanel } from './components/incident/CustomerIncidentPanel'
import { IncidentReplayControls } from './components/incident/IncidentReplayControls'
import { LbEnergyIncidentPanel } from './components/incident/LbEnergyIncidentPanel'
import { PresenterCue } from './components/incident/PresenterCue'
import { OptimizeModal } from './components/ui/OptimizeModal'
import type { OptimizeSuggestion } from './components/ui/OptimizeModal'
import { PokesPanel } from './components/ui/PokesPanel'
import { RoomDetailsPanel } from './components/ui/RoomDetailsPanel'
import { ServiceSidebar } from './components/ui/ServiceSidebar'
import { TechnicianPanel } from './components/ui/TechnicianPanel'
import type { Alert, Notification } from './components/ui/TechnicianPanel'
import { TopBar } from './components/ui/TopBar'
import type { AppView } from './components/ui/TopBar'
import { BuildingProfilePage } from './components/profile/BuildingProfilePage'
import {
  plannedActions,
  roomLoadHeatmap,
  weatherForecast as mockWeatherForecast,
} from './data/mockCampus'
import { useIncidentReplay } from './hooks/useIncidentReplay'
import { useBackendStatus } from './hooks/useBackendStatus'
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

function App() {
  // ── View state ────────────────────────────────────────────────────────────
  const [view, setView] = useState<AppView>('customer')

  // ── UI state ─────────────────────────────────────────────────────────────────
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

  // ── Fault simulation & incident replay (demo campus) ──────────────────────
  const incident = useIncidentReplay(view)
  const currentDevices = incident.devices
  const currentRooms   = incident.rooms

  // ── Real backend status (LB Energy service view) ──────────────────────────
  const { rooms: backendRooms, stats, connected, scenarios } = useBackendStatus()

  // ── Initial data fetch ────────────────────────────────────────────────────
  useEffect(() => {
    fetchImpactByDevice().then(setImpactByDevice).catch(console.error)
    fetchImpactSummary().then((s) => setImpactTotal(s.total)).catch(console.error)
    fetchSchedule()
      .then(setRoomEvents)
      .catch(() => setRoomEvents([]))
    fetchEnergyWindows().then(setEnergyWindows).catch(console.error)
    fetchAnomalyAlerts('heating').then(setAnomalyAlerts).catch(console.error)
    fetchNotifications().then(setNotifications).catch(console.error)
  }, [])

  // ── Incident replay auto-selects the affected device (customer view only —
  // the LB Energy sidebar uses real backend device IDs, a separate namespace) ─
  useEffect(() => {
    if (view !== 'customer') return
    if (incident.incidentState.deviceStatuses['device-1'] === 'unavailable') {
      setSelectedDeviceId(incident.affectedMockDeviceId)
      setSelectedRoomId(null)
    }
  }, [view, incident.incidentState.deviceStatuses, incident.affectedMockDeviceId])

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
  const handleReset = () => { handleClearSelection(); incident.controls.reset() }

  // ── Event management (synced to backend) ─────────────────────────────────
  const handleAddEvent = useCallback(async (event: RoomEvent) => {
    setRoomEvents((prev) => [...prev, event])
    try {
      const saved = await createScheduleEvent(event)
      setRoomEvents((prev) => prev.map((e) => (e.id === event.id ? saved : e)))
      fetchEnergyWindows().then(setEnergyWindows).catch(console.error)
    } catch {
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
    setRoomEvents((prev) =>
      prev.map((e) =>
        e.id === suggestion.moveEventId ? { ...e, roomId: suggestion.toRoomId } : e
      )
    )
    setOptimizeOpen(false)
    setOptimizeSuggestion(null)
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

  const criticalAlertCount = anomalyAlerts.filter(
    (a) => a.severity === 'critical' || a.severity === 'warning'
  ).length

  return (
    <div className="app-shell">
      <TopBar
        view={view}
        onViewChange={setView}
        onBadgesClick={() => setPokesOpen((v) => !v)}
        onOptimizeClick={handleOpenOptimize}
        onTechnicianClick={() => setTechOpen((v) => !v)}
        alertCount={criticalAlertCount}
        notificationCount={notifications.length}
        backendConnected={connected}
      />

      <main className={view === 'profile' ? 'bp-stage' : 'map-stage'}>
        {view === 'profile' ? (
          <BuildingProfilePage />
        ) : (
          <>
            <CampusCanvas
              rooms={currentRooms}
              devices={currentDevices}
              activeFloor="all"
              selectedRoomId={selectedRoomId}
              onSelectDevice={handleSelectDevice}
              onSelectRoom={handleSelectRoom}
            />

            {/* Demo campus label */}
            <div className="demo-campus-label">
              <span>Demo Campus</span>
              <span className="demo-campus-label__badge">Simulated</span>
            </div>

            {selectedRoom && view === 'customer' && (
              <RoomDetailsPanel
                room={selectedRoom}
                events={roomEvents}
                savings={roomSavings}
                energyWindows={roomEnergyWindows}
                devices={currentDevices}
                onClose={handleClearSelection}
                onAddEvent={handleAddEvent}
                onSelectDevice={handleSelectDevice}
              />
            )}

            {pokesOpen && (
              <PokesPanel totals={impactTotal} onClose={() => setPokesOpen(false)} />
            )}

            {optimizeOpen && view === 'customer' && (
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
                mode={view === 'service' ? 'service' : 'customer'}
              />
            )}

            {/* Fault simulation & incident replay — available from Customer and LB Energy views
                (this branch only renders when view !== 'profile', see the ternary above) */}
            {
              simOpen ? (
                <>
                  <div className="incident-stack">
                    <IncidentReplayControls
                      currentStage={incident.currentStage}
                      stageIndex={incident.stageIndex}
                      stageCount={incident.stageCount}
                      playing={incident.playing}
                      speed={incident.speed}
                      presenterCuesOn={incident.presenterCuesOn}
                      onClose={() => setSimOpen(false)}
                      controls={{ ...incident.controls, reset: handleReset }}
                    />
                    {view === 'customer' && (
                      <CustomerIncidentPanel
                        incidentState={incident.incidentState}
                        onClose={() => setSimOpen(false)}
                      />
                    )}
                    {view === 'service' && (
                      <LbEnergyIncidentPanel
                        incidentState={incident.incidentState}
                        onClose={() => setSimOpen(false)}
                        controls={incident.controls}
                      />
                    )}
                  </div>
                  <PresenterCue cue={incident.presenterCue} visible={incident.presenterCuesOn} />
                </>
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
                  Fault simulation
                </button>
              )
            }

            {/* Sidebar — view-dependent */}
            {view === 'customer' ? (
              <CampusSidebar
                rooms={currentRooms}
                devices={currentDevices}
                selectedDeviceId={selectedDeviceId}
                buildingTelemetry={incident.buildingTelemetry}
                weatherForecast={mockWeatherForecast}
                roomEvents={roomEvents}
                controlDecisions={incident.controlDecisions}
                roomLoadHeatmap={roomLoadHeatmap}
                impactByDevice={impactByDevice}
                onSelectDevice={handleSelectDevice}
                onClearSelection={handleClearSelection}
              />
            ) : (
              <ServiceSidebar
                rooms={backendRooms}
                stats={stats}
                scenarios={scenarios}
                connected={connected}
                selectedDeviceId={selectedDeviceId}
                onSelectDevice={handleSelectDevice}
                onClearSelection={handleClearSelection}
                onTechnicianClick={() => setTechOpen((v) => !v)}
              />
            )}

            {view === 'customer' && <ControlTimeline actions={plannedActions} />}
          </>
        )}
      </main>
    </div>
  )
}

export default App
