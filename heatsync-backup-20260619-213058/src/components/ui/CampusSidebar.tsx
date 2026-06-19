import type {
  ClimateDevice,
  Room,
} from '../../types/campus'
import {
  STATUS_COLORS,
  STATUS_LABELS,
  TECHNOLOGY_ABBREVIATIONS,
  TECHNOLOGY_LABELS,
} from '../../utils/status'

interface CampusSidebarProps {
  rooms: Room[]
  devices: ClimateDevice[]
  selectedDeviceId: string | null
  onSelectDevice: (deviceId: string) => void
}

export function CampusSidebar({
  rooms,
  devices,
  selectedDeviceId,
  onSelectDevice,
}: CampusSidebarProps) {
  const normalRooms = rooms.filter(
    (room) =>
      room.status === 'normal' ||
      room.status === 'warming',
  ).length

  const roomsAtRisk = rooms.filter(
    (room) =>
      room.status === 'at-risk' ||
      room.status === 'fault',
  ).length

  const currentPower = devices.reduce(
    (total, device) => total + device.currentPowerKw,
    0,
  )

  const energyToday = devices.reduce(
    (total, device) => total + device.energyTodayKwh,
    0,
  )

  return (
    <aside className="campus-sidebar glass-panel">
      <section className="sidebar-section">
        <div className="section-heading">
          <div>
            <span className="section-eyebrow">
              Campus status
            </span>
            <h2>Operations overview</h2>
          </div>

          <span className="confidence-badge">
            High confidence
          </span>
        </div>

        <div className="overview-grid">
          <div className="overview-metric">
            <span>Rooms ready</span>
            <strong>
              {normalRooms}
              <small>/{rooms.length}</small>
            </strong>
          </div>

          <div className="overview-metric overview-metric--warning">
            <span>Require attention</span>
            <strong>{roomsAtRisk}</strong>
          </div>

          <div className="overview-metric">
            <span>Current power</span>
            <strong>
              {currentPower.toFixed(1)}
              <small> kW</small>
            </strong>
          </div>

          <div className="overview-metric">
            <span>Energy today</span>
            <strong>
              {energyToday.toFixed(1)}
              <small> kWh</small>
            </strong>
          </div>
        </div>
      </section>

      <section className="sidebar-section">
        <div className="section-heading section-heading--compact">
          <div>
            <span className="section-eyebrow">
              Technology
            </span>
            <h2>Climate systems</h2>
          </div>

          <span className="system-count">
            {devices.length}
          </span>
        </div>

        <div className="system-list">
          {devices.map((device) => {
            const color = STATUS_COLORS[device.status]
            const isSelected =
              selectedDeviceId === device.id

            return (
              <button
                type="button"
                className={
                  isSelected
                    ? 'system-row system-row--selected'
                    : 'system-row'
                }
                key={device.id}
                onClick={() => onSelectDevice(device.id)}
              >
                <span
                  className="system-row__icon"
                  style={{
                    color,
                    background: `${color}18`,
                    borderColor: `${color}55`,
                  }}
                >
                  {
                    TECHNOLOGY_ABBREVIATIONS[
                      device.technology
                    ]
                  }
                </span>

                <span className="system-row__content">
                  <strong>{device.id}</strong>
                  <small>
                    {TECHNOLOGY_LABELS[device.technology]}
                  </small>
                </span>

                <span className="system-row__data">
                  <strong>
                    {device.currentPowerKw.toFixed(1)} kW
                  </strong>
                  <small style={{ color }}>
                    {STATUS_LABELS[device.status]}
                  </small>
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <section className="sidebar-impact">
        <span className="section-eyebrow">
          Forecast impact today
        </span>

        <div className="impact-row">
          <div>
            <strong>18.4 kWh</strong>
            <span>Energy avoided</span>
          </div>

          <div>
            <strong>23 kW</strong>
            <span>Peak reduction</span>
          </div>
        </div>

        <p>
          Model-estimated against the configured fixed
          preheating schedule.
        </p>
      </section>
    </aside>
  )
}
