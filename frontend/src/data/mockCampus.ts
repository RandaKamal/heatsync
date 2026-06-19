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
    name: 'Lecture Hall G01',
    floor: 0,
    position: [-3.8, 0.8, -0.6],
    size: [3.2, 1.3, 4.6],
    status: 'normal',
    currentTemperature: 21.1,
    targetTemperature: 21,
    humidityPct: 43,
    occupancy: 114,
    capacity: 140,
    forecastOccupancy: 120,
    nextEvent: '07:00 · Thermodynamics',
    servedBy: ['ORION-01', 'S-G01'],
  },
  {
    id: 'G02',
    name: 'Lecture Hall G02',
    floor: 0,
    position: [0, 0.8, -0.6],
    size: [3.2, 1.3, 4.6],
    status: 'normal',
    currentTemperature: 20.8,
    targetTemperature: 21,
    humidityPct: 45,
    occupancy: 76,
    capacity: 120,
    forecastOccupancy: 85,
    nextEvent: '07:30 · Flight Systems',
    servedBy: ['ORION-01'],
  },
  {
    id: 'G03',
    name: 'Lecture Hall G03',
    floor: 0,
    position: [3.8, 0.8, -0.6],
    size: [3.2, 1.3, 4.6],
    status: 'at-risk',
    currentTemperature: 18.4,
    targetTemperature: 21,
    humidityPct: 49,
    occupancy: 0,
    capacity: 160,
    forecastOccupancy: 146,
    nextEvent: '08:00 · Geodesy',
    servedBy: ['ORION-02', 'S-G03'],
  },
  {
    id: 'F01',
    name: 'Seminar Room F01',
    floor: 1,
    position: [-3.8, 2.45, -0.6],
    size: [3.2, 1.3, 4.6],
    status: 'normal',
    currentTemperature: 20.7,
    targetTemperature: 21,
    humidityPct: 42,
    occupancy: 28,
    capacity: 45,
    forecastOccupancy: 34,
    nextEvent: '07:15 · Project Seminar',
    servedBy: ['ORION-03'],
  },
  {
    id: 'F02',
    name: 'Lecture Hall F02',
    floor: 1,
    position: [0, 2.45, -0.6],
    size: [3.2, 1.3, 4.6],
    status: 'warming',
    currentTemperature: 19.2,
    targetTemperature: 21,
    humidityPct: 47,
    occupancy: 0,
    capacity: 110,
    forecastOccupancy: 98,
    nextEvent: '08:30 · Aerospace Design',
    servedBy: ['ORION-03'],
  },
  {
    id: 'F03',
    name: 'Lab F03',
    floor: 1,
    position: [3.8, 2.45, -0.6],
    size: [3.2, 1.3, 4.6],
    status: 'fault',
    currentTemperature: 22.7,
    targetTemperature: 20,
    humidityPct: 51,
    occupancy: 12,
    capacity: 35,
    forecastOccupancy: 18,
    nextEvent: 'In use · Sensor Laboratory',
    servedBy: ['ORION-02', 'S-F03'],
  },
]

