import type { Sex } from './bac'
import type { ProfileRow } from './database.types'

export interface UserProfile {
  userId: string
  displayName: string
  bodyWeightKg: number
  sex: Sex
}

export function readUserProfile(profile: ProfileRow | null): UserProfile | null {
  if (!profile) {
    return null
  }

  const bodyWeightKg = Number(profile.body_weight_kg)
  const displayName = profile.display_name?.trim()
  const sex = profile.sex

  if (
    !displayName ||
    !Number.isFinite(bodyWeightKg) ||
    bodyWeightKg <= 0 ||
    (sex !== 'male' && sex !== 'female')
  ) {
    return null
  }

  return {
    userId: profile.user_id,
    displayName,
    bodyWeightKg,
    sex,
  }
}
