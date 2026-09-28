import { describe, expect, it } from 'vitest'
import {
  calculateAlcoholGrams,
  calculateMaximumDrinkPromille,
  calculatePromille,
  generatePromilleTimeline,
  type Drink,
} from './bac'

const beerTime = new Date('2026-01-01T20:00:00.000Z')
const beer: Drink = {
  timestamp: beerTime,
  volumeMl: 500,
  abv: 4.7,
}

function minutesAfter(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000)
}

describe('BAC calculation', () => {
  it('converts drink volume and ABV to grams of pure alcohol', () => {
    expect(calculateAlcoholGrams(beer)).toBeCloseTo(18.5415, 6)
  })

  it('uses the simplified Widmark maximum contribution', () => {
    const expected = 18.5415 / (80 * 0.68)

    expect(calculateMaximumDrinkPromille(beer, 80, 'male')).toBeCloseTo(
      expected,
      10,
    )
  })

  it('returns zero before and at the drink timestamp', () => {
    expect(calculatePromille(80, 'male', [beer], minutesAfter(beerTime, -1))).toBe(
      0,
    )
    expect(calculatePromille(80, 'male', [beer], beerTime)).toBe(0)
  })

  it('absorbs linearly and applies elimination during the 45-minute window', () => {
    const maximum = calculateMaximumDrinkPromille(beer, 80, 'male')
    const expectedAtHalfAbsorption = maximum / 2 - 0.15 * (22.5 / 60)

    expect(
      calculatePromille(80, 'male', [beer], minutesAfter(beerTime, 22.5)),
    ).toBeCloseTo(expectedAtHalfAbsorption, 10)
  })

  it('never returns a negative value after alcohol has been eliminated', () => {
    expect(
      calculatePromille(80, 'male', [beer], minutesAfter(beerTime, 24 * 60)),
    ).toBe(0)
  })

  it('handles each drink according to its own timestamp', () => {
    const laterBeer: Drink = {
      ...beer,
      timestamp: minutesAfter(beerTime, 4 * 60),
    }
    const maximum = calculateMaximumDrinkPromille(laterBeer, 80, 'male')
    const expected = maximum - 0.15 * 0.75

    // The first drink has reached zero before the second starts, so its old
    // elapsed time must not erase the contribution from the later drink.
    expect(
      calculatePromille(
        80,
        'male',
        [beer, laterBeer],
        minutesAfter(laterBeer.timestamp, 45),
      ),
    ).toBeCloseTo(expected, 10)
  })

  it('generates an inclusive timeline at one-minute intervals', () => {
    const timeline = generatePromilleTimeline(
      80,
      'male',
      [beer],
      beerTime,
      minutesAfter(beerTime, 2),
    )

    expect(timeline).toHaveLength(3)
    expect(timeline.map(({ timestamp }) => timestamp.toISOString())).toEqual([
      '2026-01-01T20:00:00.000Z',
      '2026-01-01T20:01:00.000Z',
      '2026-01-01T20:02:00.000Z',
    ])
  })

  it('validates invalid physical inputs and time ranges', () => {
    expect(() => calculatePromille(0, 'male', [beer], beerTime)).toThrow(
      'Body weight must be a positive number.',
    )
    expect(() =>
      generatePromilleTimeline(
        80,
        'male',
        [beer],
        minutesAfter(beerTime, 1),
        beerTime,
      ),
    ).toThrow('End timestamp must be at or after start timestamp.')
  })
})
