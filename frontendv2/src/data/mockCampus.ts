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
  '05:30', '05:45', '06:00', '06:15', '06:30', '06:45', '07:00', '07:15', '07:30',
]

const outdoorTemperatures = [7.2, 7.1, 7.3, 7.6, 8.0, 8.4, 8.9, 9.4, 10.0]

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

function createRuntimeHeatmap(seed: number, dominantMode: OperatingMode): RuntimeHeatmapCell[] {
  return heatmapDays.flatMap((day, dayIndex) =>
    heatmapHours.map((hour, hourIndex) => {
      const weekdayFactor = dayIndex < 5 ? 1 : 0.35
      const activeWindow = hourIndex >= 1 && hourIndex <= 6 ? 1 : 0.3
      const wave = 28 + ((seed * 17 + dayIndex * 11 + hourIndex * 19) % 65)
      return {
        day,
        hour,
        runtimePct: Math.round(Math.min(100, wave * weekdayFactor * activeWindow)),
        mode: dominantMode,
      }
    }),
  )
}

// ── Building layout ──────────────────────────────────────────────────────────
//
//  2 floors · 2 rooms per floor · 4 heat pumps per room (16 total)
//
//  Each room is the same size as the original single room: 24 m × 16 m × 3.5 m
//  Rooms are placed side-by-side left/right within each floor:
//
//  Floor 1 (y = 3.5–7.0):  [ F01 Seminar A  (-13, 5.25, 0) | F02 Seminar B  (13, 5.25, 0) ]
//  Floor 0 (y = 0–3.5  ):  [ G01 Lecture A  (-13, 1.75, 0) | G02 Lecture B  (13, 1.75, 0) ]
//
//  Total building footprint: 50 m wide (24 + 2 divider + 24) × 16 m deep × 7 m tall
//
//  Heat-pump roof quadrant mapping (all HPs at y = 7.5):
//    G01 → front-left  (x: -23 to -3, z: -7 to -3)
//    G02 → front-right (x:   3 to 23, z: -7 to -3)
//    F01 → back-left   (x: -23 to -3, z:  3 to  7)
//    F02 → back-right  (x:   3 to 23, z:  3 to  7)

export const rooms: Room[] = [
  // ── Ground floor ──────────────────────────────────────────────────────────
  {
    id: 'G01',
    name: 'Lecture Hall A',
    floor: 0,
    position: [-13, 1.75, 0],
    size: [24, 3.5, 16],
    status: 'normal',
    currentTemperature: 21.1,
    targetTemperature: 21,
    humidityPct: 43,
    occupancy: 114,
    capacity: 200,
    forecastOccupancy: 120,
    nextEvent: '07:00 · Thermodynamics',
    servedBy: ['ORION-01', 'ORION-02', 'HP-3', 'HP-4'],
  },
  {
    id: 'G02',
    name: 'Lecture Hall B',
    floor: 0,
    position: [13, 1.75, 0],
    size: [24, 3.5, 16],
    status: 'at-risk',
    currentTemperature: 18.6,
    targetTemperature: 21,
    humidityPct: 51,
    occupancy: 0,
    capacity: 200,
    forecastOccupancy: 160,
    nextEvent: '08:00 · Flight Systems',
    servedBy: ['G02-HP-1', 'G02-HP-2', 'G02-HP-3', 'G02-HP-4'],
  },
  // ── First floor ───────────────────────────────────────────────────────────
  {
    id: 'F01',
    name: 'Seminar Hall A',
    floor: 1,
    position: [-13, 5.25, 0],
    size: [24, 3.5, 16],
    status: 'warming',
    currentTemperature: 19.4,
    targetTemperature: 21,
    humidityPct: 47,
    occupancy: 34,
    capacity: 80,
    forecastOccupancy: 60,
    nextEvent: '07:15 · Project Seminar',
    servedBy: ['F01-HP-1', 'F01-HP-2', 'F01-HP-3', 'F01-HP-4'],
  },
  {
    id: 'F02',
    name: 'Seminar Hall B',
    floor: 1,
    position: [13, 5.25, 0],
    size: [24, 3.5, 16],
    status: 'fault',
    currentTemperature: 16.2,
    targetTemperature: 21,
    humidityPct: 58,
    occupancy: 0,
    capacity: 80,
    forecastOccupancy: 75,
    nextEvent: '08:30 · Aerospace Design',
    servedBy: ['F02-HP-1', 'F02-HP-2', 'F02-HP-3', 'F02-HP-4'],
  },
]

