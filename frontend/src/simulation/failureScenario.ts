import {
  buildingTelemetry as baseBuildingTelemetry,
  climateDevices as baseClimateDevices,
  controlDecisions as baseControlDecisions,
  rooms as baseRooms,
} from '../data/mockCampus'
import type {
  BuildingTelemetryPoint,
  ClimateDevice,
  ControlDecision,
  Room,
} from '../types/campus'
import type {
  DetectionEvidence,
  FailureSimulationFrame,
  FailureSimulationPhase,
  FailureSimulationStatus,
  SimulationLogEntry,
  SimulationSeverity,
} from './types'

export const FAILURE_SIMULATION_DURATION_SECONDS = 60

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value))
}

function interpolate(
  start: number,
  end: number,
  progress: number,
): number {
  return start + (end - start) * clamp(progress, 0, 1)
}

function progressBetween(
  elapsedSeconds: number,
  start: number,
  end: number,
): number {
  if (end <= start) {
    return 1
  }

  return clamp(
    (elapsedSeconds - start) / (end - start),
    0,
    1,
  )
}

function getPhase(
  elapsedSeconds: number,
): FailureSimulationPhase {
  if (elapsedSeconds <= 0) return 'idle'
  if (elapsedSeconds < 8) return 'normal'
  if (elapsedSeconds < 16) return 'occupancy-adaptation'
  if (elapsedSeconds < 22) return 'transient-disturbance'
  if (elapsedSeconds < 31) return 'fault-developing'
  if (elapsedSeconds < 38) return 'detecting'
  if (elapsedSeconds < 44) return 'warning'
  if (elapsedSeconds < 50) return 'mitigation'
  if (elapsedSeconds < 58) return 'recovery'
  return 'complete'
}

function cloneRooms(): Room[] {
  return baseRooms.map((room) => ({
    ...room,
    servedBy: [...room.servedBy],
  }))
}

function cloneDevices(): ClimateDevice[] {
  return baseClimateDevices.map((device) => ({
    ...device,
    servedRoomIds: [...device.servedRoomIds],
    features: [...device.features],
    influencingFactors: [...device.influencingFactors],
    history: device.history.map((point) => ({ ...point })),
    runtimeHeatmap: device.runtimeHeatmap.map((cell) => ({ ...cell })),
  }))
}

function createBaseNormalState(
  rooms: Room[],
  devices: ClimateDevice[],
): void {
  for (const room of rooms) {
    if (room.id === 'G01') {
      room.status = 'warming'
      room.currentTemperature = 20.4
      room.occupancy = 12
    } else if (room.id === 'G03') {
      room.status = 'warming'
      room.currentTemperature = 19.5
      room.occupancy = 0
    } else if (room.id === 'F03') {
      room.status = 'normal'
      room.currentTemperature = 20.1
    } else if (room.status === 'fault' || room.status === 'at-risk') {
      room.status = 'normal'
    }
  }

  for (const device of devices) {
    device.alert = undefined
    device.recommendedAction = undefined

    if (device.id === 'ORION-01') {
      device.status = 'normal'
      device.operatingMode = 'heating'
      device.currentPowerKw = 6.2
      device.energyTodayKwh = 18.4
      device.healthScore = 97
      device.efficiencyCop = 4.0
      device.freshAirRatioPct = 34
      device.supplyFanSpeedPct = 68
      device.airflowM3h = 4600
      device.influencingFactors = [
        'G01 lecture begins at 07:00',
        'The room is still below its 21°C target',
        'Cold and windy outdoor conditions increase envelope losses',
      ]
    }

    if (device.id === 'ORION-02') {
      device.status = 'normal'
      device.operatingMode = 'heating'
      device.currentPowerKw = 9.8
      device.energyTodayKwh = 24.6
      device.healthScore = 96
      device.efficiencyCop = 3.35
      device.airflowM3h = 6000
      device.freshAirRatioPct = 48
      device.supplyFanSpeedPct = 82
      device.influencingFactors = [
        'G03 must reach 21°C before the 08:00 lecture',
        'Expected occupancy is 146 students',
        'Current warming response matches the thermal model',
        'Outdoor temperature remains below 10°C',
      ]
    }

    if (device.id === 'ORION-03') {
      device.status = 'normal'
      device.operatingMode = 'ventilation'
      device.currentPowerKw = 1.0
      device.healthScore = 95
    }

    if (device.id === 'S-F03') {
      device.status = 'normal'
      device.healthScore = 97
      device.alert = undefined
      device.recommendedAction = undefined
      device.influencingFactors = [
        'Temperature agrees with the room thermal model',
        'No sensor drift or communication gap detected',
      ]
    }
  }
}

