import type { FloorFilter } from '../../types/campus'

interface TopBarProps {
  activeFloor: FloorFilter
  onFloorChange: (floor: FloorFilter) => void
}

const floorOptions: Array<{
  label: string
  value: FloorFilter
}> = [
  { label: 'All floors', value: 'all' },
  { label: 'Ground', value: 0 },
  { label: 'First floor', value: 1 },
]

export function TopBar({
  activeFloor,
  onFloorChange,
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
          <div className="brand__name">
            IHL TwinGuard
          </div>
          <div className="brand__subtitle">
            Taufkirchen Campus Digital Twin
          </div>
        </div>
      </div>

      <nav
        className="floor-selector"
        aria-label="Select visible building floor"
      >
        {floorOptions.map((option) => (
          <button
            type="button"
            key={String(option.value)}
            className={
              activeFloor === option.value
                ? 'floor-button floor-button--active'
                : 'floor-button'
            }
            onClick={() => onFloorChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </nav>

      <div className="top-bar__status">
        <div className="simulation-time">
          <span>Simulation time</span>
          <strong>06:42</strong>
        </div>

        <div className="live-badge">
          <span className="live-badge__dot" />
          Live replay
        </div>
      </div>
    </header>
  )
}
