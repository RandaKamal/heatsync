import type { AnomalyScenario } from '../../hooks/useBackendStatus'
import type {
  FailureSimulationStatus,
  SimulationSeverity,
} from '../../simulation/types'

interface FailureSimulationPanelProps {
  status: FailureSimulationStatus
  onStepToNextPhase: () => void
  onReset: () => void
  onDismiss: () => void
  scenarios: AnomalyScenario[]
  selectedScenario: string
  onSelectScenario: (type: string) => void
}

const SEVERITY_LABELS: Record<SimulationSeverity, string> = {
  none: 'Normal',
  information: 'Information',
  warning: 'Watching',
  critical: 'Early warning',
  recovering: 'Recovery',
  resolved: 'Resolved',
}

const SCENARIO_DESCRIPTIONS: Record<string, { title: string; narrative: string; severity: string }> = {
  ACTIVE_ALARM: {
    title: 'Active Alarm',
    narrative: 'One or more devices are reporting an active hardware alarm. The error registers contain non-zero values indicating a triggered protection circuit.',
    severity: 'critical',
  },
  ERROR_REGISTER: {
    title: 'Error Register Fault',
    narrative: 'Non-zero error register values were detected without a full alarm flag. These indicate background fault conditions that may escalate.',
    severity: 'warning',
  },
  PRESSURE_ANOMALY: {
    title: 'Pressure Anomaly',
    narrative: 'System pressure readings are outside the expected statistical range. High or low pressure deviations can indicate refrigerant issues or blocked circuits.',
    severity: 'warning',
  },
  SUPPLY_RETURN_COLLAPSE: {
    title: 'Supply/Return Collapse',
    narrative: 'The supply and return temperatures are nearly equal while conditioning is active. This typically indicates a compressor or heat-exchange issue.',
    severity: 'warning',
  },
}

const SEV_COLOR: Record<string, string> = {
  critical: '#ef4444',
  warning: '#f59e0b',
  info: '#38bdf8',
}

function formatTime(seconds: number): string {
  return `00:${seconds.toString().padStart(2, '0')}`
}

