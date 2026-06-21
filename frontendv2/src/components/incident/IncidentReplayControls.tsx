import { STAGE_LABELS } from '../../simulation/incident/incidentScenario'
import type { FaultSimulationStage } from '../../simulation/incident/incidentTypes'

interface IncidentReplayControlsProps {
  currentStage: FaultSimulationStage
  stageIndex: number
  stageCount: number
  playing: boolean
  speed: 1 | 2
  presenterCuesOn: boolean
  onClose: () => void
  controls: {
    play: () => void
    pause: () => void
    next: () => void
    previous: () => void
    reset: () => void
    replay: () => void
    setSpeed: (speed: 1 | 2) => void
    togglePresenterCues: () => void
  }
}

export function IncidentReplayControls({
  currentStage,
  stageIndex,
  stageCount,
  playing,
  speed,
  presenterCuesOn,
  onClose,
  controls,
}: IncidentReplayControlsProps) {
  const isFirstStage = stageIndex === 0
  const isLastStage = stageIndex === stageCount - 1

  return (
    <div className="incident-controls glass-panel">
      <div className="incident-controls__row">
        <span className="section-eyebrow">Fault simulation &amp; incident replay</span>
        <button type="button" className="pokes-close" onClick={onClose} title="Close" style={{ marginLeft: 'auto' }}>
          ×
        </button>
      </div>
      <div className="incident-controls__row">
        <span className="incident-controls__stage-label">
          Stage {stageIndex + 1}/{stageCount} · {STAGE_LABELS[currentStage]}
        </span>
      </div>
      <div className="incident-controls__row">
        <button
          type="button"
          className="incident-btn"
          onClick={playing ? controls.pause : controls.play}
        >
          {playing ? '⏸ Pause' : '▶ Play'}
        </button>
        <button type="button" className="incident-btn" onClick={controls.previous} disabled={isFirstStage}>
          ⏮ Prev
        </button>
        <button type="button" className="incident-btn" onClick={controls.next} disabled={isLastStage}>
          Next ⏭
        </button>
        <button type="button" className="incident-btn" onClick={controls.reset}>
          ⟲ Reset
        </button>
        <button type="button" className="incident-btn" onClick={controls.replay}>
          ↻ Replay
        </button>
        <div className="incident-controls__speed">
          <button
            type="button"
            className={`incident-btn${speed === 1 ? ' incident-btn--active' : ''}`}
            onClick={() => controls.setSpeed(1)}
          >
            1×
          </button>
          <button
            type="button"
            className={`incident-btn${speed === 2 ? ' incident-btn--active' : ''}`}
            onClick={() => controls.setSpeed(2)}
          >
            2×
          </button>
        </div>
      </div>
      <div className="incident-controls__row">
        <button
          type="button"
          className={`incident-btn${presenterCuesOn ? ' incident-btn--active' : ''}`}
          onClick={controls.togglePresenterCues}
        >
          🎙 Presenter cues {presenterCuesOn ? 'on' : 'off'}
        </button>
      </div>
    </div>
  )
}
