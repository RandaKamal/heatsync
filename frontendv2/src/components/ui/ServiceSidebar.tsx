/**
 * LB Energy Service View sidebar.
 *
 * Shows real device telemetry from the backend /api/status endpoint.
 * Data source: measured (snapshots) and derived (energy from power_draw.csv).
 * Space ID: 3dbed10b-9e88-4163-916d-3182e2ecc69f
 */

import { useMemo, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, ReferenceArea, Legend,
} from 'recharts'
import type { BackendHeatPump, BackendRoom, BackendStats, AnomalyScenario } from '../../hooks/useBackendStatus'
import { decodeErrorRegisters } from '../../utils/errorRegisters'

const SPACE_ID = '3dbed10b-9e88-4163-916d-3182e2ecc69f'

const SEV_COLOR: Record<string, string> = {
  critical: '#ef4444',
  warning:  '#f59e0b',
  info:     '#38bdf8',
}

const STATUS_COLOR: Record<string, string> = {
  active:  '#2dd4bf',
  idle:    '#64748b',
  warning: '#f59e0b',
  error:   '#ef4444',
}

// Source badge component
function SourceBadge({ label }: { label: string }) {
  const colors: Record<string, string> = {
    Measured:   '#2dd4bf',
    Derived:    '#818cf8',
    Scheduled:  '#38bdf8',
    Estimated:  '#94a3b8',
    Simulated:  '#fb923c',
    Unavailable: '#475569',
  }
  const color = colors[label] ?? '#64748b'
  return (
    <span
      className="source-badge"
      style={{ borderColor: `${color}55`, color, background: `${color}11` }}
    >
      {label}
    </span>
  )
}

// Temperature history chart with comfort band
function ThermalHistoryChart({ history }: { history: BackendRoom['tempHistory'] }) {
  if (!history || history.length === 0) {
    return (
      <div className="chart-empty">
        <span className="section-eyebrow">No history data available</span>
      </div>
    )
  }

  const COMFORT_MIN = 20
  const COMFORT_MAX = 22

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: '#2dd4bf' }}>— Consensus temp (Measured)</span>
        <span style={{ fontSize: 11, color: '#f59e0b' }}>- - Controller target (Scheduled)</span>
        <span style={{ fontSize: 11, color: '#64748b' }}>· · Outside temp (Measured)</span>
        <span style={{ fontSize: 11, color: '#38bdf850' }}>▒ Comfort range 20–22°C (Profile)</span>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={history} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e3a52" />
          <XAxis
            dataKey="time"
            tick={{ fill: '#64748b', fontSize: 10 }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={['auto', 'auto']}
            tick={{ fill: '#64748b', fontSize: 10 }}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{ background: '#0d1f30', border: '1px solid #1e3a52', borderRadius: 6 }}
            labelStyle={{ color: '#94a3b8', fontSize: 11 }}
            itemStyle={{ fontSize: 11 }}
          />
          {/* Comfort band */}
          <ReferenceArea
            y1={COMFORT_MIN} y2={COMFORT_MAX}
            fill="#38bdf8"
            fillOpacity={0.08}
            label={{ value: 'Comfort zone', fill: '#38bdf850', fontSize: 10, position: 'insideTopRight' }}
          />
          <ReferenceLine y={COMFORT_MIN} stroke="#38bdf8" strokeDasharray="4 4" strokeOpacity={0.4} />
          <ReferenceLine y={COMFORT_MAX} stroke="#38bdf8" strokeDasharray="4 4" strokeOpacity={0.4} />
          <Legend wrapperStyle={{ display: 'none' }} />
          <Line
            type="monotone"
            dataKey="temp"
            stroke="#2dd4bf"
            strokeWidth={2}
            dot={false}
            name="Consensus temp"
          />
          <Line
            type="stepAfter"
            dataKey="target"
            stroke="#f59e0b"
            strokeWidth={1.5}
            strokeDasharray="6 3"
            dot={false}
            name="Controller target"
          />
          <Line
            type="monotone"
            dataKey="outside"
            stroke="#64748b"
            strokeWidth={1}
            strokeDasharray="2 4"
            dot={false}
            name="Outside temp"
          />
        </LineChart>
      </ResponsiveContainer>
      <div style={{ marginTop: 6 }}>
        <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>
          Controller target: 11°C (unoccupied minimum) or 21°C (event temperature) ·
          Profile comfort range: 20–22°C ·{' '}
          <SourceBadge label="Measured" />
        </p>
      </div>
    </div>
  )
}

