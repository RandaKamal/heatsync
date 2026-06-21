import { SourceBadge } from '../ui/SourceBadge'
import { getLbEnergyVisibleSummary } from '../../simulation/incident/incidentVisibility'
import { DEMO_EVENT, INCIDENT_ROOM_ID, SCENARIO } from '../../simulation/incident/incidentScenario'
import type { IncidentCardActionLog, IncidentDeviceRole, SharedIncidentState } from '../../simulation/incident/incidentTypes'

const DEVICE_ROLE_LABELS: Record<IncidentDeviceRole, string> = {
  'device-1': 'Device 1',
  'device-2': 'Device 2',
  'device-3': 'Device 3',
  'device-4': 'Device 4',
}

const DEVICE_ROLE_ORDER: IncidentDeviceRole[] = ['device-1', 'device-2', 'device-3', 'device-4']

const DIAGNOSIS_STATUS_LABEL: Record<SharedIncidentState['diagnosisStatus'], string> = {
  'not-started': 'Not started',
  analysing: 'Analysing',
  classified: 'Classified',
  'technician-confirmation-required': 'Suspected fault — technician confirmation required',
}

const SERVICE_STATUS_LABEL: Record<SharedIncidentState['serviceStatus'], string> = {
  'not-created': 'Not yet created',
  prepared: 'Control recommendation prepared',
  created: 'Service ticket created',
  'technician-notified': 'Technician notified',
}

interface LbEnergyIncidentPanelProps {
  incidentState: SharedIncidentState
  onClose: () => void
  controls: {
    acknowledgeIncident: () => void
    createServiceTicket: () => void
    markTechnicianNotified: () => void
    markDeviceUnavailable: () => void
    returnDeviceToService: () => void
  }
}

function ActionButton({
  label,
  done,
  onClick,
}: {
  label: string
  done: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className={`incident-btn${done ? ' incident-btn--active' : ''}`}
      onClick={onClick}
      disabled={done}
    >
      {done ? '✓ ' : ''}
      {label}
    </button>
  )
}

