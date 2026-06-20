import type { SavingsTotals } from '../../api/client'

interface PokesPanelProps {
  totals: SavingsTotals
  onClose: () => void
}

const TIERS = [
  { name: 'Bronze',  emoji: '🥉', kwh: 200,  eur: 50,   co2: 75   },
  { name: 'Silver',  emoji: '🥈', kwh: 750,  eur: 187,  co2: 285  },
  { name: 'Gold',    emoji: '🥇', kwh: 1500, eur: 375,  co2: 570  },
  { name: 'Platinum',emoji: '💎', kwh: 3000, eur: 750,  co2: 1140 },
  { name: 'Diamond', emoji: '✨', kwh: 7500, eur: 1875, co2: 2850 },
]

function getTier(value: number, key: 'kwh' | 'eur' | 'co2') {
  const earned = TIERS.filter((t) => value >= t[key])
  return earned.at(-1) ?? null
}

function getNextTier(value: number, key: 'kwh' | 'eur' | 'co2') {
  return TIERS.find((t) => value < t[key]) ?? null
}

function getProgress(value: number, key: 'kwh' | 'eur' | 'co2'): number {
  const next = getNextTier(value, key)
  if (!next) return 100
  const current = getTier(value, key)
  const low = current ? current[key] : 0
  return Math.min(100, ((value - low) / (next[key] - low)) * 100)
}

interface MetricRowProps {
  label: string
  icon: string
  value: number
  unit: string
  tierKey: 'kwh' | 'eur' | 'co2'
  accentColor: string
}

function MetricRow({ label, icon, value, unit, tierKey, accentColor }: MetricRowProps) {
  const tier = getTier(value, tierKey)
  const next = getNextTier(value, tierKey)
  const pct = getProgress(value, tierKey)

  return (
    <div className="badge-metric">
      <div className="badge-metric__header">
        <span className="badge-metric__icon">{icon}</span>
        <span className="badge-metric__label">{label}</span>
        {tier && (
          <span className="badge-tier-label">
            {tier.emoji} {tier.name}
          </span>
        )}
      </div>
      <div className="badge-metric__value" style={{ color: accentColor }}>
        {tierKey === 'eur' ? `€${value.toFixed(0)}` : `${value.toFixed(0)} ${unit}`}
      </div>
      <div className="badge-progress-track">
        <div
          className="badge-progress-fill"
          style={{ width: `${pct}%`, background: accentColor }}
        />
      </div>
      <div className="badge-metric__next">
        {next
          ? `${Math.round(next[tierKey] - value)} ${unit} to ${next.emoji} ${next.name} Badge`
          : `${tier?.emoji} Maximum Badge reached!`}
      </div>
    </div>
  )
}

export function PokesPanel({ totals, onClose }: PokesPanelProps) {
  const kwhTier = getTier(totals.energy_saved_kwh, 'kwh')
  const eurTier  = getTier(totals.cost_saved_eur,  'eur')
  const co2Tier  = getTier(totals.co2_saved_kg,    'co2')

  const tiers = [kwhTier, eurTier, co2Tier].filter(Boolean)
  const tierIndexes = tiers.map((t) => TIERS.findIndex((x) => x.name === t?.name))
  const overallIndex = tierIndexes.length ? Math.min(...tierIndexes) : -1
  const overallTier = overallIndex >= 0 ? TIERS[overallIndex] : null

  return (
    <div className="pokes-overlay" onClick={onClose}>
      <div className="pokes-panel glass-panel" onClick={(e) => e.stopPropagation()}>
        <div className="pokes-header">
          <div>
            <span className="section-eyebrow">Gamified savings</span>
            <h2 className="pokes-title">🏆 Badges</h2>
          </div>
          <button type="button" className="pokes-close" onClick={onClose}>×</button>
        </div>

        {overallTier && (
          <div className="pokes-overall">
            <span className="pokes-overall__emoji">{overallTier.emoji}</span>
            <div>
              <div className="pokes-overall__tier">{overallTier.name} Badge</div>
              <div className="pokes-overall__sub">Overall achievement level</div>
            </div>
          </div>
        )}

        <div className="pokes-metrics">
          <MetricRow
            label="Energy saved"
            icon="⚡"
            value={totals.energy_saved_kwh}
            unit="kWh"
            tierKey="kwh"
            accentColor="#38bdf8"
          />
          <MetricRow
            label="Cost saved"
            icon="💰"
            value={totals.cost_saved_eur}
            unit="€"
            tierKey="eur"
            accentColor="#2dd4bf"
          />
          <MetricRow
            label="CO₂ avoided"
            icon="🌱"
            value={totals.co2_saved_kg}
            unit="kg"
            tierKey="co2"
            accentColor="#a3e635"
          />
        </div>

        <div className="pokes-tiers-row">
          {TIERS.map((t, i) => {
            const earned = overallIndex >= i
            return (
              <div key={t.name} className={`badge-tier-pip ${earned ? 'badge-tier-pip--earned' : ''}`}>
                <span>{t.emoji}</span>
                <span>{t.name}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
