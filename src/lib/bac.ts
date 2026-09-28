export type Sex = 'male' | 'female'

export interface Drink {
  /** Time at which consumption of the drink is treated as starting. */
  timestamp: Date
  /** Total drink volume in milliliters. */
  volumeMl: number
  /** Alcohol by volume as a percentage, for example 4.7 for beer. */
  abv: number
}

export interface PromillePoint {
  timestamp: Date
  promille: number
}

export const DISTRIBUTION_FACTORS: Readonly<Record<Sex, number>> = {
  male: 0.68,
  female: 0.55,
}

export const ABSORPTION_MINUTES = 45
export const ELIMINATION_PROMILLE_PER_HOUR = 0.15

const ALCOHOL_DENSITY_GRAMS_PER_MILLILITER = 0.789
const MILLISECONDS_PER_HOUR = 60 * 60 * 1000
const MILLISECONDS_PER_MINUTE = 60 * 1000

interface AbsorptionEvent {
  timestampMs: number
  rateChangePerHour: number
}

/**
 * Converts a drink to grams of pure alcohol.
 *
 * Formula: volume (ml) * ABV fraction * ethanol density (g/ml).
 */
export function calculateAlcoholGrams(drink: Drink): number {
  validateDrink(drink)
  return drink.volumeMl * (drink.abv / 100) * ALCOHOL_DENSITY_GRAMS_PER_MILLILITER
}

/**
 * Calculates the drink's maximum gross promille contribution before the
 * body's elimination of alcohol is applied.
 *
 * Simplified Widmark formula:
 * alcohol grams / (body weight in kg * distribution factor).
 */
export function calculateMaximumDrinkPromille(
  drink: Drink,
  bodyWeightKg: number,
  sexOrDistributionFactor: Sex | number,
): number {
  validateBodyWeight(bodyWeightKg)
  const distributionFactor = resolveDistributionFactor(sexOrDistributionFactor)

  return calculateAlcoholGrams(drink) / (bodyWeightKg * distributionFactor)
}

/**
 * Estimates promille at one timestamp.
 *
 * Every drink adds its maximum contribution at a constant rate during its own
 * 45-minute absorption window. The body-wide elimination rate is subtracted
 * once while alcohol is present, and the result is clamped at zero.
 */
export function calculatePromille(
  bodyWeightKg: number,
  sexOrDistributionFactor: Sex | number,
  drinks: readonly Drink[],
  at: Date,
): number {
  validateBodyWeight(bodyWeightKg)
  const distributionFactor = resolveDistributionFactor(sexOrDistributionFactor)
  const targetMs = validateDate(at, 'Calculation timestamp')
  const absorptionHours = ABSORPTION_MINUTES / 60
  const absorptionMs = ABSORPTION_MINUTES * MILLISECONDS_PER_MINUTE

  const events: AbsorptionEvent[] = []

  for (const drink of drinks) {
    const drinkTimestampMs = validateDate(drink.timestamp, 'Drink timestamp')
    const maximumPromille =
      calculateAlcoholGrams(drink) / (bodyWeightKg * distributionFactor)
    const absorptionRatePerHour = maximumPromille / absorptionHours

    // Starting and ending rate events let overlapping drinks absorb
    // independently without applying the elimination rate once per drink.
    events.push({
      timestampMs: drinkTimestampMs,
      rateChangePerHour: absorptionRatePerHour,
    })
    events.push({
      timestampMs: drinkTimestampMs + absorptionMs,
      rateChangePerHour: -absorptionRatePerHour,
    })
  }

  events.sort((a, b) => a.timestampMs - b.timestampMs)

  if (events.length === 0 || targetMs <= events[0].timestampMs) {
    return 0
  }

  let promille = 0
  let absorptionRatePerHour = 0
  let currentTimestampMs = events[0].timestampMs
  let eventIndex = 0

  while (
    eventIndex < events.length &&
    events[eventIndex].timestampMs <= targetMs
  ) {
    const eventTimestampMs = events[eventIndex].timestampMs
    promille = advancePromille(
      promille,
      absorptionRatePerHour,
      eventTimestampMs - currentTimestampMs,
    )

    // Apply simultaneous events together so results do not depend on input
    // ordering when drinks start or finish at exactly the same time.
    while (
      eventIndex < events.length &&
      events[eventIndex].timestampMs === eventTimestampMs
    ) {
      absorptionRatePerHour += events[eventIndex].rateChangePerHour
      eventIndex += 1
    }

    // Avoid tiny negative rates caused by floating-point subtraction.
    absorptionRatePerHour = Math.max(0, absorptionRatePerHour)
    currentTimestampMs = eventTimestampMs
  }

  return advancePromille(
    promille,
    absorptionRatePerHour,
    targetMs - currentTimestampMs,
  )
}

