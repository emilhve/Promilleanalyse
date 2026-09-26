import { SupabaseStatus } from '../components/SupabaseStatus'

export function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-16 sm:py-24">
      <div className="mx-auto max-w-3xl">
        <div className="mb-10">
          <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-800">
            React + Vite + TypeScript
          </span>
          <h1 className="mt-5 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
            Promilleanalyse
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
            The app is running, Tailwind CSS is styling this page, and the card
            below checks whether Supabase is reachable.
          </p>
        </div>

        <SupabaseStatus />
      </div>
    </main>
  )
}
