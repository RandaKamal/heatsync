const SOURCE_BADGE_COLORS: Record<string, string> = {
  Measured: '#2dd4bf',
  Derived: '#818cf8',
  Scheduled: '#38bdf8',
  Estimated: '#94a3b8',
  Simulated: '#fb923c',
  Unavailable: '#475569',
}

export function SourceBadge({ label }: { label: string }) {
  const color = SOURCE_BADGE_COLORS[label] ?? '#64748b'
  return (
    <span
      className="source-badge"
      style={{ borderColor: `${color}55`, color, background: `${color}11` }}
    >
      {label}
    </span>
  )
}