/** Generates inclusive promille estimates at one-minute intervals. */
export function generatePromilleTimeline(
  bodyWeightKg: number,
  sexOrDistributionFactor: Sex | number,
  drinks: readonly Drink[],
  startTime: Date,
  endTime: Date,
): PromillePoint[] {
  const startMs = validateDate(startTime, 'Start timestamp')
  const endMs = validateDate(endTime, 'End timestamp')

  if (endMs < startMs) {
    throw new RangeError('End timestamp must be at or after start timestamp.')
  }

  const timeline: PromillePoint[] = []

  for (
    let timestampMs = startMs;
    timestampMs <= endMs;
    timestampMs += MILLISECONDS_PER_MINUTE
  ) {
    const timestamp = new Date(timestampMs)
    timeline.push({
      timestamp,
      promille: calculatePromille(
        bodyWeightKg,
        sexOrDistributionFactor,
        drinks,
        timestamp,
      ),
    })
  }

  return timeline
}

function advancePromille(
  currentPromille: number,
  absorptionRatePerHour: number,
  elapsedMilliseconds: number,
): number {
  if (elapsedMilliseconds <= 0) {
    return Math.max(0, currentPromille)
  }

  const elapsedHours = elapsedMilliseconds / MILLISECONDS_PER_HOUR
  const netRatePerHour =
    absorptionRatePerHour - ELIMINATION_PROMILLE_PER_HOUR

  // If BAC has already reached zero, elimination cannot make it negative.
  // Absorption must exceed elimination before the estimate rises again.
  if (currentPromille === 0 && netRatePerHour <= 0) {
    return 0
  }

  return Math.max(0, currentPromille + netRatePerHour * elapsedHours)
}

function resolveDistributionFactor(
  sexOrDistributionFactor: Sex | number,
): number {
  const distributionFactor =
    typeof sexOrDistributionFactor === 'number'
      ? sexOrDistributionFactor
      : DISTRIBUTION_FACTORS[sexOrDistributionFactor]

  if (
    typeof distributionFactor !== 'number' ||
    !Number.isFinite(distributionFactor) ||
    distributionFactor <= 0
  ) {
    throw new RangeError(
      'Sex must be "male" or "female", or the distribution factor must be a positive number.',
    )
  }

  return distributionFactor
}

function validateBodyWeight(bodyWeightKg: number): void {
  if (!Number.isFinite(bodyWeightKg) || bodyWeightKg <= 0) {
    throw new RangeError('Body weight must be a positive number.')
  }
}

function validateDrink(drink: Drink): void {
  validateDate(drink.timestamp, 'Drink timestamp')

  if (!Number.isFinite(drink.volumeMl) || drink.volumeMl < 0) {
    throw new RangeError('Drink volume must be a non-negative number.')
  }

  if (!Number.isFinite(drink.abv) || drink.abv < 0 || drink.abv > 100) {
    throw new RangeError('Drink ABV must be between 0 and 100.')
  }
}

function validateDate(date: Date, label: string): number {
  const timestampMs = date.getTime()

  if (!Number.isFinite(timestampMs)) {
    throw new RangeError(`${label} must be a valid Date.`)
  }

  return timestampMs
}
