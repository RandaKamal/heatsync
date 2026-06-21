interface OptimizeSuggestion {
  moveEventId: string
  moveEventTitle: string
  fromRoomId: string
  fromRoomName: string
  toRoomId: string
  toRoomName: string
  eventStart: string
  eventEnd: string
  combinedStudents: number
  toRoomCapacity: number
  reason: string
  savings: {
    kwh: number
    eur: number
    co2_kg: number
    overlapMinutes: number
  }
}

interface OptimizeModalProps {
  suggestion: OptimizeSuggestion | null
  loading: boolean
  onAccept: (suggestion: OptimizeSuggestion) => void
  onReject: () => void
  onClose: () => void
}

export type { OptimizeSuggestion }

export function OptimizeModal({ suggestion, loading, onAccept, onReject, onClose }: OptimizeModalProps) {
  return (
    <div className="opt-overlay" onClick={onClose}>
      <div className="opt-modal glass-panel" onClick={(e) => e.stopPropagation()}>
        <div className="opt-header">
          <div>
            <span className="section-eyebrow">Schedule intelligence</span>
            <h2 className="opt-title">⚡ Optimize Schedule</h2>
          </div>
          <button type="button" className="pokes-close" onClick={onClose}>×</button>
        </div>

        {loading && (
          <div className="opt-loading">
            <span className="opt-spinner" />
            Analysing schedule…
          </div>
        )}

        {!loading && !suggestion && (
          <div className="opt-empty">
            <span className="opt-empty__icon">✅</span>
            <p>Schedule is already well consolidated. No room-merge opportunity found for the current events.</p>
          </div>
        )}

        {!loading && suggestion && (
          <>
            <div className="opt-move-card">
              <div className="opt-move-card__from">
                <span className="section-eyebrow">Move event from</span>
                <strong>{suggestion.fromRoomName}</strong>
              </div>
              <span className="opt-arrow">→</span>
              <div className="opt-move-card__to">
                <span className="section-eyebrow">Into</span>
                <strong>{suggestion.toRoomName}</strong>
              </div>
            </div>

            <div className="opt-event-info">
              <div className="opt-event-label">
                <span className="section-eyebrow">Event to move</span>
                <strong>{suggestion.moveEventTitle}</strong>
                <span>{suggestion.eventStart} – {suggestion.eventEnd}</span>
              </div>
              <div className="opt-capacity-pill">
                {suggestion.combinedStudents} / {suggestion.toRoomCapacity} seats
              </div>
            </div>

            <p className="opt-reason">{suggestion.reason}</p>

            <div className="opt-savings-row">
              <article className="opt-saving">
                <span>Energy saved</span>
                <strong>{suggestion.savings.kwh} kWh</strong>
              </article>
              <article className="opt-saving">
                <span>Cost saved</span>
                <strong>€{suggestion.savings.eur.toFixed(2)}</strong>
              </article>
              <article className="opt-saving">
                <span>CO₂ avoided</span>
                <strong>{suggestion.savings.co2_kg} kg</strong>
              </article>
            </div>

            <div className="opt-actions">
              <button
                type="button"
                className="opt-btn opt-btn--reject"
                onClick={onReject}
              >
                ✕ Reject
              </button>
              <button
                type="button"
                className="opt-btn opt-btn--accept"
                onClick={() => onAccept(suggestion)}
              >
                ✓ Accept & Apply
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
