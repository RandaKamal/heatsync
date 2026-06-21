import { describe, it, expect } from 'vitest'
import { decodeErrorRegisters } from '../utils/errorRegisters'
import {
  buildCrossDeviceComparison,
  buildIncidentRoomAndDeviceOverrides,
  calculateCapacityAdjustedLeadMinutes,
  calculateLoadAllocation,
  getIncidentStateForStage,
} from '../simulation/incident/incidentDerivation'
import { getCustomerVisibleSummary, getLbEnergyVisibleSummary } from '../simulation/incident/incidentVisibility'
import {
  DEVICE_1_HISTORICAL,
  DEVICE_4_HISTORICAL,
  DEVICE_ROLE_MAP,
  STAGE_DURATIONS_SECONDS,
  STAGE_ORDER,
} from '../simulation/incident/incidentScenario'
import type { FaultSimulationStage } from '../simulation/incident/incidentTypes'

// ── Register decode (regression guard — must reuse the existing util) ────────
describe('decodeErrorRegisters (reused, not reimplemented)', () => {
  it('decodes "0,64,0,0" to register 1902 bit 6 — Circuit 1 Low Pressure Alarm', () => {
    const alarms = decodeErrorRegisters('0,64,0,0')
    expect(alarms).toContainEqual(
      expect.objectContaining({ id: '1902-6', message: 'Circuit 1 Low Pressure Alarm' }),
    )
  })

  it('decodes "0,0,0,0" (Device 4) to no alarms', () => {
    expect(decodeErrorRegisters('0,0,0,0')).toHaveLength(0)
  })
})

// ── Historical fixtures never mutated ─────────────────────────────────────────
describe('historical fixtures', () => {
  it('Device 1 historical alarm flag is false', () => {
    expect(DEVICE_1_HISTORICAL.alarmActive).toBe(false)
  })

  it('Device 1 historical alarm flag stays false across every stage', () => {
    for (const stage of STAGE_ORDER) {
      getIncidentStateForStage(stage)
      expect(DEVICE_1_HISTORICAL.alarmActive).toBe(false)
    }
  })

  it('Device 1 requests heating but compressor is inactive', () => {
    expect(DEVICE_1_HISTORICAL.heatingRequired).toBe(true)
    expect(DEVICE_1_HISTORICAL.compressorActive).toBe(false)
  })

  it('Device 4 is the healthy comparison (compressor active, no register fault)', () => {
    expect(DEVICE_4_HISTORICAL.compressorActive).toBe(true)
    expect(decodeErrorRegisters(DEVICE_4_HISTORICAL.errorRegisters)).toHaveLength(0)
  })
})

// ── Stage table shape ──────────────────────────────────────────────────────────
describe('stage table', () => {
  it('has exactly 11 stages', () => {
    expect(STAGE_ORDER).toHaveLength(11)
  })

  it('starts at customer-normal-operation', () => {
    expect(STAGE_ORDER[0]).toBe('customer-normal-operation')
  })

  it('ends at complete', () => {
    expect(STAGE_ORDER[STAGE_ORDER.length - 1]).toBe('complete')
  })

  it('sums to a duration within the 75-90 second requirement', () => {
    const total = STAGE_ORDER.reduce((sum, stage) => sum + STAGE_DURATIONS_SECONDS[stage], 0)
    expect(total).toBeGreaterThanOrEqual(75)
    expect(total).toBeLessThanOrEqual(90)
  })

  it('every stage has a positive duration', () => {
    for (const stage of STAGE_ORDER) {
      expect(STAGE_DURATIONS_SECONDS[stage]).toBeGreaterThan(0)
    }
  })
})

