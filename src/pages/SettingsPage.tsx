import type { UserProfile } from '../lib/profile'
import type { AppRole } from '../lib/sessions'

interface SettingsPageProps {
  userEmail: string
  profile: UserProfile
  appRole: AppRole
}

interface SettingProps {
  label: string
  value: string
}

function Setting({ label, value }: SettingProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
      <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </dt>
      <dd className="mt-2 break-words font-semibold text-slate-950">{value}</dd>
    </div>
  )
}

export function SettingsPage({
  userEmail,
  profile,
  appRole,
}: SettingsPageProps) {
  return (
    <div>
      <header className="mb-8 max-w-3xl sm:mb-10">
        <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-800">
          Your account
        </span>
        <h1 className="mt-5 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
          Settings
        </h1>
        <p className="mt-4 text-lg leading-8 text-slate-600">
          These details are saved to your account and used by the BAC
          calculation.
        </p>
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-emerald-700">
              Profile
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
              Account details
            </h2>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            Read only
          </span>
        </div>

        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <Setting label="Display name" value={profile.displayName} />
          <Setting label="Email" value={userEmail} />
          <Setting
            label="Account role"
            value={appRole === 'admin' ? 'Admin' : 'User'}
          />
          <Setting
            label="Body weight"
            value={`${profile.bodyWeightKg} kg`}
          />
          <Setting
            label="Sex used for BAC calculation"
            value={
              profile.sex === 'male' ? 'Male (r = 0.68)' : 'Female (r = 0.55)'
            }
          />
        </dl>

        <p className="mt-5 text-sm leading-6 text-slate-500">
          Contact an administrator if these saved details need to be corrected.
        </p>
      </section>
    </div>
  )
}
