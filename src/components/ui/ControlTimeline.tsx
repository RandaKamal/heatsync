import type { PlannedAction } from '../../types/campus'

interface ControlTimelineProps {
  actions: PlannedAction[]
}

export function ControlTimeline({
  actions,
}: ControlTimelineProps) {
  return (
    <section className="control-timeline glass-panel">
      <div className="timeline-heading">
        <span className="section-eyebrow">
          Predictive control
        </span>
        <strong>Next planned actions</strong>
      </div>

      <div className="timeline-actions">
        {actions.map((action) => (
          <article
            className={`timeline-action timeline-action--${action.type}`}
            key={action.id}
          >
            <time>{action.time}</time>

            <div>
              <strong>{action.location}</strong>
              <span>{action.label}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
