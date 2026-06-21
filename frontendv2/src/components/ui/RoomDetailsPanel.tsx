import { useState } from 'react'
import type { Room, RoomEvent, ClimateDevice, WeekDay, EventRecurrence } from '../../types/campus'
import type { SavingsTotals, EnergyWindow } from '../../api/client'
import { STATUS_COLORS, STATUS_LABELS } from '../../utils/status'

interface RoomDetailsPanelProps {
  room: Room
  events: RoomEvent[]
  savings: SavingsTotals
  energyWindows: EnergyWindow[]
  devices: ClimateDevice[]
  onClose: () => void
  onAddEvent: (event: RoomEvent) => void
  onSelectDevice: (id: string) => void
}

// 30-minute slots from 06:00 to 22:00
const TIME_SLOTS = Array.from({ length: 33 }, (_, i) => {
  const totalMin = 6 * 60 + i * 30
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
})

const DAYS: WeekDay[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const RECURRENCE_OPTIONS: { value: EventRecurrence; label: string }[] = [
  { value: 'weekly',   label: 'Every week'    },
  { value: 'once',     label: 'Once only'     },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'monthly',  label: 'Every month'   },
]

const RECURRENCE_LABELS: Record<EventRecurrence, string> = {
  once:     'Once',
  weekly:   'Weekly',
  biweekly: 'Every 2 wks',
  monthly:  'Monthly',
}

