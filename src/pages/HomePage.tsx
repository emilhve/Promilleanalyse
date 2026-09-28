import { useState } from 'react'
import { PromilleCalculator } from '../components/PromilleCalculator'
import type { UserProfile } from '../lib/profile'
import { SettingsPage, type AppRole } from './SettingsPage'

type Page = 'calculator' | 'settings'

interface HomePageProps {
  userEmail: string
  profile: UserProfile
  appRole: AppRole
  signOutError: string | null
  onSignOut: () => void
}

export function HomePage({
  userEmail,
  profile,
  appRole,
  signOutError,
  onSignOut,
}: HomePageProps) {
  const [page, setPage] = useState<Page>('calculator')

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-5xl">
        <header className="mb-10 sm:mb-12">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-6">
            <button
              className="text-sm font-semibold text-slate-950"
              type="button"
              onClick={() => setPage('calculator')}
            >
              Promilleanalyse
            </button>
            <div className="flex items-center gap-3">
              <button
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition focus:outline-none focus:ring-4 focus:ring-slate-200 ${
                  page === 'calculator'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                }`}
                type="button"
                aria-current={page === 'calculator' ? 'page' : undefined}
                onClick={() => setPage('calculator')}
              >
                Calculator
              </button>
              <button
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition focus:outline-none focus:ring-4 focus:ring-slate-200 ${
                  page === 'settings'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                }`}
                type="button"
                aria-current={page === 'settings' ? 'page' : undefined}
                onClick={() => setPage('settings')}
              >
                Settings
              </button>
              <button
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950 focus:outline-none focus:ring-4 focus:ring-slate-200"
                type="button"
                onClick={onSignOut}
              >
                Sign out
              </button>
            </div>
          </div>

          {page === 'calculator' && (
            <div className="mt-10 max-w-3xl">
              <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-800">
                BAC estimator
              </span>
              <h1 className="mt-5 text-4xl font-bold tracking-tight text-slate-950 sm:text-6xl">
                Estimate your promille
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
                Add what you drank and when you drank it to get a simplified
                estimate of your blood alcohol concentration.
              </p>
            </div>
          )}
        </header>

        {signOutError && (
          <div
            className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-800"
            role="alert"
          >
            Could not sign out: {signOutError}
          </div>
        )}

        {page === 'calculator' ? (
          <PromilleCalculator
            bodyWeightKg={profile.bodyWeightKg}
            sex={profile.sex}
          />
        ) : (
          <SettingsPage
            userEmail={userEmail}
            profile={profile}
            appRole={appRole}
          />
        )}
      </div>
    </main>
  )
}