function getRoom(
  rooms: Room[],
  roomId: string,
): Room {
  const room = rooms.find((candidate) => candidate.id === roomId)

  if (!room) {
    throw new Error(`Simulation room ${roomId} was not found`)
  }

  return room
}

function getDevice(
  devices: ClimateDevice[],
  deviceId: string,
): ClimateDevice {
  const device = devices.find(
    (candidate) => candidate.id === deviceId,
  )

  if (!device) {
    throw new Error(`Simulation device ${deviceId} was not found`)
  }

  return device
}

function updateNormalOperation(
  elapsedSeconds: number,
  rooms: Room[],
  devices: ClimateDevice[],
): void {
  const g01 = getRoom(rooms, 'G01')
  const orion01 = getDevice(devices, 'ORION-01')

  const normalProgress = progressBetween(elapsedSeconds, 0, 8)

  g01.currentTemperature = interpolate(20.4, 20.8, normalProgress)
  orion01.currentPowerKw = interpolate(6.2, 5.7, normalProgress)
}

function updateOccupancyAdaptation(
  elapsedSeconds: number,
  rooms: Room[],
  devices: ClimateDevice[],
): void {
  if (elapsedSeconds < 8) return

  const g01 = getRoom(rooms, 'G01')
  const orion01 = getDevice(devices, 'ORION-01')
  const progress = progressBetween(elapsedSeconds, 8, 16)

  g01.occupancy = Math.round(interpolate(12, 114, progress))
  g01.currentTemperature = interpolate(20.8, 21.1, progress)
  g01.status = progress > 0.65 ? 'normal' : 'warming'

  orion01.currentPowerKw = interpolate(5.7, 3.9, progress)
  orion01.freshAirRatioPct = Math.round(interpolate(34, 67, progress))
  orion01.supplyFanSpeedPct = Math.round(interpolate(68, 76, progress))
  orion01.operatingMode = progress > 0.5 ? 'ventilation' : 'heating'
  orion01.influencingFactors = [
    `${g01.occupancy} students are now contributing internal heat`,
    'HeatSync reduces compressor load as the room reaches target',
    'Fresh-air demand increases with occupancy',
    'The fixed-schedule baseline would still run at full heating power',
  ]
}

function updateTransientDisturbance(
  elapsedSeconds: number,
  rooms: Room[],
  devices: ClimateDevice[],
): void {
  if (elapsedSeconds < 16) return

  const g01 = getRoom(rooms, 'G01')
  const orion01 = getDevice(devices, 'ORION-01')

  const localSecond = elapsedSeconds - 16
  const disturbance =
    localSecond <= 2
      ? interpolate(0, 0.55, localSecond / 2)
      : interpolate(0.55, 0, (localSecond - 2) / 4)

  g01.currentTemperature = 21.1 - disturbance
  g01.status = 'normal'
  orion01.currentPowerKw = 4.1
  orion01.influencingFactors = [
    'A short temperature dip was detected in G01',
    'The signal recovered within the transient-event window',
    'Occupancy and airflow remained consistent',
    'HeatSync classified this as a door-opening disturbance and did not raise a fault',
  ]
}

function updateFaultDevelopment(
  elapsedSeconds: number,
  rooms: Room[],
  devices: ClimateDevice[],
): void {
  if (elapsedSeconds < 22) return

  const g03 = getRoom(rooms, 'G03')
  const orion02 = getDevice(devices, 'ORION-02')
  const progress = progressBetween(elapsedSeconds, 22, 31)

  orion02.currentPowerKw = interpolate(9.8, 10.3, progress)
  orion02.airflowM3h = Math.round(interpolate(6000, 3150, progress))
  orion02.supplyFanSpeedPct = Math.round(interpolate(82, 96, progress))
  orion02.efficiencyCop = interpolate(3.35, 2.55, progress)
  orion02.healthScore = Math.round(interpolate(96, 76, progress))
  orion02.status = progress > 0.72 ? 'at-risk' : 'normal'

  g03.currentTemperature = interpolate(19.5, 19.72, progress)
  g03.status = progress > 0.7 ? 'at-risk' : 'warming'

  orion02.influencingFactors = [
    'Electrical input remains close to maximum',
    `Measured supply airflow has fallen to ${orion02.airflowM3h?.toLocaleString()} m³/h`,
    'G03 temperature is rising more slowly than predicted',
    'The disturbance is persistent and does not match a door-opening pattern',
  ]
}

