import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import type { Sex } from '../lib/bac'
import type { UserProfile } from '../lib/profile'

interface ProfileSetupPageProps {
  userEmail: string
  onComplete: (profile: UserProfile) => void
  onSignOut: () => void
}

export function ProfileSetupPage({
  userEmail,
  onComplete,
  onSignOut,
}: ProfileSetupPageProps) {
  const [bodyWeightKg, setBodyWeightKg] = useState('')
  const [sex, setSex] = useState<Sex>('male')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsedBodyWeight = Number(bodyWeightKg)

    if (!Number.isFinite(parsedBodyWeight) || parsedBodyWeight <= 0) {
      setError('Enter a body weight greater than zero.')
      return
    }

    if (!supabase) {
      setError('Supabase is not configured.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        body_weight_kg: parsedBodyWeight,
        sex,
      },
    })

    setIsSubmitting(false)

    if (updateError) {
      setError(updateError.message)
      return
    }

    onComplete({ bodyWeightKg: parsedBodyWeight, sex })
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 sm:px-6">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <span className="inline-flex rounded-full bg-emerald-400/10 px-3 py-1 text-sm font-semibold text-emerald-300 ring-1 ring-inset ring-emerald-400/20">
            One-time setup
          </span>
          <h1 className="mt-5 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Complete your profile
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Add the details used by the BAC calculation. You will only be asked
            once.
          </p>
        </div>

        <section className="rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
          <p className="mb-6 truncate text-sm text-slate-500">{userEmail}</p>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">
                Body weight (kg)
              </span>
              <input
                className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                type="number"
                min="1"
                step="0.1"
                inputMode="decimal"
                placeholder="80"
                required
                value={bodyWeightKg}
                onChange={(event) => {
                  setBodyWeightKg(event.target.value)
                  setError(null)
                }}
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">
                Sex used for BAC calculation
              </span>
              <select
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-950 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                value={sex}
                onChange={(event) => {
                  setSex(event.target.value as Sex)
                  setError(null)
                }}
              >
                <option value="male">Male (r = 0.68)</option>
                <option value="female">Female (r = 0.55)</option>
              </select>
            </label>

            {error && (
              <div
                className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-800"
                role="alert"
              >
                {error}
              </div>
            )}

            <button
              className="w-full rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-200 disabled:cursor-not-allowed disabled:bg-slate-300"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving…' : 'Save profile'}
            </button>
          </form>

          <button
            className="mt-4 w-full text-sm font-medium text-slate-500 hover:text-slate-800"
            type="button"
            onClick={onSignOut}
          >
            Sign out
          </button>
        </section>
      </div>
    </main>
  )
}
