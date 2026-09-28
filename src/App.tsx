import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { readUserProfile, type UserProfile } from './lib/profile'
import type { AppRole } from './lib/sessions'
import { supabase } from './lib/supabase'
import { DashboardPage } from './pages/DashboardPage'
import { HistoryPage } from './pages/HistoryPage'
import { LoginPage } from './pages/LoginPage'
import { NewSessionPage } from './pages/NewSessionPage'
import { ProfileSetupPage } from './pages/ProfileSetupPage'
import { SessionPage } from './pages/SessionPage'
import { SettingsPage } from './pages/SettingsPage'

function LoadingScreen({ message }: { message: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6">
      <p className="text-sm font-medium text-slate-300" role="status">
        {message}
      </p>
    </main>
  )
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoadingSession, setIsLoadingSession] = useState(true)
  const [isLoadingProfile, setIsLoadingProfile] = useState(false)
  const [profileError, setProfileError] = useState('')

  useEffect(() => {
    if (!supabase) {
      setIsLoadingSession(false)
      return
    }

    let isMounted = true
    void supabase.auth.getSession().then(({ data }) => {
      if (isMounted) {
        setSession(data.session)
        setIsLoadingProfile(Boolean(data.session))
        setIsLoadingSession(false)
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (isMounted) {
        setSession(nextSession)
        setProfile(null)
        setIsLoadingProfile(Boolean(nextSession))
        setIsLoadingSession(false)
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!supabase || !session) {
      setProfile(null)
      setProfileError('')
      return
    }

    let isMounted = true
    setIsLoadingProfile(true)
    void supabase
      .from('profiles')
      .select('*')
      .eq('user_id', session.user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!isMounted) return
        if (error) {
          setProfileError(error.message)
          setProfile(null)
        } else {
          setProfile(readUserProfile(data))
          setProfileError('')
        }
        setIsLoadingProfile(false)
      })

    return () => {
      isMounted = false
    }
  }, [session])

  const handleSignOut = async () => {
    if (!supabase) return
    const { error } = await supabase.auth.signOut()
    if (error) {
      setProfileError(error.message)
    }
  }

  if (isLoadingSession) {
    return <LoadingScreen message="Loading your session…" />
  }

  if (!session) {
    return <LoginPage />
  }

  if (isLoadingProfile) {
    return <LoadingScreen message="Loading your profile…" />
  }

  const appRole: AppRole =
    session.user.app_metadata.app_role === 'admin' ? 'admin' : 'user'

  if (!profile) {
    return (
      <ProfileSetupPage
        errorMessage={profileError}
        onComplete={setProfile}
        onSignOut={handleSignOut}
        userEmail={session.user.email ?? 'Signed-in user'}
      />
    )
  }

  return (
    <Routes>
      <Route element={<AppShell onSignOut={handleSignOut} role={appRole} />}>
        <Route index element={<DashboardPage role={appRole} />} />
        <Route path="sessions/new" element={<NewSessionPage role={appRole} />} />
        <Route
          path="sessions/:sessionId"
          element={<SessionPage role={appRole} userId={session.user.id} />}
        />
        <Route path="history" element={<HistoryPage role={appRole} />} />
        <Route
          path="settings"
          element={
            <SettingsPage
              appRole={appRole}
              profile={profile}
              userEmail={session.user.email ?? 'Signed-in user'}
            />
          }
        />
        <Route path="*" element={<Navigate replace to="/" />} />
      </Route>
    </Routes>
  )
}
