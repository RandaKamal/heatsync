import type { CalibrationState, CalibrationStage, ThermalParameters, WizardStep } from '../../types/buildingProfile'
import type { BuildingProfile } from '../../types/buildingProfile'
import { STAGE_LABELS, STAGE_DESCRIPTIONS } from '../../utils/profileCalibration'
import { CALIBRATION_ADJUSTMENTS } from '../../data/buildingProfiles'
import { ParameterComparison } from './ParameterComparison'

const TIMELINE_STAGES: CalibrationStage[] = [
  'baseline-observation',
  'controlled-heating',
  'thermal-decay',
  'parameter-fitting',
]

const STAGE_ORDER: CalibrationStage[] = [
  'not-started',
  'baseline-observation',
  'controlled-heating',
  'thermal-decay',
  'parameter-fitting',
  'ready',
]

function stageIndex(stage: CalibrationStage): number {
  return STAGE_ORDER.indexOf(stage)
}

// Keys we animate during parameter-fitting (progress 75→100)
const LIVE_PARAM_KEYS: (keyof ThermalParameters)[] = [
  'thermalTimeConstantHours',
  'estimatedHeatRetentionHours',
  'heatingRateCPerHour',
  'envelopeResistanceIndex',
]
const LIVE_PARAM_LABELS: Record<string, string> = {
  thermalTimeConstantHours: 'Thermal time constant',
  estimatedHeatRetentionHours: 'Heat retention',
  heatingRateCPerHour: 'Heating rate',
  envelopeResistanceIndex: 'Envelope resistance',
}
const LIVE_PARAM_UNITS: Record<string, string> = {
  thermalTimeConstantHours: 'h',
  estimatedHeatRetentionHours: 'h',
  heatingRateCPerHour: '°C/h',
  envelopeResistanceIndex: '',
}

interface CalibrationPanelProps {
  calibration: CalibrationState
  activeProfile: BuildingProfile
  siteValues: { thermal: ThermalParameters }
  onStart: () => void
  onPause: () => void
  onRestart: () => void
  onSkip: () => void
  onImportSchedule: () => void
  onCommission: () => void
  scheduleImported: boolean
  wizardStep: WizardStep
}

