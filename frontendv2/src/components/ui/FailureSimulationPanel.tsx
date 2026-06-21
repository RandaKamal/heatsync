import type {
  FailureSimulationStatus,
  SimulationSeverity,
} from '../../simulation/types'

interface FailureSimulationPanelProps {
  status: FailureSimulationStatus
  onStepToNextPhase: () => void
  onReset: () => void
  onDismiss: () => void
}

const SEVERITY_LABELS: Record<SimulationSeverity, string> = {
  none: 'Normal',
  information: 'Information',
  warning: 'Watching',
  critical: 'Early warning',
  recovering: 'Recovery',
  resolved: 'Resolved',
}

function formatTime(seconds: number): string {
  return `00:${seconds.toString().padStart(2, '0')}`
}

export function FailureSimulationPanel({
  status,
  onStepToNextPhase,
  onReset,
  onDismiss,
}: FailureSimulationPanelProps) {
  const hasStarted = status.elapsedSeconds > 0
  const isComplete = status.phase === 'complete'

  return (
    <section
      className={`failure-simulation glass-panel failure-simulation--${status.severity}`}
    >
      {/* Header with dismiss */}
      <header className="failure-simulation__header">
        <div style={{ flex: 1, minWidth: 0 }}>
          <span className="section-eyebrow">Automated demo scenario</span>
          <h2 style={{ fontSize: 13, marginTop: 4 }}>Early-warning failure detection</h2>
        </div>

        <span className="simulation-severity">
          <span className="simulation-severity__dot" />
          {SEVERITY_LABELS[status.severity]}
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
    </section>
  )
}