export function RoomDetailsPanel({
  room,
  events,
  savings,
  energyWindows,
  devices,
  onClose,
  onAddEvent,
  onSelectDevice,
}: RoomDetailsPanelProps) {
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle]           = useState('')
  const [start, setStart]           = useState('08:00')
  const [end, setEnd]               = useState('09:30')
  const [students, setStudents]     = useState('')
  const [day, setDay]               = useState<WeekDay>('Mon')
  const [recurrence, setRecurrence] = useState<EventRecurrence>('weekly')

  const statusColor = STATUS_COLORS[room.status]
  const roomEvents = events
    .filter((e) => e.roomId === room.id)
    .sort((a, b) => a.start.localeCompare(b.start))
  const roomDevices = devices.filter((d) => room.servedBy.includes(d.id))

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!title) return
    onAddEvent({
      id: `event-${Date.now()}`,
      roomId: room.id,
      title,
      start,
      end,
      expectedStudents: students ? parseInt(students, 10) : 50,
      day,
      recurrence,
    })
    setTitle('')
    setStart('08:00')
    setEnd('09:30')
    setStudents('')
    setDay('Mon')
    setRecurrence('weekly')
    setShowForm(false)
  }

  return (
    <aside className="room-details-panel glass-panel">
      <div className="rdp-header">
        <button type="button" className="back-button" onClick={onClose}>
          ← Building overview
        </button>
        <div className="rdp-heading">
          <span className="section-eyebrow">Room details</span>
          <h2>{room.name}</h2>
          <div className="rdp-status" style={{ color: statusColor }}>
            <span className="status-dot" style={{ background: statusColor }} />
            {room.id} · {STATUS_LABELS[room.status]}
          </div>
        </div>
      </div>

      {/* Room vitals */}
      <section className="analytics-section">
        <div className="metric-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr' }}>
          <article className="analytics-metric">
            <span>Temperature</span>
            <strong>{room.currentTemperature.toFixed(1)}<small>°C</small></strong>
            <span style={{ fontSize: 11, color: '#64748b' }}>Target {room.targetTemperature}°C</span>
          </article>
          <article className="analytics-metric">
            <span>Humidity</span>
            <strong>{room.humidityPct}<small>%</small></strong>
          </article>
          <article className="analytics-metric">
            <span>Occupancy</span>
            <strong>{room.occupancy}<small>/{room.capacity}</small></strong>
          </article>
          <article className="analytics-metric">
            <span>Next event</span>
            <strong style={{ fontSize: 12 }}>{room.nextEvent ?? '—'}</strong>
          </article>
        </div>
      </section>

      {/* Active heat pumps */}
      {roomDevices.length > 0 && (
        <section className="analytics-section">
          <div className="analytics-section__heading">
            <div>
              <span className="section-eyebrow">Active heat pumps</span>
              <h3>{roomDevices.length} units serving this room</h3>
            </div>
          </div>
          <div className="hp-card-grid">
            {roomDevices.map((device) => {
              const color = STATUS_COLORS[device.status]
              const isBad = device.status === 'fault' || device.status === 'at-risk'
              return (
                <button
                  key={device.id}
                  type="button"
                  className={`hp-card ${isBad ? 'hp-card--alert' : ''}`}
                  style={{ '--hp-color': color } as React.CSSProperties}
                  onClick={() => onSelectDevice(device.id)}
                >
                  <div className="hp-card__header">
                    <span className="status-dot" style={{ background: color }} />
                    <span className="hp-card__name">{device.name}</span>
                    <span className="hp-card__status" style={{ color }}>{STATUS_LABELS[device.status]}</span>
                  </div>
                  <div className="hp-card__metrics">
                    <div className="hp-card__metric">
                      <span>Power</span>
                      <strong>{device.currentPowerKw.toFixed(1)} kW</strong>
                    </div>
                    <div className="hp-card__metric">
                      <span>COP</span>
                      <strong>{device.efficiencyCop?.toFixed(1) ?? '—'}</strong>
                    </div>
                    <div className="hp-card__metric">
                      <span>Health</span>
                      <strong style={{ color: device.healthScore < 70 ? '#ef4444' : device.healthScore < 85 ? '#f59e0b' : '#2dd4bf' }}>
                        {device.healthScore}%
                      </strong>
                    </div>
                  </div>
                  {device.alert && (
                    <div className="hp-card__alert">{device.alert}</div>
                  )}
                </button>
              )
            })}
          </div>
        </section>
      )}

      {/* Savings */}
      <section className="analytics-section">
        <div className="analytics-section__heading">
          <div>
            <span className="section-eyebrow">Cumulative savings</span>
            <h3>Energy · Cost · CO₂</h3>
          </div>
        </div>
        <div className="metric-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
          <article className="analytics-metric">
            <span>Energy saved</span>
            <strong>{savings.energy_saved_kwh.toFixed(0)}<small> kWh</small></strong>
          </article>
          <article className="analytics-metric">
            <span>Cost saved</span>
            <strong>€{savings.cost_saved_eur.toFixed(0)}</strong>
          </article>
          <article className="analytics-metric">
            <span>CO₂ avoided</span>
            <strong>{savings.co2_saved_kg.toFixed(0)}<small> kg</small></strong>
          </article>
        </div>
      </section>

      {/* Schedule */}
      <section className="analytics-section">
        <div className="analytics-section__heading">
          <div>
            <span className="section-eyebrow">Calendar</span>
            <h3>Room schedule</h3>
          </div>
          <button
            type="button"
            className="rdp-add-btn"
            onClick={() => setShowForm((v) => !v)}
          >
            {showForm ? '✕ Cancel' : '+ Add event'}
          </button>
        </div>

        {showForm && (
          <form className="rdp-form" onSubmit={handleAdd}>
            {/* Title */}
            <div className="rdp-form__row">
              <label className="rdp-label">
                <span>Title</span>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Thermodynamics"
                  required
                />
              </label>
            </div>

            {/* Day of week */}
            <div className="rdp-form__row">
              <span className="rdp-field-label">Day</span>
              <div className="rdp-day-row">
                {DAYS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    className={`rdp-day-btn ${day === d ? 'rdp-day-btn--active' : ''}`}
                    onClick={() => setDay(d)}
                  >
                    {d.slice(0, 2)}
                  </button>
                ))}
              </div>
            </div>

            {/* Start / End — styled select dropdowns */}
            <div className="rdp-form__row rdp-form__row--split">
              <label className="rdp-label">
                <span>Start</span>
                <select
                  className="rdp-time-select"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                >
                  {TIME_SLOTS.map((slot) => (
                    <option key={slot} value={slot}>{slot}</option>
                  ))}
                </select>
              </label>
              <label className="rdp-label">
                <span>End</span>
                <select
                  className="rdp-time-select"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                >
                  {TIME_SLOTS.map((slot) => (
                    <option key={slot} value={slot}>{slot}</option>
                  ))}
                </select>
              </label>
            </div>

            {/* Recurrence */}
            <div className="rdp-form__row">
              <label className="rdp-label">
                <span>Repeats</span>
                <select
                  className="rdp-time-select"
                  value={recurrence}
                  onChange={(e) => setRecurrence(e.target.value as EventRecurrence)}
                >
                  {RECURRENCE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </label>
            </div>

            {/* Attendees */}
            <div className="rdp-form__row">
              <label className="rdp-label">
                <span>Avg. attendees (default 50)</span>
                <input
                  type="number"
                  min="1"
                  value={students}
                  onChange={(e) => setStudents(e.target.value)}
                  placeholder="50"
                />
              </label>
            </div>

            <button type="submit" className="rdp-submit">Add event</button>
          </form>
        )}

        {roomEvents.length === 0 ? (
          <p className="rdp-empty">No events scheduled. Add one above.</p>
        ) : (
          <div className="rdp-event-list">
            {roomEvents.map((ev) => (
              <article className="rdp-event-row" key={ev.id}>
                <div className="rdp-event-meta">
                  {ev.day && <span className="rdp-event-day">{ev.day}</span>}
                  <time className="rdp-event-time">{ev.start} – {ev.end}</time>
                  {ev.recurrence && ev.recurrence !== 'once' && (
                    <span className="rdp-event-recur">{RECURRENCE_LABELS[ev.recurrence]}</span>
                  )}
                </div>
                <div className="rdp-event-body">
                  <strong>{ev.title}</strong>
                  <span>{ev.expectedStudents} attendees</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Energy windows: preheat + wind-down times */}
      {energyWindows.length > 0 && (
        <section className="analytics-section">
          <div className="analytics-section__heading">
            <div>
              <span className="section-eyebrow">Predictive control</span>
              <h3>Pre-heat &amp; wind-down windows</h3>
            </div>
          </div>
          <p className="panel-explanation">
            Heat pump turns on before each event and holds temperature
            {' '}{energyWindows[0]?.windDownBufferMin ?? 15} min after it ends,
            then drops to the unoccupied setpoint.
          </p>
          <div className="ew-list">
            {energyWindows.map((w) => (
              <article className="ew-row" key={w.eventId}>
                <div className="ew-title">{w.title}</div>
                <div className="ew-timeline">
                  <span className="ew-segment ew-segment--preheat" title="Preheat starts">
                    🔥 {w.preheatStart}
                  </span>
                  <span className="ew-line" />
                  <span className="ew-segment ew-segment--event" title="Event">
                    👥 {w.eventStart}–{w.eventEnd}
                  </span>
                  <span className="ew-line" />
                  <span className="ew-segment ew-segment--idle" title="Wind-down">
                    🌙 {w.windDownTime}
                  </span>
                </div>
                <div className="ew-meta">
                  <span>{w.predictedMode} · {w.setpointCelsius}°C target</span>
                  <span>{w.leadMinutes} min lead</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </aside>
  )
}