// ── Common HP base ────────────────────────────────────────────────────────────

const HP_BASE = {
  technology: 'ihl-heat-pump' as const,
  manufacturer: 'LB Energy / HELOT',
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
  features: [
    'Cooling, heat-pump heating and ventilation',
    'EC supply fan',
    'Automatic defrost',
    'Variable fresh-air operation',
    'Remote monitoring and automation',
  ],
}

// ── 16 heat pumps — 4 per room, all on top roof (y = 7.5) ────────────────────
//
//  G01 quadrant:  ORION-01 ORION-02   (NW/NE)   HP-3   HP-4   (SW/SE)
//  G02 quadrant:  G02-HP-1 G02-HP-2  (NW/NE)   G02-HP-3 G02-HP-4 (SW/SE)
//  F01 quadrant:  F01-HP-1 F01-HP-2  (NW/NE)   F01-HP-3 F01-HP-4 (SW/SE)
//  F02 quadrant:  F02-HP-1 F02-HP-2  (NW/NE)   F02-HP-3 F02-HP-4 (SW/SE)

export const climateDevices: ClimateDevice[] = [
  // ── G01 — Lecture Hall A (ground left) ── front-left roof quadrant ─────────
  {
    ...HP_BASE,
    id: 'ORION-01',
    name: 'HP-1 · Wing A',
    position: [-24, 2.9, -7],
    servedRoomIds: ['G01'],
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
      'Lecture Hall A occupancy begins at 07:00',
      '114 people currently add internal heat',
      'Outdoor temperature is 7.2–10.0°C',
    ],
  },
  {
    ...HP_BASE,
    id: 'ORION-02',
    name: 'HP-2 · Wing B',
    position: [-2, 2.9, -7],
    servedRoomIds: ['G01'],
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
    name: 'HP-3 · Wing C',
    position: [-24, 2.9, -1],
    servedRoomIds: ['G01'],
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
    name: 'HP-4 · Main Hall',
    position: [-2, 2.9, -1],
    servedRoomIds: ['G01'],
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

  // ── G02 — Lecture Hall B (ground right) ── front-right roof quadrant ───────
  {
    ...HP_BASE,
    id: 'G02-HP-1',
    name: 'HP G02-1 · NW',
    position: [2, 2.9, -7],
    servedRoomIds: ['G02'],
    status: 'at-risk',
    currentPowerKw: 6.3,
    energyTodayKwh: 23.9,
    runtimeTodayMinutes: 242,
    compressorRuntimeMinutes: 212,
    efficiencyCop: 2.8,
    healthScore: 66,
    airflowM3h: 4600,
    freshAirRatioPct: 46,
    supplyFanSpeedPct: 80,
    history: createHistory(
      [3.3, 5.2, 5.9, 5.8, 6.0, 6.2, 6.2, 6.0, 5.6],
      [16.2, 16.3, 16.4, 16.6, 16.8, 17.0, 17.2, 17.5, 17.8],
      [0, 0, 0, 0, 0, 0, 0, 8, 8],
      [2900, 3800, 4400, 4400, 4500, 4600, 4600, 4500, 4300],
    ),
    runtimeHeatmap: createRuntimeHeatmap(5, 'heating'),
    alert: 'Warming rate 35% below expected. Room not reaching target.',
    recommendedAction: 'Check duct connections and filter condition.',
    influencingFactors: [
      'Lecture Hall B struggles to reach 21°C target',
      'No occupancy yet — no internal heat gain',
    ],
  },
  {
    ...HP_BASE,
    id: 'G02-HP-2',
    name: 'HP G02-2 · NE',
    position: [24, 2.9, -7],
    servedRoomIds: ['G02'],
    status: 'at-risk',
    currentPowerKw: 6.1,
    energyTodayKwh: 23.2,
    runtimeTodayMinutes: 238,
    compressorRuntimeMinutes: 208,
    efficiencyCop: 2.6,
    healthScore: 63,
    airflowM3h: 4600,
    freshAirRatioPct: 50,
    supplyFanSpeedPct: 84,
    history: createHistory(
      [3.4, 5.4, 6.0, 5.9, 6.1, 6.3, 6.3, 6.1, 5.7],
      [16.1, 16.2, 16.3, 16.5, 16.7, 16.9, 17.1, 17.4, 17.7],
      [0, 0, 0, 0, 0, 0, 0, 8, 8],
      [2800, 3900, 4400, 4400, 4600, 4600, 4600, 4500, 4350],
    ),
    runtimeHeatmap: createRuntimeHeatmap(7, 'heating'),
    alert: 'High compressor runtime with insufficient thermal gain.',
    recommendedAction: 'Inspect refrigerant charge and outdoor coil.',
    influencingFactors: [
      'Continuous compressor operation without room reaching target',
      'Elevated fresh-air demand increasing load',
    ],
  },
  {
    ...HP_BASE,
    id: 'G02-HP-3',
    name: 'HP G02-3 · SW',
    position: [2, 2.9, -1],
    servedRoomIds: ['G02'],
    status: 'normal',
    currentPowerKw: 5.7,
    energyTodayKwh: 20.8,
    runtimeTodayMinutes: 218,
    compressorRuntimeMinutes: 176,
    efficiencyCop: 3.5,
    healthScore: 84,
    airflowM3h: 4600,
    freshAirRatioPct: 40,
    supplyFanSpeedPct: 62,
    history: createHistory(
      [2.2, 3.5, 4.9, 5.8, 5.9, 5.7, 4.3, 3.0, 2.2],
      [16.4, 16.6, 17.0, 17.5, 18.0, 18.4, 18.7, 18.9, 19.1],
      [0, 0, 0, 0, 0, 0, 0, 8, 8],
      [2400, 3100, 3900, 4400, 4500, 4400, 4100, 3600, 3000],
    ),
    runtimeHeatmap: createRuntimeHeatmap(8, 'heating'),
    influencingFactors: [
      'Operating normally — monitoring G02 thermal response',
    ],
  },
  {
    ...HP_BASE,
    id: 'G02-HP-4',
    name: 'HP G02-4 · SE',
    position: [24, 2.9, -1],
    servedRoomIds: ['G02'],
    status: 'normal',
    currentPowerKw: 5.6,
    energyTodayKwh: 20.3,
    runtimeTodayMinutes: 214,
    compressorRuntimeMinutes: 172,
    efficiencyCop: 3.6,
    healthScore: 86,
    airflowM3h: 4600,
    freshAirRatioPct: 38,
    supplyFanSpeedPct: 60,
    history: createHistory(
      [2.1, 3.3, 4.7, 5.7, 5.8, 5.6, 4.2, 2.9, 2.1],
      [16.3, 16.5, 16.9, 17.3, 17.8, 18.2, 18.6, 18.8, 19.0],
      [0, 0, 0, 0, 0, 0, 0, 8, 8],
      [2300, 3000, 3800, 4300, 4400, 4300, 4000, 3500, 2900],
    ),
    runtimeHeatmap: createRuntimeHeatmap(9, 'heating'),
    influencingFactors: [
      'Healthy COP for current outdoor conditions',
    ],
  },

  // ── F01 — Seminar Hall A (first floor left) ── back-left roof quadrant ─────
  {
    ...HP_BASE,
    id: 'F01-HP-1',
    name: 'HP F01-1 · NW',
    position: [-24, 7.5, 1],
    servedRoomIds: ['F01'],
    status: 'normal',
    currentPowerKw: 5.4,
    energyTodayKwh: 19.6,
    runtimeTodayMinutes: 200,
    compressorRuntimeMinutes: 158,
    efficiencyCop: 3.7,
    healthScore: 93,
    airflowM3h: 4600,
    freshAirRatioPct: 40,
    supplyFanSpeedPct: 61,
    history: createHistory(
      [2.0, 3.2, 4.6, 5.5, 5.6, 5.4, 4.1, 2.8, 2.0],
      [17.8, 18.1, 18.5, 19.0, 19.4, 19.7, 20.0, 20.2, 20.4],
      [0, 0, 0, 0, 10, 30, 34, 34, 20],
      [2300, 3000, 3700, 4300, 4500, 4400, 4100, 3600, 2900],
    ),
    runtimeHeatmap: createRuntimeHeatmap(10, 'heating'),
    influencingFactors: [
      'Seminar Hall A warming towards 21°C',
      '34 occupants present — partial heat gain',
    ],
  },
  {
    ...HP_BASE,
    id: 'F01-HP-2',
    name: 'HP F01-2 · NE',
    position: [-2, 7.5, 1],
    servedRoomIds: ['F01'],
    status: 'normal',
    currentPowerKw: 5.2,
    energyTodayKwh: 18.8,
    runtimeTodayMinutes: 195,
    compressorRuntimeMinutes: 152,
    efficiencyCop: 3.6,
    healthScore: 92,
    airflowM3h: 4600,
    freshAirRatioPct: 38,
    supplyFanSpeedPct: 59,
    history: createHistory(
      [1.9, 3.1, 4.4, 5.3, 5.5, 5.3, 4.0, 2.7, 1.9],
      [17.7, 18.0, 18.4, 18.9, 19.3, 19.6, 19.9, 20.1, 20.3],
      [0, 0, 0, 0, 10, 30, 34, 34, 20],
      [2200, 2900, 3600, 4200, 4400, 4300, 4000, 3500, 2800],
    ),
    runtimeHeatmap: createRuntimeHeatmap(11, 'heating'),
    influencingFactors: [
      'Operating within thermal model',
    ],
  },
  {
    ...HP_BASE,
    id: 'F01-HP-3',
    name: 'HP F01-3 · SW',
    position: [-24, 7.5, 7],
    servedRoomIds: ['F01'],
    status: 'normal',
    currentPowerKw: 5.5,
    energyTodayKwh: 20.0,
    runtimeTodayMinutes: 205,
    compressorRuntimeMinutes: 162,
    efficiencyCop: 3.8,
    healthScore: 94,
    airflowM3h: 4600,
    freshAirRatioPct: 36,
    supplyFanSpeedPct: 58,
    history: createHistory(
      [2.1, 3.3, 4.7, 5.6, 5.7, 5.5, 4.2, 2.9, 2.1],
      [17.9, 18.2, 18.6, 19.1, 19.5, 19.8, 20.1, 20.3, 20.4],
      [0, 0, 0, 0, 10, 30, 34, 34, 20],
      [2300, 3000, 3800, 4300, 4500, 4400, 4100, 3600, 2900],
    ),
    runtimeHeatmap: createRuntimeHeatmap(12, 'heating'),
    influencingFactors: [
      'Healthy compressor operation',
    ],
  },
  {
    ...HP_BASE,
    id: 'F01-HP-4',
    name: 'HP F01-4 · SE',
    position: [-2, 7.5, 7],
    servedRoomIds: ['F01'],
    status: 'warming',
    currentPowerKw: 5.3,
    energyTodayKwh: 19.2,
    runtimeTodayMinutes: 198,
    compressorRuntimeMinutes: 156,
    efficiencyCop: 3.5,
    healthScore: 90,
    airflowM3h: 4600,
    freshAirRatioPct: 42,
    supplyFanSpeedPct: 64,
    history: createHistory(
      [2.0, 3.2, 4.5, 5.4, 5.6, 5.4, 4.1, 2.8, 2.0],
      [17.6, 17.9, 18.3, 18.8, 19.2, 19.5, 19.8, 20.0, 20.2],
      [0, 0, 0, 0, 10, 30, 34, 34, 20],
      [2200, 2900, 3700, 4200, 4400, 4300, 4000, 3500, 2800],
    ),
    runtimeHeatmap: createRuntimeHeatmap(13, 'heating'),
    influencingFactors: [
      'Slightly below expected heating response — monitoring',
    ],
  },

  // ── F02 — Seminar Hall B (first floor right) ── back-right roof quadrant ───
  {
    ...HP_BASE,
    id: 'F02-HP-1',
    name: 'HP F02-1 · NW',
    position: [2, 7.5, 1],
    servedRoomIds: ['F02'],
    status: 'fault',
    currentPowerKw: 3.1,
    energyTodayKwh: 11.2,
    runtimeTodayMinutes: 310,
    compressorRuntimeMinutes: 295,
    efficiencyCop: 0.8,
    healthScore: 28,
    airflowM3h: 2800,
    freshAirRatioPct: 22,
    supplyFanSpeedPct: 40,
    history: createHistory(
      [3.0, 3.1, 3.1, 3.1, 3.2, 3.1, 3.0, 3.1, 3.0],
      [14.0, 14.1, 14.2, 14.3, 14.5, 14.8, 15.1, 15.3, 15.6],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [1800, 1900, 1900, 2000, 2100, 2000, 1900, 2000, 1900],
    ),
    runtimeHeatmap: createRuntimeHeatmap(14, 'heating'),
    alert: 'Error register 1902 non-zero. Circuit 1 low pressure condition.',
    recommendedAction: 'Check refrigerant charge, inspect expansion valve and outdoor coil.',
    influencingFactors: [
      'Non-zero error register (Reg 1902 bit 1)',
      'Circuit 1 low pressure alarm active',
    ],
  },
  {
    ...HP_BASE,
    id: 'F02-HP-2',
    name: 'HP F02-2 · NE',
    position: [24, 7.5, 1],
    servedRoomIds: ['F02'],
    status: 'fault',
    currentPowerKw: 3.3,
    energyTodayKwh: 11.8,
    runtimeTodayMinutes: 305,
    compressorRuntimeMinutes: 290,
    efficiencyCop: 0.9,
    healthScore: 31,
    airflowM3h: 2900,
    freshAirRatioPct: 24,
    supplyFanSpeedPct: 42,
    history: createHistory(
      [3.2, 3.3, 3.3, 3.3, 3.4, 3.3, 3.2, 3.3, 3.2],
      [14.1, 14.2, 14.3, 14.4, 14.6, 14.9, 15.2, 15.4, 15.7],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [1900, 2000, 2000, 2100, 2200, 2100, 2000, 2100, 2000],
    ),
    runtimeHeatmap: createRuntimeHeatmap(15, 'heating'),
    alert: 'Circuit 1 low pressure alarm. Possible refrigerant loss.',
    recommendedAction: 'Check for refrigerant leaks and outdoor coil icing.',
    influencingFactors: [
      'Circuit 1 low pressure alarm active',
      'Compressor running at severely reduced capacity',
    ],
  },
  {
    ...HP_BASE,
    id: 'F02-HP-3',
    name: 'HP F02-3 · SW',
    position: [2, 7.5, 7],
    servedRoomIds: ['F02'],
    status: 'at-risk',
    currentPowerKw: 4.2,
    energyTodayKwh: 15.4,
    runtimeTodayMinutes: 280,
    compressorRuntimeMinutes: 252,
    efficiencyCop: 1.8,
    healthScore: 52,
    airflowM3h: 3800,
    freshAirRatioPct: 32,
    supplyFanSpeedPct: 56,
    history: createHistory(
      [3.5, 3.8, 4.0, 4.1, 4.2, 4.2, 4.1, 4.0, 3.8],
      [14.2, 14.3, 14.4, 14.5, 14.7, 15.0, 15.3, 15.5, 15.8],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [2400, 2600, 2700, 2800, 3000, 2900, 2800, 2700, 2600],
    ),
    runtimeHeatmap: createRuntimeHeatmap(16, 'heating'),
    alert: 'COP severely degraded — cascade risk from adjacent units.',
    recommendedAction: 'Reduce setpoint and schedule immediate inspection.',
    influencingFactors: [
      'Degraded COP likely from cascade effect of F02-HP-1 / F02-HP-2 faults',
    ],
  },
  {
    ...HP_BASE,
    id: 'F02-HP-4',
    name: 'HP F02-4 · SE',
    position: [24, 7.5, 7],
    servedRoomIds: ['F02'],
    status: 'at-risk',
    currentPowerKw: 4.4,
    energyTodayKwh: 16.0,
    runtimeTodayMinutes: 270,
    compressorRuntimeMinutes: 240,
    efficiencyCop: 2.0,
    healthScore: 55,
    airflowM3h: 3900,
    freshAirRatioPct: 34,
    supplyFanSpeedPct: 58,
    history: createHistory(
      [3.6, 3.9, 4.1, 4.2, 4.4, 4.4, 4.3, 4.1, 3.9],
      [14.3, 14.4, 14.5, 14.6, 14.8, 15.1, 15.4, 15.6, 15.9],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [2500, 2700, 2800, 2900, 3100, 3000, 2900, 2800, 2700],
    ),
    runtimeHeatmap: createRuntimeHeatmap(17, 'heating'),
    influencingFactors: [
      'Reduced efficiency — monitoring for further degradation',
    ],
  },
]

