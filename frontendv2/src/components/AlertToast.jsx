import { useEffect } from 'react'

const SEV_COLOR = { high: '#ef5350', medium: '#ffa726', low: '#4fc3f7', warning: '#ffa726', error: '#ef5350' }
const SEV_ICON  = { high: '⚡', medium: '⚠', low: 'ℹ', warning: '⚠', error: '⚡' }

function Toast({ alert, onDismiss }) {
  const sev   = alert.severity in SEV_COLOR ? alert.severity : 'low'
  const color = SEV_COLOR[sev]

  useEffect(() => {
    const t = setTimeout(() => onDismiss(alert.id), 6000)
    return () => clearTimeout(t)
  }, [alert.id, onDismiss])

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      background: 'rgba(6,13,26,0.97)',
      border: `1px solid ${color}55`,
      borderLeft: `3px solid ${color}`,
      borderRadius: 8,
      padding: '10px 12px',
      minWidth: 300, maxWidth: 360,
      boxShadow: `0 4px 20px rgba(0,0,0,0.5), 0 0 12px ${color}22`,
      animation: 'toastIn 0.25s ease',
      pointerEvents: 'all',
    }}>
      <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{SEV_ICON[sev]}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color, marginBottom: 2, letterSpacing: '0.4px', textTransform: 'uppercase' }}>
          {alert.severity} · {alert.roomName}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.4 }}>
          {alert.message}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>
          Unit {alert.unitId}
        </div>
      </div>
      <button
        onClick={() => onDismiss(alert.id)}
        style={{
          background: 'none', border: 'none', color: 'var(--text-muted)',
          cursor: 'pointer', fontSize: 13, padding: '0 2px', flexShrink: 0,
        }}
      >✕</button>
    </div>
  )
}

export default function AlertToastStack({ alerts, onDismiss }) {
  if (!alerts.length) return null
  return (
    <div style={{
      position: 'fixed', top: 60, right: 16, zIndex: 9999,
      display: 'flex', flexDirection: 'column', gap: 8,
      pointerEvents: 'none',
    }}>
      {alerts.slice(0, 4).map(a => (
        <Toast key={a.id} alert={a} onDismiss={onDismiss} />
      ))}
    </div>
  )
}
