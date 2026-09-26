import { useCallback, useEffect, useState } from 'react'
import {
  checkSupabaseConnection,
  supabaseConfigurationError,
  type SupabaseConnectionStatus,
} from '../lib/supabase'

type Status = SupabaseConnectionStatus | null

export function SupabaseStatus() {
  const [status, setStatus] = useState<Status>(null)
  const [isChecking, setIsChecking] = useState(false)

  const checkConnection = useCallback(async () => {
    setIsChecking(true)
    setStatus(await checkSupabaseConnection())
    setIsChecking(false)
  }, [])

  useEffect(() => {
    void checkConnection()
  }, [checkConnection])

  const isConfigured = !supabaseConfigurationError
  const isConnected = status?.ok === true

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">
            Supabase
          </p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900">
            Connection status
          </h2>
        </div>
        <span
          className={`mt-1 h-3 w-3 shrink-0 rounded-full ${
            isChecking
              ? 'animate-pulse bg-amber-400'
              : isConnected
                ? 'bg-emerald-500'
                : 'bg-rose-500'
          }`}
          aria-hidden="true"
        />
      </div>

      <p className="mt-4 text-sm leading-6 text-slate-600" role="status">
        {isChecking ? 'Checking Supabase connection…' : status?.message}
      </p>

      {isConfigured && !isChecking && !isConnected && (
        <button
          className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
          type="button"
          onClick={() => void checkConnection()}
        >
          Try again
        </button>
      )}
    </section>
  )
}
