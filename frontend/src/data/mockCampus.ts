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

const telemetryTimes = ['05:30','05:45','06:00','06:15','06:30','06:45','07:00','07:15','07:30']
const outdoorTemperatures = [7.2, 7.1, 7.3, 7.6, 8.0, 8.4, 8.9, 9.4, 10.0]

function createHistory(
  power: number[],
  indoor: number[],
  occupancy: number[],
  airflow: number[],
  targetTempC = 21,
): DeviceTelemetryPoint[] {
  return telemetryTimes.map((time, i) => ({
    time,
    indoorTempC: indoor[i],
    targetTempC,
    outdoorTempC: outdoorTemperatures[i],
    powerKw: power[i],
    occupancy: occupancy[i],
    airflowM3h: airflow[i],
  }))
}

const heatmapDays = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
const heatmapHours = ['05','07','09','11','13','15','17','19']

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
//  2 floors · 2 rooms per floor
//
//  Floor 1 (y = 3.5–7.0):  [ F01 Seminar A  |  F02 Seminar B  ]
//  Floor 0 (y = 0–3.5  ):  [ G01 Lecture A  |  G02 Lecture B  ]
//
//  Each room: 11.5 m wide × 15.5 m deep × 3.5 m tall
//  Roof at y = 7.0. 16 heat pumps on the roof, 4 per room.

export const rooms: Room[] = [
  // ── Ground floor ──────────────────────────────────────────────────────────
  {
    id: 'G01',
    name: 'Lecture Hall A',
    floor: 0,
    position: [-6, 1.75, 0],
    size: [11.5, 3.5, 15.5],
    status: 'normal',
    currentTemperature: 21.1,
    targetTemperature: 21,
    humidityPct: 43,
    occupancy: 114,
    capacity: 200,
    forecastOccupancy: 120,
    nextEvent: '07:00 · Thermodynamics',
    servedBy: ['HP-G01-1','HP-G01-2','HP-G01-3','HP-G01-4'],
  },
  {
    id: 'G02',
    name: 'Lecture Hall B',
    floor: 0,
    position: [6, 1.75, 0],
    size: [11.5, 3.5, 15.5],
    status: 'at-risk',
    currentTemperature: 18.6,
    targetTemperature: 21,
    humidityPct: 51,
    occupancy: 0,
    capacity: 200,
    forecastOccupancy: 160,
    nextEvent: '08:00 · Flight Systems',
    servedBy: ['HP-G02-1','HP-G02-2','HP-G02-3','HP-G02-4'],
  },
  // ── First floor ───────────────────────────────────────────────────────────
  {
    id: 'F01',
    name: 'Seminar Hall A',
    floor: 1,
    position: [-6, 5.25, 0],
    size: [11.5, 3.5, 15.5],
    status: 'warming',
    currentTemperature: 19.4,
    targetTemperature: 21,
    humidityPct: 47,
    occupancy: 34,
    capacity: 80,
    forecastOccupancy: 60,
    nextEvent: '07:15 · Project Seminar',
    servedBy: ['HP-F01-1','HP-F01-2','HP-F01-3','HP-F01-4'],
  },
  {
    id: 'F02',
    name: 'Seminar Hall B',
    floor: 1,
    position: [6, 5.25, 0],
    size: [11.5, 3.5, 15.5],
    status: 'fault',
    currentTemperature: 16.2,
    targetTemperature: 21,
    humidityPct: 58,
    occupancy: 0,
    capacity: 80,
    forecastOccupancy: 75,
    nextEvent: '08:30 · Aerospace Design',
    servedBy: ['HP-F02-1','HP-F02-2','HP-F02-3','HP-F02-4'],
  },
]

// ── Heat pump factory ─────────────────────────────────────────────────────────
//
//  Roof quadrant layout (all HPs at y = 7.6):
//
//   z < 0  →  G01 (x<0) / G02 (x>0)  ground-floor pumps
//   z > 0  →  F01 (x<0) / F02 (x>0)  first-floor pumps
//
//  Each quadrant holds a 2×2 cluster of pumps.

const HP_COMMON = {
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
  airflowM3h: 4600,
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
}

