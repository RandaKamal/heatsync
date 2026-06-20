import type {
  BuildingTelemetryPoint,
  ClimateDevice,
  ControlDecision,
  DeviceTelemetryPoint,
  OperatingMode,
  PlannedAction,
  Room,
  RoomEvent,
  RoomLoadHeatmapCell,
  RuntimeHeatmapCell,
  WeatherForecastPoint,
} from '../types/campus'

const telemetryTimes = [
  '05:30',
  '05:45',
  '06:00',
  '06:15',
  '06:30',
  '06:45',
  '07:00',
  '07:15',
  '07:30',
]

const outdoorTemperatures = [
  7.2, 7.1, 7.3, 7.6, 8.0, 8.4, 8.9, 9.4, 10.0,
]

function createHistory(
  power: number[],
  indoor: number[],
  occupancy: number[],
  airflow: number[],
  targetTempC = 21,
): DeviceTelemetryPoint[] {
  return telemetryTimes.map((time, index) => ({
    time,
    indoorTempC: indoor[index],
    targetTempC,
    outdoorTempC: outdoorTemperatures[index],
    powerKw: power[index],
    occupancy: occupancy[index],
    airflowM3h: airflow[index],
  }))
}

const heatmapDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const heatmapHours = ['05', '07', '09', '11', '13', '15', '17', '19']

function createRuntimeHeatmap(
  seed: number,
  dominantMode: OperatingMode,
): RuntimeHeatmapCell[] {
  return heatmapDays.flatMap((day, dayIndex) =>
    heatmapHours.map((hour, hourIndex) => {
      const weekdayFactor = dayIndex < 5 ? 1 : 0.35
      const activeWindow =
        hourIndex >= 1 && hourIndex <= 6 ? 1 : 0.3
      const wave =
        28 +
        ((seed * 17 + dayIndex * 11 + hourIndex * 19) % 65)

      return {
        day,
        hour,
        runtimePct: Math.round(
          Math.min(100, wave * weekdayFactor * activeWindow),
        ),
        mode: dominantMode,
      }
    }),
  )
}

export const rooms: Room[] = [
  {
    id: 'G01',
    name: 'Main Space',
    floor: 0,
    position: [0, 0.8, -0.6],
    size: [10.8, 1.3, 4.6],
    status: 'normal',
    currentTemperature: 21.1,
    targetTemperature: 21,
    humidityPct: 43,
    occupancy: 114,
    capacity: 200,
    forecastOccupancy: 120,
    nextEvent: '07:00 · Occupancy begins',
    servedBy: ['ORION-01', 'ORION-02', 'HP-3', 'HP-4'],
  },
]

const HP_BASE = {
  technology: 'orion-mobile-rooftop' as const,
  model: 'ORIO 025' as const,
  manufacturer: 'İmbat',
  floor: 'external' as const,
  operatingMode: 'heating' as const,
  setpointCelsius: 21,
  lastUpdated: '10 seconds ago',
  nominalCoolingCapacityKw: 27.2,
  nominalHeatingCapacityKw: 25.4,
  ratedCoolingInputKw: 7.6,
  ratedHeatingInputKw: 6.0,
  staticPressurePa: 150,
  refrigerant: 'R-454B',
  compressorType: 'Inverter scroll',
  controlInterface: 'Ethernet / modem / Modbus-ready',
  automaticDefrost: true,
  servedRoomIds: ['G01'],
  features: [
    'Cooling, heat-pump heating and ventilation',
    'EC supply fan',
    'Automatic defrost',
    'Variable fresh-air operation',
    'Remote monitoring and automation',
  ],
}