// ── getIncidentStateForStage ───────────────────────────────────────────────────
describe('getIncidentStateForStage', () => {
  it('stage 1 (customer-normal-operation): 4 of 4 devices, comfort inside range, no diagnosis yet', () => {
    const state = getIncidentStateForStage('customer-normal-operation')
    expect(state.availableDevicesLabel).toBe('4 of 4')
    expect(state.roomComfortStatus).toBe('inside-range')
    expect(state.diagnosisStatus).toBe('not-started')
    expect(state.serviceStatus).toBe('not-created')
    expect(Object.values(state.deviceStatuses).every((s) => s === 'healthy')).toBe(true)
  })

  it('stage 2 (customer-degraded-status): capacity drops to 3 of 4, device-1 under investigation', () => {
    const state = getIncidentStateForStage('customer-degraded-status')
    expect(state.availableDevicesLabel).toBe('3 of 4')
    expect(state.capacityAvailablePercent).toBe(75)
    expect(state.deviceStatuses['device-1']).not.toBe('healthy')
  })

  it('device 1 becomes unavailable once fault classification is reached', () => {
    const state = getIncidentStateForStage('lb-energy-fault-classification')
    expect(state.deviceStatuses['device-1']).toBe('unavailable')
  })

  it('replayTimeUtc is derived from eventStartUtc + elapsed seconds, never wall-clock', () => {
    const a = getIncidentStateForStage('customer-normal-operation', { secondsIntoStage: 0 })
    const b = getIncidentStateForStage('customer-normal-operation', { secondsIntoStage: 3 })
    expect(a.replayTimeUtc).toBe('2026-03-30T04:30:00.000Z')
    expect(b.replayTimeUtc).toBe('2026-03-30T04:30:03.000Z')
  })

  it('is deterministic: same inputs always produce the same output', () => {
    const first = getIncidentStateForStage('lb-energy-load-rebalancing', { secondsIntoStage: 2 })
    const second = getIncidentStateForStage('lb-energy-load-rebalancing', { secondsIntoStage: 2 })
    expect(first).toEqual(second)
  })

  it('respects an explicit activeMode rather than only the stage default', () => {
    const state = getIncidentStateForStage('customer-normal-operation', { activeMode: 'lb-energy' })
    expect(state.activeMode).toBe('lb-energy')
  })

  it('profile archetype label is copy-only fixture data, never the live building-profile module', () => {
    const state = getIncidentStateForStage('customer-normal-operation')
    expect(state.operationalProfileImpact.profileLabel).toBe('Temporary Lecture Hall')
  })
})

// ── Capacity-adjusted lead time ────────────────────────────────────────────────
describe('calculateCapacityAdjustedLeadMinutes', () => {
  it('48 minutes at 75% capacity becomes 64 minutes', () => {
    expect(calculateCapacityAdjustedLeadMinutes(48, 0.75)).toBe(64)
  })

  it('stage table reflects 48 before rebalancing and 64 after', () => {
    expect(getIncidentStateForStage('customer-normal-operation').leadTimeMinutes).toBe(48)
    expect(getIncidentStateForStage('lb-energy-load-rebalancing').leadTimeMinutes).toBe(64)
  })

  it('full capacity requires no adjustment', () => {
    expect(calculateCapacityAdjustedLeadMinutes(48, 1)).toBe(48)
  })
})

// ── Load allocation ────────────────────────────────────────────────────────────
describe('calculateLoadAllocation', () => {
  it('sums to 100% before the incident (even split)', () => {
    const allocation = calculateLoadAllocation('customer-normal-operation')
    const total = Object.values(allocation).reduce((sum, v) => sum + v, 0)
    expect(total).toBe(100)
  })

  it('sums to 100% after rebalancing too', () => {
    const allocation = calculateLoadAllocation('lb-energy-load-rebalancing')
    const total = Object.values(allocation).reduce((sum, v) => sum + v, 0)
    expect(total).toBe(100)
  })

  it('removes device-1 and redistributes 30/30/40 across devices 2-4 after rebalancing', () => {
    const allocation = calculateLoadAllocation('lb-energy-load-rebalancing')
    expect(allocation['device-1']).toBe(0)
    expect(allocation['device-2']).toBe(30)
    expect(allocation['device-3']).toBe(30)
    expect(allocation['device-4']).toBe(40)
  })
})

// ── Cross-device comparison ────────────────────────────────────────────────────
describe('buildCrossDeviceComparison', () => {
  const rows = buildCrossDeviceComparison()

  it('shows Device 1 with a register fault present and Device 4 with none', () => {
    const registerRow = rows.find((r) => r.signal === 'Register fault')
    expect(registerRow?.device1).toBe('Present')
    expect(registerRow?.device4).toBe('None')
  })

  it('shows both alarm flags off', () => {
    const alarmRow = rows.find((r) => r.signal === 'Alarm flag')
    expect(alarmRow?.device1).toBe('Off')
    expect(alarmRow?.device4).toBe('Off')
  })

  it('shows Device 1 compressor inactive and Device 4 active', () => {
    const compressorRow = rows.find((r) => r.signal === 'Compressor active')
    expect(compressorRow?.device1).toBe('No')
    expect(compressorRow?.device4).toBe('Yes')
  })
})