// Daily energy chart
function EnergyHistoryChart({ history }: { history: BackendRoom['energyHistory'] }) {
  if (!history || history.length === 0) return null
  return (
    <ResponsiveContainer width="100%" height={120}>
      <LineChart data={history} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e3a52" />
        <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} />
        <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} />
        <Tooltip
          contentStyle={{ background: '#0d1f30', border: '1px solid #1e3a52', borderRadius: 6 }}
          itemStyle={{ fontSize: 11 }}
        />
        <Line type="monotone" dataKey="actual" stroke="#2dd4bf" strokeWidth={2} dot={false} name="IHL-controlled (kWh)" />
        <Line type="monotone" dataKey="baseline" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="4 2" dot={false} name="Baseline scenario (kWh)" />
      </LineChart>
    </ResponsiveContainer>
  )
}

// Single heat pump card
function HeatPumpCard({
  hp,
  selected,
  onSelect,
}: {
  hp: BackendHeatPump
  selected: boolean
  onSelect: () => void
}) {
  const color = STATUS_COLOR[hp.status] ?? '#94a3b8'
  const alarms = decodeErrorRegisters(hp.rawErrorRegisters)
  const [expanded, setExpanded] = useState(false)

  return (
    <article
      className={`hp-card ${selected ? 'hp-card--selected' : ''}`}
      style={{ borderLeftColor: color }}
    >
      <button type="button" className="hp-card__header" onClick={onSelect}>
        <div>
          <span className="hp-card__id">{hp.id}</span>
          <span className="hp-card__name">{hp.name}</span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ color, fontSize: 11, fontWeight: 600 }}>{hp.status.toUpperCase()}</span>
          <br />
          <span style={{ color: '#64748b', fontSize: 11 }}>{hp.mode}</span>
        </div>
      </button>

      {selected && (
        <div className="hp-card__body">
          <div className="hp-metric-grid">
            <div>
              <span>Room temp</span>
              <strong>—</strong>
              <SourceBadge label="Measured" />
            </div>
            <div>
              <span>Supply temp</span>
              <strong>{hp.temperature.supply}°C</strong>
              <SourceBadge label="Measured" />
            </div>
            <div>
              <span>Return temp</span>
              <strong>{hp.temperature.return}°C</strong>
              <SourceBadge label="Measured" />
            </div>
            <div>
              <span>Supply ΔT</span>
              <strong>{(hp.temperature.supply - hp.temperature.return).toFixed(1)}°C</strong>
              <SourceBadge label="Derived" />
            </div>
            <div>
              <span>Supply air</span>
              <strong>{hp.airFlow.supply}%</strong>
              <SourceBadge label="Measured" />
            </div>
            <div>
              <span>Return air</span>
              <strong>{hp.airFlow.return}%</strong>
              <SourceBadge label="Measured" />
            </div>
            <div>
              <span>Humidity</span>
              <strong>{hp.humidity}%</strong>
              <SourceBadge label="Measured" />
            </div>
            <div>
              <span>Indoor CO₂</span>
              <strong>{hp.co2Ppm} ppm</strong>
              <SourceBadge label="Measured" />
            </div>
            <div>
              <span>Power (avg 1h)</span>
              <strong>{hp.power.current} kW</strong>
              <SourceBadge label="Measured" />
            </div>
            <div>
              <span>Uptime</span>
              <strong>{hp.runtime}</strong>
              <SourceBadge label="Measured" />
            </div>
          </div>

          {/* Alarm registers */}
          <div style={{ marginTop: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span className="section-eyebrow">Modbus alarm registers</span>
              <SourceBadge label="Measured" />
            </div>
            <code style={{ fontSize: 11, color: '#94a3b8', background: '#0d1f30', padding: '4px 8px', borderRadius: 4, display: 'block' }}>
              1901,1902,1903,1904 = {hp.rawErrorRegisters}
            </code>

            {alarms.length === 0 ? (
              <p style={{ fontSize: 11, color: '#2dd4bf', marginTop: 6 }}>
                No alarm bits set in current snapshot
              </p>
            ) : (
              <div style={{ marginTop: 6 }}>
                {alarms.map((a) => (
                  <div key={a.id} style={{ marginBottom: 4, padding: '6px 8px', background: '#0d1f30', borderRadius: 4, borderLeft: `2px solid ${SEV_COLOR[a.severity] ?? '#64748b'}` }}>
                    <div style={{ fontSize: 11, color: SEV_COLOR[a.severity], fontWeight: 600 }}>{a.severity.toUpperCase()} — {a.message}</div>
                    {(hp.rawErrorRegisters === '0,64,0,0' || hp.rawErrorRegisters === '0,2,0,0') && (
                      <div style={{ fontSize: 10, color: '#64748b', marginTop: 3 }}>
                        ⚠ Diagnostic register bit set while active-alarm flag is false. May be latched or stale. Requires corroboration (abnormal pressure, thermal response) before treating as confirmed fault.
                      </div>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  style={{ fontSize: 10, color: '#38bdf8', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 4 }}
                  onClick={() => setExpanded(!expanded)}
                >
                  {expanded ? 'Hide full register detail' : 'Show full register detail'}
                </button>
                {expanded && (
                  <div style={{ marginTop: 6, fontSize: 10, color: '#94a3b8', lineHeight: 1.5 }}>
                    Register 1902, value 64 → bit 6 set → Circuit 1 Low Pressure Alarm<br />
                    status_is_alarm_active = false<br />
                    Classification: DIAGNOSTIC_INCONSISTENCY<br />
                    Corroboration check: compare status_low_pressure_in_bar against IQR baseline,
                    and supply/return delta while compressor active.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Anomalies from detector */}
          {hp.anomalies.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <span className="section-eyebrow">Detected anomalies</span>
              {hp.anomalies.map((a) => (
                <div key={a.id} style={{ marginTop: 6, padding: '6px 8px', background: '#0d1f30', borderRadius: 4, borderLeft: `2px solid ${SEV_COLOR[a.severity] ?? '#94a3b8'}` }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: SEV_COLOR[a.severity] }}>{a.type} · {a.time}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>{a.message}</div>
                </div>
              ))}
            </div>
          )}

          {/* Savings */}
          <div style={{ marginTop: 10 }}>
            <span className="section-eyebrow">Estimated savings vs continuous baseline</span>
            <div className="hp-metric-grid" style={{ marginTop: 6 }}>
              <div>
                <span>Energy saved</span>
                <strong>{hp.savings.kwh.toFixed(1)} kWh</strong>
                <SourceBadge label="Derived" />
              </div>
              <div>
                <span>Cost saved</span>
                <strong>€{hp.savings.eur.toFixed(2)}</strong>
                <SourceBadge label="Derived" />
              </div>
              <div>
                <span>CO₂e avoided</span>
                <strong>{hp.savings.co2.toFixed(1)} kg</strong>
                <SourceBadge label="Estimated" />
              </div>
            </div>
            <p style={{ fontSize: 10, color: '#475569', marginTop: 4 }}>
              Baseline assumes continuous unoptimised operation (25% savings factor from IHL benchmark).
              CO₂e uses German grid mix 0.380 kg/kWh. Source: <SourceBadge label="Derived" />
            </p>
          </div>
        </div>
      )}
    </article>
  )
}

interface ServiceSidebarProps {
  rooms: BackendRoom[]
  stats: BackendStats
  scenarios: AnomalyScenario[]
  connected: boolean
  selectedDeviceId: string | null
  onSelectDevice: (id: string) => void
  onClearSelection: () => void
  onTechnicianClick: () => void
}

export function ServiceSidebar({
  rooms,
  stats,
  scenarios,
  connected,
  selectedDeviceId,
  onSelectDevice,
  onClearSelection,
  onTechnicianClick,
}: ServiceSidebarProps) {
  const mainSpace = rooms.find((r) => r.id === 'main-space') ?? rooms[0]

  const selectedDevice = useMemo(() => {
    if (!selectedDeviceId || !mainSpace) return null
    return mainSpace.heatPumps.find((hp) => hp.id === selectedDeviceId) ?? null
  }, [selectedDeviceId, mainSpace])

  if (!connected || !mainSpace) {
    return (
      <aside className="analytics-sidebar glass-panel">
        <div className="analytics-sidebar__sticky-header">
          <span className="section-eyebrow">LB Energy Service View</span>
          <h2>Backend offline</h2>
          <p style={{ color: '#64748b', fontSize: 13 }}>
            Start the backend to see real device telemetry.<br />
            <code style={{ fontSize: 11 }}>cd backend && uv run python app.py</code>
          </p>
        </div>
      </aside>
    )
  }

  const avgTemp = mainSpace.temperature.current
  const { activeUnits, totalUnits, alerts } = stats

  return (
    <aside className="analytics-sidebar glass-panel">
      <div className="analytics-sidebar__sticky-header">
        {selectedDevice && (
          <button type="button" className="back-button" onClick={onClearSelection}>
            ← Space overview
          </button>
        )}
        <div>
          <span className="section-eyebrow">LB Energy · Service View · Real Data</span>
          <h2 style={{ marginBottom: 2 }}>Thermal Space</h2>
          <div style={{ fontSize: 11, color: '#38bdf8', fontFamily: 'monospace' }}>
            Space ID: {SPACE_ID.slice(0, 18)}…
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
            <SourceBadge label="Measured" />
            <span style={{ fontSize: 11, color: '#64748b' }}>
              {totalUnits} devices · {activeUnits} active · {alerts} alerts
            </span>
          </div>
        </div>
      </div>

      {/* Real space status */}
      <section className="analytics-section">
        <div className="analytics-section__heading">
          <div>
            <span className="section-eyebrow">Space-level aggregation</span>
            <h3>Consensus temperature &amp; comfort</h3>
          </div>
        </div>

        <div className="metric-grid metric-grid--four">
          <article className="analytics-metric">
            <span>Consensus temp</span>
            <strong>{avgTemp.toFixed(1)}<small>°C</small></strong>
            <SourceBadge label="Derived" />
          </article>
          <article className="analytics-metric">
            <span>Controller target</span>
            <strong>{mainSpace.temperature.target.toFixed(1)}<small>°C</small></strong>
            <SourceBadge label="Scheduled" />
          </article>
          <article className="analytics-metric">
            <span>Outside</span>
            <strong>{mainSpace.temperature.outside.toFixed(1)}<small>°C</small></strong>
            <SourceBadge label="Measured" />
          </article>
          <article className="analytics-metric">
            <span>Profile comfort</span>
            <strong>20–22<small>°C</small></strong>
            <SourceBadge label="Estimated" />
          </article>
        </div>

        <div style={{ marginTop: 8, padding: '8px 10px', background: '#091525', borderRadius: 6, border: '1px solid #1e3a52' }}>
          <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.6 }}>
            <strong style={{ color: '#38bdf8' }}>Profile comfort range:</strong> 20–22°C (product assumption) ·{' '}
            <strong style={{ color: '#f59e0b' }}>Controller target:</strong>{' '}
            {mainSpace.temperature.target}°C (scheduled) ·{' '}
            <strong style={{ color: '#64748b' }}>Unoccupied minimum:</strong> 11°C
          </div>
          {mainSpace.advice && (
            <div style={{ marginTop: 6, fontSize: 11, color: '#94a3b8' }}>
              <strong style={{ color: '#2dd4bf' }}>Advice:</strong> {mainSpace.advice.recommendation}
              <br />
              <SourceBadge label="Estimated" />
              {mainSpace.advice.etaSource && (
                <span style={{ marginLeft: 6, fontSize: 10, color: '#64748b' }}>
                  (rate source: {mainSpace.advice.etaSource})
                </span>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Temperature history */}
      <section className="analytics-section">
        <div className="analytics-section__heading">
          <div>
            <span className="section-eyebrow">24-hour history — 15-min intervals</span>
            <h3>Thermal history &amp; comfort band</h3>
          </div>
          <SourceBadge label="Measured" />
        </div>
        <ThermalHistoryChart history={mainSpace.tempHistory} />
      </section>

      {/* Anomaly scenarios */}
      {scenarios.length > 0 && (
        <section className="analytics-section">
          <div className="analytics-section__heading">
            <div>
              <span className="section-eyebrow">Anomaly detection — heating window</span>
              <h3>Detected patterns</h3>
            </div>
            <button type="button" className="topbar-btn" style={{ padding: '4px 10px', fontSize: 11 }} onClick={onTechnicianClick}>
              Notifications
            </button>
          </div>
          {scenarios.map((sc) => (
            <div key={sc.type} style={{ marginBottom: 8, padding: '8px 10px', background: '#091525', borderRadius: 6, borderLeft: `2px solid ${SEV_COLOR[sc.severity] ?? '#94a3b8'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: SEV_COLOR[sc.severity] }}>{sc.label}</span>
                <span style={{ fontSize: 11, color: '#64748b' }}>{sc.count} occurrence{sc.count !== 1 ? 's' : ''}</span>
              </div>
              {sc.sample && (
                <div style={{ marginTop: 4, fontSize: 11, color: '#94a3b8' }}>
                  {sc.sample.device_name}: {sc.sample.message.slice(0, 100)}
                </div>
              )}
            </div>
          ))}

          {/* Register inconsistency note */}
          {scenarios.some((s) => s.type === 'DIAGNOSTIC_INCONSISTENCY') && (
            <div style={{ marginTop: 6, padding: '8px 10px', background: '#0d1f30', borderRadius: 6, border: '1px dashed #f59e0b55' }}>
              <div style={{ fontSize: 11, color: '#f59e0b', fontWeight: 600 }}>⚠ Register inconsistency note</div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4, lineHeight: 1.5 }}>
                Heating window: Register 1902 bit 6 (Circuit 1 Low Pressure Alarm) is set in ~7,300 rows
                while status_is_alarm_active = false. Classified as DIAGNOSTIC_INCONSISTENCY.
                No corroborating pressure or thermal anomaly found. Probable cause: latched or
                historically stale register value.
              </div>
            </div>
          )}
        </section>
      )}

      {/* Energy history */}
      {mainSpace.energyHistory.length > 0 && (
        <section className="analytics-section">
          <div className="analytics-section__heading">
            <div>
              <span className="section-eyebrow">7-day energy — from power_draw.csv</span>
              <h3>IHL-controlled vs baseline scenario</h3>
            </div>
            <SourceBadge label="Derived" />
          </div>
          <EnergyHistoryChart history={mainSpace.energyHistory} />
          <div style={{ marginTop: 6 }}>
            <div className="metric-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
              <article className="analytics-metric">
                <span>Energy saved</span>
                <strong>{stats.savings.kwh.total.toFixed(0)}<small> kWh</small></strong>
                <SourceBadge label="Derived" />
              </article>
              <article className="analytics-metric">
                <span>Cost saved</span>
                <strong>€{stats.savings.eur.total.toFixed(0)}</strong>
                <SourceBadge label="Estimated" />
              </article>
              <article className="analytics-metric">
                <span>CO₂e avoided</span>
                <strong>{stats.savings.co2.total.toFixed(0)}<small> kg</small></strong>
                <SourceBadge label="Estimated" />
              </article>
            </div>
            <p style={{ fontSize: 10, color: '#475569', marginTop: 6 }}>
              Baseline: 25% above measured (IHL benchmark midpoint, 20-30% range).
              CO₂e: 0.380 kg/kWh (German grid mix, Umweltbundesamt 2024).
              Electricity: €0.25/kWh. These are scenario estimates, not measured savings.
            </p>
          </div>
        </section>
      )}

      {/* Device list */}
      <section className="analytics-section">
        <div className="analytics-section__heading">
          <div>
            <span className="section-eyebrow">HELOT IHL Heat Pumps · hardware v0.2.0</span>
            <h3>Device telemetry — select a unit</h3>
          </div>
          <SourceBadge label="Measured" />
        </div>
        <p style={{ fontSize: 11, color: '#64748b', marginBottom: 10 }}>
          All four devices serve the same thermal space. Positions on the 3D map are
          approximate — confirmed room-level mapping is unavailable in the exported data.
        </p>
        {mainSpace.heatPumps.map((hp) => (
          <HeatPumpCard
            key={hp.id}
            hp={hp}
            selected={selectedDeviceId === hp.id}
            onSelect={() => onSelectDevice(hp.id)}
          />
        ))}
      </section>

      {/* Thermal model note */}
      <section className="analytics-section">
        <div className="analytics-section__heading">
          <div>
            <span className="section-eyebrow">Thermal model</span>
            <h3>Space parameters (estimated)</h3>
          </div>
          <SourceBadge label="Estimated" />
        </div>
        <div className="spec-grid">
          <div><span>Heating rate</span><strong>~2.0 °C/h</strong></div>
          <div><span>Data basis</span><strong>15-min intervals</strong></div>
          <div><span>Controller preheat</span><strong>0 min (configured)</strong></div>
          <div><span>Unoccupied min</span><strong>11°C</strong></div>
          <div><span>Event target</span><strong>21°C</strong></div>
          <div><span>Airflow range</span><strong>~40–50% (observed)</strong></div>
        </div>
        <div style={{ marginTop: 8, padding: '6px 10px', background: '#0d1f30', borderRadius: 4, fontSize: 10, color: '#64748b', lineHeight: 1.5 }}>
          Heating rate estimated from adjusting intervals where was_adjusting_temperature = 1.
          Cooling rates from cooling window. Wide confidence interval due to fixed airflow
          (40–50%) across the full dataset — model has not observed variable fan performance.
          Airflow note: <SourceBadge label="Measured" /> fixed at ~40-50%. Full performance
          range not observed → model confidence: Medium.
        </div>
      </section>
    </aside>
  )
}