interface HPParams {
  id: string
  name: string
  roomId: string
  position: [number, number, number]
  status: 'normal' | 'warming' | 'at-risk' | 'fault' | 'standby'
  cop: number
  powerKw: number
  energyKwh: number
  runtimeMin: number
  compressorMin: number
  healthScore: number
  seed: number
  indoor: number[]
  factors: string[]
  alert?: string
  recommendedAction?: string
}

function makeHP(p: HPParams): ClimateDevice {
  return {
    ...HP_COMMON,
    id: p.id,
    name: p.name,
    position: p.position,
    status: p.status,
    servedRoomIds: [p.roomId],
    efficiencyCop: p.cop,
    currentPowerKw: p.powerKw,
    energyTodayKwh: p.energyKwh,
    runtimeTodayMinutes: p.runtimeMin,
    compressorRuntimeMinutes: p.compressorMin,
    healthScore: p.healthScore,
    influencingFactors: p.factors,
    alert: p.alert,
    recommendedAction: p.recommendedAction,
    history: createHistory(
      [
        p.powerKw * 0.35, p.powerKw * 0.55, p.powerKw * 0.78, p.powerKw * 0.92,
        p.powerKw,        p.powerKw * 0.97, p.powerKw * 0.88, p.powerKw * 0.72, p.powerKw * 0.58,
      ],
      p.indoor,
      [0, 0, 0, 0, 12, 58, 114, 114, 76],
      [2200, 2900, 3600, 4200, 4500, 4450, 4200, 3700, 3100],
    ),
    runtimeHeatmap: createRuntimeHeatmap(p.seed, 'heating'),
  }
}

const indoorG01 = [18.5, 18.9, 19.4, 19.9, 20.4, 20.8, 21.0, 21.1, 21.1]
const indoorG02 = [16.2, 16.3, 16.4, 16.6, 16.8, 17.0, 17.2, 17.5, 17.8]
const indoorF01 = [17.8, 18.1, 18.5, 19.0, 19.4, 19.7, 20.0, 20.2, 20.4]
const indoorF02 = [14.0, 14.1, 14.2, 14.3, 14.5, 14.8, 15.1, 15.3, 15.6]

