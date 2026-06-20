import {
  BuildingPowerChart,
  DevicePerformanceChart,
  OccupancyChart,
  RoomLoadHeatmap,
  RuntimeHeatmap,
} from '../charts/AnalyticsCharts'
import type {
  BuildingTelemetryPoint,
  ClimateDevice,
  ControlDecision,
  Room,
  RoomEvent,
  RoomLoadHeatmapCell,
  WeatherForecastPoint,
} from '../../types/campus'
import type { DeviceImpact } from '../../api/client'
import {
  MODE_LABELS,
  STATUS_COLORS,
  STATUS_LABELS,
  TECHNOLOGY_ABBREVIATIONS,
  TECHNOLOGY_LABELS,
} from '../../utils/status'

interface CampusSidebarProps {
  rooms: Room[]
  devices: ClimateDevice[]
  selectedDeviceId: string | null
  buildingTelemetry: BuildingTelemetryPoint[]
  weatherForecast: WeatherForecastPoint[]
  roomEvents: RoomEvent[]
  controlDecisions: ControlDecision[]
  roomLoadHeatmap: RoomLoadHeatmapCell[]
  impactByDevice: DeviceImpact[]
  onSelectDevice: (deviceId: string) => void
  onClearSelection: () => void
}

function formatRuntime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return `${hours} h ${remainingMinutes} min`
}

function statusClass(
  status: ControlDecision['status'],
): string {
  return `decision-status decision-status--${status}`
}

