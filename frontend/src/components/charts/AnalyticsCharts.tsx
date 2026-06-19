import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type {
  BuildingTelemetryPoint,
  ClimateDevice,
  Room,
  RoomLoadHeatmapCell,
  RuntimeHeatmapCell,
} from '../../types/campus'

const tooltipStyle = {
  background: 'rgba(7, 18, 31, 0.96)',
  border: '1px solid rgba(148, 184, 211, 0.2)',
  borderRadius: '10px',
  color: '#eaf4fa',
  fontSize: '11px',
}

export function BuildingPowerChart({
  data,
}: {
  data: BuildingTelemetryPoint[]
}) {
  return (
    <div className="chart-shell chart-shell--large">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="actualPowerFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.42} />
              <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="baselinePowerFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.20} />
              <stop offset="95%" stopColor="#94a3b8" stopOpacity={0.01} />
            </linearGradient>
          </defs>

          <CartesianGrid stroke="rgba(148,184,211,0.09)" vertical={false} />
          <XAxis
            dataKey="time"
            stroke="#6f8ca2"
            tickLine={false}
            axisLine={false}
            fontSize={9}
          />
          <YAxis
            unit=" kW"
            stroke="#6f8ca2"
            tickLine={false}
            axisLine={false}
            fontSize={9}
          />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: '9px', color: '#9fb5c5' }} />

          <Area
            type="monotone"
            dataKey="baselinePowerKw"
            name="Fixed-schedule baseline"
            stroke="#94a3b8"
            strokeDasharray="5 4"
            fill="url(#baselinePowerFill)"
            strokeWidth={1.5}
          />
          <Area
            type="monotone"
            dataKey="actualPowerKw"
            name="HeatSync plan"
            stroke="#38bdf8"
            fill="url(#actualPowerFill)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export function DevicePerformanceChart({
  device,
}: {
  device: ClimateDevice
}) {
  return (
    <div className="chart-shell chart-shell--large">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={device.history}
          margin={{ top: 8, right: 4, left: -16, bottom: 0 }}
        >
          <CartesianGrid stroke="rgba(148,184,211,0.09)" vertical={false} />
          <XAxis
            dataKey="time"
            stroke="#6f8ca2"
            tickLine={false}
            axisLine={false}
            fontSize={9}
          />
          <YAxis
            yAxisId="temperature"
            domain={['dataMin - 1', 'dataMax + 1']}
            unit="°"
            stroke="#6f8ca2"
            tickLine={false}
            axisLine={false}
            fontSize={9}
          />
          <YAxis
            yAxisId="power"
            orientation="right"
            unit=" kW"
            stroke="#6f8ca2"
            tickLine={false}
            axisLine={false}
            fontSize={9}
          />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: '9px', color: '#9fb5c5' }} />

          <Bar
            yAxisId="power"
            dataKey="powerKw"
            name="Electrical input"
            fill="rgba(56,189,248,0.28)"
            radius={[4, 4, 0, 0]}
            barSize={14}
          />
          <Line
            yAxisId="temperature"
            type="monotone"
            dataKey="indoorTempC"
            name="Observed room temperature"
            stroke="#2dd4bf"
            strokeWidth={2.4}
            dot={false}
          />
          <Line
            yAxisId="temperature"
            type="stepAfter"
            dataKey="targetTempC"
            name="Target"
            stroke="#f59e0b"
            strokeDasharray="5 4"
            strokeWidth={1.5}
            dot={false}
          />
          <Line
            yAxisId="temperature"
            type="monotone"
            dataKey="outdoorTempC"
            name="Outdoor"
            stroke="#94a3b8"
            strokeWidth={1.3}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

export function OccupancyChart({ rooms }: { rooms: Room[] }) {
  const data = rooms.map((room) => ({
    room: room.id,
    students: room.occupancy,
    expected: room.forecastOccupancy,
  }))

  return (
    <div className="chart-shell">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, left: -24, bottom: 0 }}>
          <CartesianGrid stroke="rgba(148,184,211,0.09)" vertical={false} />
          <XAxis
            dataKey="room"
            stroke="#6f8ca2"
            tickLine={false}
            axisLine={false}
            fontSize={9}
          />
          <YAxis
            stroke="#6f8ca2"
            tickLine={false}
            axisLine={false}
            fontSize={9}
          />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: '9px', color: '#9fb5c5' }} />
          <Bar
            dataKey="expected"
            name="Expected"
            fill="rgba(148,163,184,0.24)"
            radius={[3, 3, 0, 0]}
          />
          <Bar
            dataKey="students"
            name="Current"
            fill="#38bdf8"
            radius={[3, 3, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function RuntimeHeatmap({
  data,
}: {
  data: RuntimeHeatmapCell[]
}) {
  const days = [...new Set(data.map((cell) => cell.day))]
  const hours = [...new Set(data.map((cell) => cell.hour))]

  return (
    <div
      className="heatmap-grid"
      style={{
        gridTemplateColumns: `42px repeat(${hours.length}, minmax(20px, 1fr))`,
      }}
    >
      <span />
      {hours.map((hour) => (
        <span className="heatmap-axis" key={hour}>
          {hour}
        </span>
      ))}

      {days.map((day) => (
        <div className="heatmap-row" key={day}>
          <span className="heatmap-day">{day}</span>
          {hours.map((hour) => {
            const cell = data.find(
              (candidate) =>
                candidate.day === day && candidate.hour === hour,
            )
            const value = cell?.runtimePct ?? 0
            const alpha = 0.08 + value / 100 * 0.82

            return (
              <span
                key={`${day}-${hour}`}
                className="heatmap-cell"
                title={`${day} ${hour}:00 · ${value}% runtime`}
                style={{
                  background: `rgba(56, 189, 248, ${alpha})`,
                }}
              />
            )
          })}
        </div>
      ))}
    </div>
  )
}

export function RoomLoadHeatmap({
  data,
}: {
  data: RoomLoadHeatmapCell[]
}) {
  const rooms = [...new Set(data.map((cell) => cell.roomId))]
  const times = [...new Set(data.map((cell) => cell.time))]

  return (
    <div
      className="heatmap-grid"
      style={{
        gridTemplateColumns: `42px repeat(${times.length}, minmax(24px, 1fr))`,
      }}
    >
      <span />
      {times.map((time) => (
        <span className="heatmap-axis" key={time}>
          {time}
        </span>
      ))}

      {rooms.map((roomId) => (
        <div className="heatmap-row" key={roomId}>
          <span className="heatmap-day">{roomId}</span>
          {times.map((time) => {
            const cell = data.find(
              (candidate) =>
                candidate.roomId === roomId && candidate.time === time,
            )
            const value = cell?.loadPct ?? 0
            const hue =
              value > 80
                ? '245, 158, 11'
                : value > 55
                  ? '56, 189, 248'
                  : '45, 212, 191'
            const alpha = 0.10 + value / 100 * 0.76

            return (
              <span
                key={`${roomId}-${time}`}
                className="heatmap-cell"
                title={`${roomId} at ${time}:00 · ${value}% predicted climate load`}
                style={{
                  background: `rgba(${hue}, ${alpha})`,
                }}
              />
            )
          })}
        </div>
      ))}
    </div>
  )
}
