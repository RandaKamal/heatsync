export function TopBar() {
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
          <div className="brand__subtitle">
            3D building climate intelligence
          </div>
        </div>
      </div>

      <div className="top-bar__status">
        <div className="simulation-time">
          <span>Simulation time</span>
          <strong>06:42</strong>
        </div>

        <div className="live-badge">
          <span className="live-badge__dot" />
          HeatSync live replay
        </div>
      </div>
    </header>
  )
}
