import { useState, useEffect, useRef } from 'react'

const LOCATIONS = [
  {
    id: 'tum-ottobrunn',
    name: 'TUM Ottobrunn Campus',
    sub: 'Ottobrunn-Taufkirchen, Munich',
    status: 'live',
    units: 11,
  },
  {
    id: 'lb-kolbermoor',
    name: 'LB Energy Test Site',
    sub: 'Kolbermoor, Bavaria',
    status: 'coming-soon',
    units: 4,
  },
]

const STATUS_LABEL = { live: 'Live', 'coming-soon': 'Soon' }
const STATUS_COLOR = { live: '#00e676', 'coming-soon': '#3a6a8a' }
const STATUS_BG    = { live: 'rgba(0,230,118,0.1)', 'coming-soon': 'rgba(79,195,247,0.06)' }

function LocationDropdown({ current, onSelect }) {
  const [open, setOpen] = useState(false)
  const ref = useRef()

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="location-dropdown-wrap" ref={ref}>
      <button
        className="location-trigger"
        onClick={() => setOpen(v => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <div className="location-trigger-text">
          <span className="topbar-building-name">{current.name}</span>
          <span className="topbar-building-sub">{current.sub}</span>
        </div>
        <svg
          width="12" height="12" viewBox="0 0 12 12" fill="none"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}
        >
          <path d="M2 4l4 4 4-4" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="location-dropdown" role="listbox">
          {LOCATIONS.map((loc, i) => (
            <div key={loc.id}>
              {i > 0 && <div className="location-divider" />}
              <div
                className={`location-option ${loc.id === current.id ? 'active' : ''} ${loc.status === 'coming-soon' ? 'disabled' : ''}`}
                role="option"
                aria-selected={loc.id === current.id}
                onClick={() => { if (loc.status !== 'coming-soon') { onSelect(loc); setOpen(false) } }}
              >
                <span
                  className="location-dot"
                  style={{ background: STATUS_COLOR[loc.status], boxShadow: loc.status === 'live' ? `0 0 5px ${STATUS_COLOR[loc.status]}` : 'none' }}
                />
                <div className="location-option-body">
                  <div className="location-option-name">{loc.name}</div>
                  <div className="location-option-sub">{loc.sub} · {loc.units} units</div>
                </div>
                <span
                  className="location-badge"
                  style={{ background: STATUS_BG[loc.status], color: STATUS_COLOR[loc.status], border: `1px solid ${STATUS_COLOR[loc.status]}33` }}
                >
                  {STATUS_LABEL[loc.status]}
                </span>
              </div>
            </div>
          ))}

          <div className="location-divider" />
          <div className="location-option disabled" style={{ opacity: 0.3 }}>
            <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>+</span>
            <div className="location-option-body">
              <div className="location-option-name" style={{ color: 'var(--text-muted)' }}>Add location…</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function FlameIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M12 2C12 2 7 8 7 13a5 5 0 0010 0c0-2.5-1-4.5-2-6-1 2-1.5 3-1.5 3S12 8 12 2z" fill="#00c6ff" />
      <path d="M12 16c-.5 0-1-.5-1-1 0-.8.5-1.5 1-2 .5.5 1 1.2 1 2 0 .5-.5 1-1 1z" fill="#0072ff" />
    </svg>
  )
}

export default function TopBar({ stats, onAlertsClick }) {
  const [time, setTime]         = useState(new Date())
  const [location, setLocation] = useState(LOCATIONS[0])

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const timeStr = time.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  return (
    <header className="topbar">
      <div className="topbar-logo">
        <div className="topbar-logo-icon"><FlameIcon /></div>
        <span className="topbar-logo-text">HeatSync</span>
      </div>

      <div className="topbar-divider" />

      <LocationDropdown current={location} onSelect={setLocation} />

      <div className="topbar-spacer" />

      <div className="topbar-weather">
        <span style={{ fontSize: 16 }}>🌥</span>
        <span className="topbar-weather-temp">{stats.weather.temp} °C</span>
        <span className="topbar-weather-label">{stats.weather.condition} · {stats.weather.humidity}%</span>
      </div>

      <div className="topbar-stat-group">
        <div className="topbar-stat">
          <span className="topbar-stat-value">{stats.activeUnits}/{stats.totalUnits}</span>
          <span className="topbar-stat-label">Units Active</span>
        </div>
        <div
          className={`topbar-stat ${stats.alerts > 0 ? 'alert' : ''}`}
          onClick={stats.alerts > 0 ? onAlertsClick : undefined}
          style={{ cursor: stats.alerts > 0 ? 'pointer' : 'default', position: 'relative' }}
          title={stats.alerts > 0 ? 'View active alerts' : undefined}
        >
          <span className="topbar-stat-value">
            {stats.alerts > 0 && (
              <span style={{
                display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
                background: '#ef5350', marginRight: 5, verticalAlign: 'middle',
                boxShadow: '0 0 6px #ef5350', animation: 'pulse 1.5s infinite',
              }} />
            )}
            {stats.alerts}
          </span>
          <span className="topbar-stat-label">Alerts</span>
        </div>
        <div className="topbar-stat">
          <span className="topbar-stat-value">{stats.savings.kwh.today} kWh</span>
          <span className="topbar-stat-label">Saved Today</span>
        </div>
      </div>

      <div className="topbar-time">{timeStr}</div>
    </header>
  )
}