export const climateDevices: ClimateDevice[] = [
  {
    ...HP_BASE,
    id: 'ORION-01',
    name: 'HP-1 (ORIO 025)',
    position: [-4.5, 0.72, -1.5],
    status: 'normal',
    currentPowerKw: 5.8,
    energyTodayKwh: 21.8,
    runtimeTodayMinutes: 224,
    compressorRuntimeMinutes: 177,
    efficiencyCop: 4.0,
    healthScore: 96,
    airflowM3h: 4600,
    freshAirRatioPct: 42,
    supplyFanSpeedPct: 63,
    history: createHistory(
      [2.1, 3.4, 4.8, 5.9, 6.0, 5.8, 4.4, 3.0, 2.2],
      [18.5, 18.9, 19.4, 19.9, 20.4, 20.8, 21.0, 21.1, 21.1],
      [0, 0, 0, 0, 12, 58, 114, 114, 76],
      [2400, 3100, 3900, 4500, 4600, 4450, 4100, 3600, 3000],
    ),
    runtimeHeatmap: createRuntimeHeatmap(1, 'heating'),
    influencingFactors: [
      'Space occupancy begins at 07:00',
      '114 people currently add internal heat',
      'Outdoor temperature is 7.2–10.0°C',
    ],
  },
  {
    ...HP_BASE,
    id: 'ORION-02',
    name: 'HP-2 (ORIO 025)',
    position: [-1.5, 0.72, -1.5],
    status: 'at-risk',
    currentPowerKw: 6.4,
    energyTodayKwh: 24.6,
    runtimeTodayMinutes: 248,
    compressorRuntimeMinutes: 218,
    efficiencyCop: 2.7,
    healthScore: 68,
    airflowM3h: 4600,
    freshAirRatioPct: 48,
    supplyFanSpeedPct: 82,
    history: createHistory(
      [3.5, 5.6, 6.1, 6.0, 6.2, 6.4, 6.4, 6.2, 5.8],
      [17.9, 18.0, 18.1, 18.2, 18.3, 18.4, 18.4, 18.5, 18.6],
      [0, 0, 0, 0, 0, 0, 0, 12, 12],
      [3000, 4000, 4500, 4500, 4600, 4600, 4600, 4550, 4400],
    ),
    runtimeHeatmap: createRuntimeHeatmap(4, 'heating'),
    alert: 'Observed warming rate is 38% below expected while compressor is active.',
    recommendedAction: 'Inspect flexible ducts, airflow restriction and filter condition.',
    influencingFactors: [
      'Warming response is below the learned room model',
      'Current fresh-air ratio is elevated',
    ],
  },
  {
    ...HP_BASE,
    id: 'HP-3',
    name: 'HP-3 (ORIO 025)',
    position: [1.5, 0.72, -1.5],
    status: 'normal',
    currentPowerKw: 5.6,
    energyTodayKwh: 20.1,
    runtimeTodayMinutes: 210,
    compressorRuntimeMinutes: 168,
    efficiencyCop: 3.9,
    healthScore: 95,
    airflowM3h: 4600,
    freshAirRatioPct: 38,
    supplyFanSpeedPct: 60,
    history: createHistory(
      [2.0, 3.1, 4.5, 5.5, 5.7, 5.6, 4.2, 2.9, 2.1],
      [18.6, 19.0, 19.5, 20.0, 20.5, 20.9, 21.1, 21.1, 21.1],
      [0, 0, 0, 0, 12, 58, 114, 114, 76],
      [2300, 3000, 3800, 4400, 4600, 4400, 4000, 3500, 2900],
    ),
    runtimeHeatmap: createRuntimeHeatmap(2, 'heating'),
    influencingFactors: [
      'Operating within expected thermal model',
      'Outdoor temperature is 7.2–10.0°C',
    ],
  },
  {
    ...HP_BASE,
    id: 'HP-4',
    name: 'HP-4 (ORIO 025)',
    position: [4.5, 0.72, -1.5],
    status: 'normal',
    currentPowerKw: 5.5,
    energyTodayKwh: 19.8,
    runtimeTodayMinutes: 205,
    compressorRuntimeMinutes: 160,
    efficiencyCop: 3.8,
    healthScore: 94,
    airflowM3h: 4600,
    freshAirRatioPct: 36,
    supplyFanSpeedPct: 58,
    history: createHistory(
      [1.9, 3.0, 4.4, 5.4, 5.6, 5.5, 4.1, 2.8, 2.0],
      [18.4, 18.8, 19.3, 19.8, 20.3, 20.7, 21.0, 21.1, 21.0],
      [0, 0, 0, 0, 12, 58, 114, 114, 76],
      [2200, 2900, 3700, 4300, 4500, 4300, 3900, 3400, 2800],
    ),
    runtimeHeatmap: createRuntimeHeatmap(6, 'heating'),
    influencingFactors: [
      'Operating within expected thermal model',
      'Outdoor temperature is 7.2–10.0°C',
    ],
  },
]

export const buildingTelemetry: BuildingTelemetryPoint[] =
  telemetryTimes.map((time, index) => ({
    time,
    actualPowerKw: [6.2, 10.4, 15.8, 19.4, 19.8, 19.5, 17.2, 15.1, 13.2][
      index
    ],
    baselinePowerKw: [21.5, 22.0, 23.0, 24.5, 25.0, 25.0, 24.0, 23.0, 22.0][
      index
    ],
    averageIndoorTempC: [18.6, 18.8, 19.1, 19.5, 19.9, 20.2, 20.4, 20.6, 20.7][
      index
    ],
    outdoorTempC: outdoorTemperatures[index],
    totalOccupancy: [0, 0, 0, 0, 12, 86, 154, 182, 230][index],
  }))