export const climateDevices: ClimateDevice[] = [
  {
    id: 'ORION-01',
    name: 'West mobile climate unit',
    technology: 'orion-mobile-rooftop',
    model: 'ORIO 025',
    manufacturer: 'İmbat',
    floor: 'external',
    position: [-7.2, 0.72, -1.5],
    status: 'normal',
    operatingMode: 'heating',
    currentPowerKw: 5.8,
    energyTodayKwh: 21.8,
    runtimeTodayMinutes: 224,
    compressorRuntimeMinutes: 177,
    efficiencyCop: 4.0,
    healthScore: 96,
    servedRoomIds: ['G01', 'G02'],
    setpointCelsius: 21,
    lastUpdated: '12 seconds ago',
    nominalCoolingCapacityKw: 27.2,
    nominalHeatingCapacityKw: 25.4,
    ratedCoolingInputKw: 7.6,
    ratedHeatingInputKw: 6.0,
    airflowM3h: 4600,
    staticPressurePa: 150,
    freshAirRatioPct: 42,
    supplyFanSpeedPct: 63,
    refrigerant: 'R-454B',
    compressorType: 'Inverter scroll',
    controlInterface: 'Ethernet / modem / Modbus-ready',
    automaticDefrost: true,
    features: [
      'Cooling, heat-pump heating and ventilation',
      'EC supply fan',
      'Automatic defrost',
      'Variable fresh-air operation',
      'Remote monitoring and automation',
    ],
    history: createHistory(
      [2.1, 3.4, 4.8, 5.9, 6.0, 5.8, 4.4, 3.0, 2.2],
      [18.5, 18.9, 19.4, 19.9, 20.4, 20.8, 21.0, 21.1, 21.1],
      [0, 0, 0, 0, 12, 58, 114, 114, 76],
      [2400, 3100, 3900, 4500, 4600, 4450, 4100, 3600, 3000],
    ),
    runtimeHeatmap: createRuntimeHeatmap(1, 'heating'),
    influencingFactors: [
      'G01 lecture begins at 07:00',
      '114 students currently add internal heat',
      'Outdoor temperature is 7.2–10.0°C',
      'Wind increases expected envelope losses',
    ],
  },
  {
    id: 'ORION-02',
    name: 'East mobile climate unit',
    technology: 'orion-mobile-rooftop',
    model: 'ORIO 039',
    manufacturer: 'İmbat',
    floor: 'external',
    position: [7.2, 0.72, -1.5],
    status: 'at-risk',
    operatingMode: 'heating',
    currentPowerKw: 10.1,
    energyTodayKwh: 36.2,
    runtimeTodayMinutes: 248,
    compressorRuntimeMinutes: 218,
    efficiencyCop: 2.7,
    healthScore: 68,
    servedRoomIds: ['G03', 'F03'],
    setpointCelsius: 21,
    lastUpdated: '8 seconds ago',
    nominalCoolingCapacityKw: 38.77,
    nominalHeatingCapacityKw: 35.06,
    ratedCoolingInputKw: 11.06,
    ratedHeatingInputKw: 10.4,
    airflowM3h: 6000,
    staticPressurePa: 150,
    freshAirRatioPct: 58,
    supplyFanSpeedPct: 89,
    refrigerant: 'R-454B',
    compressorType: 'Scroll',
    controlInterface: 'Ethernet / modem / Modbus-ready',
    automaticDefrost: true,
    features: [
      'Cooling, heat-pump heating and ventilation',
      'EC supply fan',
      'Automatic defrost',
      'Variable fresh-air operation',
      'Remote monitoring and automation',
    ],
    history: createHistory(
      [3.5, 5.6, 8.1, 10.0, 10.2, 10.1, 10.1, 10.0, 9.8],
      [17.9, 18.0, 18.1, 18.2, 18.3, 18.4, 18.4, 18.5, 18.6],
      [0, 0, 0, 0, 0, 0, 0, 12, 12],
      [3000, 4000, 5100, 5900, 6000, 6000, 6000, 5950, 5800],
    ),
    runtimeHeatmap: createRuntimeHeatmap(4, 'heating'),
    alert:
      'The observed warming rate is 38% below the expected response while the compressor and EC fan are active.',
    recommendedAction:
      'Inspect flexible ducts, airflow restriction, filter condition and compressor output before the G03 lecture.',
    influencingFactors: [
      'G03 must reach 21°C before 08:00',
      'Fresh-air ratio increased for the expected 146 students',
      'Current warming response is below the learned room model',
      'F03 sensor drift makes room feedback less reliable',
    ],
  },
  {
    id: 'ORION-03',
    name: 'North mobile climate unit',
    technology: 'orion-mobile-rooftop',
    model: 'ORIO 047',
    manufacturer: 'İmbat',
    floor: 'external',
    position: [0, 0.72, 5.1],
    status: 'warming',
    operatingMode: 'ventilation',
    currentPowerKw: 1.1,
    energyTodayKwh: 11.4,
    runtimeTodayMinutes: 190,
    compressorRuntimeMinutes: 84,
    efficiencyCop: null,
    healthScore: 92,
    servedRoomIds: ['F01', 'F02'],
    setpointCelsius: 21,
    lastUpdated: '15 seconds ago',
    nominalCoolingCapacityKw: 46.21,
    nominalHeatingCapacityKw: 44.4,
    ratedCoolingInputKw: 15.19,
    ratedHeatingInputKw: 13.87,
    airflowM3h: 7250,
    staticPressurePa: 150,
    freshAirRatioPct: 72,
    supplyFanSpeedPct: 48,
    refrigerant: 'R-454B',
    compressorType: 'Dual scroll (1+1)',
    controlInterface: 'Ethernet / modem / Modbus-ready',
    automaticDefrost: true,
    features: [
      'Cooling, heat-pump heating and ventilation',
      'Dual-compressor staged capacity',
      'EC supply fan',
      'Automatic defrost',
      'Variable fresh-air operation',
    ],
    history: createHistory(
      [0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.1, 1.1, 1.1],
      [19.2, 19.3, 19.4, 19.5, 19.7, 19.9, 20.1, 20.3, 20.5],
      [0, 0, 0, 0, 0, 28, 28, 28, 28],
      [2600, 3100, 3600, 4000, 4200, 4400, 4200, 4000, 3800],
    ),
    runtimeHeatmap: createRuntimeHeatmap(7, 'ventilation'),
    influencingFactors: [
      'F01 is occupied by 28 students',
      'F02 preconditioning begins later for an 08:30 lecture',
      'Ventilation mode uses the EC fan without compressor heating',
      'Solar gain is expected to increase after 08:00',
    ],
  },
  {
    id: 'S-G01',
    name: 'G01 room climate sensor',
    technology: 'room-sensor',
    manufacturer: 'IHL sensor box',
    floor: 0,
    position: [-3.8, 0.92, 1.76],
    status: 'normal',
    operatingMode: 'standby',
    currentPowerKw: 0.01,
    energyTodayKwh: 0.04,
    runtimeTodayMinutes: 310,
    compressorRuntimeMinutes: 0,
    efficiencyCop: null,
    healthScore: 99,
    servedRoomIds: ['G01'],
    setpointCelsius: 21,
    lastUpdated: '5 seconds ago',
    controlInterface: 'Cloud telemetry',
    automaticDefrost: false,
    features: [
      'Indoor temperature sensing',
      'Humidity sensing',
      'Room-level telemetry',
    ],
    history: createHistory(
      [0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01],
      [18.5, 18.9, 19.4, 19.9, 20.4, 20.8, 21.0, 21.1, 21.1],
      [0, 0, 0, 0, 12, 58, 114, 114, 114],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
    ),
    runtimeHeatmap: createRuntimeHeatmap(3, 'standby'),
    influencingFactors: [
      'Temperature agrees with the room thermal model',
      'Humidity remains inside the configured comfort band',
      'No sensor drift or communication gap detected',
    ],
  },
  {
    id: 'S-F03',
    name: 'F03 room climate sensor',
    technology: 'room-sensor',
    manufacturer: 'IHL sensor box',
    floor: 1,
    position: [3.8, 2.57, 1.76],
    status: 'fault',
    operatingMode: 'standby',
    currentPowerKw: 0.01,
    energyTodayKwh: 0.03,
    runtimeTodayMinutes: 310,
    compressorRuntimeMinutes: 0,
    efficiencyCop: null,
    healthScore: 41,
    servedRoomIds: ['F03'],
    setpointCelsius: 20,
    lastUpdated: '4 seconds ago',
    controlInterface: 'Cloud telemetry',
    automaticDefrost: false,
    features: [
      'Indoor temperature sensing',
      'Humidity sensing',
      'Room-level telemetry',
    ],
    history: createHistory(
      [0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01],
      [20.1, 20.2, 20.4, 20.8, 21.3, 21.8, 22.2, 22.5, 22.7],
      [0, 0, 0, 0, 0, 0, 12, 12, 12],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      20,
    ),
    runtimeHeatmap: createRuntimeHeatmap(9, 'standby'),
    alert:
      'The temperature signal is drifting away from the room model and neighbouring-room behaviour.',
    recommendedAction:
      'Validate the sensor with a reference thermometer and recalibrate it before using it for automatic control.',
    influencingFactors: [
      'Measured temperature rose without matching heat input',
      'The neighbouring rooms do not show the same rise',
      'Occupancy alone does not explain the full deviation',
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
