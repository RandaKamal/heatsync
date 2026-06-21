import { describe, it, expect } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { incidentReplayReducer, useIncidentReplay } from '../hooks/useIncidentReplay'
import { STAGE_ORDER } from '../simulation/incident/incidentScenario'

const DEFAULT_ACTION_LOG = {
  acknowledged: false,
  serviceTicketCreated: false,
  technicianNotified: false,
  deviceMarkedUnavailable: false,
  deviceReturnedToService: false,
}

const initialState = {
  stageIndex: 0,
  secondsIntoStage: 0,
  playing: false,
  speed: 1 as const,
  presenterCuesOn: true,
  actionLog: DEFAULT_ACTION_LOG,
}

// ── Reducer (pure, no timers needed) ──────────────────────────────────────────
describe('incidentReplayReducer', () => {
  it('tick is a no-op while paused', () => {
    const result = incidentReplayReducer(initialState, { type: 'tick' })
    expect(result).toEqual(initialState)
  })

  it('tick advances seconds within the current stage while playing', () => {
    const playing = { ...initialState, playing: true }
    const result = incidentReplayReducer(playing, { type: 'tick' })
    expect(result.stageIndex).toBe(0)
    expect(result.secondsIntoStage).toBe(1)
  })

  it('tick crosses the stage boundary and carries the remainder', () => {
    // stage 0 ("customer-normal-operation") is 6 seconds long
    const playing = { ...initialState, playing: true, secondsIntoStage: 5 }
    const result = incidentReplayReducer(playing, { type: 'tick' })
    expect(result.stageIndex).toBe(1)
    expect(result.secondsIntoStage).toBe(0)
  })

  it('tick at the final stage stops playback once its duration elapses', () => {
    const lastIndex = STAGE_ORDER.length - 1
    const atComplete = { ...initialState, playing: true, stageIndex: lastIndex, secondsIntoStage: 4 }
    const result = incidentReplayReducer(atComplete, { type: 'tick' })
    expect(result.stageIndex).toBe(lastIndex)
    expect(result.playing).toBe(false)
  })

  it('next/previous clamp at the stage bounds', () => {
    const atStart = incidentReplayReducer(initialState, { type: 'previous' })
    expect(atStart.stageIndex).toBe(0)

    const lastIndex = STAGE_ORDER.length - 1
    const atEnd = incidentReplayReducer({ ...initialState, stageIndex: lastIndex }, { type: 'next' })
    expect(atEnd.stageIndex).toBe(lastIndex)
  })

  it('next resets secondsIntoStage so navigation is deterministic regardless of prior elapsed time', () => {
    const mid = { ...initialState, stageIndex: 2, secondsIntoStage: 4 }
    const result = incidentReplayReducer(mid, { type: 'next' })
    expect(result.secondsIntoStage).toBe(0)
  })

  it('reset returns to stage 0 with playing false, preserving speed and presenter-cue preference', () => {
    const mid = { ...initialState, stageIndex: 5, secondsIntoStage: 3, playing: true, speed: 2 as const, presenterCuesOn: false }
    const result = incidentReplayReducer(mid, { type: 'reset' })
    expect(result.stageIndex).toBe(0)
    expect(result.playing).toBe(false)
    expect(result.speed).toBe(2)
    expect(result.presenterCuesOn).toBe(false)
  })

  it('replay returns to stage 0 with playing true', () => {
    const mid = { ...initialState, stageIndex: 5 }
    const result = incidentReplayReducer(mid, { type: 'replay' })
    expect(result.stageIndex).toBe(0)
    expect(result.playing).toBe(true)
  })

  it('demo actions each flip exactly one actionLog flag without touching the stage', () => {
    const ack = incidentReplayReducer(initialState, { type: 'acknowledgeIncident' })
    expect(ack.actionLog.acknowledged).toBe(true)
    expect(ack.stageIndex).toBe(initialState.stageIndex)
    expect({ ...ack.actionLog, acknowledged: false }).toEqual(DEFAULT_ACTION_LOG)

    const ticket = incidentReplayReducer(initialState, { type: 'createServiceTicket' })
    expect(ticket.actionLog.serviceTicketCreated).toBe(true)
    expect({ ...ticket.actionLog, serviceTicketCreated: false }).toEqual(DEFAULT_ACTION_LOG)
  })

  it('reducer calls are deterministic: identical state + action always produce identical results', () => {
    const a = incidentReplayReducer({ ...initialState, playing: true }, { type: 'tick' })
    const b = incidentReplayReducer({ ...initialState, playing: true }, { type: 'tick' })
    expect(a).toEqual(b)
  })
})