export const weatherForecast: WeatherForecastPoint[] = [
  {
    time: '06:00',
    condition: 'Cloudy',
    temperatureC: 7.3,
    feelsLikeC: 4.7,
    windKph: 22,
    humidityPct: 83,
    solarWm2: 18,
  },
  {
    time: '07:00',
    condition: 'Cloudy',
    temperatureC: 8.9,
    feelsLikeC: 6.3,
    windKph: 20,
    humidityPct: 79,
    solarWm2: 46,
  },
  {
    time: '08:00',
    condition: 'Brightening',
    temperatureC: 10.8,
    feelsLikeC: 8.9,
    windKph: 17,
    humidityPct: 73,
    solarWm2: 128,
  },
  {
    time: '09:00',
    condition: 'Partly cloudy',
    temperatureC: 12.4,
    feelsLikeC: 11.1,
    windKph: 14,
    humidityPct: 68,
    solarWm2: 245,
  },
  {
    time: '10:00',
    condition: 'Partly cloudy',
    temperatureC: 14.1,
    feelsLikeC: 13.4,
    windKph: 12,
    humidityPct: 63,
    solarWm2: 376,
  },
  {
    time: '11:00',
    condition: 'Sunny periods',
    temperatureC: 15.2,
    feelsLikeC: 14.8,
    windKph: 10,
    humidityPct: 59,
    solarWm2: 488,
  },
]

export const roomEvents: RoomEvent[] = [
  {
    id: 'event-1',
    roomId: 'G01',
    title: 'Thermodynamics',
    start: '07:00',
    end: '08:30',
    expectedStudents: 120,
  },
  {
    id: 'event-2',
    roomId: 'F01',
    title: 'Project Seminar',
    start: '07:15',
    end: '08:45',
    expectedStudents: 34,
  },
  {
    id: 'event-3',
    roomId: 'G02',
    title: 'Flight Systems',
    start: '07:30',
    end: '09:00',
    expectedStudents: 85,
  },
  {
    id: 'event-4',
    roomId: 'G03',
    title: 'Geodesy',
    start: '08:00',
    end: '09:30',
    expectedStudents: 146,
  },
  {
    id: 'event-5',
    roomId: 'F02',
    title: 'Aerospace Design',
    start: '08:30',
    end: '10:00',
    expectedStudents: 98,
  },
]

export const controlDecisions: ControlDecision[] = [
  {
    id: 'decision-1',
    time: '06:42',
    roomId: 'G01',
    deviceId: 'ORION-01',
    action: 'Reduce compressor load to 62%',
    reason:
      'Room is ready and 114 occupants provide additional internal heat.',
    status: 'active',
  },
  {
    id: 'decision-2',
    time: '06:45',
    roomId: 'F02',
    deviceId: 'ORION-03',
    action: 'Keep ventilation only',
    reason:
      'The lecture begins at 08:30 and forecast solar gain will reduce preheating demand.',
    status: 'planned',
  },
  {
    id: 'decision-3',
    time: '06:47',
    roomId: 'G03',
    deviceId: 'ORION-02',
    action: 'Maintain full heating and inspect unit',
    reason:
      'Warming rate is below expectation and the room has a high-occupancy lecture at 08:00.',
    status: 'active',
  },
  {
    id: 'decision-4',
    time: '07:05',
    roomId: 'F01',
    deviceId: 'ORION-03',
    action: 'Increase fresh-air ratio to 72%',
    reason:
      'Expected occupancy and CO₂ load increase at lecture start.',
    status: 'planned',
  },
]

export const plannedActions: PlannedAction[] = [
  {
    id: 'action-1',
    time: '06:45',
    label: 'Keep ventilation only',
    location: 'F02',
    type: 'reduce',
  },
  {
    id: 'action-2',
    time: '06:52',
    label: 'Reduce compressor to 45%',
    location: 'G01',
    type: 'reduce',
  },
  {
    id: 'action-3',
    time: '07:05',
    label: 'Technical inspection',
    location: 'ORION-02',
    type: 'inspect',
  },
  {
    id: 'action-4',
    time: '07:20',
    label: 'Begin preconditioning',
    location: 'F02',
    type: 'start',
  },
]

const heatmapTimes = ['06', '07', '08', '09', '10', '11']

const roomLoads: Record<string, number[]> = {
  G01: [86, 72, 44, 18, 12, 8],
  G02: [48, 79, 52, 24, 18, 10],
  G03: [96, 100, 84, 46, 21, 14],
  F01: [54, 68, 31, 16, 10, 8],
  F02: [18, 42, 88, 63, 28, 13],
  F03: [32, 38, 42, 34, 24, 20],
}

export const roomLoadHeatmap: RoomLoadHeatmapCell[] =
  Object.entries(roomLoads).flatMap(([roomId, values]) =>
    heatmapTimes.map((time, index) => ({
      roomId,
      time,
      loadPct: values[index],
    })),
  )
