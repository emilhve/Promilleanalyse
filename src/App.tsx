import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import { readUserProfile, type UserProfile } from './lib/profile'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { ProfileSetupPage } from './pages/ProfileSetupPage'

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [isLoadingSession, setIsLoadingSession] = useState(true)
  const [signOutError, setSignOutError] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase) {
      setIsLoadingSession(false)
      return
    }

    let isMounted = true

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!isMounted) {
        return
      }

      if (!error) {
        setSession(data.session)
      }
      setIsLoadingSession(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (isMounted) {
        setSession(nextSession)
        setIsLoadingSession(false)
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  async function handleSignOut() {
    if (!supabase) {
      return
    }

    setSignOutError(null)
    const { error } = await supabase.auth.signOut()

    if (error) {
      setSignOutError(error.message)
    }
  }

  if (isLoadingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6">
        <p className="text-sm font-medium text-slate-300" role="status">
          Loading your session…
        </p>
      </main>
    )
  }

  if (!session) {
    return <LoginPage />
  }

  const profile = readUserProfile(session.user.user_metadata)
  const appRole =
    session.user.app_metadata.app_role === 'admin' ? 'admin' : 'user'

  function handleProfileComplete(completedProfile: UserProfile) {
    setSession((currentSession) =>
      currentSession
        ? {
            ...currentSession,
            user: {
              ...currentSession.user,
              user_metadata: {
                ...currentSession.user.user_metadata,
                body_weight_kg: completedProfile.bodyWeightKg,
                sex: completedProfile.sex,
              },
            },
          }
        : currentSession,
    )
  }

  if (!profile) {
    return (
      <ProfileSetupPage
        userEmail={session.user.email ?? 'Signed-in user'}
        onComplete={handleProfileComplete}
        onSignOut={() => void handleSignOut()}
      />
    )
  }

  return (
    <HomePage
      userEmail={session.user.email ?? 'Signed-in user'}
      profile={profile}
      appRole={appRole}
      signOutError={signOutError}
      onSignOut={() => void handleSignOut()}
    />
  )
}
