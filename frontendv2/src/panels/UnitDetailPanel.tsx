import { useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { BackendRoom } from '../hooks/useBackendStatus'
import { decodeErrorRegisters } from '../utils/errorRegisters'

// ── SVG Temperature Gauge ──────────────────────────────────────────────────

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const toRad = (a: number) => ((a - 90) * Math.PI) / 180
  const x1 = cx + r * Math.cos(toRad(startAngle))
  const y1 = cy + r * Math.sin(toRad(startAngle))
  const x2 = cx + r * Math.cos(toRad(endAngle))
  const y2 = cy + r * Math.sin(toRad(endAngle))
  const large = endAngle - startAngle > 180 ? 1 : 0
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`
}

function TempGauge({ current, target, min = 10, max = 35 }: { current: number; target: number; min?: number; max?: number }) {
  const startAngle = -225
  const endAngle = 45
  const range = endAngle - startAngle
  const pct = Math.max(0, Math.min(1, (current - min) / (max - min)))
  const angle = startAngle + pct * range

  const color =
    current < 18 ? '#4fc3f7' :
    current < 21 ? '#00e5ff' :
    current < 23 ? '#00e676' :
    current < 25 ? '#ffa726' :
    '#ef5350'

  const bgPath = describeArc(80, 88, 60, startAngle, endAngle)
  const fillPath = describeArc(80, 88, 60, startAngle, angle)
  const needleRad = ((angle - 90) * Math.PI) / 180
  const nx = 80 + 52 * Math.cos(needleRad)
  const ny = 88 + 52 * Math.sin(needleRad)

  return (
    <svg viewBox="0 0 160 110" width="180" height="124">
      <defs>
        <filter id="udp-glow">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <path d={bgPath} fill="none" stroke="#0d2540" strokeWidth="10" strokeLinecap="round" />
      <path d={fillPath} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
        style={{ filter: 'url(#udp-glow)', transition: 'all 0.6s ease' }} />
      <line x1="80" y1="88" x2={nx} y2={ny} stroke={color} strokeWidth="2" strokeLinecap="round"
        style={{ transition: 'all 0.6s ease' }} />
      <circle cx="80" cy="88" r="4" fill={color} />
      <text x="80" y="82" textAnchor="middle" fontSize="22" fontWeight="700"
        fill="white" fontFamily="'JetBrains Mono', monospace">
        {current.toFixed(1)}°
      </text>
      <text x="80" y="97" textAnchor="middle" fontSize="10" fill="#6a9bbf">
        target {target.toFixed(1)} °C
      </text>
      <text x="18" y="108" fontSize="8" fill="#3a6480">{min}°</text>
      <text x="138" y="108" fontSize="8" fill="#3a6480">{max}°</text>
    </svg>
  )
}

// ── Chart tooltip ──────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ color: string; name: string; value: number; unit?: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'rgba(6,13,26,0.95)', border: '1px solid rgba(79,195,247,0.3)',
      borderRadius: 8, padding: '8px 12px', fontSize: 11,
    }}>
      <div style={{ color: '#6a9bbf', marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, display: 'flex', gap: 8 }}>
          <span>{p.name}:</span>
          <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>
            {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}{p.unit ?? ''}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Severity config ────────────────────────────────────────────────────────

const SEV_ICON: Record<string, string> = { high: '⚡', medium: '⚠', low: 'ℹ' }
const SEV_STYLE: Record<string, { bg: string; color: string }> = {
  high:   { bg: 'rgba(239,83,80,0.15)',  color: '#ef5350' },
  medium: { bg: 'rgba(255,167,38,0.15)', color: '#ffa726' },
  low:    { bg: 'rgba(79,195,247,0.10)', color: '#4fc3f7' },
}

// ── Main panel ─────────────────────────────────────────────────────────────

const API = 'http://localhost:5001/api'
const MOLD_MIN = 12.0
const TEMP_MAX = 30.0

interface Props {
  room: BackendRoom
  onClose: () => void
}

export function UnitDetailPanel({ room, onClose }: Props) {
  const [targetTemp, setTargetTemp] = useState(room.temperature.target)
  const [mode, setMode] = useState((room.heatPumps[0]?.mode ?? 'AUTO').toLowerCase())
  const [saveState, setSaveState] = useState<null | 'saving' | 'saved' | 'error'>(null)

  // Aggregate across all units
  const totalPower    = room.heatPumps.reduce((s, hp) => s + hp.power.current, 0)
  const totalMaxPower = room.heatPumps.reduce((s, hp) => s + hp.power.max, 0)
  const totalPct      = totalMaxPower > 0 ? Math.round((totalPower / totalMaxPower) * 100) : 0
  const totalSavings  = room.heatPumps.reduce(
    (acc, hp) => ({ kwh: acc.kwh + hp.savings.kwh, co2: acc.co2 + hp.savings.co2, eur: acc.eur + hp.savings.eur }),
    { kwh: 0, co2: 0, eur: 0 },
  )
  const statusRank: Record<string, number> = { error: 3, warning: 2, active: 1, idle: 0 }
  const worstStatus = room.heatPumps.reduce(
    (worst, hp) => statusRank[hp.status] > statusRank[worst] ? hp.status : worst,
    'idle',
  )

  // Combined error-register alarms across all units
  const regAlarms = room.heatPumps.flatMap((hp) =>
    decodeErrorRegisters(hp.rawErrorRegisters).map((a) => ({ ...a, id: `${hp.id}-${a.id}` }))
  )
  const allAlarms = regAlarms.length > 0 ? regAlarms : (room.anomalies ?? [])

  async function applyMode(m: string) {
    setMode(m)
    setSaveState('saving')
    try {
      if (m === 'off') {
        await Promise.all(room.heatPumps.map((hp) =>
          fetch(`${API}/control/device/${hp.deviceId}/toggle`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ enabled: false }),
          })
        ))
      } else {
        await fetch(`${API}/control/mode`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: m.toUpperCase() }),
        })
      }
      setSaveState('saved')
    } catch {
      setSaveState('error')
    }
    setTimeout(() => setSaveState(null), 2500)
  }

  async function applySetpoint(newTemp: number) {
    const clamped = Math.max(MOLD_MIN, Math.min(TEMP_MAX, newTemp))
    setTargetTemp(clamped)
    setSaveState('saving')
    try {
      await Promise.all(room.heatPumps.map((hp) =>
        fetch(`${API}/control/device/${hp.deviceId}/setpoint`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ temperature: clamped }),
        })
      ))
      setSaveState('saved')
    } catch {
      setSaveState('error')
    }
    setTimeout(() => setSaveState(null), 2500)
  }

  return (
    <aside className="udp-panel">
      {/* Header */}
      <div className="udp-header">
        <div>
          <div className="udp-header-id">{room.name}</div>
          <div className="udp-header-room">{room.heatPumps.length} × HELOT IHL Heat Pump · hw v0.2.0</div>
        </div>
        <div className="udp-header-spacer" />
        <span className={`udp-status-badge udp-status-${worstStatus}`}>
          <span className="udp-status-dot" />
          {worstStatus}
        </span>
        <button className="udp-close" onClick={onClose} title="Close">✕</button>
      </div>

      <div className="udp-scroll">

        {/* Temperature */}
        <div className="udp-section">
          <div className="udp-section-title">Room Temperature (avg)</div>
          <div className="udp-gauge-wrap">
            <TempGauge current={room.temperature.current} target={room.temperature.target} />
            <div className="udp-quick-stats">
              <div className="udp-quick-stat">
                <div className="udp-quick-stat-value" style={{ color: '#00f5ff' }}>
                  {room.temperature.current} °C
                </div>
                <div className="udp-quick-stat-label">Current</div>
              </div>
              <div className="udp-quick-stat">
                <div className="udp-quick-stat-value">{room.temperature.target} °C</div>
                <div className="udp-quick-stat-label">Target</div>
              </div>
              <div className="udp-quick-stat">
                <div className="udp-quick-stat-value" style={{ color: '#4fc3f7' }}>
                  {room.temperature.outside} °C
                </div>
                <div className="udp-quick-stat-label">Outside</div>
              </div>
            </div>
          </div>
        </div>

        {/* Heat pump units grid */}
        <div className="udp-section">
          <div className="udp-section-title">Heat Pump Units</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {room.heatPumps.map((hp) => (
              <div key={hp.id} style={{
                border: `1px solid ${hp.status === 'error' ? 'rgba(239,83,80,0.3)' : hp.status === 'warning' ? 'rgba(255,167,38,0.3)' : 'rgba(74,195,247,0.14)'}`,
                borderRadius: 8, padding: '9px 10px',
                background: hp.status === 'error' ? 'rgba(239,83,80,0.05)' : 'rgba(10,20,42,0.5)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 700, color: '#4fc3f7' }}>
                    {hp.id}
                  </span>
                  <span className={`udp-status-badge udp-status-${hp.status}`} style={{ fontSize: 8, padding: '1px 5px' }}>
                    <span className="udp-status-dot" style={{ width: 4, height: 4 }} />
                    {hp.status}
                  </span>
                </div>
                <div style={{ fontSize: 10, color: '#6a9bbf', marginBottom: 2 }}>
                  {hp.mode} · {hp.runtime}
                </div>
                <div style={{ fontSize: 10, color: '#dff0ff', marginBottom: 4 }}>
                  ↑{hp.temperature.supply}° ↓{hp.temperature.return}°C
                </div>
                <div className="udp-fan-row" style={{ marginBottom: 2 }}>
                  <span className="udp-fan-label" style={{ fontSize: 9, minWidth: 30 }}>Sup</span>
                  <div className="udp-bar-track">
                    <div className="udp-bar-fill" style={{ width: `${hp.airFlow.supply}%`, background: '#0072ff' }} />
                  </div>
                  <span className="udp-fan-pct" style={{ fontSize: 9 }}>{hp.airFlow.supply}%</span>
                </div>
                <div className="udp-fan-row">
                  <span className="udp-fan-label" style={{ fontSize: 9, minWidth: 30 }}>Ret</span>
                  <div className="udp-bar-track">
                    <div className="udp-bar-fill" style={{ width: `${hp.airFlow.return}%`, background: '#4fc3f7' }} />
                  </div>
                  <span className="udp-fan-pct" style={{ fontSize: 9 }}>{hp.airFlow.return}%</span>
                </div>
                <div style={{ fontSize: 10, color: 'var(--udp-accent)', marginTop: 5, fontFamily: 'JetBrains Mono, monospace' }}>
                  {hp.power.current} kW
                </div>
                {hp.rawErrorRegisters !== '0,0,0,0' && (
                  <div style={{ fontSize: 9, color: '#ffa726', marginTop: 3 }}>⚠ error registers</div>
                )}
              </div>
            ))}
          </div>

          {/* Aggregate air quality (from first unit as representative) */}
          {room.heatPumps[0] && (
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <div className="udp-mini-card udp-mini-card--green">
                <div className="udp-mini-label">Humidity</div>
                <div className="udp-mini-value" style={{ color: '#00e676' }}>{room.heatPumps[0].humidity} %</div>
              </div>
              <div className="udp-mini-card udp-mini-card--orange">
                <div className="udp-mini-label">CO₂</div>
                <div className="udp-mini-value" style={{
                  color: room.heatPumps[0].co2Ppm > 1200 ? '#ef5350' : room.heatPumps[0].co2Ppm > 800 ? '#ffa726' : '#00e676',
                }}>{room.heatPumps[0].co2Ppm} ppm</div>
              </div>
            </div>
          )}

          {/* Total power bar */}
          <div className="udp-power-wrap" style={{ marginTop: 10 }}>
            <div className="udp-power-header">
              <span className="udp-label">Total power draw</span>
              <span className="udp-value-mono" style={{ color: 'var(--udp-accent)' }}>
                {totalPower.toFixed(1)} / {totalMaxPower} kW ({totalPct}%)
              </span>
            </div>
            <div className="udp-bar-track" style={{ height: 6 }}>
              <div className="udp-bar-fill" style={{
                width: `${totalPct}%`,
                background: totalPct > 90 ? 'linear-gradient(90deg,#ff4444,#ff8800)'
                           : totalPct > 70 ? 'linear-gradient(90deg,#ff8800,#ffcc00)'
                           : 'linear-gradient(90deg,#0072ff,#00f5ff)',
                height: '100%',
              }} />
            </div>
          </div>
        </div>

        {/* Temperature history */}
        {room.tempHistory.length > 0 && (
          <div className="udp-section">
            <div className="udp-section-title">24 h Temperature History (avg)</div>
            <div className="udp-chart">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={room.tempHistory} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(79,195,247,0.07)" />
                  <XAxis dataKey="time" tick={{ fontSize: 9, fill: '#3a6480' }}
                    tickFormatter={(v: string) => v.replace(':00', 'h')} interval={5} />
                  <YAxis tick={{ fontSize: 9, fill: '#3a6480' }} domain={['auto', 'auto']}
                    tickFormatter={(v: number) => `${v}°`} />
                  <Tooltip content={<ChartTooltip />} />
                  <Line type="monotone" dataKey="outside" name="Outside" stroke="#2a5a7a"
                    strokeWidth={1.5} dot={false} unit="°C" />
                  <Line type="monotone" dataKey="target" name="Target" stroke="#4fc3f7"
                    strokeWidth={1} strokeDasharray="4 3" dot={false} unit="°C" />
                  <Line type="monotone" dataKey="temp" name="Room" stroke="#00f5ff"
                    strokeWidth={2} dot={false} unit="°C" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Energy comparison */}
        {room.energyHistory.length > 0 && (
          <div className="udp-section">
            <div className="udp-section-title">Energy — 7 Day (all units)</div>
            <div className="udp-chart-tall">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={room.energyHistory} margin={{ top: 4, right: 4, bottom: 0, left: -16 }} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(79,195,247,0.07)" />
                  <XAxis dataKey="day" tick={{ fontSize: 9, fill: '#3a6480' }} />
                  <YAxis tick={{ fontSize: 9, fill: '#3a6480' }} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 10, color: '#6a9bbf', paddingTop: 4 }} iconSize={8} />
                  <Bar dataKey="baseline" name="w/o IHL" fill="#1a3a5a" radius={[2, 2, 0, 0]} unit=" kWh" />
                  <Bar dataKey="actual" name="With IHL" fill="#0072ff" radius={[2, 2, 0, 0]} unit=" kWh" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Savings */}
        <div className="udp-section">
          <div className="udp-section-title">Today's Savings (all units)</div>
          <div className="udp-savings-grid">
            <div className="udp-savings-card">
              <div className="udp-savings-value">{totalSavings.kwh.toFixed(1)}</div>
              <div className="udp-savings-label">kWh saved</div>
            </div>
            <div className="udp-savings-card">
              <div className="udp-savings-value">{totalSavings.co2.toFixed(1)} kg</div>
              <div className="udp-savings-label">CO₂ avoided</div>
            </div>
            <div className="udp-savings-card">
              <div className="udp-savings-value">€ {totalSavings.eur.toFixed(2)}</div>
              <div className="udp-savings-label">Cost saved</div>
            </div>
          </div>
        </div>

        {/* Anomaly detection */}
        <div className="udp-section">
          <div className="udp-section-title">Anomaly Detection</div>
          {allAlarms.length === 0 ? (
            <div className="udp-anomaly-empty">
              <span style={{ fontSize: 22 }}>✓</span>
              <span>No anomalies detected</span>
            </div>
          ) : (
            <div className="udp-anomaly-list">
              {allAlarms.map((ev) => {
                const s = SEV_STYLE[ev.severity] ?? SEV_STYLE.low
                return (
                  <div key={ev.id} className={`udp-anomaly-item udp-sev-${ev.severity}`}>
                    <div className="udp-anomaly-icon" style={{ background: s.bg }}>
                      <span style={{ color: s.color }}>{SEV_ICON[ev.severity]}</span>
                    </div>
                    <div className="udp-anomaly-body">
                      <div className="udp-anomaly-msg">{ev.message}</div>
                      <div className="udp-anomaly-meta">
                        <span className="udp-anomaly-time">{ev.time}</span>
                        {ev.resolved
                          ? <span className="udp-anomaly-resolved">✓ Resolved</span>
                          : <span className="udp-anomaly-active">● Active</span>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Smart Advice */}
        {room.advice && (
          <div className="udp-section">
            <div className="udp-section-title">Smart Advice</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <div className="udp-advice-card" style={{
                  background: room.advice.occupancyStatus === 'occupied' ? 'rgba(0,230,118,0.09)'
                    : room.advice.occupancyStatus === 'preheat' ? 'rgba(255,167,38,0.09)'
                    : 'rgba(79,195,247,0.07)',
                }}>
                  <div className="udp-advice-label">Occupancy</div>
                  <div className="udp-advice-value" style={{
                    color: room.advice.occupancyStatus === 'occupied' ? '#00e676'
                      : room.advice.occupancyStatus === 'preheat' ? '#ffa726' : '#4fc3f7',
                  }}>
                    {room.advice.occupancyStatus === 'occupied' ? '● Occupied'
                      : room.advice.occupancyStatus === 'preheat' ? '◑ Pre-heat soon'
                      : '○ Unoccupied'}
                  </div>
                  {room.advice.minutesToOccupied != null && (
                    <div className="udp-advice-sub">Starts in ~{room.advice.minutesToOccupied} min</div>
                  )}
                </div>
                <div className="udp-advice-card" style={{
                  background: room.advice.efficiency === 'good' ? 'rgba(0,230,118,0.09)'
                    : room.advice.efficiency === 'fair' ? 'rgba(255,167,38,0.09)'
                    : 'rgba(239,83,80,0.09)',
                }}>
                  <div className="udp-advice-label">Efficiency</div>
                  <div className="udp-advice-value" style={{
                    color: room.advice.efficiency === 'good' ? '#00e676'
                      : room.advice.efficiency === 'fair' ? '#ffa726' : '#ef5350',
                  }}>
                    {room.advice.efficiency === 'good' ? '▲ Good'
                      : room.advice.efficiency === 'fair' ? '► Fair' : '▼ Poor'}
                  </div>
                  <div className="udp-advice-sub">{room.advice.efficiencyNote}</div>
                </div>
              </div>

              {room.advice.etaMinutes !== 0 && (
                <div className="udp-eta-card">
                  <span style={{ fontSize: 18 }}>⏱</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#4fc3f7' }}>
                      {room.advice.etaLabel}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--udp-muted)' }}>
                      {room.advice.etaSource === 'measured'
                        ? 'Based on measured heating/cooling rate'
                        : 'Rate estimated — set a mode to refine'}
                    </div>
                  </div>
                </div>
              )}

              <div className="udp-recommendation">
                {room.advice.recommendation}
              </div>
            </div>
          </div>
        )}

        {/* Controls — apply to all units */}
        <div className="udp-section">
          <div className="udp-section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            Controls (all units)
            {saveState === 'saving' && <span style={{ fontSize: 10, color: '#4fc3f7', fontWeight: 400 }}>Saving…</span>}
            {saveState === 'saved'  && <span style={{ fontSize: 10, color: '#00e676', fontWeight: 400 }}>✓ Saved</span>}
            {saveState === 'error'  && <span style={{ fontSize: 10, color: '#ef5350', fontWeight: 400 }}>✕ Failed</span>}
          </div>
          <div className="udp-controls">
            <div className="udp-temp-control">
              <span className="udp-label">
                Target temperature
                <span style={{ fontSize: 10, color: 'var(--udp-muted)', marginLeft: 6 }}>min {MOLD_MIN}°C</span>
              </span>
              <div className="udp-temp-adjust">
                <button className="udp-temp-btn" onClick={() => applySetpoint(targetTemp - 0.5)}
                  disabled={targetTemp <= MOLD_MIN}>−</button>
                <span className="udp-temp-display">{targetTemp.toFixed(1)} °C</span>
                <button className="udp-temp-btn" onClick={() => applySetpoint(targetTemp + 0.5)}
                  disabled={targetTemp >= TEMP_MAX}>+</button>
              </div>
            </div>
            <div>
              <div className="udp-label" style={{ marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Mode</div>
              <div className="udp-mode-buttons">
                {['heat', 'cool', 'auto', 'off'].map((m) => (
                  <button key={m} className={`udp-mode-btn ${mode === m ? 'udp-mode-active' : ''}`}
                    onClick={() => applyMode(m)} disabled={saveState === 'saving'}>
                    {m === 'heat' ? '🔥' : m === 'cool' ? '❄' : m === 'auto' ? '⚡' : '○'} {m}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div style={{ height: 20 }} />
      </div>
    </aside>
  )
}