export function LbEnergyIncidentPanel({ incidentState, onClose, controls }: LbEnergyIncidentPanelProps) {
  const summary = getLbEnergyVisibleSummary(incidentState)
  const actionLog: IncidentCardActionLog = summary.actionLog

  return (
    <div className="incident-panel glass-panel">
      <div className="incident-panel__header">
        <div>
          <span className="section-eyebrow">LB Energy View · Fault simulation</span>
          <h2 style={{ margin: '4px 0 0', fontSize: 14 }}>{SCENARIO.title}</h2>
        </div>
        <button type="button" className="pokes-close" onClick={onClose}>×</button>
      </div>

      <div className="incident-panel__body">
        <p style={{ margin: 0, fontSize: 11, color: 'var(--muted)' }}>{SCENARIO.subtitle}</p>

        <div className="incident-section">
          <span className="section-eyebrow">Device &amp; location</span>
          <div className="incident-field-grid">
            <div className="incident-field">
              <span>Affected device</span>
              <strong>{summary.affectedDeviceName}</strong>
            </div>
            <div className="incident-field">
              <span>Location</span>
              <strong>{DEMO_EVENT.profileLabel} ({INCIDENT_ROOM_ID})</strong>
            </div>
          </div>
        </div>

        <div className="incident-section">
          <span className="section-eyebrow">Raw signals <SourceBadge label="Historical" /></span>
          <div className="incident-field-grid">
            <div className="incident-field">
              <span>Heating requested</span>
              <strong>{summary.historicalDevice1.heatingRequired ? 'Yes' : 'No'}</strong>
            </div>
            <div className="incident-field">
              <span>Compressor active</span>
              <strong>{summary.historicalDevice1.compressorActive ? 'Yes' : 'No'}</strong>
            </div>
            <div className="incident-field">
              <span>Normal alarm flag</span>
              <strong>{summary.historicalDevice1.alarmActive ? 'On' : 'Off'}</strong>
            </div>
            <div className="incident-field">
              <span>Raw error registers</span>
              <strong style={{ fontFamily: 'monospace', fontSize: 11 }}>{summary.historicalDevice1.errorRegisters}</strong>
            </div>
          </div>
          {summary.decodedRegisterDevice1.map((alarm) => (
            <div key={alarm.id} style={{ fontSize: 11, color: '#f59e0b' }}>
              Register {alarm.id.split('-')[0]} · bit {alarm.id.split('-')[1]} active → {alarm.message}
            </div>
          ))}
          <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>
            The standard alarm flag says nothing is wrong. The raw register and operating behaviour disagree.
          </p>
        </div>

        <div className="incident-section">
          <span className="section-eyebrow">Cross-device consistency check</span>
          <table className="incident-table">
            <thead>
              <tr>
                <th>Signal</th>
                <th>{summary.affectedDeviceName}</th>
                <th>Device 4</th>
              </tr>
            </thead>
            <tbody>
              {summary.crossDeviceComparison.map((row) => (
                <tr key={row.signal}>
                  <td>{row.signal}</td>
                  <td>{row.device1}</td>
                  <td>{row.device4}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="incident-section">
          <span className="section-eyebrow">Why HeatSync escalated this incident</span>
          <ul className="incident-fact-list">
            {summary.diagnosisFacts.map((fact) => (
              <li key={fact}>{fact}</li>
            ))}
          </ul>
        </div>

        <div className="incident-section">
          <span className="section-eyebrow">Classification</span>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#f59e0b' }}>{summary.diagnosisText}</p>
          <p style={{ margin: 0, fontSize: 11, color: 'var(--muted)' }}>
            {DIAGNOSIS_STATUS_LABEL[summary.diagnosisStatus]}
          </p>
          <p style={{ margin: 0, fontSize: 11, color: '#9bb1c0' }}>{summary.technicianRecommendation}</p>
        </div>

        <div className="incident-section">
          <span className="section-eyebrow">
            Demand allocation <SourceBadge label="Simulated" />
          </span>
          <table className="incident-table">
            <thead>
              <tr>
                <th>Device</th>
                <th>Share</th>
              </tr>
            </thead>
            <tbody>
              {DEVICE_ROLE_ORDER.map((role) => (
                <tr key={role}>
                  <td>{DEVICE_ROLE_LABELS[role]}</td>
                  <td>{summary.loadAllocation[role]}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ margin: 0, fontSize: 10, color: 'var(--muted)' }}>
            Illustrative demand allocation — not historical measurements. Capacity available:{' '}
            {summary.availableDevicesLabel} ({summary.capacityAvailablePercent}%).
          </p>
        </div>

        <div className="incident-section">
          <span className="section-eyebrow">
            Profile &amp; capacity impact <SourceBadge label="Simulated" />
          </span>
          <div className="incident-field-grid">
            <div className="incident-field">
              <span>Available capacity</span>
              <strong>
                {summary.operationalProfileImpact.capacityBeforePercent}% → {summary.operationalProfileImpact.capacityAfterPercent}%
              </strong>
            </div>
            <div className="incident-field">
              <span>Calibration confidence</span>
              <strong>
                {summary.operationalProfileImpact.calibrationConfidenceBeforePercent}% → {summary.operationalProfileImpact.calibrationConfidenceAfterPercent}%
              </strong>
            </div>
            <div className="incident-field">
              <span>Preparation estimate</span>
              <strong>48 min → {summary.leadTimeMinutes} min</strong>
            </div>
            <div className="incident-field">
              <span>Profile</span>
              <strong>{summary.operationalProfileImpact.profileLabel}</strong>
            </div>
          </div>
          <p style={{ margin: 0, fontSize: 10, color: 'var(--muted)' }}>{summary.operationalProfileImpact.note}</p>
        </div>

        <div className="incident-section">
          <span className="section-eyebrow">Technician handoff</span>
          <div className="incident-card">
            <div className="incident-card__row">
              <span>Incident</span>
              <strong>{summary.incidentCardId}</strong>
            </div>
            <div className="incident-card__row">
              <span>Probable category</span>
              <strong>Refrigerant circuit / low-pressure condition</strong>
            </div>
            <div className="incident-card__row">
              <span>Service status</span>
              <strong>{SERVICE_STATUS_LABEL[incidentState.serviceStatus]}</strong>
            </div>
            <div className="incident-action-row">
              <ActionButton label="Acknowledge incident" done={actionLog.acknowledged} onClick={controls.acknowledgeIncident} />
              <ActionButton label="Create service ticket" done={actionLog.serviceTicketCreated} onClick={controls.createServiceTicket} />
              <ActionButton label="Mark technician notified" done={actionLog.technicianNotified} onClick={controls.markTechnicianNotified} />
              <ActionButton label="Mark device unavailable" done={actionLog.deviceMarkedUnavailable} onClick={controls.markDeviceUnavailable} />
              <ActionButton label="Return device to service" done={actionLog.deviceReturnedToService} onClick={controls.returnDeviceToService} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
