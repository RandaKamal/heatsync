import { SourceBadge } from '../ui/SourceBadge'
import { getCustomerVisibleSummary } from '../../simulation/incident/incidentVisibility'
import type { SharedIncidentState } from '../../simulation/incident/incidentTypes'

const COMFORT_STATUS_LABEL: Record<SharedIncidentState['roomComfortStatus'], string> = {
  'below-range': 'Below comfort range — heating toward target',
  'inside-range': 'Inside comfort range',
  'above-range': 'Above comfort range',
  'at-risk': 'At risk — HeatSync is checking remaining capacity',
}

const CONTINUITY_LABEL: Record<SharedIncidentState['eventContinuity'], string> = {
  'expected-to-continue': 'Expected to continue',
  'at-risk': 'At risk — being protected',
  'cannot-be-guaranteed': 'Cannot be guaranteed',
}

interface CustomerIncidentPanelProps {
  incidentState: SharedIncidentState
  onClose: () => void
}

export function CustomerIncidentPanel({ incidentState, onClose }: CustomerIncidentPanelProps) {
  const summary = getCustomerVisibleSummary(incidentState)
  const bandSpan = summary.comfortMaxC - summary.comfortMinC
  const bandLow = summary.comfortMinC - 2
  const bandHigh = summary.comfortMaxC + 2
  const bandWidth = bandHigh - bandLow
  const markerLeftPct = Math.min(100, Math.max(0, ((summary.roomTemperatureC - bandLow) / bandWidth) * 100))

  return (
    <div className="incident-panel glass-panel">
      <div className="incident-panel__header">
        <div>
          <span className="section-eyebrow">Customer View · Fault simulation</span>
          <h2 style={{ margin: '4px 0 0', fontSize: 14 }}>{summary.eventTitle}</h2>
        </div>
        <button type="button" className="pokes-close" onClick={onClose}>×</button>
      </div>

      <div className="incident-panel__body">
        <p style={{ margin: 0, fontSize: 11, color: 'var(--muted)' }}>
          Starts {summary.eventStartLocal} local time · expected attendance {summary.expectedAttendance}.{' '}
          <SourceBadge label="Simulated" /> demo context mapped onto a real recorded fault window.
        </p>

        <div className="incident-section">
          <span className="section-eyebrow">Room comfort</span>
          <div className="comfort-band">
            <div className="comfort-band__labels">
              <span style={{ color: '#7dd3fc', fontSize: 10 }}>Too cold</span>
              <span style={{ color: '#88a3b9', fontSize: 10 }}>Comfort zone</span>
              <span style={{ color: '#f59e0b', fontSize: 10 }}>Too warm</span>
            </div>
            <div className="comfort-band__track" style={{ position: 'relative' }}>
              <div
                className="comfort-band__range"
                style={{
                  left: `${((summary.comfortMinC - bandLow) / bandWidth) * 100}%`,
                  width: `${(bandSpan / bandWidth) * 100}%`,
                }}
              />
              <div
                title={`${summary.roomTemperatureC}°C`}
                style={{
                  position: 'absolute',
                  left: `${markerLeftPct}%`,
                  top: -3,
                  width: 2,
                  height: 11,
                  background: '#eef7ff',
                  transform: 'translateX(-1px)',
                }}
              />
            </div>
            <div className="comfort-band__temp-labels">
              <span style={{ color: '#88a3b9', fontSize: 10 }}>{bandLow}°C</span>
              <span style={{ color: '#5eead4', fontSize: 11, fontWeight: 700 }}>
                {summary.roomTemperatureC}°C — {COMFORT_STATUS_LABEL[summary.roomComfortStatus]}
              </span>
              <span style={{ color: '#88a3b9', fontSize: 10 }}>{bandHigh}°C</span>
            </div>
          </div>
        </div>

        <div className="incident-field-grid">
          <div className="incident-field">
            <span>Available devices</span>
            <strong>{summary.availableDevicesLabel}</strong>
          </div>
          <div className="incident-field">
            <span>Event status</span>
            <strong>{CONTINUITY_LABEL[summary.eventContinuity]}</strong>
          </div>
          <div className="incident-field">
            <span>LB Energy informed</span>
            <strong>{summary.lbEnergyInformed ? 'Yes' : 'In progress'}</strong>
          </div>
          <div className="incident-field">
            <span>Operator action</span>
            <strong>{summary.operatorActionRequired ? 'Action needed' : 'None required'}</strong>
          </div>
        </div>

        <div className="incident-section">
          <span className="section-eyebrow">Active profile</span>
          <div className="incident-field-grid">
            <div className="incident-field">
              <span>Profile</span>
              <strong>{summary.profileLabel}</strong>
            </div>
            <div className="incident-field">
              <span>Calibration confidence</span>
              <strong>{summary.calibrationConfidencePercent}%</strong>
            </div>
          </div>
          <p style={{ margin: 0, fontSize: 10, color: 'var(--muted)' }}>Status: Continuously learning</p>
        </div>

        <p style={{ margin: 0, fontSize: 11, color: '#9bb1c0', lineHeight: 1.5 }}>
          {summary.operatorActionText} Another room or event is{' '}
          {summary.otherRoomsAtRisk ? 'also at risk.' : 'not affected.'}
        </p>

        <p style={{ margin: 0, fontSize: 10, color: 'var(--muted)', fontStyle: 'italic' }}>
          The operator does not manage four machines. They manage one comfortable room.
        </p>
      </div>
    </div>
  )
}