export function CampusSidebar({
  rooms,
  devices,
  selectedDeviceId,
  buildingTelemetry,
  weatherForecast,
  roomEvents,
  controlDecisions,
  roomLoadHeatmap,
  impactByDevice,
  onSelectDevice,
  onClearSelection,
}: CampusSidebarProps) {
  const selectedDevice =
    devices.find(
      (device) => device.id === selectedDeviceId,
    ) ?? null

  if (selectedDevice) {
    const statusColor = STATUS_COLORS[selectedDevice.status]
    const servedRooms = rooms.filter((room) =>
      selectedDevice.servedRoomIds.includes(room.id),
    )
    // Match backend device UUID by name ("Device 1" → find in impactByDevice)
    const impact = impactByDevice.find(
      (d) => d.device_name === selectedDevice.name || d.device_id === selectedDevice.id,
    ) ?? impactByDevice[0] ?? null

    return (
      <aside className="analytics-sidebar glass-panel">
        <div className="analytics-sidebar__sticky-header">
          <button
            type="button"
            className="back-button"
            onClick={onClearSelection}
          >
            ← Building overview
          </button>

          <div className="device-panel-heading">
            <div>
              <span className="section-eyebrow">
                {selectedDevice.model ??
                  TECHNOLOGY_LABELS[selectedDevice.technology]}
              </span>
              <h2>{selectedDevice.name}</h2>
              <div
                className="device-panel-heading__status"
                style={{ color: statusColor }}
              >
                <span
                  className="status-dot"
                  style={{ background: statusColor }}
                />
                {STATUS_LABELS[selectedDevice.status]} ·{' '}
                {MODE_LABELS[selectedDevice.operatingMode]}
              </div>
            </div>

            <div
              className="health-orb"
              style={{
                borderColor: statusColor,
                color: statusColor,
              }}
            >
              <strong>{selectedDevice.healthScore}</strong>
              <span>health</span>
            </div>
          </div>
        </div>

        <section className="analytics-section">
          <div className="metric-grid metric-grid--four">
            <article className="analytics-metric">
              <span>Power now</span>
              <strong>
                {selectedDevice.currentPowerKw.toFixed(1)}
                <small> kW</small>
              </strong>
            </article>
            <article className="analytics-metric">
              <span>Energy today</span>
              <strong>
                {selectedDevice.energyTodayKwh.toFixed(1)}
                <small> kWh</small>
              </strong>
            </article>
            <article className="analytics-metric">
              <span>Runtime</span>
              <strong>{formatRuntime(selectedDevice.runtimeTodayMinutes)}</strong>
            </article>
            <article className="analytics-metric">
              <span>
                {selectedDevice.efficiencyCop
                  ? 'Current COP'
                  : 'Setpoint'}
              </span>
              <strong>
                {selectedDevice.efficiencyCop
                  ? selectedDevice.efficiencyCop.toFixed(2)
                  : `${selectedDevice.setpointCelsius.toFixed(1)}°`}
              </strong>
            </article>
          </div>
        </section>

        {impact && (
          <section className="analytics-section">
            <div className="analytics-section__heading">
              <div>
                <span className="section-eyebrow">Cumulative savings</span>
                <h3>Energy · Cost · CO₂</h3>
              </div>
            </div>
            <div className="metric-grid metric-grid--four" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
              <article className="analytics-metric">
                <span>Energy saved</span>
                <strong>{impact.energy_saved_kwh.toFixed(0)}<small> kWh</small></strong>
              </article>
              <article className="analytics-metric">
                <span>Cost saved</span>
                <strong>€{impact.cost_saved_eur.toFixed(0)}</strong>
              </article>
              <article className="analytics-metric">
                <span>CO₂ avoided</span>
                <strong>{impact.co2_saved_kg.toFixed(0)}<small> kg</small></strong>
              </article>
            </div>
          </section>
        )}

        <section className="analytics-section">
          <div className="analytics-section__heading">
            <div>
              <span className="section-eyebrow">
                Performance timeline
              </span>
              <h3>Temperature and electricity input</h3>
            </div>
            <span className="data-badge">15 min</span>
          </div>
          <DevicePerformanceChart device={selectedDevice} />
        </section>

        <section className="analytics-section">
          <div className="analytics-section__heading">
            <div>
              <span className="section-eyebrow">
                Weekly utilisation
              </span>
              <h3>Runtime heat map</h3>
            </div>
          </div>
          <RuntimeHeatmap data={selectedDevice.runtimeHeatmap} />
          <div className="heatmap-legend">
            <span>Low</span>
            <span className="heatmap-scale" />
            <span>High</span>
          </div>
        </section>

        {selectedDevice.technology === 'orion-mobile-rooftop' && (
          <section className="analytics-section">
            <div className="analytics-section__heading">
              <div>
                <span className="section-eyebrow">
                  Current regulation
                </span>
                <h3>Air and capacity control</h3>
              </div>
            </div>

            <div className="control-stat-grid">
              <div>
                <span>Mode</span>
                <strong>
                  {MODE_LABELS[selectedDevice.operatingMode]}
                </strong>
              </div>
              <div>
                <span>Supply airflow</span>
                <strong>
                  {selectedDevice.airflowM3h?.toLocaleString()} m³/h
                </strong>
              </div>
              <div>
                <span>EC fan speed</span>
                <strong>{selectedDevice.supplyFanSpeedPct}%</strong>
              </div>
              <div>
                <span>Fresh-air ratio</span>
                <strong>{selectedDevice.freshAirRatioPct}%</strong>
              </div>
            </div>
          </section>
        )}

        {selectedDevice.alert && (
          <section className="analytics-section">
            <article className="panel-alert">
              <span className="section-eyebrow">Detected issue</span>
              <h3>{selectedDevice.alert}</h3>
              <p>{selectedDevice.recommendedAction}</p>
            </article>
          </section>
        )}

        <section className="analytics-section">
          <div className="analytics-section__heading">
            <div>
              <span className="section-eyebrow">
                Why the device is doing this
              </span>
              <h3>Influencing factors</h3>
            </div>
          </div>

          <div className="factor-list">
            {selectedDevice.influencingFactors.map((factor) => (
              <div className="factor-row" key={factor}>
                <span className="factor-row__marker" />
                <span>{factor}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="analytics-section">
          <div className="analytics-section__heading">
            <div>
              <span className="section-eyebrow">
                Connected spaces
              </span>
              <h3>Rooms served</h3>
            </div>
          </div>

          <div className="served-room-list">
            {servedRooms.map((room) => (
              <article className="served-room-row" key={room.id}>
                <div>
                  <strong>{room.id}</strong>
                  <span>{room.nextEvent}</span>
                </div>
                <div>
                  <strong>
                    {room.currentTemperature.toFixed(1)}° /{' '}
                    {room.targetTemperature.toFixed(0)}°
                  </strong>
                  <span>
                    {room.occupancy} current ·{' '}
                    {room.forecastOccupancy} expected
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="analytics-section">
          <div className="analytics-section__heading">
            <div>
              <span className="section-eyebrow">
                Equipment configuration
              </span>
              <h3>Technical characteristics</h3>
            </div>
          </div>

          <div className="spec-grid">
            {selectedDevice.nominalCoolingCapacityKw && (
              <div>
                <span>Cooling capacity</span>
                <strong>
                  {selectedDevice.nominalCoolingCapacityKw} kW
                </strong>
              </div>
            )}
            {selectedDevice.nominalHeatingCapacityKw && (
              <div>
                <span>Heat-pump capacity</span>
                <strong>
                  {selectedDevice.nominalHeatingCapacityKw} kW
                </strong>
              </div>
            )}
            {selectedDevice.ratedCoolingInputKw && (
              <div>
                <span>Rated cooling input</span>
                <strong>
                  {selectedDevice.ratedCoolingInputKw} kW
                </strong>
              </div>
            )}
            {selectedDevice.ratedHeatingInputKw && (
              <div>
                <span>Rated heating input</span>
                <strong>
                  {selectedDevice.ratedHeatingInputKw} kW
                </strong>
              </div>
            )}
            {selectedDevice.staticPressurePa && (
              <div>
                <span>External static pressure</span>
                <strong>{selectedDevice.staticPressurePa} Pa</strong>
              </div>
            )}
            {selectedDevice.refrigerant && (
              <div>
                <span>Refrigerant</span>
                <strong>{selectedDevice.refrigerant}</strong>
              </div>
            )}
            {selectedDevice.compressorType && (
              <div>
                <span>Compressor</span>
                <strong>{selectedDevice.compressorType}</strong>
              </div>
            )}
            {selectedDevice.controlInterface && (
              <div>
                <span>Connectivity</span>
                <strong>{selectedDevice.controlInterface}</strong>
              </div>
            )}
          </div>

          <div className="feature-chip-row">
            {selectedDevice.features.map((feature) => (
              <span key={feature}>{feature}</span>
            ))}
          </div>
        </section>
      </aside>
    )
  }

  const currentPower = devices.reduce(
    (total, device) => total + device.currentPowerKw,
    0,
  )
  const energyToday = devices.reduce(
    (total, device) => total + device.energyTodayKwh,
    0,
  )
  const totalOccupancy = rooms.reduce(
    (total, room) => total + room.occupancy,
    0,
  )
  const roomsAtRisk = rooms.filter(
    (room) =>
      room.status === 'at-risk' || room.status === 'fault',
  ).length

  return (
    <aside className="analytics-sidebar glass-panel">
      <div className="analytics-sidebar__sticky-header">
        <span className="section-eyebrow">
          Whole-building intelligence
        </span>
        <div className="building-panel-heading">
          <div>
            <h2>Campus operations</h2>
            <p>
              Weather, occupancy, schedules and device behaviour
              combined in one control view.
            </p>
          </div>
          <span className="confidence-badge">
            High confidence
          </span>
        </div>
      </div>

      <section className="analytics-section">
        <div className="metric-grid metric-grid--four">
          <article className="analytics-metric">
            <span>Power now</span>
            <strong>
              {currentPower.toFixed(1)}
              <small> kW</small>
            </strong>
          </article>
          <article className="analytics-metric">
            <span>Energy today</span>
            <strong>
              {energyToday.toFixed(1)}
              <small> kWh</small>
            </strong>
          </article>
          <article className="analytics-metric">
            <span>Students inside</span>
            <strong>{totalOccupancy}</strong>
          </article>
          <article className="analytics-metric analytics-metric--warning">
            <span>Rooms at risk</span>
            <strong>{roomsAtRisk}</strong>
          </article>
        </div>
      </section>

      <section className="analytics-section">
        <div className="analytics-section__heading">
          <div>
            <span className="section-eyebrow">
              Energy trajectory
            </span>
            <h3>HeatSync versus fixed schedule</h3>
          </div>
          <span className="data-badge">Live replay</span>
        </div>
        <BuildingPowerChart data={buildingTelemetry} />
      </section>

      <section className="analytics-section">
        <div className="analytics-section__heading">
          <div>
            <span className="section-eyebrow">
              Weather influence
            </span>
            <h3>Six-hour forecast</h3>
          </div>
          <span className="weather-impact-badge">
            High wind impact
          </span>
        </div>

        <div className="weather-strip">
          {weatherForecast.map((point) => (
            <article className="weather-card" key={point.time}>
              <time>{point.time}</time>
              <strong>{point.temperatureC.toFixed(0)}°</strong>
              <span>{point.condition}</span>
              <small>{point.windKph} km/h wind</small>
            </article>
          ))}
        </div>

        <p className="panel-explanation">
          Cold morning air and wind increase early heat loss.
          Rising solar gain after 08:00 allows later rooms to
          precondition more slowly.
        </p>
      </section>

      <section className="analytics-section">
        <div className="analytics-section__heading">
          <div>
            <span className="section-eyebrow">
              Occupancy
            </span>
            <h3>Current and expected students</h3>
          </div>
        </div>
        <OccupancyChart rooms={rooms} />
      </section>

      <section className="analytics-section">
        <div className="analytics-section__heading">
          <div>
            <span className="section-eyebrow">
              Predicted room demand
            </span>
            <h3>Climate-load heat map</h3>
          </div>
        </div>
        <RoomLoadHeatmap data={roomLoadHeatmap} />
        <div className="heatmap-legend">
          <span>Low load</span>
          <span className="heatmap-scale heatmap-scale--multi" />
          <span>High load</span>
        </div>
      </section>

      <section className="analytics-section">
        <div className="analytics-section__heading">
          <div>
            <span className="section-eyebrow">
              Calendar context
            </span>
            <h3>Upcoming room events</h3>
          </div>
        </div>

        <div className="event-list">
          {roomEvents.map((event) => (
            <article className="event-row" key={event.id}>
              <time>{event.start}</time>
              <div>
                <strong>
                  {event.roomId} · {event.title}
                </strong>
                <span>
                  {event.expectedStudents} students · until{' '}
                  {event.end}
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="analytics-section">
        <div className="analytics-section__heading">
          <div>
            <span className="section-eyebrow">
              Explainable regulation
            </span>
            <h3>Why HeatSync changed the plan</h3>
          </div>
        </div>

        <div className="decision-list">
          {controlDecisions.map((decision) => (
            <article className="decision-row" key={decision.id}>
              <div className="decision-row__top">
                <time>{decision.time}</time>
                <span className={statusClass(decision.status)}>
                  {decision.status}
                </span>
              </div>
              <strong>
                {decision.roomId} · {decision.action}
              </strong>
              <p>{decision.reason}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="analytics-section">
        <div className="analytics-section__heading">
          <div>
            <span className="section-eyebrow">
              Climate technology
            </span>
            <h3>Select a device for diagnostics</h3>
          </div>
        </div>

        <div className="system-list">
          {devices.map((device) => {
            const color = STATUS_COLORS[device.status]

            return (
              <button
                type="button"
                className="system-row"
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
                  {TECHNOLOGY_ABBREVIATIONS[device.technology]}
                </span>

                <span className="system-row__content">
                  <strong>{device.id}</strong>
                  <small>
                    {device.model ??
                      TECHNOLOGY_LABELS[device.technology]}
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
    </aside>
  )
}
