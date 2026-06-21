export function FleetLearningCard() {
  const stages = [
    { icon: '🏗️', label: 'Site calibration', desc: 'Each building runs a calibration sequence to fit local thermal parameters.' },
    { icon: '📊', label: 'Data collection', desc: 'Sensor data accumulates over time, improving the site model with real-world observations.' },
    { icon: '🔄', label: 'Model refinement', desc: 'In a future integration, aggregated data from similar buildings could refine archetype defaults.' },
    { icon: '🎯', label: 'Improved predictions', desc: 'More accurate lead time predictions could reduce energy waste and improve occupant comfort.' },
  ]

  return (
    <div className="fleet-card glass-panel">
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
        <span className="section-eyebrow">Future capability</span>
        <h3 style={{ margin: '4px 0 0', fontSize: 14, fontWeight: 700 }}>
          How profiles improve over time
        </h3>
        <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--muted)' }}>
          Site-level calibration is active today. The stages below describe how this could evolve
          with fleet-level data — not a current feature.
        </p>
      </div>

      <div style={{ padding: '16px' }}>
        <div className="fleet-diagram">
          {stages.map((stage, idx) => (
            <div key={idx} className="fleet-diagram__step">
              <div className="fleet-diagram__icon">{stage.icon}</div>
              <div className="fleet-diagram__info">
                <div className="fleet-diagram__label">{stage.label}</div>
                <div className="fleet-diagram__desc">{stage.desc}</div>
              </div>
              {idx < stages.length - 1 && (
                <div className="fleet-diagram__arrow">→</div>
              )}
            </div>
          ))}
        </div>

        <div style={{
          marginTop: 14,
          padding: '10px 12px',
          border: '1px solid rgba(56,189,248,0.12)',
          borderRadius: 8,
          background: 'rgba(56,189,248,0.04)',
          fontSize: 10,
          color: 'var(--muted)',
          lineHeight: 1.55,
        }}>
          <strong style={{ color: '#7dd3fc' }}>Note:</strong> The site calibration feature is operational.
          Fleet-level learning and cross-building parameter sharing are conceptual future integrations
          that would require additional data infrastructure and privacy considerations.
          All energy savings shown are demo estimates based on the thermal model.
        </div>
      </div>
    </div>
  )
}
