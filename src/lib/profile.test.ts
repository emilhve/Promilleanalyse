import { describe, expect, it } from 'vitest'
import { readUserProfile } from './profile'

describe('user profile metadata', () => {
  it('reads a valid saved profile', () => {
    expect(
      readUserProfile({ body_weight_kg: 80, sex: 'male' }),
    ).toEqual({ bodyWeightKg: 80, sex: 'male' })
  })

  it('accepts numeric weight metadata stored as a string', () => {
    expect(
      readUserProfile({ body_weight_kg: '62.5', sex: 'female' }),
    ).toEqual({ bodyWeightKg: 62.5, sex: 'female' })
  })

  it('rejects incomplete or invalid profile metadata', () => {
    expect(readUserProfile({ body_weight_kg: 80 })).toBeNull()
    expect(readUserProfile({ body_weight_kg: -1, sex: 'male' })).toBeNull()
    expect(
      readUserProfile({ body_weight_kg: 80, sex: 'unsupported' }),
    ).toBeNull()
  })
})
