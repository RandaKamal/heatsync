import { roomEvents } from '../../data/mockCampus'
import type { ThermalParameters } from '../../types/buildingProfile'
import { calcLeadMinutes, genericLeadMinutes, estimatedEnergySaved } from '../../utils/eventLeadTime'

const CURRENT_TEMP_C = 17
const ACTIVE_DEVICES = 4
const AVG_KW_PER_DEVICE = 5.5
const TARGET_TEMP_C = 21

interface ProfileScheduleImpactProps {
  thermal: ThermalParameters
  calibrationDone: boolean
  confidencePercent: number
  archetypeThermal: ThermalParameters
  initialConfidencePercent: number
}

export function ProfileScheduleImpact({
  thermal,
  calibrationDone,
  confidencePercent,
  archetypeThermal,
  initialConfidencePercent,
}: ProfileScheduleImpactProps) {
  const genericMins = genericLeadMinutes()

  return (
    <div className="glass-panel" style={{ borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
        <span className="section-eyebrow">Schedule impact</span>
        <h3 style={{ margin: '4px 0 0', fontSize: 14, fontWeight: 700 }}>
          Event pre-heating lead times
        </h3>
        <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--muted)' }}>
          How far in advance the system would need to start heating for each event. Demo estimates.
        </p>
      </div>

      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {roomEvents.map((event) => {
          const archetypeMins = calcLeadMinutes({
            currentTempC: CURRENT_TEMP_C,
            targetTempC: TARGET_TEMP_C,
            heatingRateCPerHour: archetypeThermal.heatingRateCPerHour,
            confidencePercent: initialConfidencePercent,
            heatingEfficiencyIndex: archetypeThermal.heatingEfficiencyIndex,
          })

          const siteMins = calibrationDone
            ? calcLeadMinutes({
                currentTempC: CURRENT_TEMP_C,
                targetTempC: TARGET_TEMP_C,
                heatingRateCPerHour: thermal.heatingRateCPerHour,
                confidencePercent: confidencePercent,
                heatingEfficiencyIndex: thermal.heatingEfficiencyIndex,
              })
            : null

          const savings = calibrationDone && siteMins !== null
            ? estimatedEnergySaved(genericMins, siteMins, ACTIVE_DEVICES, AVG_KW_PER_DEVICE)
            : estimatedEnergySaved(genericMins, archetypeMins, ACTIVE_DEVICES, AVG_KW_PER_DEVICE)

          return (
            <div
              key={event.id}
              style={{
                padding: '12px',
                border: '1px solid var(--border)',
                borderRadius: 10,
                background: 'rgba(255,255,255,0.022)',
              }}
            >
              {/* Event header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#dceaf3' }}>{event.title}</div>
                  <div style={{ fontSize: 10, color: 'var(--muted)' }}>
                    Room {event.roomId} · {event.start}–{event.end} · {event.expectedStudents} students
                  </div>
                </div>
                <span style={{
                  fontSize: 9,
                  padding: '2px 7px',
                  border: '1px solid rgba(56,189,248,0.2)',
                  borderRadius: 999,
                  color: '#7dd3fc',
                  background: 'rgba(56,189,248,0.07)',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                }}>
                  Starts {event.start}
                </span>
              </div>

              {/* Lead time comparison */}
              <div style={{ display: 'grid', gridTemplateColumns: calibrationDone ? '1fr 1fr 1fr' : '1fr 1fr', gap: 8, marginBottom: 10 }}>
                <div className="analytics-metric">
                  <span>Generic</span>
                  <strong>{genericMins}<small style={{ fontSize: 10, fontWeight: 400 }}> min</small></strong>
                </div>
                <div className="analytics-metric">
                  <span>Archetype model</span>
                  <strong style={{ color: '#38bdf8' }}>
                    {archetypeMins}<small style={{ fontSize: 10, fontWeight: 400 }}> min</small>
                  </strong>
                </div>
                {calibrationDone && siteMins !== null && (
                  <div className="analytics-metric">
                    <span>Site-calibrated</span>
                    <strong style={{ color: '#5eead4' }}>
                      {siteMins}<small style={{ fontSize: 10, fontWeight: 400 }}> min</small>
                    </strong>
                  </div>
                )}
              </div>

              {/* Savings */}
              <div style={{ fontSize: 9, color: 'var(--muted)', marginBottom: 6 }}>
                Estimated savings vs generic · <em>Demo estimates</em>
              </div>
              <div className="impact-grid">
                <div className="impact-card">
                  <span>Energy</span>
                  <strong>{savings.savedKwh.toFixed(1)} kWh</strong>
                </div>
                <div className="impact-card">
                  <span>Cost</span>
                  <strong>€{savings.savedEur.toFixed(2)}</strong>
                </div>
                <div className="impact-card">
                  <span>CO₂</span>
                  <strong>{savings.savedCo2Kg.toFixed(2)} kg</strong>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