function updateDetection(
  elapsedSeconds: number,
  rooms: Room[],
  devices: ClimateDevice[],
): void {
  if (elapsedSeconds < 31) return

  const g03 = getRoom(rooms, 'G03')
  const orion02 = getDevice(devices, 'ORION-02')
  const progress = progressBetween(elapsedSeconds, 31, 38)

  orion02.currentPowerKw = 10.3
  orion02.airflowM3h = Math.round(interpolate(3150, 2980, progress))
  orion02.supplyFanSpeedPct = 97
  orion02.healthScore = Math.round(interpolate(76, 66, progress))
  orion02.status = 'at-risk'
  orion02.efficiencyCop = interpolate(2.55, 2.42, progress)

  g03.currentTemperature = interpolate(19.72, 19.79, progress)
  g03.status = 'at-risk'

  orion02.alert =
    'Early warning: persistent loss of delivered airflow is causing a slower-than-expected thermal response.'
  orion02.recommendedAction =
    'Inspect the return-air filter, flexible ducts and fan path. Keep the unit in safe supervised operation until airflow is verified.'
}

function updateWarning(
  elapsedSeconds: number,
  rooms: Room[],
  devices: ClimateDevice[],
): void {
  if (elapsedSeconds < 38) return

  const g03 = getRoom(rooms, 'G03')
  const orion02 = getDevice(devices, 'ORION-02')

  orion02.status = 'fault'
  orion02.currentPowerKw = 10.3
  orion02.airflowM3h = 2950
  orion02.supplyFanSpeedPct = 98
  orion02.healthScore = 58
  orion02.efficiencyCop = 2.38
  orion02.alert =
    'Likely airflow restriction: the unit draws high electrical power while measured airflow and room warming remain far below expectation.'
  orion02.recommendedAction =
    'Technician inspection required: check and replace a clogged return-air filter, then verify the flexible duct path and fan airflow.'
  orion02.influencingFactors = [
    'Power input is 10.3 kW, close to the expected maximum',
    'Airflow is 51% below the configured 6,000 m³/h value',
    'Observed warming is 0.18°C per hour versus 0.72°C per hour expected',
    'The deviation persisted across three consecutive validation windows',
    'No matching door event, schedule change or occupancy explanation was found',
  ]

  g03.currentTemperature = 19.8
  g03.status = 'fault'
}

function updateMitigation(
  elapsedSeconds: number,
  rooms: Room[],
  devices: ClimateDevice[],
): void {
  if (elapsedSeconds < 44) return

  const g03 = getRoom(rooms, 'G03')
  const orion02 = getDevice(devices, 'ORION-02')
  const progress = progressBetween(elapsedSeconds, 44, 50)

  orion02.status = 'fault'
  orion02.currentPowerKw = interpolate(10.3, 8.8, progress)
  orion02.airflowM3h = Math.round(interpolate(2950, 3300, progress))
  orion02.supplyFanSpeedPct = 90
  orion02.healthScore = 61
  orion02.alert =
    'Safe mitigation active while technician inspection is simulated.'
  orion02.recommendedAction =
    'HeatSync has extended the G03 preconditioning window, prevented repeated power escalation and requested filter and duct inspection.'

  g03.status = 'at-risk'
  g03.currentTemperature = interpolate(19.8, 19.92, progress)
}

