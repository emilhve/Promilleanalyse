import type { Sex } from './bac'

export interface UserProfile {
  bodyWeightKg: number
  sex: Sex
}

export function readUserProfile(
  metadata: Record<string, unknown>,
): UserProfile | null {
  const bodyWeightKg = Number(metadata.body_weight_kg)
  const sex = metadata.sex

  if (
    !Number.isFinite(bodyWeightKg) ||
    bodyWeightKg <= 0 ||
    (sex !== 'male' && sex !== 'female')
  ) {
    return null
  }

  return { bodyWeightKg, sex }
}
