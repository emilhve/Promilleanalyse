import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { createSession, type AppRole } from '../lib/sessions'

interface NewSessionPageProps {
  role: AppRole
}

export function NewSessionPage({ role }: NewSessionPageProps) {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (role !== 'admin') {
    return <Navigate replace to="/" />
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedName = name.trim()
    if (trimmedName.length < 2 || trimmedName.length > 80) {
      setErrorMessage('Session name must be between 2 and 80 characters.')
      return
    }

    setIsSubmitting(true)
    setErrorMessage('')
    try {
      const sessionId = await createSession(trimmedName)
      navigate(`/sessions/${sessionId}`)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not create the session.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <h1 className="text-2xl font-bold">Create a session</h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        The session remains a draft while you select participants. Its 18-hour timer
        begins only when you press Start.
      </p>
      <form className="mt-6 space-y-5" onSubmit={(event) => void handleSubmit(event)}>
        <label className="block text-sm font-semibold text-slate-700">
          Session name
          <input
            autoFocus
            className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            maxLength={80}
            minLength={2}
            onChange={(event) => setName(event.target.value)}
            placeholder="Friday gathering"
            required
            value={name}
          />
        </label>
        {errorMessage && (
          <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">
            {errorMessage}
          </p>
        )}
        <div className="flex justify-end gap-3">
          <button
            className="rounded-xl px-4 py-2.5 font-semibold text-slate-600 hover:bg-slate-100"
            onClick={() => navigate('/')}
            type="button"
          >
            Cancel
          </button>
          <button
            className="rounded-xl bg-sky-700 px-4 py-2.5 font-semibold text-white hover:bg-sky-800 disabled:opacity-50"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? 'Creating…' : 'Create draft'}
          </button>
        </div>
      </form>
    </section>
  )
}