function updateRecovery(
  elapsedSeconds: number,
  rooms: Room[],
  devices: ClimateDevice[],
): void {
  if (elapsedSeconds < 50) return

  const g03 = getRoom(rooms, 'G03')
  const orion02 = getDevice(devices, 'ORION-02')
  const progress = progressBetween(elapsedSeconds, 50, 58)

  orion02.status = progress > 0.65 ? 'normal' : 'warming'
  orion02.currentPowerKw = interpolate(8.8, 7.0, progress)
  orion02.airflowM3h = Math.round(interpolate(3300, 5900, progress))
  orion02.supplyFanSpeedPct = Math.round(interpolate(90, 83, progress))
  orion02.efficiencyCop = interpolate(2.45, 3.28, progress)
  orion02.healthScore = Math.round(interpolate(61, 92, progress))
  orion02.alert =
    progress > 0.65
      ? undefined
      : 'Recovery verification: airflow has returned and the room warming rate is improving.'
  orion02.recommendedAction =
    progress > 0.65
      ? undefined
      : 'Continue supervised operation until three normal response windows are observed.'
  orion02.influencingFactors = [
    'The simulated technician cleared the restricted return-air filter',
    `Supply airflow recovered to ${orion02.airflowM3h?.toLocaleString()} m³/h`,
    'Electrical input is falling as delivered heat becomes effective again',
    'Observed temperature response is returning to the model confidence band',
  ]

  g03.currentTemperature = interpolate(19.92, 20.75, progress)
  g03.status = progress > 0.72 ? 'normal' : 'warming'
}

function updateComplete(
  elapsedSeconds: number,
  rooms: Room[],
  devices: ClimateDevice[],
): void {
  if (elapsedSeconds < 58) return

  const g03 = getRoom(rooms, 'G03')
  const orion02 = getDevice(devices, 'ORION-02')

  orion02.status = 'normal'
  orion02.operatingMode = 'heating'
  orion02.currentPowerKw = 6.6
  orion02.airflowM3h = 5980
  orion02.supplyFanSpeedPct = 80
  orion02.efficiencyCop = 3.32
  orion02.healthScore = 94
  orion02.alert = undefined
  orion02.recommendedAction = undefined
  orion02.influencingFactors = [
    'Airflow and thermal response are inside the normal confidence band',
    'G03 remains on track for the 08:00 lecture',
    'The incident is resolved and retained in the audit log',
  ]

  g03.currentTemperature = 20.9
  g03.status = 'normal'
}

function appendLiveDeviceHistory(
  elapsedSeconds: number,
  rooms: Room[],
  devices: ClimateDevice[],
): void {
  const g01 = getRoom(rooms, 'G01')
  const g03 = getRoom(rooms, 'G03')
  const orion01 = getDevice(devices, 'ORION-01')
  const orion02 = getDevice(devices, 'ORION-02')
  const timeLabel = `+${elapsedSeconds}s`

  orion01.history = [
    ...orion01.history.slice(-7),
    {
      time: timeLabel,
      indoorTempC: Number(g01.currentTemperature.toFixed(2)),
      targetTempC: g01.targetTemperature,
      outdoorTempC: 8.9,
      powerKw: Number(orion01.currentPowerKw.toFixed(2)),
      occupancy: g01.occupancy,
      airflowM3h: orion01.airflowM3h ?? 0,
    },
  ]

  orion02.history = [
    ...orion02.history.slice(-7),
    {
      time: timeLabel,
      indoorTempC: Number(g03.currentTemperature.toFixed(2)),
      targetTempC: g03.targetTemperature,
      outdoorTempC: 8.9,
      powerKw: Number(orion02.currentPowerKw.toFixed(2)),
      occupancy: g03.occupancy,
      airflowM3h: orion02.airflowM3h ?? 0,
    },
  ]
}

function createBuildingTelemetry(
  elapsedSeconds: number,
  devices: ClimateDevice[],
  rooms: Room[],
): BuildingTelemetryPoint[] {
  const currentPower = devices.reduce(
    (total, device) => total + device.currentPowerKw,
    0,
  )
  const totalOccupancy = rooms.reduce(
    (total, room) => total + room.occupancy,
    0,
  )
  const averageIndoorTemp =
    rooms.reduce(
      (total, room) => total + room.currentTemperature,
      0,
    ) / rooms.length

  return [
    ...baseBuildingTelemetry.slice(-7),
    {
      time: `+${elapsedSeconds}s`,
      actualPowerKw: Number(currentPower.toFixed(2)),
      baselinePowerKw: 25.0,
      averageIndoorTempC: Number(
        averageIndoorTemp.toFixed(2),
      ),
      outdoorTempC: 8.9,
      totalOccupancy,
    },
  ]
}

