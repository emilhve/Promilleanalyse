import type {
  DrinkRow,
  ParticipantRow,
  SessionRow,
} from './database.types'
import { requireSupabase } from './supabase'

export type AppRole = 'admin' | 'user'
export type SessionState = 'draft' | 'active' | 'closed'

export interface SessionBundle {
  session: SessionRow
  participants: ParticipantRow[]
  drinks: DrinkRow[]
}

export interface SelectableUser {
  user_id: string
  display_name: string
  email: string
}

export function getSessionState(
  session: SessionRow,
  at = new Date(),
): SessionState {
  if (!session.started_at || !session.ends_at) {
    return 'draft'
  }

  return at.getTime() < new Date(session.ends_at).getTime()
    ? 'active'
    : 'closed'
}

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function formatRemaining(endsAt: string, now: Date): string {
  const remainingMs = Math.max(0, new Date(endsAt).getTime() - now.getTime())
  const totalMinutes = Math.ceil(remainingMs / 60_000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (remainingMs === 0) {
    return 'Closed'
  }

  return `${hours}h ${minutes}m remaining`
}

export async function fetchSessions(): Promise<SessionRow[]> {
  const { data, error } = await requireSupabase()
    .from('sessions')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function fetchSessionBundle(
  sessionId: string,
): Promise<SessionBundle> {
  const client = requireSupabase()
  const [sessionResult, participantResult, drinkResult] = await Promise.all([
    client.from('sessions').select('*').eq('id', sessionId).maybeSingle(),
    client
      .from('session_participants')
      .select('*')
      .eq('session_id', sessionId)
      .order('joined_at', { ascending: true }),
    client
      .from('drinks')
      .select('*')
      .eq('session_id', sessionId)
      .order('consumed_at', { ascending: true }),
  ])

  const error = sessionResult.error ?? participantResult.error ?? drinkResult.error
  if (error) {
    throw new Error(error.message)
  }

  if (!sessionResult.data) {
    throw new Error('This session was not found or you no longer have access to it.')
  }

  return {
    session: sessionResult.data,
    participants: participantResult.data ?? [],
    drinks: drinkResult.data ?? [],
  }
}

export async function fetchSelectableUsers(): Promise<SelectableUser[]> {
  const { data, error } = await requireSupabase().rpc('list_selectable_users')

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function createSession(name: string): Promise<string> {
  const { data, error } = await requireSupabase().rpc('create_session', {
    p_name: name,
  })

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function deleteDraftSession(sessionId: string): Promise<void> {
  const { error } = await requireSupabase().rpc('delete_draft_session', {
    p_session_id: sessionId,
  })

  if (error) {
    throw new Error(error.message)
  }
}

export async function addSessionParticipant(
  sessionId: string,
  userId: string,
): Promise<void> {
  const { error } = await requireSupabase().rpc('add_session_participant', {
    p_session_id: sessionId,
    p_user_id: userId,
  })

  if (error) {
    throw new Error(error.message)
  }
}

export async function removeDraftParticipant(
  sessionId: string,
  userId: string,
): Promise<void> {
  const { error } = await requireSupabase().rpc('remove_draft_participant', {
    p_session_id: sessionId,
    p_user_id: userId,
  })

  if (error) {
    throw new Error(error.message)
  }
}

export async function startSession(sessionId: string): Promise<SessionRow> {
  const { data, error } = await requireSupabase().rpc('start_session', {
    p_session_id: sessionId,
  })

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function logDrink(
  sessionId: string,
  volumeMl: number,
  abv: number,
): Promise<DrinkRow> {
  const { data, error } = await requireSupabase().rpc('log_drink', {
    p_session_id: sessionId,
    p_volume_ml: volumeMl,
    p_abv: abv,
  })

  if (error) {
    throw new Error(error.message)
  }

  return data
}
