import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { SessionRow } from '../lib/database.types'
import {
  fetchSessions,
  formatDateTime,
  formatRemaining,
  getSessionState,
  type AppRole,
  type SessionState,
} from '../lib/sessions'

interface DashboardPageProps {
  role: AppRole
}

function SessionCard({ session, now }: { session: SessionRow; now: Date }) {
  const state = getSessionState(session, now)

  return (
    <Link
      className="block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-sky-300 hover:shadow-md"
      to={`/sessions/${session.id}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-bold text-slate-950">{session.name}</h3>
          <p className="mt-1 text-sm text-slate-500">
            {state === 'draft' && `Created ${formatDateTime(session.created_at)}`}
            {state !== 'draft' && session.started_at &&
              `Started ${formatDateTime(session.started_at)}`}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
            state === 'active'
              ? 'bg-emerald-100 text-emerald-800'
              : state === 'draft'
                ? 'bg-amber-100 text-amber-800'
                : 'bg-slate-100 text-slate-600'
          }`}
        >
          {state}
        </span>
      </div>
      {state === 'active' && session.ends_at && (
        <p className="mt-4 text-sm font-semibold text-emerald-700">
          {formatRemaining(session.ends_at, now)}
        </p>
      )}
    </Link>
  )
}

function SessionGroup({
  title,
  sessions,
  now,
  emptyMessage,
}: {
  title: string
  sessions: SessionRow[]
  now: Date
  emptyMessage: string
}) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-bold">{title}</h2>
      {sessions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
          {emptyMessage}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {sessions.map((session) => (
            <SessionCard key={session.id} now={now} session={session} />
          ))}
        </div>
      )}
    </section>
  )
}

export function DashboardPage({ role }: DashboardPageProps) {
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [errorMessage, setErrorMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [now, setNow] = useState(() => new Date())

  const loadSessions = useCallback(async () => {
    try {
      setSessions(await fetchSessions())
      setErrorMessage('')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not load sessions.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadSessions()
    const intervalId = window.setInterval(() => {
      setNow(new Date())
      void loadSessions()
    }, 60_000)

    return () => window.clearInterval(intervalId)
  }, [loadSessions])

  const grouped = useMemo(() => {
    const result: Record<SessionState, SessionRow[]> = {
      draft: [],
      active: [],
      closed: [],
    }
    sessions.forEach((session) => result[getSessionState(session, now)].push(session))
    return result
  }, [now, sessions])

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sessions</h1>
          <p className="mt-2 text-slate-600">
            {role === 'admin'
              ? 'Create an event, choose its participants, and start tracking.'
              : 'Your active event will appear here when an admin adds you.'}
          </p>
        </div>
        {role === 'admin' && (
          <Link
            className="rounded-xl bg-sky-700 px-4 py-2.5 font-semibold text-white hover:bg-sky-800"
            to="/sessions/new"
          >
            Create session
          </Link>
        )}
      </div>

      {errorMessage && (
        <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700" role="alert">
          {errorMessage}
        </p>
      )}

      {isLoading ? (
        <p className="text-slate-500">Loading sessions…</p>
      ) : (
        <>
          {role === 'admin' && (
            <SessionGroup
              emptyMessage="You have no draft sessions."
              now={now}
              sessions={grouped.draft}
              title="Drafts"
            />
          )}
          <SessionGroup
            emptyMessage="There is no active session for you right now."
            now={now}
            sessions={grouped.active}
            title="Active"
          />
          {role === 'admin' && grouped.closed.length > 0 && (
            <p className="text-sm text-slate-600">
              You have {grouped.closed.length} completed session
              {grouped.closed.length === 1 ? '' : 's'}.{' '}
              <Link className="font-semibold text-sky-700 hover:underline" to="/history">
                View history
              </Link>
            </p>
          )}
        </>
      )}
    </div>
  )
}