function createControlDecisions(
  elapsedSeconds: number,
): ControlDecision[] {
  const decisions: ControlDecision[] = [
    ...baseControlDecisions.slice(0, 2),
  ]

  if (elapsedSeconds >= 8) {
    decisions.unshift({
      id: 'simulation-occupancy',
      time: '+08s',
      roomId: 'G01',
      deviceId: 'ORION-01',
      action: 'Reduce compressor load and increase ventilation',
      reason:
        'Student arrival creates internal heat while fresh-air demand rises.',
      status: 'completed',
    })
  }

  if (elapsedSeconds >= 16) {
    decisions.unshift({
      id: 'simulation-door',
      time: '+16s',
      roomId: 'G01',
      deviceId: 'ORION-01',
      action: 'No fault action',
      reason:
        'The short temperature dip recovered inside the transient-event window and matched a door-opening pattern.',
      status: 'completed',
    })
  }

  if (elapsedSeconds >= 31) {
    decisions.unshift({
      id: 'simulation-watch',
      time: '+31s',
      roomId: 'G03',
      deviceId: 'ORION-02',
      action: 'Escalate residual monitoring',
      reason:
        'High power input, low airflow and slow warming persisted across multiple samples.',
      status: elapsedSeconds >= 38 ? 'completed' : 'active',
    })
  }

  if (elapsedSeconds >= 38) {
    decisions.unshift({
      id: 'simulation-warning',
      time: '+38s',
      roomId: 'G03',
      deviceId: 'ORION-02',
      action: 'Issue early warning and request inspection',
      reason:
        'The evidence is consistent with an airflow restriction rather than weather, occupancy or a short door disturbance.',
      status: elapsedSeconds >= 50 ? 'completed' : 'active',
    })
  }

  if (elapsedSeconds >= 44) {
    decisions.unshift({
      id: 'simulation-mitigation',
      time: '+44s',
      roomId: 'G03',
      deviceId: 'ORION-02',
      action: 'Enter safe supervised mitigation',
      reason:
        'HeatSync extends the preconditioning window and prevents repeated power escalation while the technician checks the unit.',
      status: elapsedSeconds >= 50 ? 'completed' : 'active',
    })
  }

  if (elapsedSeconds >= 50) {
    decisions.unshift({
      id: 'simulation-recovery',
      time: '+50s',
      roomId: 'G03',
      deviceId: 'ORION-02',
      action: 'Verify recovery after filter restriction is cleared',
      reason:
        'Airflow, COP and room warming are returning to their expected confidence bands.',
      status: elapsedSeconds >= 58 ? 'completed' : 'active',
    })
  }

  return decisions
}

function createEvidence(
  elapsedSeconds: number,
  phase: FailureSimulationPhase,
): DetectionEvidence[] {
  if (
    phase === 'idle' ||
    phase === 'normal' ||
    phase === 'occupancy-adaptation'
  ) {
    return [
      {
        label: 'Thermal-model residual',
        observed: '0.12°C',
        expected: '< 0.50°C',
        state: 'normal',
      },
      {
        label: 'Supply airflow',
        observed: '6,000 m³/h',
        expected: '5,700–6,200 m³/h',
        state: 'normal',
      },
      {
        label: 'Warming rate',
        observed: '0.70°C/h',
        expected: '0.62–0.78°C/h',
        state: 'normal',
      },
    ]
  }

  if (phase === 'transient-disturbance') {
    return [
      {
        label: 'Temperature dip',
        observed: '−0.55°C',
        expected: 'Transient',
        state: 'warning',
      },
      {
        label: 'Recovery time',
        observed: '< 4 min',
        expected: '< 8 min',
        state: 'normal',
      },
      {
        label: 'Persistence',
        observed: '1 window',
        expected: '3 windows for fault',
        state: 'normal',
      },
    ]
  }

  const faultProgress = progressBetween(elapsedSeconds, 22, 38)
  const airflow = Math.round(interpolate(6000, 2950, faultProgress))
  const residual = interpolate(0.25, 1.42, faultProgress)
  const warmingRate = interpolate(0.67, 0.18, faultProgress)

  return [
    {
      label: 'Thermal-model residual',
      observed: `${residual.toFixed(2)}°C`,
      expected: '< 0.50°C',
      state: residual > 1.0 ? 'critical' : 'warning',
    },
    {
      label: 'Supply airflow',
      observed: `${airflow.toLocaleString()} m³/h`,
      expected: '5,700–6,200 m³/h',
      state: airflow < 3600 ? 'critical' : 'warning',
    },
    {
      label: 'Warming rate',
      observed: `${warmingRate.toFixed(2)}°C/h`,
      expected: '0.62–0.78°C/h',
      state: warmingRate < 0.3 ? 'critical' : 'warning',
    },
    {
      label: 'Electrical input',
      observed: '10.3 kW',
      expected: '9.5–10.4 kW',
      state: 'normal',
    },
  ]
}

