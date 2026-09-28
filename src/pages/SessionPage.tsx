import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { BacChart } from '../components/BacChart'
import { useFiveMinuteClock } from '../hooks/useFiveMinuteClock'
import type { DrinkRow, ParticipantRow, SessionRow } from '../lib/database.types'
import {
  addSessionParticipant,
  deleteDraftSession,
  fetchSelectableUsers,
  fetchSessionBundle,
  formatDateTime,
  formatRemaining,
  getSessionState,
  logDrink,
  removeDraftParticipant,
  startSession,
  type AppRole,
  type SelectableUser,
} from '../lib/sessions'
import { requireSupabase } from '../lib/supabase'

interface SessionPageProps {
  role: AppRole
  userId: string
}

interface ParticipantManagerProps {
  directory: SelectableUser[]
  participants: ParticipantRow[]
  isDraft: boolean
  isSaving: boolean
  onAdd: (userId: string) => Promise<void>
  onRemove: (userId: string) => Promise<void>
}

function ParticipantManager({
  directory,
  participants,
  isDraft,
  isSaving,
  onAdd,
  onRemove,
}: ParticipantManagerProps) {
  const [search, setSearch] = useState('')
  const participantIds = new Set(participants.map((participant) => participant.user_id))
  const normalizedSearch = search.trim().toLocaleLowerCase()
  const availableUsers = directory.filter((user) => {
    if (participantIds.has(user.user_id)) {
      return false
    }
    return (
      normalizedSearch === '' ||
      user.display_name.toLocaleLowerCase().includes(normalizedSearch) ||
      user.email.toLocaleLowerCase().includes(normalizedSearch)
    )
  })

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold">Participants</h2>
      <p className="mt-1 text-sm text-slate-500">
        {isDraft
          ? 'Add or remove people before starting.'
          : 'You can add people while the session is active, but not remove them.'}
      </p>

      <div className="mt-4 space-y-2">
        {participants.length === 0 ? (
          <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">
            No participants selected.
          </p>
        ) : (
          participants.map((participant) => (
            <div
              className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2"
              key={participant.user_id}
            >
              <span className="font-medium">{participant.display_name}</span>
              {isDraft && (
                <button
                  className="text-sm font-semibold text-red-700 hover:underline disabled:opacity-50"
                  disabled={isSaving}
                  onClick={() => void onRemove(participant.user_id)}
                  type="button"
                >
                  Remove
                </button>
              )}
            </div>
          ))
        )}
      </div>

      <label className="mt-5 block text-sm font-semibold text-slate-700">
        Find a user
        <input
          className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search name or email"
          type="search"
          value={search}
        />
      </label>
      <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">
        {availableUsers.length === 0 ? (
          <p className="p-3 text-sm text-slate-500">No available users found.</p>
        ) : (
          availableUsers.map((user) => (
            <div
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2"
              key={user.user_id}
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{user.display_name}</p>
                <p className="truncate text-xs text-slate-500">{user.email}</p>
              </div>
              <button
                className="shrink-0 rounded-lg bg-sky-100 px-3 py-1.5 text-sm font-semibold text-sky-800 hover:bg-sky-200 disabled:opacity-50"
                disabled={isSaving}
                onClick={() => void onAdd(user.user_id)}
                type="button"
              >
                Add
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  )
}

function DrinkForm({ sessionId, onLogged }: { sessionId: string; onLogged: () => void }) {
  const [volumeMl, setVolumeMl] = useState('')
  const [abv, setAbv] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const parsedVolume = Number(volumeMl)
    const parsedAbv = Number(abv)

    if (!Number.isFinite(parsedVolume) || parsedVolume <= 0 || parsedVolume > 10_000) {
      setErrorMessage('Amount must be greater than 0 and no more than 10,000 mL.')
      return
    }
    if (!Number.isFinite(parsedAbv) || parsedAbv <= 0 || parsedAbv > 100) {
      setErrorMessage('Alcohol percentage must be greater than 0 and no more than 100%.')
      return
    }

    setIsSubmitting(true)
    setErrorMessage('')
    try {
      await logDrink(sessionId, parsedVolume, parsedAbv)
      setVolumeMl('')
      setAbv('')
      onLogged()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not log the drink.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="rounded-2xl border border-sky-200 bg-sky-50 p-5">
      <h2 className="text-lg font-bold">Log a drink</h2>
      <p className="mt-1 text-sm text-slate-600">
        The consumption time is recorded automatically when you submit.
      </p>
      <form
        className="mt-4 grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
        onSubmit={(event) => void handleSubmit(event)}
      >
        <label className="text-sm font-semibold text-slate-700">
          Amount (mL)
          <input
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            inputMode="decimal"
            max="10000"
            min="0.1"
            onChange={(event) => setVolumeMl(event.target.value)}
            placeholder="500"
            required
            step="0.1"
            type="number"
            value={volumeMl}
          />
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Alcohol (ABV %)
          <input
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            inputMode="decimal"
            max="100"
            min="0.1"
            onChange={(event) => setAbv(event.target.value)}
            placeholder="4.7"
            required
            step="0.1"
            type="number"
            value={abv}
          />
        </label>
        <button
          className="rounded-xl bg-sky-700 px-5 py-2.5 font-semibold text-white hover:bg-sky-800 disabled:opacity-50"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? 'Logging…' : 'Add drink'}
        </button>
      </form>
      {errorMessage && (
        <p className="mt-3 text-sm text-red-700" role="alert">
          {errorMessage}
        </p>
      )}
    </section>
  )
}

function DrinkLog({
  drinks,
  participants,
}: {
  drinks: DrinkRow[]
  participants: ParticipantRow[]
}) {
  const names = new Map(
    participants.map((participant) => [participant.user_id, participant.display_name]),
  )
  const newestFirst = [...drinks].reverse()

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold">Drink log</h2>
      {newestFirst.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">No drinks have been logged.</p>
      ) : (
        <div className="mt-4 divide-y divide-slate-100">
          {newestFirst.map((drink) => (
            <div className="flex flex-wrap justify-between gap-2 py-3 text-sm" key={drink.id}>
              <div>
                <span className="font-semibold">
                  {names.get(drink.user_id) ?? 'Participant'}
                </span>{' '}
                <span className="text-slate-600">
                  logged {Number(drink.volume_ml).toLocaleString()} mL at{' '}
                  {Number(drink.abv).toLocaleString()}%
                </span>
              </div>
              <time className="text-slate-500" dateTime={drink.consumed_at}>
                {formatDateTime(drink.consumed_at)}
              </time>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

export function SessionPage({ role, userId }: SessionPageProps) {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const now = useFiveMinuteClock()
  const [session, setSession] = useState<SessionRow | null>(null)
  const [participants, setParticipants] = useState<ParticipantRow[]>([])
  const [drinks, setDrinks] = useState<DrinkRow[]>([])
  const [directory, setDirectory] = useState<SelectableUser[]>([])
  const [errorMessage, setErrorMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const loadSession = useCallback(async () => {
    if (!sessionId) return
    try {
      const result = await fetchSessionBundle(sessionId)
      setSession(result.session)
      setParticipants(result.participants)
      setDrinks(result.drinks)
      setErrorMessage('')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not load the session.')
    } finally {
      setIsLoading(false)
    }
  }, [sessionId])

  const loadDirectory = useCallback(async () => {
    if (role !== 'admin') return
    try {
      setDirectory(await fetchSelectableUsers())
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not load users.')
    }
  }, [role])

  useEffect(() => {
    void loadSession()
    void loadDirectory()
  }, [loadDirectory, loadSession])

  useEffect(() => {
    if (!sessionId) return
    const client = requireSupabase()
    const channel = client
      .channel(`session-${sessionId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'drinks', filter: `session_id=eq.${sessionId}` },
        () => void loadSession(),
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'session_participants',
          filter: `session_id=eq.${sessionId}`,
        },
        () => void loadSession(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sessions', filter: `id=eq.${sessionId}` },
        () => void loadSession(),
      )
      .subscribe()

    return () => {
      void client.removeChannel(channel)
    }
  }, [loadSession, sessionId])

  const state = session ? getSessionState(session, now) : null
  const isOwner = session?.created_by === userId
  const canManage = role === 'admin' && isOwner
  const isParticipant = participants.some((participant) => participant.user_id === userId)

  useEffect(() => {
    if (state === 'closed' && !canManage) {
      navigate('/', { replace: true })
    }
  }, [canManage, navigate, state])

  const performMutation = async (operation: () => Promise<unknown>) => {
    setIsSaving(true)
    setErrorMessage('')
    try {
      await operation()
      await loadSession()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'The action could not be completed.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteDraft = async (draftId: string) => {
    setIsSaving(true)
    setErrorMessage('')
    try {
      await deleteDraftSession(draftId)
      navigate('/')
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'The draft could not be deleted.',
      )
      setIsSaving(false)
    }
  }

  const chartEnd = useMemo(() => {
    if (!session?.ends_at) return now
    const end = new Date(session.ends_at)
    return now < end ? now : end
  }, [now, session?.ends_at])

  if (!sessionId) {
    return <Navigate replace to="/" />
  }

  if (isLoading) {
    return <p className="text-slate-500">Loading session…</p>
  }

  if (!session) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800">
        <h1 className="font-bold">Session unavailable</h1>
        <p className="mt-2 text-sm">{errorMessage}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{session.name}</h1>
            <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-700">
              {state}
            </span>
          </div>
          {state === 'draft' ? (
            <p className="mt-2 text-slate-600">Choose participants, then start the session.</p>
          ) : (
            <div className="mt-2 text-sm text-slate-600">
              <span>Started {session.started_at && formatDateTime(session.started_at)}</span>
              {state === 'active' && session.ends_at && (
                <span className="ml-3 font-semibold text-emerald-700">
                  {formatRemaining(session.ends_at, now)}
                </span>
              )}
            </div>
          )}
        </div>
        {canManage && state === 'draft' && (
          <div className="flex gap-3">
            <button
              className="rounded-xl px-4 py-2.5 font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
              disabled={isSaving}
              onClick={() => {
                if (window.confirm('Delete this draft session?')) {
                  void handleDeleteDraft(session.id)
                }
              }}
              type="button"
            >
              Delete draft
            </button>
            <button
              className="rounded-xl bg-emerald-700 px-4 py-2.5 font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
              disabled={isSaving || participants.length === 0}
              onClick={() => void performMutation(() => startSession(session.id))}
              type="button"
            >
              Start session
            </button>
          </div>
        )}
      </header>

      {errorMessage && (
        <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700" role="alert">
          {errorMessage}
        </p>
      )}

      {canManage && state !== 'closed' && (
        <ParticipantManager
          directory={directory}
          isDraft={state === 'draft'}
          isSaving={isSaving}
          onAdd={(selectedUserId) =>
            performMutation(() => addSessionParticipant(session.id, selectedUserId))
          }
          onRemove={(selectedUserId) =>
            performMutation(() => removeDraftParticipant(session.id, selectedUserId))
          }
          participants={participants}
        />
      )}

      {state === 'active' && isParticipant && (
        <DrinkForm onLogged={() => void loadSession()} sessionId={session.id} />
      )}

      {state !== 'draft' && session.started_at && (
        <>
          <div className="grid gap-5 lg:grid-cols-2">
            {participants.map((participant) => (
              <BacChart
                chartEnd={chartEnd}
                drinks={drinks}
                key={participant.user_id}
                participant={participant}
                startedAt={session.started_at!}
              />
            ))}
          </div>
          <DrinkLog drinks={drinks} participants={participants} />
        </>
      )}
    </div>
  )
}
