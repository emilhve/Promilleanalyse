import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()

const missingEnvironmentVariables = [
  !supabaseUrl && 'VITE_SUPABASE_URL',
  !supabasePublishableKey && 'VITE_SUPABASE_PUBLISHABLE_KEY',
].filter((name): name is string => Boolean(name))

export const supabaseConfigurationError = missingEnvironmentVariables.length
  ? `Supabase is not configured. Add ${missingEnvironmentVariables.join(
      ' and ',
    )} to .env.local, then restart the development server.`
  : null

export const supabase =
  supabaseUrl && supabasePublishableKey
    ? createClient(supabaseUrl, supabasePublishableKey)
    : null

export interface SupabaseConnectionStatus {
  ok: boolean
  message: string
}

export async function checkSupabaseConnection(): Promise<SupabaseConnectionStatus> {
  if (!supabase || !supabaseUrl || !supabasePublishableKey) {
    return {
      ok: false,
      message:
        supabaseConfigurationError ?? 'Supabase configuration is incomplete.',
    }
  }

  try {
    // The Auth health endpoint verifies project reachability without requiring a table.
    const healthUrl = new URL('/auth/v1/health', supabaseUrl)
    const response = await fetch(healthUrl, {
      headers: { apikey: supabasePublishableKey },
    })

    if (!response.ok) {
      throw new Error(`Supabase returned HTTP ${response.status}.`)
    }

    return { ok: true, message: 'Connected to Supabase.' }
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Unknown error.'

    return {
      ok: false,
      message: `Could not connect to Supabase: ${reason}`,
    }
  }
}
