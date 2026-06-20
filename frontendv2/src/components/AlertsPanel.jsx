import { useState } from 'react'

const API = 'http://localhost:5001/api'

const SEV_COLOR = { high: '#ef5350', medium: '#ffa726', low: '#4fc3f7', warning: '#ffa726', error: '#ef5350' }
const SEV_BG    = { high: 'rgba(239,83,80,0.12)', medium: 'rgba(255,167,38,0.12)', low: 'rgba(79,195,247,0.08)', warning: 'rgba(255,167,38,0.12)', error: 'rgba(239,83,80,0.12)' }
const SEV_ICON  = { high: '⚡', medium: '⚠', low: 'ℹ', warning: '⚠', error: '⚡' }

function sev(a) { return a.severity in SEV_COLOR ? a.severity : 'low' }

export default function AlertsPanel({ alerts, onClose }) {
  const [notifying, setNotifying] = useState({})
  const [notified,  setNotified]  = useState({})

  async function notifyTech(alert) {
    setNotifying(prev => ({ ...prev, [alert.id]: true }))
    try {
      await fetch(`${API}/anomaly/notify`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          roomName: alert.roomName,
          unitId:   alert.unitId,
          deviceId: alert.deviceId ?? '',
          severity: alert.severity,
          message:  alert.message,
        }),
      })
      setNotified(prev => ({ ...prev, [alert.id]: true }))
    } catch {
      // still mark as attempted
      setNotified(prev => ({ ...prev, [alert.id]: 'error' }))
    }
    setNotifying(prev => ({ ...prev, [alert.id]: false }))
  }

  const grouped = alerts.reduce((acc, a) => {
    const key = a.roomName ?? 'Unknown'
    ;(acc[key] = acc[key] ?? []).push(a)
    return acc
  }, {})

  return (
    <div className="alerts-panel-overlay" onClick={onClose}>
      <aside className="alerts-panel" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="panel-header" style={{ borderBottom: '1px solid rgba(239,83,80,0.2)' }}>
          <div>
            <div className="panel-header-id" style={{ color: '#ef5350' }}>
              Active Alerts
            </div>
            <div className="panel-header-room">
              {alerts.length} issue{alerts.length !== 1 ? 's' : ''} across {Object.keys(grouped).length} zone{Object.keys(grouped).length !== 1 ? 's' : ''}
            </div>
          </div>
          <div className="panel-header-spacer" />
          <button className="panel-close" onClick={onClose} title="Close">✕</button>
        </div>

        <div className="panel-scroll">
          {alerts.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>✓</div>
              <div>No active alerts — all systems nominal.</div>
            </div>
          ) : (
            Object.entries(grouped).map(([roomName, roomAlerts]) => (
              <div key={roomName} className="panel-section">
                <div className="panel-section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: '#ef5350', fontSize: 9 }}>●</span>
                  {roomName}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {roomAlerts.map(alert => (
                    <div
                      key={alert.id}
                      className={`anomaly-item severity-${sev(alert)}`}
                      style={{ flexDirection: 'column', gap: 8 }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        <div className="anomaly-icon" style={{ background: SEV_BG[sev(alert)], flexShrink: 0 }}>
                          <span style={{ color: SEV_COLOR[sev(alert)] }}>{SEV_ICON[sev(alert)]}</span>
                        </div>
                        <div className="anomaly-body" style={{ flex: 1 }}>
                          <div className="anomaly-msg">{alert.message}</div>
                          <div className="anomaly-meta">
                            <span style={{ color: SEV_COLOR[sev(alert)], fontWeight: 600, textTransform: 'uppercase', fontSize: 9 }}>
                              {alert.severity}
                            </span>
                            <span className="anomaly-time">Unit {alert.unitId}</span>
                            {alert.time && alert.time !== '—' && (
                              <span className="anomaly-time">{alert.time}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Notify button */}
                      <button
                        onClick={() => notifyTech(alert)}
                        disabled={!!notifying[alert.id] || !!notified[alert.id]}
                        style={{
                          width: '100%',
                          padding: '7px 0',
                          borderRadius: 6,
                          border: `1px solid ${notified[alert.id] === true ? 'rgba(0,230,118,0.3)' : notified[alert.id] === 'error' ? 'rgba(239,83,80,0.3)' : 'rgba(255,167,38,0.3)'}`,
                          background: notified[alert.id] === true ? 'rgba(0,230,118,0.08)' : notified[alert.id] === 'error' ? 'rgba(239,83,80,0.08)' : 'rgba(255,167,38,0.07)',
                          color: notified[alert.id] === true ? '#00e676' : notified[alert.id] === 'error' ? '#ef5350' : '#ffa726',
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: notified[alert.id] ? 'default' : 'pointer',
                          letterSpacing: '0.4px',
                          transition: 'all 0.2s',
                        }}
                      >
                        {notifying[alert.id]
                          ? 'Sending…'
                          : notified[alert.id] === true
                          ? '✓ Technician Notified'
                          : notified[alert.id] === 'error'
                          ? '✕ Failed — retry'
                          : 'Notify Technician'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
          <div style={{ height: 20 }} />
        </div>
      </aside>
    </div>
  )
}