// ── Building telemetry ────────────────────────────────────────────────────────

export const buildingTelemetry: BuildingTelemetryPoint[] =
  telemetryTimes.map((time, index) => ({
    time,
    actualPowerKw:      [24.8, 41.6, 63.2, 77.6, 79.2, 78.0, 68.8, 60.4, 52.8][index],
    baselinePowerKw:    [86.0, 88.0, 92.0, 98.0,100.0,100.0, 96.0, 92.0, 88.0][index],
    averageIndoorTempC: [17.7, 17.9, 18.3, 18.8, 19.2, 19.6, 19.9, 20.1, 20.2][index],
    outdoorTempC: outdoorTemperatures[index],
    totalOccupancy: [0, 0, 0, 0, 46, 172, 282, 258, 152][index],
  }))

export const weatherForecast: WeatherForecastPoint[] = [
  { time: '06:00', condition: 'Cloudy',        temperatureC: 7.3,  feelsLikeC: 4.7,  windKph: 22, humidityPct: 83, solarWm2: 18  },
  { time: '07:00', condition: 'Cloudy',        temperatureC: 8.9,  feelsLikeC: 6.3,  windKph: 20, humidityPct: 79, solarWm2: 46  },
  { time: '08:00', condition: 'Brightening',   temperatureC: 10.8, feelsLikeC: 8.9,  windKph: 17, humidityPct: 73, solarWm2: 128 },
  { time: '09:00', condition: 'Partly cloudy', temperatureC: 12.4, feelsLikeC: 11.1, windKph: 14, humidityPct: 68, solarWm2: 245 },
  { time: '10:00', condition: 'Partly cloudy', temperatureC: 14.1, feelsLikeC: 13.4, windKph: 12, humidityPct: 63, solarWm2: 376 },
  { time: '11:00', condition: 'Sunny periods', temperatureC: 15.2, feelsLikeC: 14.8, windKph: 10, humidityPct: 59, solarWm2: 488 },
]

