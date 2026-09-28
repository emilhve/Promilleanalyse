import { describe, expect, it } from 'vitest'
import { readUserProfile } from './profile'

describe('user profile metadata', () => {
  it('reads a valid saved profile', () => {
    expect(
      readUserProfile({
        user_id: 'user-1',
        display_name: 'Emil',
        body_weight_kg: 80,
        sex: 'male',
        created_at: '2026-01-01T00:00:00Z',
        completed_at: '2026-01-01T00:00:00Z',
      }),
    ).toEqual({
      userId: 'user-1',
      displayName: 'Emil',
      bodyWeightKg: 80,
      sex: 'male',
    })
  })

  it('rejects incomplete or invalid profile metadata', () => {
    expect(readUserProfile(null)).toBeNull()
    expect(
      readUserProfile({
        user_id: 'user-1',
        display_name: null,
        body_weight_kg: 80,
        sex: 'male',
        created_at: '2026-01-01T00:00:00Z',
        completed_at: null,
      }),
    ).toBeNull()
  })
})
