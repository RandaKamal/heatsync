import { useState } from 'react'
import type {
  BuildingParameters,
  ThermalParameters,
  OccupancyParameters,
  ComfortParameters,
  InsulationLevel,
  AirLeakageLevel,
  ThermalMassLevel,
  ActivityType,
} from '../../types/buildingProfile'
import {
  validateBuildingParams,
  validateThermalParams,
  validateOccupancyParams,
  validateComfortParams,
} from '../../utils/profileValidation'

interface SectionProps {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}

function CollapsibleSection({ title, children, defaultOpen = true }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="analytics-section bp-details-section">
      <button
        type="button"
        className="bp-section-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span>{title}</span>
        <span className="bp-section-toggle__arrow">{open ? '▲' : '▼'}</span>
      </button>
      {open && <div className="bp-section-body">{children}</div>}
    </div>
  )
}

interface FieldProps {
  id: string
  label: string
  error?: string
  children: React.ReactNode
}

function Field({ id, label, error, children }: FieldProps) {
  return (
    <div className="bp-field">
      <label htmlFor={id} className="bp-field__label">{label}</label>
      {children}
      {error && <span className="bp-field__error">{error}</span>}
    </div>
  )
}

interface ProfileDetailsPanelProps {
  building: BuildingParameters
  thermal: ThermalParameters
  occupancy: OccupancyParameters
  comfort: ComfortParameters
  onUpdate: (updates: {
    building?: Partial<BuildingParameters>
    thermal?: Partial<ThermalParameters>
    occupancy?: Partial<OccupancyParameters>
    comfort?: Partial<ComfortParameters>
  }) => void
  onReset: () => void
  /** When true, all inputs are disabled (during active calibration) */
  readOnly?: boolean
  /** Set of thermal parameter keys that were refined during calibration */
  refinedKeys?: Set<string>
  /** Whether to show Save/Reset action buttons */
  showActions?: boolean
}

const INSULATION_OPTIONS: InsulationLevel[] = ['low', 'medium', 'medium-high', 'high']
const AIR_LEAKAGE_OPTIONS: AirLeakageLevel[] = ['low', 'medium', 'high']
const THERMAL_MASS_OPTIONS: ThermalMassLevel[] = ['low', 'medium', 'high']
const ACTIVITY_LABELS: Record<ActivityType, string> = {
  seated: 'Seated (lectures, meetings)',
  light: 'Light (office work, standing)',
  mixed: 'Mixed (varied activity levels)',
  active: 'Active (movement, events)',
}

