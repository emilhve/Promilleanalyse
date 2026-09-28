import { useState, type FormEvent } from 'react'
import type { Sex } from '../lib/bac'
import { supabase, supabaseConfigurationError } from '../lib/supabase'

type AuthMode = 'sign-in' | 'sign-up'

export function LoginPage() {
  const [mode, setMode] = useState<AuthMode>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [bodyWeightKg, setBodyWeightKg] = useState('')
  const [sex, setSex] = useState<Sex>('male')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const isSignIn = mode === 'sign-in'

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode)
    setPassword('')
    setError(null)
    setMessage(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setMessage(null)

    if (!supabase) {
      setError(
        supabaseConfigurationError ?? 'Supabase configuration is incomplete.',
      )
      return
    }

    setIsSubmitting(true)

    try {
      if (isSignIn) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })

        if (signInError) {
          setError(signInError.message)
        }
      } else {
        const parsedBodyWeight = Number(bodyWeightKg)

        if (!Number.isFinite(parsedBodyWeight) || parsedBodyWeight <= 0) {
          setError('Enter a body weight greater than zero.')
          return
        }

        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              body_weight_kg: parsedBodyWeight,
              sex,
            },
          },
        })

        if (signUpError) {
          setError(signUpError.message)
        } else if (!data.session) {
          setMessage(
            'Account created. Check your email and follow the confirmation link before signing in.',
          )
        }
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Authentication failed. Please try again.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 sm:px-6">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <span className="inline-flex rounded-full bg-emerald-400/10 px-3 py-1 text-sm font-semibold text-emerald-300 ring-1 ring-inset ring-emerald-400/20">
            Promilleanalyse
          </span>
          <h1 className="mt-5 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {isSignIn ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            {isSignIn
              ? 'Sign in to access the BAC estimator.'
              : 'Register with your email and a secure password.'}
          </p>
        </div>

        <section className="rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
          <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1">
            <button
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                isSignIn
                  ? 'bg-white text-slate-950 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              type="button"
              aria-pressed={isSignIn}
              onClick={() => changeMode('sign-in')}
            >
              Sign in
            </button>
            <button
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                !isSignIn
                  ? 'bg-white text-slate-950 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              type="button"
              aria-pressed={!isSignIn}
              onClick={() => changeMode('sign-up')}
            >
              Create account
            </button>
          </div>

          <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Email</span>
              <input
                className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                required
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value)
                  setError(null)
                  setMessage(null)
                }}
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">
                Password
              </span>
              <input
                className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                type="password"
                autoComplete={isSignIn ? 'current-password' : 'new-password'}
                minLength={6}
                placeholder="At least 6 characters"
                required
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value)
                  setError(null)
                  setMessage(null)
                }}
              />
            </label>

            {!isSignIn && (
              <div className="grid gap-5 sm:grid-cols-2">
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
                      setMessage(null)
                    }}
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-slate-700">
                    Sex for calculation
                  </span>
                  <select
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-950 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                    value={sex}
                    onChange={(event) => {
                      setSex(event.target.value as Sex)
                      setError(null)
                      setMessage(null)
                    }}
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </label>
              </div>
            )}

            {supabaseConfigurationError && (
              <div
                className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900"
                role="alert"
              >
                {supabaseConfigurationError}
              </div>
            )}

            {error && (
              <div
                className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-800"
                role="alert"
              >
                {error}
              </div>
            )}

            {message && (
              <div
                className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-800"
                role="status"
              >
                {message}
              </div>
            )}

            <button
              className="w-full rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-200 disabled:cursor-not-allowed disabled:bg-slate-300"
              type="submit"
              disabled={isSubmitting || !supabase}
            >
              {isSubmitting
                ? isSignIn
                  ? 'Signing in…'
                  : 'Creating account…'
                : isSignIn
                  ? 'Sign in'
                  : 'Create account'}
            </button>
          </form>
        </section>
      </div>
    </main>
  )
}
