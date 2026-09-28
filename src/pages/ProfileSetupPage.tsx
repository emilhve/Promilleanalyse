import { useState, type FormEvent } from 'react'
import type { Sex } from '../lib/bac'
import { readUserProfile, type UserProfile } from '../lib/profile'
import { requireSupabase } from '../lib/supabase'

interface ProfileSetupPageProps {
  userEmail: string
  errorMessage?: string
  onComplete: (profile: UserProfile) => void
  onSignOut: () => Promise<void>
}

export function ProfileSetupPage({
  userEmail,
  errorMessage,
  onComplete,
  onSignOut,
}: ProfileSetupPageProps) {
  const [displayName, setDisplayName] = useState('')
  const [bodyWeightKg, setBodyWeightKg] = useState('')
  const [sex, setSex] = useState<Sex>('male')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(errorMessage ?? null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsedBodyWeight = Number(bodyWeightKg)
    const trimmedDisplayName = displayName.trim()

    if (trimmedDisplayName.length < 2 || trimmedDisplayName.length > 50) {
      setError('Display name must be between 2 and 50 characters.')
      return
    }
    if (
      !Number.isFinite(parsedBodyWeight) ||
      parsedBodyWeight <= 0 ||
      parsedBodyWeight > 500
    ) {
      setError('Body weight must be greater than 0 and no more than 500 kg.')
      return
    }

    setIsSubmitting(true)
    setError(null)
    const { data, error: updateError } = await requireSupabase().rpc(
      'complete_profile',
      {
        p_display_name: trimmedDisplayName,
        p_body_weight_kg: parsedBodyWeight,
        p_sex: sex,
      },
    )
    setIsSubmitting(false)

    if (updateError) {
      setError(updateError.message)
      return
    }

    const completedProfile = readUserProfile(data)
    if (!completedProfile) {
      setError('The profile was saved, but the returned data was incomplete.')
      return
    }
    onComplete(completedProfile)
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 sm:px-6">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <span className="inline-flex rounded-full bg-emerald-400/10 px-3 py-1 text-sm font-semibold text-emerald-300 ring-1 ring-inset ring-emerald-400/20">
            One-time setup
          </span>
          <h1 className="mt-5 text-3xl font-bold tracking-tight text-white">
            Complete your profile
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            These details are saved once and used for session BAC estimates.
          </p>
        </div>
        <section className="rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
          <p className="mb-6 truncate text-sm text-slate-500">{userEmail}</p>
          <form className="space-y-5" onSubmit={(event) => void handleSubmit(event)}>
            <label className="block text-sm font-medium text-slate-700">
              Display name
              <input
                className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                maxLength={50}
                minLength={2}
                onChange={(event) => setDisplayName(event.target.value)}
                required
                value={displayName}
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Body weight (kg)
              <input
                className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                inputMode="decimal"
                max="500"
                min="0.1"
                onChange={(event) => setBodyWeightKg(event.target.value)}
                required
                step="0.1"
                type="number"
                value={bodyWeightKg}
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Sex used for BAC calculation
              <select
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                onChange={(event) => setSex(event.target.value as Sex)}
                value={sex}
              >
                <option value="male">Male (r = 0.68)</option>
                <option value="female">Female (r = 0.55)</option>
              </select>
            </label>
            {error && (
              <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">
                {error}
              </p>
            )}
            <button
              className="w-full rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? 'Saving…' : 'Save profile'}
            </button>
          </form>
          <button
            className="mt-4 w-full text-sm font-medium text-slate-500 hover:text-slate-800"
            onClick={() => void onSignOut()}
            type="button"
          >
            Sign out
          </button>
        </section>
      </div>
    </main>
  )
}