function createLog(
  elapsedSeconds: number,
): SimulationLogEntry[] {
  const entries: SimulationLogEntry[] = [
    {
      second: 1,
      title: 'Normal control verified',
      detail:
        'Weather, schedules and room temperatures are inside the expected operating envelope.',
      type: 'normal',
    },
    {
      second: 8,
      title: 'Occupancy-adaptive regulation',
      detail:
        'G01 compressor load is reduced while ventilation increases for arriving students.',
      type: 'decision',
    },
    {
      second: 16,
      title: 'Transient disturbance ignored',
      detail:
        'A short G01 temperature dip recovers quickly and is classified as a door-opening event.',
      type: 'normal',
    },
    {
      second: 22,
      title: 'Abnormal response begins',
      detail:
        'ORION-02 airflow falls while electrical input remains high.',
      type: 'warning',
    },
    {
      second: 31,
      title: 'Persistence threshold reached',
      detail:
        'The thermal residual and airflow deviation remain abnormal for three validation windows.',
      type: 'warning',
    },
    {
      second: 38,
      title: 'Early warning issued',
      detail:
        'HeatSync identifies a likely filter or duct airflow restriction and predicts a G03 readiness delay.',
      type: 'warning',
    },
    {
      second: 44,
      title: 'Safe mitigation activated',
      detail:
        'The room preconditioning buffer is extended and repeated power escalation is blocked.',
      type: 'action',
    },
    {
      second: 50,
      title: 'Simulated technician intervention',
      detail:
        'A restricted return-air filter is cleared and airflow begins to recover.',
      type: 'action',
    },
    {
      second: 58,
      title: 'Recovery verified',
      detail:
        'Airflow, COP and room temperature response return to the normal confidence band.',
      type: 'resolved',
    },
  ]

  return entries.filter(
    (entry) => entry.second <= elapsedSeconds,
  )
}

