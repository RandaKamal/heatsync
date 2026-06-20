import { useState } from 'react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts'
import { decodeErrorRegisters } from '../data/errorRegisters'

// ── SVG Temperature Gauge ───────────────────────────────────────────────────

function describeArc(cx, cy, r, startAngle, endAngle) {
  const toRad = a => ((a - 90) * Math.PI) / 180
  const x1 = cx + r * Math.cos(toRad(startAngle))
  const y1 = cy + r * Math.sin(toRad(startAngle))
  const x2 = cx + r * Math.cos(toRad(endAngle))
  const y2 = cy + r * Math.sin(toRad(endAngle))
  const large = endAngle - startAngle > 180 ? 1 : 0
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`
}

function TempGauge({ current, target, min = 10, max = 35 }) {
  const startAngle = -225
  const endAngle   = 45
  const range      = endAngle - startAngle
  const pct        = Math.max(0, Math.min(1, (current - min) / (max - min)))
  const angle      = startAngle + pct * range

  const color =
    current < 18 ? '#4fc3f7' :
    current < 21 ? '#00e5ff' :
    current < 23 ? '#00e676' :
    current < 25 ? '#ffa726' :
    '#ef5350'

  const bgPath   = describeArc(80, 88, 60, startAngle, endAngle)
  const fillPath = describeArc(80, 88, 60, startAngle, angle)

  const needleRad = ((angle - 90) * Math.PI) / 180
  const nx = 80 + 52 * Math.cos(needleRad)
  const ny = 88 + 52 * Math.sin(needleRad)

  return (
    <svg viewBox="0 0 160 110" width="180" height="124">
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Track */}
      <path d={bgPath} fill="none" stroke="#0d2540" strokeWidth="10" strokeLinecap="round" />

      {/* Fill */}
      <path d={fillPath} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
            style={{ filter: 'url(#glow)', transition: 'all 0.6s ease' }} />

      {/* Needle */}
      <line x1="80" y1="88" x2={nx} y2={ny} stroke={color} strokeWidth="2" strokeLinecap="round"
            style={{ transition: 'all 0.6s ease' }} />
      <circle cx="80" cy="88" r="4" fill={color} />

      {/* Value */}
      <text x="80" y="82" textAnchor="middle" fontSize="22" fontWeight="700"
            fill="white" fontFamily="'JetBrains Mono', monospace">
        {current.toFixed(1)}°
      </text>
      <text x="80" y="97" textAnchor="middle" fontSize="10" fill="#6a9bbf">
        target {target.toFixed(1)} °C
      </text>

      {/* Scale labels */}
      <text x="18" y="108" fontSize="8" fill="#3a6480">{min}°</text>
      <text x="138" y="108" fontSize="8" fill="#3a6480">{max}°</text>
    </svg>
  )
}

// ── Custom chart tooltip ────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }) {
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
            {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}
            {p.unit ?? ''}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Anomaly severity helpers ─────────────────────────────────────────────────

const SEV_ICON  = { high: '⚡', medium: '⚠', low: 'ℹ' }
const SEV_STYLE = {
  high:   { bg: 'rgba(239,83,80,0.15)',  color: '#ef5350' },
  medium: { bg: 'rgba(255,167,38,0.15)', color: '#ffa726' },
  low:    { bg: 'rgba(79,195,247,0.10)', color: '#4fc3f7' },
}

// ── Main panel ───────────────────────────────────────────────────────────────

const API = 'http://localhost:5001/api'
const MOLD_MIN = 12.0
const TEMP_MAX = 30.0

export default function UnitDetailPanel({ unit, room, onClose }) {
  const [targetTemp, setTargetTemp] = useState(room.temperature.target)
  const [mode, setMode]             = useState((unit.mode ?? 'AUTO').toLowerCase())
  const [saveState, setSaveState]   = useState(null) // null | 'saving' | 'saved' | 'error'

  const pct = Math.round((unit.power.current / unit.power.max) * 100)

  async function applyMode(m) {
    setMode(m)
    setSaveState('saving')
    try {
      if (m === 'off') {
        await fetch(`${API}/control/device/${unit.deviceId}/toggle`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enabled: false }),
        })
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

  async function applySetpoint(newTemp) {
    const clamped = Math.max(MOLD_MIN, Math.min(TEMP_MAX, newTemp))
    setTargetTemp(clamped)
    setSaveState('saving')
    try {
      await fetch(`${API}/control/device/${unit.deviceId}/setpoint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ temperature: clamped }),
      })
      setSaveState('saved')
    } catch {
      setSaveState('error')
    }
    setTimeout(() => setSaveState(null), 2500)
  }

  return (
    <aside className="detail-panel">
      {/* Header */}
      <div className="panel-header">
        <div>
          <div className="panel-header-id">{unit.id}</div>
          <div className="panel-header-room">{room.name} · {room.type}</div>
        </div>
        <div className="panel-header-spacer" />
        <span className={`status-badge ${unit.status}`}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
          {unit.status}
        </span>
        <button className="panel-close" onClick={onClose} title="Close">✕</button>
      </div>

      <div className="panel-scroll">

        {/* Temperature */}
        <div className="panel-section">
          <div className="panel-section-title">Temperature</div>
          <div className="gauge-wrap">
            <TempGauge
              current={room.temperature.current}
              target={room.temperature.target}
            />
            <div className="gauge-quick-stats">
              <div className="quick-stat">
                <div className="quick-stat-value" style={{ color: '#00f5ff' }}>
                  {room.temperature.current} °C
                </div>
                <div className="quick-stat-label">Current</div>
              </div>
              <div className="quick-stat">
                <div className="quick-stat-value">{room.temperature.target} °C</div>
                <div className="quick-stat-label">Target</div>
              </div>
              <div className="quick-stat">
                <div className="quick-stat-value" style={{ color: '#4fc3f7' }}>
                  {room.temperature.outside} °C
                </div>
                <div className="quick-stat-label">Outside</div>
              </div>
            </div>
          </div>
        </div>

        {/* Unit info */}
        <div className="panel-section">
          <div className="panel-section-title">Unit Status</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: 'var(--text-secondary)' }}>Model</span>
              <span style={{ fontFamily: 'monospace', color: 'var(--accent)' }}>{unit.model}</span>
            </div>
            {unit.mode && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: 'var(--text-secondary)' }}>Op Mode</span>
                <span style={{ fontFamily: 'monospace' }}>{unit.mode}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: 'var(--text-secondary)' }}>Runtime</span>
              <span style={{ fontFamily: 'monospace' }}>{unit.runtime ?? '—'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: 'var(--text-secondary)' }}>Occupancy</span>
              <span style={{ fontFamily: 'monospace' }}>
                {room.occupancy.current} / {room.occupancy.max}
              </span>
            </div>

            {/* Supply / return temperatures */}
            {unit.temperature && (
              <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
                <div style={{ flex: 1, background: 'rgba(0,114,255,0.08)', borderRadius: 6, padding: '6px 10px' }}>
                  <div style={{ color: 'var(--text-secondary)', marginBottom: 2 }}>Supply</div>
                  <div style={{ fontFamily: 'monospace', color: '#4fc3f7' }}>{unit.temperature.supply} °C</div>
                </div>
                <div style={{ flex: 1, background: 'rgba(0,114,255,0.08)', borderRadius: 6, padding: '6px 10px' }}>
                  <div style={{ color: 'var(--text-secondary)', marginBottom: 2 }}>Return</div>
                  <div style={{ fontFamily: 'monospace', color: '#4fc3f7' }}>{unit.temperature.return} °C</div>
                </div>
              </div>
            )}

            {/* Air quality */}
            {(unit.humidity != null || unit.co2Ppm != null) && (
              <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
                {unit.humidity != null && (
                  <div style={{ flex: 1, background: 'rgba(0,230,118,0.07)', borderRadius: 6, padding: '6px 10px' }}>
                    <div style={{ color: 'var(--text-secondary)', marginBottom: 2 }}>Humidity</div>
                    <div style={{ fontFamily: 'monospace', color: '#00e676' }}>{unit.humidity} %</div>
                  </div>
                )}
                {unit.co2Ppm != null && (
                  <div style={{ flex: 1, background: 'rgba(255,167,38,0.07)', borderRadius: 6, padding: '6px 10px' }}>
                    <div style={{ color: 'var(--text-secondary)', marginBottom: 2 }}>CO₂</div>
                    <div style={{
                      fontFamily: 'monospace',
                      color: unit.co2Ppm > 1200 ? '#ef5350' : unit.co2Ppm > 800 ? '#ffa726' : '#00e676',
                    }}>{unit.co2Ppm} ppm</div>
                  </div>
                )}
              </div>
            )}

            {/* Fan speeds */}
            {unit.airFlow && (unit.airFlow.supply > 0 || unit.airFlow.return > 0) && (
              <div style={{ fontSize: 12 }}>
                <div style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>Fan Flow</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Supply</span>
                  <div style={{ flex: 1, height: 4, background: '#0d2540', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: `${unit.airFlow.supply}%`, height: '100%', background: '#0072ff', borderRadius: 2 }} />
                  </div>
                  <span style={{ fontFamily: 'monospace', minWidth: 36 }}>{unit.airFlow.supply}%</span>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Return</span>
                  <div style={{ flex: 1, height: 4, background: '#0d2540', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: `${unit.airFlow.return}%`, height: '100%', background: '#4fc3f7', borderRadius: 2 }} />
                  </div>
                  <span style={{ fontFamily: 'monospace', minWidth: 36 }}>{unit.airFlow.return}%</span>
                </div>
              </div>
            )}

            {/* Power bar */}
            <div className="power-bar-wrap" style={{ marginTop: 4 }}>
              <div className="power-bar-header">
                <span className="power-bar-label">Power draw</span>
                <span className="power-bar-value">
                  {unit.power.current} / {unit.power.max} kW ({pct}%)
                </span>
              </div>
              <div className="power-bar-track">
                <div
                  className="power-bar-fill"
                  style={{
                    width: `${pct}%`,
                    background: pct > 90 ? 'linear-gradient(90deg,#ff4444,#ff8800)' :
                                pct > 70 ? 'linear-gradient(90deg,#ff8800,#ffcc00)' :
                                'linear-gradient(90deg,#0072ff,#00f5ff)',
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Temperature history */}
        <div className="panel-section">
          <div className="panel-section-title">24 h Temperature History</div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={room.tempHistory} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(79,195,247,0.07)" />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 9, fill: '#3a6480' }}
                  tickFormatter={v => v.replace(':00', 'h')}
                  interval={5}
                />
                <YAxis
                  tick={{ fontSize: 9, fill: '#3a6480' }}
                  domain={['auto', 'auto']}
                  tickFormatter={v => `${v}°`}
                />
                <Tooltip content={<ChartTooltip />} />
                <Line
                  type="monotone"
                  dataKey="outside"
                  name="Outside"
                  stroke="#2a5a7a"
                  strokeWidth={1.5}
                  dot={false}
                  unit="°C"
                />
                <Line
                  type="monotone"
                  dataKey="target"
                  name="Target"
                  stroke="#4fc3f7"
                  strokeWidth={1}
                  strokeDasharray="4 3"
                  dot={false}
                  unit="°C"
                />
                <Line
                  type="monotone"
                  dataKey="temp"
                  name="Room"
                  stroke="#00f5ff"
                  strokeWidth={2}
                  dot={false}
                  unit="°C"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Energy consumption */}
        <div className="panel-section">
          <div className="panel-section-title">Energy — 7 Day Comparison</div>
          <div className="chart-container-tall">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={room.energyHistory} margin={{ top: 4, right: 4, bottom: 0, left: -16 }} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(79,195,247,0.07)" />
                <XAxis dataKey="day" tick={{ fontSize: 9, fill: '#3a6480' }} />
                <YAxis tick={{ fontSize: 9, fill: '#3a6480' }} tickFormatter={v => `${v}`} />
                <Tooltip content={<ChartTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: 10, color: '#6a9bbf', paddingTop: 4 }}
                  iconSize={8}
                />
                <Bar dataKey="baseline" name="w/o IHL" fill="#1a3a5a" radius={[2,2,0,0]} unit=" kWh" />
                <Bar dataKey="actual"   name="With IHL" fill="#0072ff" radius={[2,2,0,0]} unit=" kWh" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Savings */}
        <div className="panel-section">
          <div className="panel-section-title">Today's Savings</div>
          <div className="savings-grid">
            <div className="savings-card">
              <div className="savings-value">{unit.savings.kwh}</div>
              <div className="savings-label">kWh saved</div>
            </div>
            <div className="savings-card">
              <div className="savings-value">{unit.savings.co2} kg</div>
              <div className="savings-label">CO₂ avoided</div>
            </div>
            <div className="savings-card">
              <div className="savings-value">€ {unit.savings.eur}</div>
              <div className="savings-label">Cost saved</div>
            </div>
          </div>
        </div>

        {/* Anomaly detection */}
        <div className="panel-section">
          <div className="panel-section-title">Anomaly Detection</div>
          {(() => {
            const regAlarms = decodeErrorRegisters(unit.rawErrorRegisters)
            const allAlarms = regAlarms.length > 0 ? regAlarms : (unit.anomalies ?? [])
            return allAlarms.length === 0 ? (
              <div className="anomaly-empty">
                <span style={{ fontSize: 22 }}>✓</span>
                <span>No anomalies detected</span>
              </div>
            ) : (
              <div className="anomaly-list">
                {allAlarms.map(ev => {
                  const s = SEV_STYLE[ev.severity] ?? SEV_STYLE.low
                  return (
                    <div key={ev.id} className={`anomaly-item severity-${ev.severity}`}>
                      <div className="anomaly-icon" style={{ background: s.bg }}>
                        <span style={{ color: s.color }}>{SEV_ICON[ev.severity]}</span>
                      </div>
                      <div className="anomaly-body">
                        <div className="anomaly-msg">{ev.message}</div>
                        <div className="anomaly-meta">
                          <span className="anomaly-time">{ev.time}</span>
                          {ev.resolved
                            ? <span className="anomaly-resolved">✓ Resolved</span>
                            : <span className="anomaly-active">● Active</span>}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })()}
        </div>

        {/* Smart Advice */}
        {room.advice && (
          <div className="panel-section">
            <div className="panel-section-title">Smart Advice</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

              {/* Occupancy + ETA row */}
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{
                  flex: 1, borderRadius: 8, padding: '8px 12px',
                  background: room.advice.occupancyStatus === 'occupied'
                    ? 'rgba(0,230,118,0.09)'
                    : room.advice.occupancyStatus === 'preheat'
                    ? 'rgba(255,167,38,0.09)'
                    : 'rgba(79,195,247,0.07)',
                }}>
                  <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 2 }}>Occupancy</div>
                  <div style={{
                    fontSize: 12, fontWeight: 600,
                    color: room.advice.occupancyStatus === 'occupied' ? '#00e676'
                      : room.advice.occupancyStatus === 'preheat' ? '#ffa726'
                      : '#4fc3f7',
                  }}>
                    {room.advice.occupancyStatus === 'occupied' ? '● Occupied'
                      : room.advice.occupancyStatus === 'preheat' ? '◑ Pre-heat soon'
                      : '○ Unoccupied'}
                  </div>
                  {room.advice.minutesToOccupied != null && (
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                      Starts in ~{room.advice.minutesToOccupied} min
                    </div>
                  )}
                </div>

                <div style={{
                  flex: 1, borderRadius: 8, padding: '8px 12px',
                  background: room.advice.efficiency === 'good'
                    ? 'rgba(0,230,118,0.09)'
                    : room.advice.efficiency === 'fair'
                    ? 'rgba(255,167,38,0.09)'
                    : 'rgba(239,83,80,0.09)',
                }}>
                  <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 2 }}>Efficiency</div>
                  <div style={{
                    fontSize: 12, fontWeight: 600,
                    color: room.advice.efficiency === 'good' ? '#00e676'
                      : room.advice.efficiency === 'fair' ? '#ffa726'
                      : '#ef5350',
                  }}>
                    {room.advice.efficiency === 'good' ? '▲ Good'
                      : room.advice.efficiency === 'fair' ? '► Fair'
                      : '▼ Poor'}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                    {room.advice.efficiencyNote}
                  </div>
                </div>
              </div>

              {/* ETA to target */}
              {room.advice.etaMinutes !== 0 && (
                <div style={{
                  borderRadius: 8, padding: '8px 12px',
                  background: 'rgba(0,114,255,0.08)',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <span style={{ fontSize: 18 }}>⏱</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#4fc3f7' }}>
                      {room.advice.etaLabel}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                      {room.advice.etaSource === 'measured'
                        ? 'Based on measured heating/cooling rate'
                        : 'Rate not yet available — set a mode to start'}
                    </div>
                  </div>
                </div>
              )}

              {/* Recommendation text */}
              <div style={{
                borderRadius: 8, padding: '10px 12px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(79,195,247,0.1)',
                fontSize: 12, lineHeight: 1.55, color: 'var(--text-primary)',
              }}>
                {room.advice.recommendation}
              </div>

            </div>
          </div>
        )}

        {/* Controls */}
        <div className="panel-section">
          <div className="panel-section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            Controls
            {saveState === 'saving' && (
              <span style={{ fontSize: 10, color: '#4fc3f7', fontWeight: 400 }}>Saving…</span>
            )}
            {saveState === 'saved' && (
              <span style={{ fontSize: 10, color: '#00e676', fontWeight: 400 }}>✓ Saved</span>
            )}
            {saveState === 'error' && (
              <span style={{ fontSize: 10, color: '#ef5350', fontWeight: 400 }}>✕ Failed</span>
            )}
          </div>
          <div className="controls-grid">
            <div className="temp-control">
              <span className="temp-control-label">
                Target temperature
                <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 6 }}>
                  min {MOLD_MIN}°C
                </span>
              </span>
              <div className="temp-adjust">
                <button
                  className="temp-btn"
                  onClick={() => applySetpoint(targetTemp - 0.5)}
                  disabled={targetTemp <= MOLD_MIN}
                >−</button>
                <span className="temp-display">{targetTemp.toFixed(1)} °C</span>
                <button
                  className="temp-btn"
                  onClick={() => applySetpoint(targetTemp + 0.5)}
                  disabled={targetTemp >= TEMP_MAX}
                >+</button>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Mode</div>
              <div className="mode-buttons">
                {['heat', 'cool', 'auto', 'off'].map(m => (
                  <button
                    key={m}
                    className={`mode-btn ${mode === m ? 'active' : ''}`}
                    onClick={() => applyMode(m)}
                    disabled={saveState === 'saving'}
                  >
                    {m === 'heat' ? '🔥' : m === 'cool' ? '❄' : m === 'auto' ? '⚡' : '○'} {m}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Spacer at bottom */}
        <div style={{ height: 20 }} />
      </div>
    </aside>
  )
}
