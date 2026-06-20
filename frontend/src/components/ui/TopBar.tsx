interface TopBarProps {
  onBadgesClick: () => void
  onOptimizeClick: () => void
  onTechnicianClick: () => void
  alertCount: number
}

export function TopBar({ onBadgesClick, onOptimizeClick, onTechnicianClick, alertCount }: TopBarProps) {
  return (
    <header className="top-bar">
      <div className="brand">
        <div className="brand__symbol">
          <span />
          <span />
          <span />
        </div>
        <div>
          <div className="brand__name">HeatSync</div>
          <div className="brand__subtitle">3D building climate intelligence</div>
        </div>
      </div>

      {/* Centre: action buttons */}
      <div className="top-bar__actions">
        <button type="button" className="topbar-btn topbar-btn--optimize" onClick={onOptimizeClick}>
          <span>⚡</span> Optimize Schedule
        </button>
        <button
          type="button"
          className={`topbar-btn topbar-btn--tech ${alertCount > 0 ? 'topbar-btn--alert' : ''}`}
          onClick={onTechnicianClick}
        >
          <span>🔧</span> Technician
          {alertCount > 0 && <span className="topbar-alert-dot">{alertCount}</span>}
        </button>
      </div>

      {/* Right: time + badges */}
      <div className="top-bar__status">
        <div className="simulation-time">
          <span>Simulation time</span>
          <strong>06:42</strong>
        </div>
        <button type="button" className="badges-button" onClick={onBadgesClick}>
          <span className="badges-button__icon">🏆</span>
          Badges
        </button>
      </div>
    </header>
  )
}
