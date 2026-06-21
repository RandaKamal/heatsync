import { useState } from 'react'
import type {
  BuildingParameters,
  OccupancyParameters,
  ComfortParameters,
  InsulationLevel,
  ActivityType,
} from '../../types/buildingProfile'
import {
  validateBuildingParams,
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
  occupancy: OccupancyParameters
  comfort: ComfortParameters
  onUpdate: (updates: {
    building?: Partial<BuildingParameters>
    occupancy?: Partial<OccupancyParameters>
    comfort?: Partial<ComfortParameters>
  }) => void
  onReset: () => void
  /** When true, all inputs are disabled (during active calibration) */
  readOnly?: boolean
  /** Whether to show Save/Reset action buttons */
  showActions?: boolean
}

const INSULATION_OPTIONS: InsulationLevel[] = ['low', 'medium', 'medium-high', 'high']
const ACTIVITY_LABELS: Record<ActivityType, string> = {
  seated: 'Seated (lectures, meetings)',
  light: 'Light (office work, standing)',
  mixed: 'Mixed (varied activity levels)',
  active: 'Active (movement, events)',
}

export function ProfileDetailsPanel({
  building,
  occupancy,
  comfort,
  onUpdate,
  onReset,
  readOnly = false,
  showActions = true,
}: ProfileDetailsPanelProps) {
  const buildingErrors = validateBuildingParams(building)
  const occupancyErrors = validateOccupancyParams(occupancy)
  const comfortErrors = validateComfortParams(comfort)

  const hasErrors =
    Object.keys(buildingErrors).length > 0 ||
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
        </div>
      </CollapsibleSection>

      {/* 2. Occupancy & activity */}
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
        </div>
      </CollapsibleSection>

      {/* 3. Comfort envelope */}
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
