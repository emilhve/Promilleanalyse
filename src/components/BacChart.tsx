import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  calculatePromilleFromDistributionMass,
  generatePromilleTimelineAtInterval,
  type Drink,
} from '../lib/bac'
import type { DrinkRow, ParticipantRow } from '../lib/database.types'

interface BacChartProps {
  participant: ParticipantRow
  drinks: DrinkRow[]
  startedAt: string
  chartEnd: Date
}

export function BacChart({
  participant,
  drinks,
  startedAt,
  chartEnd,
}: BacChartProps) {
  const participantDrinks: Drink[] = drinks
    .filter((drink) => drink.user_id === participant.user_id)
    .map((drink) => ({
      timestamp: new Date(drink.consumed_at),
      volumeMl: Number(drink.volume_ml),
      abv: Number(drink.abv),
    }))

  const start = new Date(startedAt)
  const safeEnd = chartEnd < start ? start : chartEnd
  const timeline = generatePromilleTimelineAtInterval(
    Number(participant.distribution_mass_kg),
    participantDrinks,
    start,
    safeEnd,
    5,
  )
  const chartData = timeline.map((point) => ({
    time: point.timestamp.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    }),
    promille: Number(point.promille.toFixed(3)),
  }))
  const currentPromille = calculatePromilleFromDistributionMass(
    Number(participant.distribution_mass_kg),
    participantDrinks,
    safeEnd,
  )

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h2 className="text-lg font-bold">{participant.display_name}</h2>
        <p className="text-2xl font-bold text-sky-700">
          {currentPromille.toFixed(2)} ‰
        </p>
      </div>
      <div className="h-64 w-full" aria-label={`Estimated BAC for ${participant.display_name}`}>
        <ResponsiveContainer height="100%" width="100%">
          <LineChart data={chartData} margin={{ left: -18, right: 12, top: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="time" minTickGap={32} tick={{ fontSize: 12 }} />
            <YAxis
              allowDecimals
              domain={[0, 'auto']}
              tick={{ fontSize: 12 }}
              unit=" ‰"
            />
            <Tooltip />
            <Line
              dataKey="promille"
              dot={false}
              isAnimationActive={false}
              name="Estimated BAC"
              stroke="#0369a1"
              strokeWidth={3}
              type="monotone"
              unit=" ‰"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500">
        Estimate only. Absorption and elimination vary considerably between people.
        Never use this value to decide whether it is safe to drive.
      </p>
    </article>
  )
}
