const REG: Record<number, (string | null)[]> = {
  1901: [
    'Outside Air Humidity Sensor Fault',
    'Circuit 1 High Pressure Switch Alarm',
    'Circuit 1 Low Pressure Switch Alarm',
    'Circuit 1 Compressor 1 Alarm',
    'Circuit 1 Compressor 2 Alarm',
    'Circuit 1 Compressor 3 Alarm',
    'Circuit 1 Discharge Pressure Sensor Fault',
    'Circuit 1 Suction Pressure Sensor Fault',
    'General Alarm',
    'Temperature Sensor Fault',
    'Supply Fan Fault',
    'Return Fan Fault',
    'Supply Air Temperature Sensor Fault',
    'Return Air Temperature Sensor Fault',
    'Outside Air Temperature Sensor Fault',
    'Return Air Humidity Sensor Fault',
  ],
  1902: [
    'Filter Alarm 2',
    'Heat Recovery System Fault',
    'Hot Water Coil Fault',
    'Gas-Fired Fault',
    'Electrical Heater Fault',
    'Circuit 1 High Pressure Alarm',
    'Circuit 1 Low Pressure Alarm',
    'Circuit 2 High Pressure Alarm',
    'Circuit 2 High Pressure Switch Alarm',
    'Circuit 2 Low Pressure Switch Alarm',
    'Circuit 2 Compressor 1 Alarm',
    'Circuit 2 Compressor 2 Alarm',
    'Circuit 2 Compressor 3 Alarm',
    'Circuit 2 Discharge Pressure Sensor Fault',
    'Circuit 2 Suction Pressure Sensor Fault',
    'Filter Alarm 1',
  ],
  1903: [
    'Circuit 1 Compressor 1 Maintenance Alarm',
    'Circuit 1 Compressor 2 Maintenance Alarm',
    'Circuit 1 Compressor 3 Maintenance Alarm',
    'Circuit 2 Compressor 1 Maintenance Alarm',
    'Circuit 2 Compressor 2 Maintenance Alarm',
    'Circuit 2 Compressor 3 Maintenance Alarm',
    'Circuit 1 Suction Temperature Sensor Fault',
    'Circuit 2 Suction Temperature Sensor Fault',
    'Circuit 2 Low Pressure Alarm',
    'Fire Detector Alarm',
    'Supply Air Flow Sensor Fault',
    'Return Air Flow Sensor Fault',
    'Phase Fault Alarm',
    'Pre-Electrical Heater Alarm',
    'Supply Fan Maintenance Alarm',
    'Exhaust Fan Maintenance Alarm',
  ],
  1904: [
    'A2L Gas Detector Fault',
    'Additional Board Fault',
    null, null, null, null, null, null,
    'Circuit 1 Electronic Expansion Valve Driver Alarm',
    'Circuit 2 Electronic Expansion Valve Driver Alarm',
    'Circuit 1 Electronic Expansion Valve Driver Connection Alarm',
    'Circuit 2 Electronic Expansion Valve Driver Connection Alarm',
    'Exhaust Air Flow Sensor Fault',
    'Plate Heat Exchanger Temperature Sensor Fault',
    'Circuit 1 Condenser Fan Alarm',
    'Circuit 2 Condenser Fan Alarm',
  ],
}

const HIGH_SEVERITY = new Set([
  'General Alarm',
  'Fire Detector Alarm',
  'Phase Fault Alarm',
  'A2L Gas Detector Fault',
])

export interface DecodedAlarm {
  id: string
  severity: 'high' | 'medium' | 'low'
  message: string
  time: string
  resolved: boolean
}

export function decodeErrorRegisters(raw: string): DecodedAlarm[] {
  if (!raw || raw === '0,0,0,0') return []
  const values = raw.split(',').map(Number)
  const regNums = [1901, 1902, 1903, 1904]
  const alarms: DecodedAlarm[] = []
  values.forEach((val, ri) => {
    if (!val) return
    const msgs = REG[regNums[ri]] ?? []
    msgs.forEach((msg, bit) => {
      if (msg && val & (1 << bit)) {
        alarms.push({
          id: `${regNums[ri]}-${bit}`,
          severity: HIGH_SEVERITY.has(msg) ? 'high' : bit <= 1 ? 'medium' : 'low',
          message: msg,
          time: '—',
          resolved: false,
        })
      }
    })
  })
  return alarms
}
