import { useRef, useState, type FormEvent } from 'react'
import { calculatePromille, type Drink, type Sex } from '../lib/bac'

interface DrinkInput {
  id: number
  volumeMl: string
  abv: string
  consumedAt: string
}

interface Estimate {
  promille: number
  calculatedAt: Date
}

function toDateTimeLocalValue(date: Date): string {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return localDate.toISOString().slice(0, 16)
}

function createDrinkInput(id: number, consumedAt = new Date()): DrinkInput {
  return {
    id,
    volumeMl: '',
    abv: '',
    consumedAt: toDateTimeLocalValue(consumedAt),
  }
}

interface PromilleCalculatorProps {
  bodyWeightKg: number
  sex: Sex
}

export function PromilleCalculator({
  bodyWeightKg,
  sex,
}: PromilleCalculatorProps) {
  const nextDrinkId = useRef(2)
  const [calculatedAt, setCalculatedAt] = useState(
    toDateTimeLocalValue(new Date()),
  )
  const [drinkInputs, setDrinkInputs] = useState<DrinkInput[]>([
    createDrinkInput(1),
  ])
  const [estimate, setEstimate] = useState<Estimate | null>(null)
  const [error, setError] = useState<string | null>(null)

  function updateDrink(
    id: number,
    field: keyof Omit<DrinkInput, 'id'>,
    value: string,
  ) {
    setDrinkInputs((current) =>
      current.map((drink) =>
        drink.id === id ? { ...drink, [field]: value } : drink,
      ),
    )
    setEstimate(null)
    setError(null)
  }

  function addDrink() {
    const id = nextDrinkId.current
    nextDrinkId.current += 1
    setDrinkInputs((current) => [...current, createDrinkInput(id)])
    setEstimate(null)
    setError(null)
  }

  function removeDrink(id: number) {
    setDrinkInputs((current) => current.filter((drink) => drink.id !== id))
    setEstimate(null)
    setError(null)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const parsedCalculationTime = new Date(calculatedAt)

    if (Number.isNaN(parsedCalculationTime.getTime())) {
      setError('Choose a valid time for the estimate.')
      setEstimate(null)
      return
    }

    const drinks: Drink[] = []

    for (const [index, input] of drinkInputs.entries()) {
      const volumeMl = Number(input.volumeMl)
      const abv = Number(input.abv)
      const timestamp = new Date(input.consumedAt)

      if (!Number.isFinite(volumeMl) || volumeMl <= 0) {
        setError(`Enter an amount greater than zero for drink ${index + 1}.`)
        setEstimate(null)
        return
      }

      if (!Number.isFinite(abv) || abv <= 0 || abv > 100) {
        setError(`Enter an alcohol percentage from 0.1 to 100 for drink ${index + 1}.`)
        setEstimate(null)
        return
      }

      if (Number.isNaN(timestamp.getTime())) {
        setError(`Choose a valid consumption time for drink ${index + 1}.`)
        setEstimate(null)
        return
      }

      drinks.push({ timestamp, volumeMl, abv })
    }

    setError(null)
    setEstimate({
      promille: calculatePromille(
        bodyWeightKg,
        sex,
        drinks,
        parsedCalculationTime,
      ),
      calculatedAt: parsedCalculationTime,
    })
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-emerald-700">
            Estimate
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
            Calculation time
          </h2>
        </div>

        <div className="mt-6 max-w-sm">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">
              Estimate at
            </span>
            <input
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-950 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              type="datetime-local"
              required
              value={calculatedAt}
              onChange={(event) => {
                setCalculatedAt(event.target.value)
                setEstimate(null)
                setError(null)
              }}
            />
          </label>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-emerald-700">
              Consumption
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
              Drinks
            </h2>
          </div>
          <button
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:border-emerald-500 hover:text-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-100"
            type="button"
            onClick={addDrink}
          >
            + Add drink
          </button>
        </div>

        {drinkInputs.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 px-5 py-8 text-center">
            <p className="text-sm text-slate-600">No drinks added.</p>
            <button
              className="mt-3 text-sm font-semibold text-emerald-700 hover:text-emerald-800"
              type="button"
              onClick={addDrink}
            >
              Add your first drink
            </button>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {drinkInputs.map((drink, index) => (
              <div
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5"
                key={drink.id}
                role="group"
                aria-labelledby={`drink-${drink.id}-title`}
              >
                <div className="flex items-center justify-between gap-4">
                  <h3
                    className="text-sm font-semibold text-slate-900"
                    id={`drink-${drink.id}-title`}
                  >
                    Drink {index + 1}
                  </h3>
                  <button
                    className="text-sm font-medium text-slate-500 transition hover:text-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-200"
                    type="button"
                    aria-label={`Remove drink ${index + 1}`}
                    onClick={() => removeDrink(drink.id)}
                  >
                    Remove
                  </button>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">
                      Amount (mL)
                    </span>
                    <input
                      className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                      type="number"
                      min="1"
                      step="1"
                      inputMode="numeric"
                      placeholder="500"
                      required
                      value={drink.volumeMl}
                      onChange={(event) =>
                        updateDrink(drink.id, 'volumeMl', event.target.value)
                      }
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">
                      Alcohol (ABV %)
                    </span>
                    <input
                      className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                      type="number"
                      min="0.1"
                      max="100"
                      step="0.1"
                      inputMode="decimal"
                      placeholder="4.7"
                      required
                      value={drink.abv}
                      onChange={(event) =>
                        updateDrink(drink.id, 'abv', event.target.value)
                      }
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">
                      Consumed at
                    </span>
                    <input
                      className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-950 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                      type="datetime-local"
                      required
                      value={drink.consumedAt}
                      onChange={(event) =>
                        updateDrink(drink.id, 'consumedAt', event.target.value)
                      }
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {error && (
        <div
          className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-800"
          role="alert"
        >
          {error}
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <button
          className="rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-200 disabled:cursor-not-allowed disabled:bg-slate-300"
          type="submit"
          disabled={drinkInputs.length === 0}
        >
          Calculate estimate
        </button>
        <p className="text-sm leading-6 text-slate-500">
          This simplified estimate cannot determine whether it is safe to
          drive.
        </p>
      </div>

      {estimate && (
        <section
          className="overflow-hidden rounded-3xl bg-slate-950 p-6 text-white shadow-xl sm:p-8"
          role="status"
        >
          <p className="text-sm font-semibold uppercase tracking-widest text-emerald-400">
            Estimated promille
          </p>
          <div className="mt-3 flex flex-wrap items-end gap-x-4 gap-y-2">
            <p className="text-5xl font-bold tracking-tight sm:text-6xl">
              {estimate.promille.toFixed(2)} ‰
            </p>
            <p className="pb-1 text-sm text-slate-400">
              at{' '}
              {estimate.calculatedAt.toLocaleString(undefined, {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </p>
          </div>
        </section>
      )}
    </form>
  )
}
