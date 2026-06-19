import type { SimulationSpeed } from '../../hooks/useFailureSimulation'
import type {
  FailureSimulationStatus,
  SimulationSeverity,
} from '../../simulation/types'

interface FailureSimulationPanelProps {
  status: FailureSimulationStatus
  isRunning: boolean
  isPaused: boolean
  speed: SimulationSpeed
  onSpeedChange: (speed: SimulationSpeed) => void
  onPlay: () => void
  onPause: () => void
  onResume: () => void
  onRestart: () => void
  onReset: () => void
}

const SEVERITY_LABELS: Record<
  SimulationSeverity,
  string
> = {
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
  isRunning,
  isPaused,
  speed,
  onSpeedChange,
  onPlay,
  onPause,
  onResume,
  onRestart,
  onReset,
}: FailureSimulationPanelProps) {
  const hasStarted = status.elapsedSeconds > 0
  const isComplete = status.phase === 'complete'

  return (
    <section
      className={`failure-simulation glass-panel failure-simulation--${status.severity}`}
    >
      <header className="failure-simulation__header">
        <div>
          <span className="section-eyebrow">
            Automated demo scenario
          </span>
          <h2>Early-warning failure detection</h2>
        </div>

        <span className="simulation-severity">
          <span className="simulation-severity__dot" />
          {SEVERITY_LABELS[status.severity]}
        </span>
      </header>

      <div className="simulation-controls">
        {!isRunning && !isPaused && !hasStarted && (
          <button
            type="button"
            className="simulation-play-button"
            onClick={onPlay}
          >
            <span className="simulation-play-button__icon">
              ▶
            </span>
            Run demo
          </button>
        )}

        {isRunning && !isPaused && (
          <button
            type="button"
            className="simulation-control-button"
            onClick={onPause}
          >
            ❚❚ Pause
          </button>
        )}

        {isPaused && (
          <button
            type="button"
            className="simulation-control-button"
            onClick={onResume}
          >
            ▶ Resume
          </button>
        )}

        {(hasStarted || isComplete) && (
          <button
            type="button"
            className="simulation-control-button"
            onClick={onRestart}
          >
            ↻ Restart
          </button>
        )}

        {hasStarted && (
          <button
            type="button"
            className="simulation-control-button simulation-control-button--quiet"
            onClick={onReset}
          >
            Reset
          </button>
        )}

        <div className="simulation-speed-control">
          {[1, 2, 4].map((option) => (
            <button
              type="button"
              key={option}
              className={
                speed === option
                  ? 'simulation-speed-button simulation-speed-button--active'
                  : 'simulation-speed-button'
              }
              onClick={() =>
                onSpeedChange(option as SimulationSpeed)
              }
            >
              {option}×
            </button>
          ))}
        </div>
      </div>

      <div className="simulation-progress">
        <div className="simulation-progress__labels">
          <span>{formatTime(status.elapsedSeconds)}</span>
          <span>
            {formatTime(status.durationSeconds)}
          </span>
        </div>
        <div className="simulation-progress__track">
          <span
            style={{
              width: `${status.progressPct}%`,
            }}
          />
        </div>
      </div>

      <article className="simulation-story">
        <span className="simulation-story__phase">
          {status.phase.replaceAll('-', ' ')}
        </span>
        <h3>{status.title}</h3>
        <p>{status.narrative}</p>
      </article>

      {status.detectionConfidencePct > 0 && (
        <div className="simulation-kpi-row">
          <article>
            <span>Model confidence</span>
            <strong>
              {status.detectionConfidencePct}%
            </strong>
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
            <strong>
              {status.targetRoomId ?? 'Campus'}
            </strong>
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
        <details
          className="simulation-log"
          open={status.severity === 'critical'}
        >
          <summary>
            Incident timeline ({status.log.length})
          </summary>

          <div className="simulation-log__entries">
            {[...status.log]
              .reverse()
              .map((entry) => (
                <article
                  className={`simulation-log-entry simulation-log-entry--${entry.type}`}
                  key={`${entry.second}-${entry.title}`}
                >
                  <time>
                    +{entry.second.toString().padStart(2, '0')}s
                  </time>
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
