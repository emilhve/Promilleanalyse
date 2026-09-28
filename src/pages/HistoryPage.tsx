import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import type { SessionRow } from '../lib/database.types'
import {
  fetchSessions,
  formatDateTime,
  getSessionState,
  type AppRole,
} from '../lib/sessions'

interface HistoryPageProps {
  role: AppRole
}

export function HistoryPage({ role }: HistoryPageProps) {
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [errorMessage, setErrorMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    void fetchSessions()
      .then((result) => {
        const now = new Date()
        setSessions(result.filter((session) => getSessionState(session, now) === 'closed'))
      })
      .catch((error: unknown) => {
        setErrorMessage(error instanceof Error ? error.message : 'Could not load history.')
      })
      .finally(() => setIsLoading(false))
  }, [])

  if (role !== 'admin') {
    return <Navigate replace to="/" />
  }

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">Session history</h1>
      <p className="mt-2 text-slate-600">Completed sessions that you created.</p>
      {errorMessage && (
        <p className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700" role="alert">
          {errorMessage}
        </p>
      )}
      {isLoading ? (
        <p className="mt-8 text-slate-500">Loading history…</p>
      ) : sessions.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-slate-500">
          No completed sessions yet.
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {sessions.map((session) => (
            <Link
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-sky-300"
              key={session.id}
              to={`/sessions/${session.id}`}
            >
              <h2 className="font-bold">{session.name}</h2>
              {session.started_at && (
                <p className="mt-2 text-sm text-slate-500">
                  Started {formatDateTime(session.started_at)}
                </p>
              )}
              {session.ends_at && (
                <p className="mt-1 text-sm text-slate-500">
                  Ended {formatDateTime(session.ends_at)}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