export const roomEvents: RoomEvent[] = [
  { id: 'event-1', roomId: 'G01', title: 'Thermodynamics',   start: '07:00', end: '08:30', expectedStudents: 120 },
  { id: 'event-2', roomId: 'F01', title: 'Project Seminar',  start: '07:15', end: '08:45', expectedStudents: 34  },
  { id: 'event-3', roomId: 'G02', title: 'Flight Systems',   start: '08:00', end: '09:30', expectedStudents: 160 },
  { id: 'event-4', roomId: 'F02', title: 'Aerospace Design', start: '08:30', end: '10:00', expectedStudents: 75  },
]

export const controlDecisions: ControlDecision[] = [
  {
    id: 'decision-1', time: '06:42', roomId: 'G01', deviceId: 'ORION-01',
    action: 'Reduce compressor load to 62%',
    reason: 'Room at target and 114 occupants provide internal heat.',
    status: 'active',
  },
  {
    id: 'decision-2', time: '06:45', roomId: 'F02', deviceId: 'F02-HP-1',
    action: 'Flag for maintenance — error register active',
    reason: 'Circuit 1 low pressure alarm on two units. Manual inspection required.',
    status: 'planned',
  },
  {
    id: 'decision-3', time: '06:47', roomId: 'G02', deviceId: 'G02-HP-1',
    action: 'Maintain full heating and inspect unit',
    reason: 'Warming rate 35% below expectation; high-occupancy lecture at 08:00.',
    status: 'active',
  },
  {
    id: 'decision-4', time: '07:05', roomId: 'F01', deviceId: 'F01-HP-1',
    action: 'Increase fresh-air ratio to 72%',
    reason: 'Expected occupancy and CO₂ load increase at lecture start.',
    status: 'planned',
  },
]

export const plannedActions: PlannedAction[] = [
  { id: 'action-1', time: '06:45', label: 'Keep ventilation only',      location: 'F01',      type: 'reduce'  },
  { id: 'action-2', time: '06:52', label: 'Reduce compressor to 45%',  location: 'G01',      type: 'reduce'  },
  { id: 'action-3', time: '07:05', label: 'Technical inspection',       location: 'F02-HP-1', type: 'inspect' },
  { id: 'action-4', time: '07:20', label: 'Begin preconditioning',      location: 'F02',      type: 'start'   },
]

const heatmapTimes = ['06', '07', '08', '09', '10', '11']

const roomLoads: Record<string, number[]> = {
  G01: [86, 72, 44, 18, 12,  8],
  G02: [48, 79, 52, 24, 18, 10],
  F01: [54, 68, 31, 16, 10,  8],
  F02: [18, 42, 88, 63, 28, 13],
}

export const roomLoadHeatmap: RoomLoadHeatmapCell[] =
  Object.entries(roomLoads).flatMap(([roomId, values]) =>
    heatmapTimes.map((time, index) => ({ roomId, time, loadPct: values[index] })),
  )