export const climateDevices: ClimateDevice[] = [
  // ── G01 — Lecture Hall A (ground left) — roof quadrant: x<0, z<0 ─────────
  makeHP({ id:'HP-G01-1', name:'HP G01-1 · NW', roomId:'G01', position:[-9,7.6,-6],
    status:'normal', cop:4.0, powerKw:5.8, energyKwh:21.8, runtimeMin:224, compressorMin:177,
    healthScore:96, seed:1, indoor:indoorG01,
    factors:['Lecture Hall A at target temperature','114 occupants add internal heat'] }),

  makeHP({ id:'HP-G01-2', name:'HP G01-2 · NE', roomId:'G01', position:[-3,7.6,-6],
    status:'normal', cop:3.9, powerKw:5.6, energyKwh:20.4, runtimeMin:218, compressorMin:170,
    healthScore:95, seed:2, indoor:indoorG01,
    factors:['Operating within expected thermal model','Outdoor temp 7–10 °C'] }),

  makeHP({ id:'HP-G01-3', name:'HP G01-3 · SW', roomId:'G01', position:[-9,7.6,-2],
    status:'normal', cop:4.1, powerKw:5.9, energyKwh:22.1, runtimeMin:228, compressorMin:180,
    healthScore:97, seed:3, indoor:indoorG01,
    factors:['Compressor runtime within healthy range'] }),

  makeHP({ id:'HP-G01-4', name:'HP G01-4 · SE', roomId:'G01', position:[-3,7.6,-2],
    status:'normal', cop:3.8, powerKw:5.5, energyKwh:19.9, runtimeMin:210, compressorMin:162,
    healthScore:94, seed:4, indoor:indoorG01,
    factors:['Normal airflow and fresh-air ratio'] }),

  // ── G02 — Lecture Hall B (ground right) — roof quadrant: x>0, z<0 ────────
  makeHP({ id:'HP-G02-1', name:'HP G02-1 · NW', roomId:'G02', position:[3,7.6,-6],
    status:'at-risk', cop:2.7, powerKw:6.4, energyKwh:24.6, runtimeMin:248, compressorMin:218,
    healthScore:68, seed:5, indoor:indoorG02,
    factors:['Warming rate 38 % below expected','Fresh-air ratio elevated'],
    alert:'Observed warming rate is 38 % below expected while compressor is active.',
    recommendedAction:'Inspect flexible ducts, airflow restriction and filter condition.' }),

  makeHP({ id:'HP-G02-2', name:'HP G02-2 · NE', roomId:'G02', position:[9,7.6,-6],
    status:'at-risk', cop:2.5, powerKw:6.2, energyKwh:23.8, runtimeMin:244, compressorMin:210,
    healthScore:65, seed:6, indoor:indoorG02,
    factors:['Compressor running continuously without adequate room response'],
    alert:'High compressor runtime with low thermal gain.',
    recommendedAction:'Check refrigerant charge and filter condition.' }),

  makeHP({ id:'HP-G02-3', name:'HP G02-3 · SW', roomId:'G02', position:[3,7.6,-2],
    status:'normal', cop:3.4, powerKw:5.8, energyKwh:21.0, runtimeMin:220, compressorMin:180,
    healthScore:82, seed:7, indoor:indoorG02,
    factors:['Operating normally','Monitoring for duct restriction signs'] }),

  makeHP({ id:'HP-G02-4', name:'HP G02-4 · SE', roomId:'G02', position:[9,7.6,-2],
    status:'normal', cop:3.5, powerKw:5.6, energyKwh:20.5, runtimeMin:215, compressorMin:175,
    healthScore:83, seed:8, indoor:indoorG02,
    factors:['Healthy COP for current outdoor conditions'] }),

  // ── F01 — Seminar Hall A (first floor left) — roof quadrant: x<0, z>0 ────
  makeHP({ id:'HP-F01-1', name:'HP F01-1 · NW', roomId:'F01', position:[-9,7.6,2],
    status:'normal', cop:3.7, powerKw:5.4, energyKwh:19.6, runtimeMin:200, compressorMin:158,
    healthScore:93, seed:9, indoor:indoorF01,
    factors:['Seminar Hall A warming towards 21 °C','34 occupants present'] }),

  makeHP({ id:'HP-F01-2', name:'HP F01-2 · NE', roomId:'F01', position:[-3,7.6,2],
    status:'normal', cop:3.6, powerKw:5.2, energyKwh:18.8, runtimeMin:195, compressorMin:152,
    healthScore:92, seed:10, indoor:indoorF01,
    factors:['Operating within thermal model'] }),

  makeHP({ id:'HP-F01-3', name:'HP F01-3 · SW', roomId:'F01', position:[-9,7.6,6],
    status:'normal', cop:3.8, powerKw:5.5, energyKwh:20.0, runtimeMin:205, compressorMin:162,
    healthScore:94, seed:11, indoor:indoorF01,
    factors:['Healthy compressor operation'] }),

  makeHP({ id:'HP-F01-4', name:'HP F01-4 · SE', roomId:'F01', position:[-3,7.6,6],
    status:'warming', cop:3.5, powerKw:5.3, energyKwh:19.2, runtimeMin:198, compressorMin:156,
    healthScore:90, seed:12, indoor:indoorF01,
    factors:['Slightly below expected response — monitoring'] }),

  // ── F02 — Seminar Hall B (first floor right) — roof quadrant: x>0, z>0 ───
  makeHP({ id:'HP-F02-1', name:'HP F02-1 · NW', roomId:'F02', position:[3,7.6,2],
    status:'fault', cop:0.8, powerKw:3.1, energyKwh:11.2, runtimeMin:310, compressorMin:295,
    healthScore:28, seed:13, indoor:indoorF02,
    factors:['Non-zero error register (Reg 1902 bit 1)','Circuit 1 pressure alarm active'],
    alert:'Error register 1902 non-zero. Circuit 1 low pressure condition.',
    recommendedAction:'Check refrigerant charge, inspect expansion valve and outdoor coil.' }),

  makeHP({ id:'HP-F02-2', name:'HP F02-2 · NE', roomId:'F02', position:[9,7.6,2],
    status:'fault', cop:0.9, powerKw:3.3, energyKwh:11.8, runtimeMin:305, compressorMin:290,
    healthScore:31, seed:14, indoor:indoorF02,
    factors:['Circuit 1 low pressure alarm active','Compressor at reduced capacity'],
    alert:'Circuit 1 low pressure alarm. Possible refrigerant loss.',
    recommendedAction:'Check for refrigerant leaks and outdoor coil icing.' }),

  makeHP({ id:'HP-F02-3', name:'HP F02-3 · SW', roomId:'F02', position:[3,7.6,6],
    status:'at-risk', cop:1.8, powerKw:4.2, energyKwh:15.4, runtimeMin:280, compressorMin:252,
    healthScore:52, seed:15, indoor:indoorF02,
    factors:['COP severely degraded','Monitoring for escalation'],
    alert:'COP below threshold — possible cascade from adjacent units.',
    recommendedAction:'Reduce setpoint and schedule inspection.' }),

  makeHP({ id:'HP-F02-4', name:'HP F02-4 · SE', roomId:'F02', position:[9,7.6,6],
    status:'at-risk', cop:2.0, powerKw:4.4, energyKwh:16.0, runtimeMin:270, compressorMin:240,
    healthScore:55, seed:16, indoor:indoorF02,
    factors:['Operating at reduced efficiency','Cascade risk from HP-F02-1 / HP-F02-2'] }),
]