// ── Hook (React state shell around the reducer) ───────────────────────────────
describe('useIncidentReplay', () => {
  it('starts in Customer View: activeMode reflects the initial view prop', () => {
    const { result } = renderHook(({ view }: { view: 'customer' | 'service' | 'profile' }) => useIncidentReplay(view), {
      initialProps: { view: 'customer' },
    })
    expect(result.current.incidentState.activeMode).toBe('customer')
    expect(result.current.currentStage).toBe('customer-normal-operation')
  })

  it('survives a mode switch: stage/actionLog persist, activeMode updates to lb-energy', () => {
    const { result, rerender } = renderHook(
      ({ view }: { view: 'customer' | 'service' | 'profile' }) => useIncidentReplay(view),
      { initialProps: { view: 'customer' } },
    )

    act(() => {
      result.current.controls.next()
    })
    const stageAfterNext = result.current.currentStage
    expect(stageAfterNext).not.toBe('customer-normal-operation')

    rerender({ view: 'service' })

    expect(result.current.currentStage).toBe(stageAfterNext)
    expect(result.current.incidentState.activeMode).toBe('lb-energy')
  })

  it('clamps activeMode to the last non-profile mode while parked in Building Profile', () => {
    const { result, rerender } = renderHook(
      ({ view }: { view: 'customer' | 'service' | 'profile' }) => useIncidentReplay(view),
      { initialProps: { view: 'service' } },
    )
    expect(result.current.incidentState.activeMode).toBe('lb-energy')

    rerender({ view: 'profile' })
    expect(result.current.incidentState.activeMode).toBe('lb-energy')

    rerender({ view: 'customer' })
    expect(result.current.incidentState.activeMode).toBe('customer')
  })

  it('reset and replay are deterministic and clear demo-action acknowledgements', () => {
    const { result } = renderHook(({ view }: { view: 'customer' | 'service' | 'profile' }) => useIncidentReplay(view), {
      initialProps: { view: 'service' },
    })

    act(() => {
      result.current.controls.next()
      result.current.controls.acknowledgeIncident()
    })
    expect(result.current.incidentState.actionLog.acknowledged).toBe(true)

    act(() => {
      result.current.controls.reset()
    })
    expect(result.current.currentStage).toBe('customer-normal-operation')
    expect(result.current.playing).toBe(false)
    expect(result.current.incidentState.actionLog.acknowledged).toBe(false)
  })

  it('demo actions update the shared incident state via actionLog', () => {
    const { result } = renderHook(({ view }: { view: 'customer' | 'service' | 'profile' }) => useIncidentReplay(view), {
      initialProps: { view: 'service' },
    })

    act(() => {
      result.current.controls.createServiceTicket()
      result.current.controls.markTechnicianNotified()
    })

    expect(result.current.incidentState.actionLog.serviceTicketCreated).toBe(true)
    expect(result.current.incidentState.actionLog.technicianNotified).toBe(true)
    expect(result.current.incidentState.actionLog.acknowledged).toBe(false)
  })

  it('always returns a full campus frame (rooms/devices) even before any stage advance', () => {
    const { result } = renderHook(({ view }: { view: 'customer' | 'service' | 'profile' }) => useIncidentReplay(view), {
      initialProps: { view: 'customer' },
    })
    expect(result.current.rooms.length).toBeGreaterThan(0)
    expect(result.current.devices.length).toBeGreaterThan(0)
    expect(result.current.buildingTelemetry.length).toBeGreaterThan(0)
  })
})
