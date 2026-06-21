import { BUILDING_PROFILES } from '../../data/buildingProfiles'
import type { BuildingProfile } from '../../types/buildingProfile'

interface ProfileCardProps {
  profile: BuildingProfile
  isActive: boolean
  onUse: (id: string) => void
}

function ProfileCard({ profile, isActive, onUse }: ProfileCardProps) {
  return (
    <button
      type="button"
      className={`bp-profile-card${isActive ? ' bp-profile-card--active' : ''}`}
      onClick={() => onUse(profile.id)}
    >
      <span className="bp-profile-card__emoji">{profile.icon}</span>
      <span className="bp-profile-card__name">{profile.name}</span>
      <span className="bp-profile-card__desc">{profile.description}</span>
      <span className="bp-use-btn">Use Profile</span>
    </button>
  )
}

interface ProfileSelectorProps {
  activeProfileId: string
  onSelect: (id: string) => void
  onConfirm: (id: string) => void
}

export function ProfileSelector({ activeProfileId, onSelect, onConfirm }: ProfileSelectorProps) {
  function handleUse(id: string) {
    onSelect(id)
    onConfirm(id)
  }

  return (
    <div className="bp-select-screen">
      <div style={{ textAlign: 'center' }}>
        <h1 className="bp-select-screen__title">Building Profile</h1>
        <p className="bp-select-screen__sub">Select the closest matching structure to begin.</p>
      </div>
      <div className="bp-profile-cards">
        {BUILDING_PROFILES.map((profile) => (
          <ProfileCard
            key={profile.id}
            profile={profile}
            isActive={profile.id === activeProfileId}
            onUse={handleUse}
          />
        ))}
      </div>
    </div>
  )
}
