import type { ThermalParameters } from '../../types/buildingProfile'
import type { BuildingProfile } from '../../types/buildingProfile'
import { CALIBRATION_ADJUSTMENTS } from '../../data/buildingProfiles'

interface ParameterComparisonProps {
  profile: BuildingProfile
  siteThermal: ThermalParameters
  calibrationDone: boolean
  confidencePercent: number
}

interface Row {
  label: string
  unit: string
  archetypeKey: keyof ThermalParameters
  format?: (v: number) => string
}

const ROWS: Row[] = [
  { label: 'Thermal time constant', unit: 'h', archetypeKey: 'thermalTimeConstantHours' },
  { label: 'Heat retention estimate', unit: 'h', archetypeKey: 'estimatedHeatRetentionHours' },
  { label: 'Heating response rate', unit: '°C/h', archetypeKey: 'heatingRateCPerHour' },
  { label: 'Envelope resistance', unit: '', archetypeKey: 'envelopeResistanceIndex' },
]

export function ParameterComparison({
  profile,
  siteThermal,
  calibrationDone,
  confidencePercent,
}: ParameterComparisonProps) {
  const archetypeThermal = profile.thermal
  const adjustments = CALIBRATION_ADJUSTMENTS[profile.id] ?? {}

  return (
    <div className="glass-panel" style={{ borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
        <span className="section-eyebrow">Model comparison</span>
        <h3 style={{ margin: '4px 0 0', fontSize: 14, fontWeight: 700 }}>
          Archetype vs site-calibrated parameters
        </h3>
      </div>

      <div style={{ padding: '12px 16px' }}>
        <div className="param-comparison">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '6px 8px', color: 'var(--muted)', fontWeight: 700, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Parameter
                </th>
                <th style={{ textAlign: 'right', padding: '6px 8px', color: 'var(--muted)', fontWeight: 700, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Archetype default
                </th>
                <th style={{ textAlign: 'right', padding: '6px 8px', color: 'var(--muted)', fontWeight: 700, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Site-calibrated
                </th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => {
                const archetypeVal = archetypeThermal[row.archetypeKey] as number
                const siteVal = calibrationDone
                  ? (siteThermal[row.archetypeKey] as number)
                  : archetypeVal
                const changed = calibrationDone && siteVal !== archetypeVal
                const adjustedVal = adjustments[row.archetypeKey] as number | undefined

                return (
                  <tr key={row.archetypeKey} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: '8px 8px', color: '#b8cdd9' }}>{row.label}</td>
                    <td style={{ padding: '8px 8px', textAlign: 'right', color: '#dceaf3', fontVariantNumeric: 'tabular-nums' }}>
                      {archetypeVal}{row.unit && <span style={{ color: 'var(--muted)', fontSize: 9, marginLeft: 2 }}>{row.unit}</span>}
                    </td>
                    <td style={{ padding: '8px 8px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {calibrationDone ? (
                        <span style={{ color: changed ? '#5eead4' : '#dceaf3', fontWeight: changed ? 700 : 400 }}>
                          {adjustedVal ?? siteVal}
                          {row.unit && <span style={{ color: 'var(--muted)', fontSize: 9, marginLeft: 2 }}>{row.unit}</span>}
                          {changed && <span style={{ color: '#5eead4', fontSize: 9, marginLeft: 4 }}>↑</span>}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>
                          {archetypeVal}{row.unit && <span style={{ fontSize: 9, marginLeft: 2 }}>{row.unit}</span>}
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
              {/* Confidence row */}
              <tr style={{ borderTop: '1px solid var(--border)' }}>
                <td style={{ padding: '8px 8px', color: '#b8cdd9' }}>Model confidence</td>
                <td style={{ padding: '8px 8px', textAlign: 'right', color: '#dceaf3' }}>
                  {profile.calibration.initialConfidencePercent}%
                </td>
                <td style={{ padding: '8px 8px', textAlign: 'right' }}>
                  {calibrationDone ? (
                    <span style={{ color: '#5eead4', fontWeight: 700 }}>
                      {confidencePercent}%
                      <span style={{ color: '#5eead4', fontSize: 9, marginLeft: 4 }}>↑</span>
                    </span>
                  ) : (
                    <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>
                      {profile.calibration.initialConfidencePercent}%
                    </span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {!calibrationDone && (
          <p style={{ margin: '10px 0 0', fontSize: 10, color: 'var(--muted)', fontStyle: 'italic' }}>
            Run calibration to refine values. Site-calibrated column will update automatically.
          </p>
        )}
        {calibrationDone && (
          <p style={{ margin: '10px 0 0', fontSize: 10, color: 'var(--muted)' }}>
            Site-specific parameters are now active. Green values indicate changes from the archetype default.
          </p>
        )}
      </div>
    </div>
  )
}