export function FailureSimulationPanel({
  status,
  onStepToNextPhase,
  onReset,
  onDismiss,
  scenarios,
  selectedScenario,
  onSelectScenario,
}: FailureSimulationPanelProps) {
  const hasStarted = status.elapsedSeconds > 0
  const isComplete = status.phase === 'complete'
  const isDemoSelected = selectedScenario === 'DEMO'

  const realScenario = !isDemoSelected ? SCENARIO_DESCRIPTIONS[selectedScenario] : null
  const liveData = !isDemoSelected ? scenarios.find((s) => s.type === selectedScenario) : null

  return (
    <section
      className={`failure-simulation glass-panel failure-simulation--${
        isDemoSelected ? status.severity : (liveData?.severity ?? 'information')
      }`}
    >
      {/* Header with dismiss */}
      <header className="failure-simulation__header">
        <div style={{ flex: 1, minWidth: 0 }}>
          <span className="section-eyebrow">
            {isDemoSelected ? 'Automated demo scenario' : 'Live backend detection'}
          </span>
          <h2 style={{ fontSize: 13, marginTop: 4 }}>
            {isDemoSelected ? 'Early-warning failure detection' : (realScenario?.title ?? selectedScenario)}
          </h2>
        </div>

        <span className="simulation-severity">
          <span className="simulation-severity__dot" />
          {isDemoSelected
            ? SEVERITY_LABELS[status.severity]
            : (liveData?.severity ?? 'info')}
        </span>

        <button
          type="button"
          onClick={onDismiss}
          title="Close panel"
          style={{
            width: 24, height: 24, border: '1px solid rgba(148,184,211,0.18)',
            borderRadius: 6, background: 'rgba(255,255,255,0.04)',
            color: '#7894a9', cursor: 'pointer', fontSize: 11, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          ✕
        </button>
      </header>

      {/* Scenario selector */}
      <div style={{
        padding: '8px 15px 10px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        gap: 5,
      }}>
        <span style={{ fontSize: 7, color: '#7894a9', fontWeight: 750, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Scenario
        </span>
        <select
          value={selectedScenario}
          onChange={(e) => {
            onSelectScenario(e.target.value)
            if (e.target.value === 'DEMO') onReset()
          }}
          style={{
            background: 'rgba(13,29,46,0.9)',
            border: '1px solid rgba(56,189,248,0.22)',
            borderRadius: 7,
            color: '#dff5ff',
            fontSize: 11,
            padding: '6px 10px',
            cursor: 'pointer',
            width: '100%',
          }}
        >
          <option value="DEMO">Demo: Airflow Restriction</option>
          {scenarios.length > 0 && (
            <optgroup label="Detected by backend">
              {scenarios.map((s) => (
                <option key={s.type} value={s.type}>
                  {s.label} ({s.count} alert{s.count !== 1 ? 's' : ''})
                </option>
              ))}
            </optgroup>
          )}
          {scenarios.length === 0 && (
            <option disabled value="">— No backend alerts detected —</option>
          )}
        </select>
      </div>

      {/* Real anomaly view */}
      {!isDemoSelected && realScenario && (
        <div style={{ padding: '13px 15px' }}>
          <span style={{
            display: 'inline-block', fontSize: 7, fontWeight: 850,
            textTransform: 'uppercase', letterSpacing: '0.12em',
            color: SEV_COLOR[liveData?.severity ?? 'info'] ?? '#38bdf8',
            marginBottom: 6,
          }}>
            {liveData?.severity ?? 'info'}
          </span>
          <h3 style={{ fontSize: 12, lineHeight: 1.3, margin: '0 0 6px' }}>{realScenario.title}</h3>
          <p style={{ margin: 0, color: '#9bb1c0', fontSize: 9, lineHeight: 1.48 }}>
            {realScenario.narrative}
          </p>

          {liveData?.sample && (
            <div style={{
              marginTop: 10, padding: '8px 10px',
              border: '1px solid rgba(148,184,211,0.12)',
              borderLeft: `3px solid ${SEV_COLOR[liveData.severity] ?? '#38bdf8'}`,
              borderRadius: 7, background: 'rgba(255,255,255,0.022)',
            }}>
              <div style={{ fontSize: 8, color: '#7894a9', marginBottom: 3 }}>Latest sample</div>
              <div style={{ fontSize: 9, fontWeight: 600, marginBottom: 2 }}>
                {liveData.sample.device_name}
              </div>
              <div style={{ fontSize: 8, color: '#9bb1c0', lineHeight: 1.4 }}>
                {liveData.sample.message}
              </div>
              <div style={{ fontSize: 7, color: '#5a7a8c', marginTop: 4 }}>
                {liveData.sample.timestamp?.slice(0, 16)?.replace('T', ' ')}
              </div>
            </div>
          )}

          {liveData && (
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 10,
            }}>
              <div style={{
                padding: '8px', border: '1px solid rgba(148,184,211,0.09)',
                borderRadius: 8, background: 'rgba(255,255,255,0.022)',
              }}>
                <div style={{ fontSize: 7, color: '#7894a9', marginBottom: 3 }}>Alerts found</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: SEV_COLOR[liveData.severity] ?? '#38bdf8' }}>
                  {liveData.count}
                </div>
              </div>
              <div style={{
                padding: '8px', border: '1px solid rgba(148,184,211,0.09)',
                borderRadius: 8, background: 'rgba(255,255,255,0.022)',
              }}>
                <div style={{ fontSize: 7, color: '#7894a9', marginBottom: 3 }}>Severity</div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: SEV_COLOR[liveData.severity] ?? '#38bdf8' }}>
                  {liveData.severity}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Demo simulation */}
      {isDemoSelected && (
        <>
          <div className="simulation-controls">
            {!isComplete && (
              <button type="button" className="simulation-play-button" onClick={onStepToNextPhase}>
                <span className="simulation-play-button__icon">▶</span>
                Next stage
              </button>
            )}
            {hasStarted && (
              <button type="button" className="simulation-control-button simulation-control-button--quiet" onClick={onReset}>
                Reset
              </button>
            )}
          </div>

          <div className="simulation-progress">
            <div className="simulation-progress__labels">
              <span>{formatTime(status.elapsedSeconds)}</span>
              <span>{formatTime(status.durationSeconds)}</span>
            </div>
            <div className="simulation-progress__track">
              <span style={{ width: `${status.progressPct}%` }} />
            </div>
          </div>

          <article className="simulation-story">
            <span className="simulation-story__phase">{status.phase.replaceAll('-', ' ')}</span>
            <h3>{status.title}</h3>
            <p>{status.narrative}</p>
          </article>

          {status.detectionConfidencePct > 0 && (
            <div className="simulation-kpi-row">
              <article>
                <span>Model confidence</span>
                <strong>{status.detectionConfidencePct}%</strong>
              </article>
              <article>
                <span>Readiness delay</span>
                <strong>
                  {status.predictedReadinessDelayMinutes}
                  <small> min</small>
                </strong>
              </article>
              <article>
                <span>Target</span>
                <strong>{status.targetRoomId ?? 'Campus'}</strong>
              </article>
            </div>
          )}

          <div className="simulation-evidence">
            {status.evidence.map((item) => (
              <article
                className={`simulation-evidence__row simulation-evidence__row--${item.state}`}
                key={item.label}
              >
                <div>
                  <strong>{item.label}</strong>
                  <span>Expected {item.expected}</span>
                </div>
                <b>{item.observed}</b>
              </article>
            ))}
          </div>

          {status.recommendedAction && (
            <article className="simulation-action-card">
              <span>Recommended technician action</span>
              <p>{status.recommendedAction}</p>
            </article>
          )}

          {status.mitigationAction && (
            <article className="simulation-mitigation-card">
              <span>HeatSync safe response</span>
              <p>{status.mitigationAction}</p>
            </article>
          )}

          {status.log.length > 0 && (
            <details className="simulation-log" open={status.severity === 'critical'}>
              <summary>Incident timeline ({status.log.length})</summary>
              <div className="simulation-log__entries">
                {[...status.log].reverse().map((entry) => (
                  <article
                    className={`simulation-log-entry simulation-log-entry--${entry.type}`}
                    key={`${entry.second}-${entry.title}`}
                  >
                    <time>+{entry.second.toString().padStart(2, '0')}s</time>
                    <div>
                      <strong>{entry.title}</strong>
                      <p>{entry.detail}</p>
                    </div>
                  </article>
                ))}
              </div>
            </details>
          )}
        </>
      )}
    </section>
  )
}