function createStatus(
  elapsedSeconds: number,
  phase: FailureSimulationPhase,
): FailureSimulationStatus {
  let title = 'Ready to run the early-warning demo'
  let narrative =
    'Press play to demonstrate normal optimisation, a harmless transient disturbance, fault development, detection, explanation, mitigation and recovery.'
  let severity: SimulationSeverity = 'none'
  let detectionConfidencePct = 0
  let delayMinutes = 0
  let recommendedAction: string | null = null
  let mitigationAction: string | null = null
  let targetDeviceId: string | null = null
  let targetRoomId: string | null = null

  if (phase === 'normal') {
    title = 'Normal operation'
    narrative =
      'HeatSync follows the weather forecast and room schedules while every device remains inside its expected thermal-response band.'
    severity = 'none'
    detectionConfidencePct = 98
  }

  if (phase === 'occupancy-adaptation') {
    title = 'Students arrive — control adapts'
    narrative =
      'Internal heat from G01 occupants allows compressor power to fall while ventilation rises to serve the occupied lecture.'
    severity = 'information'
    detectionConfidencePct = 97
  }

  if (phase === 'transient-disturbance') {
    title = 'Short door-opening disturbance'
    narrative =
      'A rapid temperature dip is detected, but it recovers quickly. HeatSync correctly avoids a noisy fault alert.'
    severity = 'information'
    detectionConfidencePct = 91
    targetDeviceId = 'ORION-01'
    targetRoomId = 'G01'
  }

  if (phase === 'fault-developing') {
    title = 'Something is beginning to fail'
    narrative =
      'ORION-02 electrical input remains high, but delivered airflow is falling and G03 warms more slowly than predicted.'
    severity = 'warning'
    detectionConfidencePct = Math.round(
      interpolate(
        34,
        64,
        progressBetween(elapsedSeconds, 22, 31),
      ),
    )
    delayMinutes = Math.round(
      interpolate(
        3,
        12,
        progressBetween(elapsedSeconds, 22, 31),
      ),
    )
    targetDeviceId = 'ORION-02'
    targetRoomId = 'G03'
  }

  if (phase === 'detecting') {
    title = 'HeatSync validates the abnormal pattern'
    narrative =
      'The residual persists across multiple samples and cannot be explained by weather, occupancy, schedule changes or a short door event.'
    severity = 'warning'
    detectionConfidencePct = Math.round(
      interpolate(
        66,
        89,
        progressBetween(elapsedSeconds, 31, 38),
      ),
    )
    delayMinutes = Math.round(
      interpolate(
        12,
        22,
        progressBetween(elapsedSeconds, 31, 38),
      ),
    )
    targetDeviceId = 'ORION-02'
    targetRoomId = 'G03'
  }

  if (phase === 'warning') {
    title = 'Early warning: likely airflow restriction'
    narrative =
      'High power, low airflow and a slow thermal response point to a clogged filter or restricted duct path.'
    severity = 'critical'
    detectionConfidencePct = 93
    delayMinutes = 24
    targetDeviceId = 'ORION-02'
    targetRoomId = 'G03'
    recommendedAction =
      'Inspect and replace the return-air filter, then verify flexible ducts and delivered airflow.'
  }

  if (phase === 'mitigation') {
    title = 'Safe mitigation while the technician responds'
    narrative =
      'HeatSync extends the G03 preconditioning window, blocks repeated power escalation and keeps the unit under supervised control.'
    severity = 'critical'
    detectionConfidencePct = 95
    delayMinutes = 18
    targetDeviceId = 'ORION-02'
    targetRoomId = 'G03'
    recommendedAction =
      'Inspect the return-air filter and duct path.'
    mitigationAction =
      'Preheating buffer extended; aggressive power escalation blocked; technician inspection requested.'
  }

  if (phase === 'recovery') {
    title = 'Recovery after simulated filter correction'
    narrative =
      'Airflow, COP and room warming are returning to normal. HeatSync waits for stable evidence before closing the incident.'
    severity = 'recovering'
    detectionConfidencePct = 97
    delayMinutes = Math.round(
      interpolate(
        16,
        2,
        progressBetween(elapsedSeconds, 50, 58),
      ),
    )
    targetDeviceId = 'ORION-02'
    targetRoomId = 'G03'
    mitigationAction =
      'Continue supervised operation until three normal response windows are observed.'
  }

  if (phase === 'complete') {
    title = 'Incident resolved and verified'
    narrative =
      'The filter restriction is cleared, G03 is back on track and the complete incident remains available in the audit log.'
    severity = 'resolved'
    detectionConfidencePct = 98
    delayMinutes = 0
    targetDeviceId = 'ORION-02'
    targetRoomId = 'G03'
    mitigationAction =
      'Normal predictive control restored.'
  }

  return {
    phase,
    title,
    narrative,
    elapsedSeconds,
    durationSeconds: FAILURE_SIMULATION_DURATION_SECONDS,
    progressPct:
      (elapsedSeconds / FAILURE_SIMULATION_DURATION_SECONDS) *
      100,
    severity,
    detectionConfidencePct,
    predictedReadinessDelayMinutes: delayMinutes,
    targetDeviceId,
    targetRoomId,
    recommendedAction,
    mitigationAction,
    evidence: createEvidence(elapsedSeconds, phase),
    log: createLog(elapsedSeconds),
  }
}

export function buildFailureSimulationFrame(
  elapsedSeconds: number,
): FailureSimulationFrame {
  const boundedElapsed = clamp(
    elapsedSeconds,
    0,
    FAILURE_SIMULATION_DURATION_SECONDS,
  )
  const phase = getPhase(boundedElapsed)
  const rooms = cloneRooms()
  const devices = cloneDevices()

  createBaseNormalState(rooms, devices)
  updateNormalOperation(boundedElapsed, rooms, devices)
  updateOccupancyAdaptation(boundedElapsed, rooms, devices)
  updateTransientDisturbance(boundedElapsed, rooms, devices)
  updateFaultDevelopment(boundedElapsed, rooms, devices)
  updateDetection(boundedElapsed, rooms, devices)
  updateWarning(boundedElapsed, rooms, devices)
  updateMitigation(boundedElapsed, rooms, devices)
  updateRecovery(boundedElapsed, rooms, devices)
  updateComplete(boundedElapsed, rooms, devices)
  appendLiveDeviceHistory(boundedElapsed, rooms, devices)

  return {
    rooms,
    devices,
    buildingTelemetry: createBuildingTelemetry(
      boundedElapsed,
      devices,
      rooms,
    ),
    controlDecisions: createControlDecisions(boundedElapsed),
    status: createStatus(boundedElapsed, phase),
  }
}
