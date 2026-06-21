import { useProfileState } from '../../hooks/useProfileState'
import { ProfileSelector } from './ProfileSelector'
import { ProfileDetailsPanel } from './ProfileDetailsPanel'
import { CalibrationPanel } from './CalibrationPanel'
import { FleetLearningCard } from './FleetLearningCard'
import { ProfileBuildingCanvas } from './ProfileBuildingCanvas'
import { CALIBRATION_ADJUSTMENTS } from '../../data/buildingProfiles'

export function BuildingProfilePage() {
  const {
    state,
    activeProfile,
    selectProfile,
    updateSiteValues,
    resetToArchetype,
    startCalibration,
    pauseCalibration,
    restartCalibration,
    skipToComplete,
    confirmProfile,
    importSchedule,
    commissionUnits,
    backToSelection,
  } = useProfileState()

  const { wizardStep, scheduleImported } = state
  const calibrationDone = state.calibration.stage === 'ready'
  const isCalibrating = !calibrationDone && state.calibration.stage !== 'not-started' && !state.calibration.paused

  // Step 1: profile selection screen
  if (wizardStep === 'selecting') {
    return (
      <ProfileSelector
        activeProfileId={state.activeProfileId}
        onSelect={selectProfile}
        onConfirm={confirmProfile}
      />
    )
  }

  // Steps 2-4: 3-panel layout
  const showDevices = wizardStep === 'commissioned'

  // Determine which params changed after calibration
  const adjustments = CALIBRATION_ADJUSTMENTS[state.activeProfileId] ?? {}
  const refinedKeys = calibrationDone ? new Set(Object.keys(adjustments)) : new Set<string>()

  return (
    <div className="bp-3panel">
      {/* LEFT PANEL */}
      <div className="bp-panel">
        <button type="button" className="bp-back-btn" onClick={backToSelection}>
          ← Change profile
        </button>

        <div style={{ fontSize: 13, fontWeight: 700, color: '#eef7ff' }}>
          {activeProfile.icon} {activeProfile.name}
        </div>

        {wizardStep === 'commissioned' ? (
          <CommissionedState />
        ) : (
          <CalibrationPanel
            calibration={state.calibration}
            activeProfile={activeProfile}
            siteValues={state.siteValues}
            onStart={startCalibration}
            onPause={pauseCalibration}
            onRestart={restartCalibration}
            onSkip={skipToComplete}
            onImportSchedule={importSchedule}
            onCommission={commissionUnits}
            scheduleImported={scheduleImported}
            wizardStep={wizardStep}
          />
        )}
      </div>

      {/* CENTER: 3D canvas */}
      <div style={{ position: 'relative', height: '100%' }}>
        <ProfileBuildingCanvas showDevices={showDevices} />
      </div>

      {/* RIGHT PANEL */}
      <div className="bp-panel bp-panel--right">
        <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)', marginBottom: 4 }}>
          Site parameters
        </div>
        <p className="bp-disclaimer">Demo estimates — initial archetype values</p>

        {isCalibrating && (
          <div className="bp-calibrating-note">
            ⏳ Calibration in progress — parameters are read-only
          </div>
        )}

        <ProfileDetailsPanel
          building={state.siteValues.building}
          thermal={state.siteValues.thermal}
          occupancy={state.siteValues.occupancy}
          comfort={state.siteValues.comfort}
          onUpdate={updateSiteValues}
          onReset={resetToArchetype}
          readOnly={isCalibrating}
          refinedKeys={refinedKeys}
          showActions={!isCalibrating}
        />
      </div>
    </div>
  )
}

function CommissionedState() {
  return (
    <>
      <div className="bp-commissioned">
        <div className="bp-commissioned__icon">✓</div>
        <h3 className="bp-commissioned__title">Heat pumps commissioned</h3>
        <p className="bp-commissioned__sub">16 units active across 4 rooms</p>
      </div>
      <FleetLearningCard />
    </>
  )
}
