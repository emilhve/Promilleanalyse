import { generatePromilleTimeline, type Drink } from './lib/bac'

const startTime = new Date('2026-01-01T20:00:00.000Z')

const drinks: Drink[] = [
  { timestamp: startTime, volumeMl: 500, abv: 4.7 },
  {
    timestamp: new Date('2026-01-01T21:00:00.000Z'),
    volumeMl: 500,
    abv: 4.7,
  },
  {
    timestamp: new Date('2026-01-01T21:30:00.000Z'),
    volumeMl: 150,
    abv: 12,
  },
]

const displayedTimes = new Set([
  '20:00',
  '20:15',
  '20:30',
  '21:00',
  '21:30',
  '22:00',
])

const timeline = generatePromilleTimeline(
  80,
  'male',
  drinks,
  startTime,
  new Date('2026-01-01T22:00:00.000Z'),
)

console.log('Estimated promille for an 80 kg male:')

for (const point of timeline) {
  const time = point.timestamp.toISOString().slice(11, 16)

  if (displayedTimes.has(time)) {
    console.log(`${time} -> ${point.promille.toFixed(2)} ‰`)
  }
}
