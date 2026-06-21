interface PresenterCueProps {
  cue: string
  visible: boolean
}

export function PresenterCue({ cue, visible }: PresenterCueProps) {
  if (!visible || !cue) return null
  return <div className="incident-presenter-cue glass-panel">🎙 {cue}</div>
}