export function CalibrationPanel({
  calibration,
  activeProfile,
  siteValues,
  onStart,
  onPause,
  onRestart,
  onSkip,
  onImportSchedule,
  onCommission,
  scheduleImported,
  wizardStep,
}: CalibrationPanelProps) {
  const { stage, progressPercent, paused } = calibration
  const isNotStarted = stage === 'not-started'
  const isReady = stage === 'ready'
  const isRunning = !isNotStarted && !isReady && !paused
  const currentIdx = stageIndex(stage)

  const remainingPct = 100 - progressPercent
  const remainingSec = Math.round(remainingPct * 0.1)
  const remainingStr = remainingSec <= 0 ? 'Done' : `~${remainingSec}s remaining (demo)`

  const adjustments = CALIBRATION_ADJUSTMENTS[activeProfile.id] ?? {}

  // Live parameter animation during parameter-fitting (progress 75→100)
  const showLiveParams = stage === 'parameter-fitting' && progressPercent >= 75
  const lerpT = showLiveParams ? Math.min(1, (progressPercent - 75) / 25) : 0

  // Demo schedule events from roomEvents
  const demoEvents = [
    { time: '07:00', title: 'Thermodynamics', room: 'G01' },
    { time: '07:15', title: 'Project Seminar', room: 'F01' },
    { time: '08:00', title: 'Flight Systems', room: 'G02' },
    { time: '08:30', title: 'Aerospace Design', room: 'F02' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Calibration card */}
      <div className="glass-panel" style={{ borderRadius: 12, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
          <span className="section-eyebrow">Site calibration</span>
          <h3 style={{ margin: '4px 0 0', fontSize: 14, fontWeight: 700 }}>
            Calibrate thermal model
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--muted)' }}>
            Run a {activeProfile.calibration.recommendedCalibrationHours}-hour calibration to refine site-specific
            parameters. Demo mode completes in ~10 seconds.
          </p>
        </div>

        {/* 4-step timeline */}
        <div className="cal-stages" style={{ padding: '14px 16px 8px' }}>
          {TIMELINE_STAGES.map((s, idx) => {
            const sIdx = stageIndex(s)
            const done = currentIdx > sIdx
            const active = currentIdx === sIdx && !isNotStarted
            return (
              <div key={s} className="cal-stage-row">
                <div className={`cal-stage-dot${done ? ' cal-stage-dot--done' : active ? ' cal-stage-dot--active' : ''}`}>
                  {done ? '✓' : idx + 1}
                </div>
                <div>
                  <div className={`cal-stage-label${active ? ' cal-stage-label--active' : ''}`}>
                    {STAGE_LABELS[s]}
                  </div>
                  <div className="cal-stage-desc">{STAGE_DESCRIPTIONS[s]}</div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Progress bar */}
        <div style={{ padding: '8px 16px 10px' }}>
          <div className="cal-progress-bar">
            <div className="cal-progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5, fontSize: 10, color: 'var(--muted)' }}>
            <span>{progressPercent}% complete</span>
            {!isNotStarted && !isReady && <span>{remainingStr}</span>}
          </div>
        </div>

        {/* Live parameter animation during parameter-fitting */}
        {showLiveParams && (
          <div style={{ padding: '0 16px 12px' }}>
            <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Fitting parameters…
            </div>
            <div className="cal-live-params">
              {LIVE_PARAM_KEYS.map((key) => {
                const orig = activeProfile.thermal[key] as number
                const calibrated = (adjustments[key] as number | undefined) ?? orig
                const displayed = orig + (calibrated - orig) * lerpT
                const unit = LIVE_PARAM_UNITS[key]
                const changed = calibrated !== orig
                return (
                  <div key={key} className="cal-live-param">
                    <span className="cal-live-param__name">{LIVE_PARAM_LABELS[key]}</span>
                    <span>
                      <span className="cal-live-param__value">
                        {displayed.toFixed(2)}{unit ? ` ${unit}` : ''}
                      </span>
                      {changed && <span className="cal-live-param__badge"> ↑</span>}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 8, padding: '10px 16px', borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
          {isNotStarted && (
            <button type="button" className="bp-cal-btn bp-cal-btn--primary" onClick={onStart}>
              Start calibration
            </button>
          )}
          {!isNotStarted && !isReady && (
            <>
              <button type="button" className="bp-cal-btn bp-cal-btn--secondary" onClick={onPause}>
                {paused ? 'Resume' : 'Pause'}
              </button>
              <button type="button" className="bp-cal-btn bp-cal-btn--ghost" onClick={onSkip}>
                Complete demo
              </button>
            </>
          )}
          {!isNotStarted && (
            <button type="button" className="bp-cal-btn bp-cal-btn--ghost" onClick={onRestart}>
              Restart
            </button>
          )}
          {isRunning && (
            <span style={{ fontSize: 10, color: 'var(--muted)', alignSelf: 'center', marginLeft: 'auto' }}>
              Running…
            </span>
          )}
          {paused && !isReady && (
            <span style={{ fontSize: 10, color: 'var(--amber)', alignSelf: 'center', marginLeft: 'auto' }}>
              Paused
            </span>
          )}
        </div>
      </div>

      {/* After calibration done: parameter comparison + import schedule */}
      {isReady && (
        <>
          <ParameterComparison
            profile={activeProfile}
            siteThermal={siteValues.thermal}
            calibrationDone={true}
            confidencePercent={calibration.confidencePercent}
          />

          {!scheduleImported ? (
            <ScheduleImportPicker onImport={onImportSchedule} />
          ) : (
            <ScheduleImported events={demoEvents} onCommission={onCommission} wizardStep={wizardStep} />
          )}
        </>
      )}
    </div>
  )
}

// ── Schedule import picker ────────────────────────────────────────────────────

function ScheduleImportPicker({ onImport }: { onImport: () => void }) {
  return (
    <div className="glass-panel bp-schedule-picker" style={{ borderRadius: 12 }}>
      <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
        <span className="section-eyebrow">Import a schedule</span>
        <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--muted)' }}>
          Choose a starting schedule for this building:
        </p>
      </div>
      <div style={{ padding: '12px 14px' }}>
        <div className="bp-schedule-option">
          <span style={{ color: 'var(--cyan)', fontSize: 14 }}>◉</span>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#eef7ff' }}>HeatSync demo schedule</div>
            <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>4 events · G01 G02 F01 F02</div>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
          <button
            type="button"
            className="bp-commission-btn"
            style={{ width: 'auto', padding: '8px 18px', fontSize: 13 }}
            onClick={onImport}
          >
            Import selected schedule
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Imported schedule + commission button ─────────────────────────────────────

interface EventRow {
  time: string
  title: string
  room: string
}

function ScheduleImported({
  events,
  onCommission,
  wizardStep,
}: {
  events: EventRow[]
  onCommission: () => void
  wizardStep: WizardStep
}) {
  return (
    <div className="glass-panel" style={{ borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
        <span className="section-eyebrow">Schedule imported ({events.length} events)</span>
      </div>
      <div style={{ padding: '10px 14px' }}>
        <div className="bp-schedule-events">
          {events.map((ev) => (
            <div key={ev.room + ev.time} className="bp-event-row">
              <span style={{ color: 'var(--muted)' }}>{ev.time}</span>
              <span style={{ color: '#dceaf3', flex: 1, marginLeft: 10 }}>{ev.title}</span>
              <span style={{ color: 'var(--cyan)', fontWeight: 700 }}>{ev.room}</span>
            </div>
          ))}
        </div>
        {wizardStep !== 'commissioned' && (
          <button
            type="button"
            className="bp-commission-btn"
            style={{ marginTop: 14 }}
            onClick={onCommission}
          >
            ⚡ Commission Heat Pumps
          </button>
        )}
      </div>
    </div>
  )
}