export function ProfileDetailsPanel({
  building,
  thermal,
  occupancy,
  comfort,
  onUpdate,
  onReset,
  readOnly = false,
  refinedKeys = new Set(),
  showActions = true,
}: ProfileDetailsPanelProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)

  const buildingErrors = validateBuildingParams(building)
  const thermalErrors = validateThermalParams(thermal)
  const occupancyErrors = validateOccupancyParams(occupancy)
  const comfortErrors = validateComfortParams(comfort)

  const hasErrors =
    Object.keys(buildingErrors).length > 0 ||
    Object.keys(thermalErrors).length > 0 ||
    Object.keys(occupancyErrors).length > 0 ||
    Object.keys(comfortErrors).length > 0

  return (
    <fieldset disabled={readOnly} style={{ border: 'none', padding: 0, margin: 0 }}>
    <div className="bp-details-panel glass-panel">
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
        <span className="section-eyebrow">Site parameters</span>
        <h3 style={{ margin: '4px 0 0', fontSize: 14, fontWeight: 700 }}>Building Details</h3>
        <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--muted)' }}>
          Adjust these values to match your specific site.
        </p>
      </div>

      {/* 1. Building */}
      <CollapsibleSection title="Building">
        <div className="bp-field-grid">
          <Field id="floorAreaM2" label="Floor area (m²)" error={buildingErrors.floorAreaM2}>
            <input
              id="floorAreaM2"
              type="number"
              className="bp-input"
              value={building.floorAreaM2}
              min={1}
              onChange={(e) => onUpdate({ building: { floorAreaM2: Number(e.target.value) } })}
            />
          </Field>
          <Field id="volumeM3" label="Volume (m³)" error={buildingErrors.volumeM3}>
            <input
              id="volumeM3"
              type="number"
              className="bp-input"
              value={building.volumeM3}
              min={1}
              onChange={(e) => onUpdate({ building: { volumeM3: Number(e.target.value) } })}
            />
          </Field>
          <Field id="insulationLevel" label="Insulation level">
            <select
              id="insulationLevel"
              className="bp-select"
              value={building.insulationLevel}
              onChange={(e) => onUpdate({ building: { insulationLevel: e.target.value as InsulationLevel } })}
            >
              {INSULATION_OPTIONS.map((opt) => (
                <option key={opt} value={opt} style={{ textTransform: 'capitalize' }}>{opt}</option>
              ))}
            </select>
          </Field>
          <Field id="airLeakageLevel" label="Air leakage">
            <select
              id="airLeakageLevel"
              className="bp-select"
              value={building.airLeakageLevel}
              onChange={(e) => onUpdate({ building: { airLeakageLevel: e.target.value as AirLeakageLevel } })}
            >
              {AIR_LEAKAGE_OPTIONS.map((opt) => (
                <option key={opt} value={opt} style={{ textTransform: 'capitalize' }}>{opt}</option>
              ))}
            </select>
          </Field>
          <Field id="thermalMassLevel" label="Thermal mass">
            <select
              id="thermalMassLevel"
              className="bp-select"
              value={building.thermalMassLevel}
              onChange={(e) => onUpdate({ building: { thermalMassLevel: e.target.value as ThermalMassLevel } })}
            >
              {THERMAL_MASS_OPTIONS.map((opt) => (
                <option key={opt} value={opt} style={{ textTransform: 'capitalize' }}>{opt}</option>
              ))}
            </select>
          </Field>
        </div>
      </CollapsibleSection>

      {/* 2. Thermal behaviour */}
      <CollapsibleSection title="Thermal behaviour">
        <div className="bp-field-grid">
          <Field
            id="thermalTimeConstantHours"
            label="Thermal time constant (h)"
            error={thermalErrors.thermalTimeConstantHours}
          >
            <input
              id="thermalTimeConstantHours"
              type="number"
              className="bp-input"
              value={thermal.thermalTimeConstantHours}
              step={0.1}
              min={0.1}
              title="The time for the building to reach 63% of a temperature change. Higher = slower response."
              onChange={(e) => onUpdate({ thermal: { thermalTimeConstantHours: Number(e.target.value) } })}
            />
          </Field>
          <Field
            id="estimatedHeatRetentionHours"
            label="Heat retention (h)"
            error={thermalErrors.estimatedHeatRetentionHours}
          >
            <input
              id="estimatedHeatRetentionHours"
              type="number"
              className="bp-input"
              value={thermal.estimatedHeatRetentionHours}
              step={0.1}
              min={0.1}
              title="Estimated time the building stays warm after heating stops."
              onChange={(e) => onUpdate({ thermal: { estimatedHeatRetentionHours: Number(e.target.value) } })}
            />
          </Field>
          <Field
            id="heatingRateCPerHour"
            label="Heating rate (°C/h)"
            error={thermalErrors.heatingRateCPerHour}
          >
            <input
              id="heatingRateCPerHour"
              type="number"
              className="bp-input"
              value={thermal.heatingRateCPerHour}
              step={0.1}
              min={0.1}
              onChange={(e) => onUpdate({ thermal: { heatingRateCPerHour: Number(e.target.value) } })}
            />
          </Field>
          <Field
            id="coolingRateCPerHour"
            label="Cooling rate (°C/h)"
            error={thermalErrors.coolingRateCPerHour}
          >
            <input
              id="coolingRateCPerHour"
              type="number"
              className="bp-input"
              value={thermal.coolingRateCPerHour}
              step={0.1}
              min={0.1}
              onChange={(e) => onUpdate({ thermal: { coolingRateCPerHour: Number(e.target.value) } })}
            />
          </Field>
        </div>

        <button
          type="button"
          className="bp-advanced-toggle"
          onClick={() => setShowAdvanced((v) => !v)}
        >
          {showAdvanced ? '▲ Hide' : '▼ Show'} advanced model parameters
        </button>

        {showAdvanced && (
          <div className="bp-field-grid" style={{ marginTop: 10 }}>
            <Field
              id="envelopeResistanceIndex"
              label="Envelope resistance index"
              error={thermalErrors.envelopeResistanceIndex}
            >
              <input
                id="envelopeResistanceIndex"
                type="number"
                className="bp-input"
                value={thermal.envelopeResistanceIndex}
                step={0.01}
                min={0.01}
                title="Normalised index (0–1) of how well the envelope resists heat flow."
                onChange={(e) => onUpdate({ thermal: { envelopeResistanceIndex: Number(e.target.value) } })}
              />
            </Field>
            <Field
              id="effectiveThermalCapacityIndex"
              label="Thermal capacity index"
              error={thermalErrors.effectiveThermalCapacityIndex}
            >
              <input
                id="effectiveThermalCapacityIndex"
                type="number"
                className="bp-input"
                value={thermal.effectiveThermalCapacityIndex}
                step={0.01}
                min={0.01}
                title="Normalised index (0–1) of the building's ability to store heat."
                onChange={(e) => onUpdate({ thermal: { effectiveThermalCapacityIndex: Number(e.target.value) } })}
              />
            </Field>
            <Field
              id="heatingEfficiencyIndex"
              label="Heating efficiency index"
              error={thermalErrors.heatingEfficiencyIndex}
            >
              <input
                id="heatingEfficiencyIndex"
                type="number"
                className="bp-input"
                value={thermal.heatingEfficiencyIndex}
                step={0.01}
                min={0.01}
                title="How effectively the HVAC system converts energy to useful heat (0–1)."
                onChange={(e) => onUpdate({ thermal: { heatingEfficiencyIndex: Number(e.target.value) } })}
              />
            </Field>
            <Field
              id="coolingEfficiencyIndex"
              label="Cooling efficiency index"
              error={thermalErrors.coolingEfficiencyIndex}
            >
              <input
                id="coolingEfficiencyIndex"
                type="number"
                className="bp-input"
                value={thermal.coolingEfficiencyIndex}
                step={0.01}
                min={0.01}
                title="How effectively the HVAC system removes heat (0–1)."
                onChange={(e) => onUpdate({ thermal: { coolingEfficiencyIndex: Number(e.target.value) } })}
              />
            </Field>
          </div>
        )}
      </CollapsibleSection>

      {/* 3. Occupancy & activity */}
      <CollapsibleSection title="Occupancy & activity">
        <div className="bp-field-grid">
          <Field
            id="typicalOccupancy"
            label="Typical occupancy"
            error={occupancyErrors.typicalOccupancy}
          >
            <input
              id="typicalOccupancy"
              type="number"
              className="bp-input"
              value={occupancy.typicalOccupancy}
              min={1}
              onChange={(e) => onUpdate({ occupancy: { typicalOccupancy: Number(e.target.value) } })}
            />
          </Field>
          <Field
            id="maximumOccupancy"
            label="Maximum occupancy"
            error={occupancyErrors.maximumOccupancy}
          >
            <input
              id="maximumOccupancy"
              type="number"
              className="bp-input"
              value={occupancy.maximumOccupancy}
              min={1}
              onChange={(e) => onUpdate({ occupancy: { maximumOccupancy: Number(e.target.value) } })}
            />
          </Field>
          <Field id="activityType" label="Activity type">
            <select
              id="activityType"
              className="bp-select"
              value={occupancy.activityType}
              onChange={(e) => onUpdate({ occupancy: { activityType: e.target.value as ActivityType } })}
            >
              {(Object.entries(ACTIVITY_LABELS) as [ActivityType, string][]).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </Field>
          <Field
            id="sensibleHeatGainWPerPerson"
            label="Sensible heat gain (W/person)"
            error={occupancyErrors.sensibleHeatGainWPerPerson}
          >
            <input
              id="sensibleHeatGainWPerPerson"
              type="number"
              className="bp-input"
              value={occupancy.sensibleHeatGainWPerPerson}
              min={1}
              onChange={(e) => onUpdate({ occupancy: { sensibleHeatGainWPerPerson: Number(e.target.value) } })}
            />
          </Field>
          <Field id="doorOpeningIntensity" label="Door opening intensity">
            <select
              id="doorOpeningIntensity"
              className="bp-select"
              value={occupancy.doorOpeningIntensity}
              onChange={(e) => onUpdate({ occupancy: { doorOpeningIntensity: e.target.value as AirLeakageLevel } })}
            >
              {AIR_LEAKAGE_OPTIONS.map((opt) => (
                <option key={opt} value={opt} style={{ textTransform: 'capitalize' }}>{opt}</option>
              ))}
            </select>
          </Field>
        </div>
      </CollapsibleSection>

      {/* 4. Comfort envelope */}
      <CollapsibleSection title="Comfort envelope">
        {/* Visual comfort band */}
        <div className="comfort-band" style={{ marginBottom: 16 }}>
          <div className="comfort-band__labels">
            <span style={{ color: '#7dd3fc', fontSize: 10 }}>Too cold</span>
            <span style={{ color: '#88a3b9', fontSize: 10 }}>Comfort zone</span>
            <span style={{ color: '#f59e0b', fontSize: 10 }}>Too warm</span>
          </div>
          <div className="comfort-band__track">
            <div
              className="comfort-band__range"
              style={{
                left: `${Math.max(0, ((comfort.heatingComfortMinC - 15) / 15) * 100)}%`,
                width: `${Math.min(100, ((comfort.heatingComfortMaxC - comfort.heatingComfortMinC) / 15) * 100)}%`,
              }}
            />
          </div>
          <div className="comfort-band__temp-labels">
            <span style={{ color: '#88a3b9', fontSize: 10 }}>15°C</span>
            <span style={{ color: '#5eead4', fontSize: 11, fontWeight: 700 }}>
              {comfort.heatingComfortMinC}°C — {comfort.heatingComfortMaxC}°C
            </span>
            <span style={{ color: '#88a3b9', fontSize: 10 }}>30°C</span>
          </div>
        </div>

        <div className="bp-field-grid">
          <Field
            id="heatingComfortMinC"
            label="Heating min (°C)"
            error={comfortErrors.heatingComfortMinC}
          >
            <input
              id="heatingComfortMinC"
              type="number"
              className="bp-input"
              value={comfort.heatingComfortMinC}
              step={0.5}
              onChange={(e) => onUpdate({ comfort: { heatingComfortMinC: Number(e.target.value) } })}
            />
          </Field>
          <Field id="heatingComfortMaxC" label="Heating max (°C)">
            <input
              id="heatingComfortMaxC"
              type="number"
              className="bp-input"
              value={comfort.heatingComfortMaxC}
              step={0.5}
              onChange={(e) => onUpdate({ comfort: { heatingComfortMaxC: Number(e.target.value) } })}
            />
          </Field>
          <Field id="coolingComfortMinC" label="Cooling min (°C)" error={comfortErrors.coolingComfortMinC}>
            <input
              id="coolingComfortMinC"
              type="number"
              className="bp-input"
              value={comfort.coolingComfortMinC}
              step={0.5}
              onChange={(e) => onUpdate({ comfort: { coolingComfortMinC: Number(e.target.value) } })}
            />
          </Field>
          <Field id="coolingComfortMaxC" label="Cooling max (°C)">
            <input
              id="coolingComfortMaxC"
              type="number"
              className="bp-input"
              value={comfort.coolingComfortMaxC}
              step={0.5}
              onChange={(e) => onUpdate({ comfort: { coolingComfortMaxC: Number(e.target.value) } })}
            />
          </Field>
          <Field id="humidityMinPercent" label="Humidity min (%)" error={comfortErrors.humidityMinPercent}>
            <input
              id="humidityMinPercent"
              type="number"
              className="bp-input"
              value={comfort.humidityMinPercent}
              min={0}
              max={100}
              onChange={(e) => onUpdate({ comfort: { humidityMinPercent: Number(e.target.value) } })}
            />
          </Field>
          <Field id="humidityMaxPercent" label="Humidity max (%)" error={comfortErrors.humidityMaxPercent}>
            <input
              id="humidityMaxPercent"
              type="number"
              className="bp-input"
              value={comfort.humidityMaxPercent}
              min={0}
              max={100}
              onChange={(e) => onUpdate({ comfort: { humidityMaxPercent: Number(e.target.value) } })}
            />
          </Field>
          <Field id="co2WarningPpm" label="CO₂ warning (ppm)">
            <input
              id="co2WarningPpm"
              type="number"
              className="bp-input"
              value={comfort.co2WarningPpm}
              min={400}
              onChange={(e) => onUpdate({ comfort: { co2WarningPpm: Number(e.target.value) } })}
            />
          </Field>
        </div>
      </CollapsibleSection>

      {/* Footer actions */}
      {showActions && (
        <div className="bp-details-footer">
          {hasErrors && (
            <span className="bp-field__error" style={{ flex: 1 }}>
              Fix validation errors before saving.
            </span>
          )}
          <button type="button" className="bp-reset-btn" onClick={onReset}>
            Reset to archetype
          </button>
        </div>
      )}
    </div>
    </fieldset>
  )
}