// ── Visibility projections ─────────────────────────────────────────────────────
describe('getCustomerVisibleSummary', () => {
  const state = getIncidentStateForStage('lb-energy-fault-classification')
  const summary = getCustomerVisibleSummary(state) as unknown as Record<string, unknown>

  it('never includes raw diagnostic fields', () => {
    const forbiddenKeys = ['lowPressureBar', 'highPressureBar', 'errorRegisters', 'alarmActive', 'deviceStatuses', 'loadAllocation']
    for (const key of forbiddenKeys) {
      expect(Object.keys(summary)).not.toContain(key)
    }
  })

  it('reports "degraded but stable" framing only when comfort can be maintained', () => {
    const stable = getCustomerVisibleSummary(getIncidentStateForStage('customer-comfort-protection'))
    expect(stable.roomComfortStatus).toBe('inside-range')
    expect(stable.eventContinuity).toBe('expected-to-continue')
    expect(stable.operatorActionRequired).toBe(false)
  })

  it('reports risk honestly when continuity cannot be guaranteed', () => {
    const hypothetical = getIncidentStateForStage('customer-degraded-status')
    hypothetical.eventContinuity = 'cannot-be-guaranteed'
    const risky = getCustomerVisibleSummary(hypothetical)
    expect(risky.operatorActionRequired).toBe(true)
    expect(risky.operatorActionText).not.toBe('No action is required from the facility operator.')
  })

  it('reflects whether LB Energy has been informed via serviceStatus', () => {
    expect(getCustomerVisibleSummary(getIncidentStateForStage('customer-normal-operation')).lbEnergyInformed).toBe(false)
    expect(getCustomerVisibleSummary(getIncidentStateForStage('lb-energy-load-rebalancing')).lbEnergyInformed).toBe(true)
  })
})

describe('getLbEnergyVisibleSummary', () => {
  const state = getIncidentStateForStage('lb-energy-signal-analysis')
  const summary = getLbEnergyVisibleSummary(state)

  it('includes raw register and pressure evidence', () => {
    expect(summary.historicalDevice1.errorRegisters).toBe('0,64,0,0')
    expect(summary.historicalDevice1.lowPressureBar).toBe(7.3)
    expect(summary.decodedRegisterDevice1.length).toBeGreaterThan(0)
  })

  it('exposes the same serviceStatus at full detail (vs. the customer\'s coarse boolean)', () => {
    const rebalancing = getIncidentStateForStage('lb-energy-load-rebalancing')
    expect(getLbEnergyVisibleSummary(rebalancing).actionLog).toEqual(rebalancing.actionLog)
    expect(getCustomerVisibleSummary(rebalancing).lbEnergyInformed).toBe(true)
  })
})

// ── 3D scene overrides ─────────────────────────────────────────────────────────
describe('buildIncidentRoomAndDeviceOverrides', () => {
  it('forces the affected mock device healthy at stage 1, overriding its stale baseline alert', () => {
    const overrides = buildIncidentRoomAndDeviceOverrides('customer-normal-operation')
    const device1Override = overrides.deviceOverrides[DEVICE_ROLE_MAP['device-1']]
    expect(device1Override.status).toBe('normal')
    expect(device1Override.alert).toBeUndefined()
  })

  it('marks the affected device as fault once unavailable', () => {
    const overrides = buildIncidentRoomAndDeviceOverrides('lb-energy-fault-classification')
    const device1Override = overrides.deviceOverrides[DEVICE_ROLE_MAP['device-1']]
    expect(device1Override.status).toBe('fault')
  })

  it('always overrides all 4 mapped devices', () => {
    const overrides = buildIncidentRoomAndDeviceOverrides('customer-normal-operation')
    for (const role of Object.keys(DEVICE_ROLE_MAP) as (keyof typeof DEVICE_ROLE_MAP)[]) {
      expect(overrides.deviceOverrides[DEVICE_ROLE_MAP[role]]).toBeDefined()
    }
  })
})

// ── Exhaustiveness ─────────────────────────────────────────────────────────────
describe('FaultSimulationStage exhaustiveness', () => {
  it('STAGE_ORDER and STAGE_DURATIONS_SECONDS agree on every stage', () => {
    const stagesWithDurations = Object.keys(STAGE_DURATIONS_SECONDS) as FaultSimulationStage[]
    expect(new Set(stagesWithDurations)).toEqual(new Set(STAGE_ORDER))
  })
})