// ── Building telemetry (aggregated across all 4 rooms) ───────────────────────

export const buildingTelemetry: BuildingTelemetryPoint[] = telemetryTimes.map((time, i) => ({
  time,
  actualPowerKw:      [24.8, 41.6, 63.2, 77.6, 79.2, 78.0, 68.8, 60.4, 52.8][i],
  baselinePowerKw:    [86.0, 88.0, 92.0, 98.0,100.0,100.0, 96.0, 92.0, 88.0][i],
  averageIndoorTempC: [17.7, 17.9, 18.3, 18.8, 19.2, 19.6, 19.9, 20.1, 20.2][i],
  outdoorTempC: outdoorTemperatures[i],
  totalOccupancy: [0, 0, 0, 0, 46, 230, 356, 310, 188][i],
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
    id: 'decision-1', time: '06:42', roomId: 'G01', deviceId: 'HP-G01-1',
    action: 'Reduce compressor load to 62 %',
    reason: 'Room at target; 114 occupants supply internal heat.',
    status: 'active',
  },
  {
    id: 'decision-2', time: '06:45', roomId: 'F01', deviceId: 'HP-F01-1',
    action: 'Keep ventilation only',
    reason: 'Lecture begins at 07:15; solar gain offsets remaining deficit.',
    status: 'planned',
  },
  {
    id: 'decision-3', time: '06:47', roomId: 'G02', deviceId: 'HP-G02-1',
    action: 'Maintain full heating and inspect unit',
    reason: 'Warming rate below expectation; high-occupancy lecture at 08:00.',
    status: 'active',
  },
  {
    id: 'decision-4', time: '06:52', roomId: 'F02', deviceId: 'HP-F02-1',
    action: 'Flag for maintenance — error register active',
    reason: 'Circuit 1 low pressure alarm on two units. Manual inspection required.',
    status: 'planned',
  },
]

export const plannedActions: PlannedAction[] = [
  { id: 'action-1', time: '06:45', label: 'Keep ventilation only',      location: 'F01',      type: 'reduce'  },
  { id: 'action-2', time: '06:52', label: 'Reduce compressor to 45 %', location: 'G01',      type: 'reduce'  },
  { id: 'action-3', time: '07:03', label: 'Technical inspection',       location: 'HP-F02-1', type: 'inspect' },
  { id: 'action-4', time: '07:20', label: 'Begin preconditioning',      location: 'F02',      type: 'start'   },
]

const heatmapTimes = ['06','07','08','09','10','11']

const roomLoads: Record<string, number[]> = {
  G01: [86, 72, 44, 18, 12,  8],
  G02: [48, 79, 52, 24, 18, 10],
  F01: [54, 68, 31, 16, 10,  8],
  F02: [18, 42, 88, 63, 28, 13],
}

export const roomLoadHeatmap: RoomLoadHeatmapCell[] = Object.entries(roomLoads).flatMap(
  ([roomId, values]) =>
    heatmapTimes.map((time, i) => ({ roomId, time, loadPct: values[i] })),
)
