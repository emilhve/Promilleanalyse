import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import type { AppRole } from '../lib/sessions'

interface AppShellProps {
  role: AppRole
  onSignOut: () => Promise<void>
}

function navClassName({ isActive }: { isActive: boolean }) {
  return isActive
    ? 'rounded-lg bg-sky-100 px-3 py-2 font-semibold text-sky-800'
    : 'rounded-lg px-3 py-2 font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-950'
}

export function AppShell({ role, onSignOut }: AppShellProps) {
  const [isSigningOut, setIsSigningOut] = useState(false)

  const handleSignOut = async () => {
    setIsSigningOut(true)
    await onSignOut()
    setIsSigningOut(false)
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          <NavLink className="mr-auto text-lg font-bold tracking-tight" to="/">
            Promilleanalyse
          </NavLink>
          <nav className="flex flex-wrap items-center gap-1 text-sm">
            <NavLink className={navClassName} end to="/">
              Sessions
            </NavLink>
            {role === 'admin' && (
              <>
                <NavLink className={navClassName} to="/sessions/new">
                  New session
                </NavLink>
                <NavLink className={navClassName} to="/history">
                  History
                </NavLink>
              </>
            )}
            <NavLink className={navClassName} to="/settings">
              Settings
            </NavLink>
            <button
              className="rounded-lg px-3 py-2 font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50"
              disabled={isSigningOut}
              onClick={() => void handleSignOut()}
              type="button"
            >
              {isSigningOut ? 'Signing out…' : 'Sign out'}
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Outlet />
      </main>
    </div>
  )
}
