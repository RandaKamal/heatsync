export type AppView = 'customer' | 'service' | 'profile'

interface TopBarProps {
  view: AppView
  onViewChange: (v: AppView) => void
  onBadgesClick: () => void
  onOptimizeClick: () => void
  onTechnicianClick: () => void
  alertCount: number
  notificationCount: number
  backendConnected: boolean
}

export function TopBar({
  view,
  onViewChange,
  onBadgesClick,
  onOptimizeClick,
  onTechnicianClick,
  alertCount,
  notificationCount,
  backendConnected,
}: TopBarProps) {
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
          <div className="brand__subtitle">IHL Climate Intelligence · LB Energy</div>
        </div>
      </div>

      {/* Centre: view toggle + actions */}
      <div className="top-bar__centre">
        <div className="view-toggle">
          <button
            type="button"
            className={`view-toggle__btn ${view === 'customer' ? 'view-toggle__btn--active' : ''}`}
            onClick={() => onViewChange('customer')}
          >
            Customer View
          </button>
          <button
            type="button"
            className={`view-toggle__btn view-toggle__btn--service ${view === 'service' ? 'view-toggle__btn--active' : ''}`}
            onClick={() => onViewChange('service')}
          >
            LB Energy Service
          </button>
          <button
            type="button"
            className={`view-toggle__btn ${view === 'profile' ? 'view-toggle__btn--active' : ''}`}
            onClick={() => onViewChange('profile')}
          >
            Building Profile
          </button>
        </div>

        <div className="top-bar__actions">
          {view === 'customer' && (
            <button type="button" className="topbar-btn topbar-btn--optimize" onClick={onOptimizeClick}>
              <span>⚡</span> Optimize Schedule
            </button>
          )}
          {view === 'customer' && (
            <button
              type="button"
              className={`topbar-btn topbar-btn--tech ${alertCount > 0 ? 'topbar-btn--alert' : ''}`}
              onClick={onTechnicianClick}
            >
              <span>🔧</span> Technician
              {alertCount > 0 && <span className="topbar-alert-dot">{alertCount}</span>}
            </button>
          )}
          {view === 'service' && (
            <button
              type="button"
              className={`topbar-btn topbar-btn--tech ${notificationCount > 0 ? 'topbar-btn--alert' : ''}`}
              onClick={onTechnicianClick}
            >
              <span>🔔</span> Notifications
              {notificationCount > 0 && <span className="topbar-alert-dot">{notificationCount}</span>}
            </button>
          )}
        </div>
      </div>

      {/* Right: connection + badges */}
      <div className="top-bar__status">
        <div className="backend-indicator" title={backendConnected ? 'Backend connected' : 'Backend offline — using demo data'}>
          <span className={`backend-dot ${backendConnected ? 'backend-dot--on' : 'backend-dot--off'}`} />
          <span className="backend-label">{backendConnected ? 'Live' : 'Demo'}</span>
        </div>
        <button type="button" className="badges-button" onClick={onBadgesClick}>
          <span className="badges-button__icon">🏆</span>
          Savings
        </button>
      </div>
    </header>
  )
}
