import type { ClimateDevice } from '../../types/campus'
import {
  STATUS_COLORS,
  STATUS_LABELS,
  TECHNOLOGY_LABELS,
} from '../../utils/status'

interface DeviceCardProps {
  device: ClimateDevice
  onClose: () => void
}

function formatRuntime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  if (hours === 0) {
    return `${remainingMinutes} min`
  }

  return `${hours} h ${remainingMinutes} min`
}

export function DeviceCard({
  device,
  onClose,
}: DeviceCardProps) {
  const statusColor = STATUS_COLORS[device.status]

  return (
    <article
      className="device-card"
      onPointerDown={(event) => event.stopPropagation()}
    >
      <header className="device-card__header">
        <div>
          <div className="device-card__eyebrow">
            {TECHNOLOGY_LABELS[device.technology]}
          </div>

          <h2>{device.name}</h2>

          <div
            className="device-card__status"
            style={{ color: statusColor }}
          >
            <span
              className="status-dot"
              style={{ background: statusColor }}
            />
            {STATUS_LABELS[device.status]}
          </div>
        </div>

        <button
          type="button"
          className="device-card__close"
          onClick={onClose}
          aria-label="Close device information"
        >
          ×
        </button>
      </header>

      <div className="device-card__metrics">
        <div className="device-metric">
          <span>Current power</span>
          <strong>{device.currentPowerKw.toFixed(1)} kW</strong>
        </div>

        <div className="device-metric">
          <span>Energy today</span>
          <strong>{device.energyTodayKwh.toFixed(1)} kWh</strong>
        </div>

        <div className="device-metric">
          <span>Runtime today</span>
          <strong>{formatRuntime(device.runtimeTodayMinutes)}</strong>
        </div>

        <div className="device-metric">
          <span>{device.efficiencyCop === null ? 'Setpoint' : 'Current COP'}</span>
          <strong>
            {device.efficiencyCop === null
              ? `${device.setpointCelsius.toFixed(1)}°C`
              : device.efficiencyCop.toFixed(1)}
          </strong>
        </div>
      </div>

      <section className="health-section">
        <div className="health-section__heading">
          <span>Equipment health</span>
          <strong>{device.healthScore}%</strong>
        </div>

        <div className="health-bar">
          <div
            className="health-bar__value"
            style={{
              width: `${device.healthScore}%`,
              background: statusColor,
            }}
          />
        </div>
      </section>

      <section className="device-card__section">
        <span className="device-card__label">Serves</span>
        <div className="room-chip-row">
          {device.servedRoomIds.map((roomId) => (
            <span className="room-chip" key={roomId}>
              {roomId}
            </span>
          ))}
        </div>
      </section>

      {device.alert && (
        <section className="device-alert">
          <div className="device-alert__title">
            Detected issue
          </div>
          <p>{device.alert}</p>

          {device.recommendedAction && (
            <>
              <div className="device-alert__title">
                Recommended action
              </div>
              <p>{device.recommendedAction}</p>
            </>
          )}
        </section>
      )}

      <footer className="device-card__footer">
        <span>Last telemetry update</span>
        <strong>{device.lastUpdated}</strong>
      </footer>
    </article>
  )
}
