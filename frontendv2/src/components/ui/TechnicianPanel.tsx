/**
 * Technician alert panel.
 *
 * When anomaly/detector finds faults, this panel:
 *   1. Shows active alerts with severity, type, and message.
 *   2. Lets the operator send a structured diagnostic notification.
 *   3. Displays the full notification log.
 *
 * Production extension: replace the backend log-append in
 *   POST /api/anomaly/contact-technician  with an HTTP call to
 *   PagerDuty, Twilio SMS, or SMTP. The payload already contains
 *   sensor readings and diagnostic steps — just forward it.
 */

import { useState } from 'react'

export interface Alert {
  id?: string
  severity: string
  type: string
  message: string
  device_id?: string
  device_name?: string
  timestamp?: string
  details?: string[]
}

export interface Notification {
  id: number
  timestamp: string
  deviceId: string
  roomName: string
  severity: string
  alertType: string
  message: string
  diagnostics?: Record<string, unknown>
  diagnosticSteps?: string[]
  status: string
}

interface TechnicianPanelProps {
  alerts: Alert[]
  notifications: Notification[]
  onContactTechnician: (alert: Alert) => Promise<void>
  onClose: () => void
  /** 'customer': send alerts to the technician. 'service': receive requests sent by the customer. */
  mode?: 'customer' | 'service'
}

const SEV_COLORS: Record<string, string> = {
  critical: '#ef4444',
  warning:  '#f59e0b',
  info:     '#38bdf8',
}

function AlertRow({ alert, onContact, sending }: {
  alert: Alert
  onContact: () => void
  sending: boolean
}) {
  const color = SEV_COLORS[alert.severity] ?? '#94a3b8'
  return (
    <article className="tech-alert-row">
      <div className="tech-alert-header">
        <span className="tech-alert-badge" style={{ borderColor: color, color }}>
          {alert.severity.toUpperCase()}
        </span>
        <span className="tech-alert-type">{alert.type.replace(/_/g, ' ')}</span>
        {alert.device_name && (
          <span className="tech-alert-device">{alert.device_name}</span>
        )}
      </div>
      <p className="tech-alert-msg">{alert.message}</p>
      {alert.details && alert.details.length > 0 && (
        <ul className="tech-alert-details">
          {alert.details.map((d, i) => <li key={i}>{d}</li>)}
        </ul>
      )}
      <button
        type="button"
        className="tech-contact-btn"
        onClick={onContact}
        disabled={sending}
      >
        {sending ? 'Sending…' : '📟 Alert Technician'}
      </button>
    </article>
  )
}

function NotificationLog({ notifications }: { notifications: Notification[] }) {
  return (
    <div className="tech-content">
      {notifications.length === 0 ? (
        <div className="tech-empty">
          <span>📭</span>
          <p>No requests from customers yet.</p>
        </div>
      ) : (
        <div className="tech-log-list">
          {[...notifications].reverse().map((n) => (
            <article className="tech-log-row" key={n.id}>
              <div className="tech-log-meta">
                <time>{n.timestamp.slice(0, 19).replace('T', ' ')}</time>
                <span
                  className="tech-log-sev"
                  style={{ color: SEV_COLORS[n.severity] ?? '#94a3b8' }}
                >
                  {n.severity}
                </span>
                <span className="tech-log-status">{n.status}</span>
              </div>
              <strong>{n.alertType.replace(/_/g, ' ')}</strong>
              <p>{n.message}</p>
              {n.diagnosticSteps && n.diagnosticSteps.length > 0 && (
                <ul className="tech-diag-steps">
                  {n.diagnosticSteps.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

export function TechnicianPanel({
  alerts,
  notifications,
  onContactTechnician,
  onClose,
  mode = 'customer',
}: TechnicianPanelProps) {
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [tab, setTab] = useState<'alerts' | 'log'>('alerts')

  async function handleContact(alert: Alert) {
    const key = alert.id ?? alert.type
    setSendingId(key)
    try {
      await onContactTechnician(alert)
    } finally {
      setSendingId(null)
    }
  }

  if (mode === 'service') {
    return (
      <div className="tech-overlay" onClick={onClose}>
        <div className="tech-panel glass-panel" onClick={(e) => e.stopPropagation()}>
          <div className="tech-header">
            <div>
              <span className="section-eyebrow">Customer requests</span>
              <h2 className="tech-title">🔔 Notifications</h2>
            </div>
            <button type="button" className="pokes-close" onClick={onClose}>×</button>
          </div>
          <NotificationLog notifications={notifications} />
        </div>
      </div>
    )
  }

  return (
    <div className="tech-overlay" onClick={onClose}>
      <div className="tech-panel glass-panel" onClick={(e) => e.stopPropagation()}>
        <div className="tech-header">
          <div>
            <span className="section-eyebrow">Maintenance</span>
            <h2 className="tech-title">🔧 Technician Alerts</h2>
          </div>
          <button type="button" className="pokes-close" onClick={onClose}>×</button>
        </div>

        <div className="tech-tabs">
          <button
            type="button"
            className={`tech-tab ${tab === 'alerts' ? 'tech-tab--active' : ''}`}
            onClick={() => setTab('alerts')}
          >
            Active alerts
            {alerts.length > 0 && (
              <span className="tech-tab-count">{alerts.length}</span>
            )}
          </button>
          <button
            type="button"
            className={`tech-tab ${tab === 'log' ? 'tech-tab--active' : ''}`}
            onClick={() => setTab('log')}
          >
            Notification log
            {notifications.length > 0 && (
              <span className="tech-tab-count">{notifications.length}</span>
            )}
          </button>
        </div>

        {tab === 'alerts' && (
          <div className="tech-content">
            {alerts.length === 0 ? (
              <div className="tech-empty">
                <span>✅</span>
                <p>No active alerts. All systems operating normally.</p>
              </div>
            ) : (
              <div className="tech-alert-list">
                {alerts.map((alert, i) => (
                  <AlertRow
                    key={alert.id ?? i}
                    alert={alert}
                    onContact={() => handleContact(alert)}
                    sending={sendingId === (alert.id ?? alert.type)}
                  />
                ))}
              </div>
            )}
            <div className="tech-note">
              <strong>How notifications work:</strong> Clicking "Alert Technician"
              posts a structured diagnostic payload to the backend log. In production,
              extend <code>POST /api/anomaly/contact-technician</code> to forward
              this to PagerDuty, Twilio, or SMTP. The payload includes sensor readings
              and suggested diagnostic steps.
            </div>
          </div>
        )}

        {tab === 'log' && <NotificationLog notifications={notifications} />}
      </div>
    </div>
  )
}
