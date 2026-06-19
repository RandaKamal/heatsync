import type { ClimateDevice } from '../../types/campus'
import {
  MODE_LABELS,
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
  return `${hours} h ${remainingMinutes} min`
}

export function DeviceCard({
  device,
  onClose,
}: DeviceCardProps) {
  const statusColor = STATUS_COLORS[device.status]

  return (
    <article
      className="device-card device-card--compact"
      onPointerDown={(event) => event.stopPropagation()}
    >
      <header className="device-card__header">
        <div>
          <div className="device-card__eyebrow">
            {device.model ?? TECHNOLOGY_LABELS[device.technology]}
          </div>
          <h2>{device.name}</h2>
          <div className="device-card__status" style={{ color: statusColor }}>
            <span
              className="status-dot"
              style={{ background: statusColor }}
            />
            {STATUS_LABELS[device.status]} ·{' '}
            {MODE_LABELS[device.operatingMode]}
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
          <span>Power now</span>
          <strong>{device.currentPowerKw.toFixed(1)} kW</strong>
        </div>
        <div className="device-metric">
          <span>Energy today</span>
          <strong>{device.energyTodayKwh.toFixed(1)} kWh</strong>
        </div>
        <div className="device-metric">
          <span>Runtime</span>
          <strong>{formatRuntime(device.runtimeTodayMinutes)}</strong>
        </div>
        <div className="device-metric">
          <span>{device.efficiencyCop ? 'Current COP' : 'Setpoint'}</span>
          <strong>
            {device.efficiencyCop
              ? device.efficiencyCop.toFixed(2)
              : `${device.setpointCelsius.toFixed(1)}°C`}
          </strong>
        </div>
      </div>

      {device.airflowM3h && (
        <div className="device-card__quick-row">
          <span>Airflow {device.airflowM3h.toLocaleString()} m³/h</span>
          <span>Fresh air {device.freshAirRatioPct}%</span>
        </div>
      )}

      {device.alert && (
        <section className="device-alert">
          <div className="device-alert__title">Attention required</div>
          <p>{device.alert}</p>
        </section>
      )}

      <footer className="device-card__footer device-card__footer--stacked">
        <strong>Full graphs and diagnostics are open in the right panel.</strong>
        <span>Updated {device.lastUpdated}</span>
      </footer>
    </article>
  )
}
