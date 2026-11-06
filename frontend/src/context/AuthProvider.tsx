import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { getDemoSession, signOut } from '../services/authService'
import type { Session } from '../types'
import { AuthContext, type AuthContextValue } from './authContext'

const demoEnabled = import.meta.env.VITE_AUTH_BYPASS === 'true'
const storageKey = 'qbudget.demoSession'

function readStoredSession(): Session | null {
  if (!demoEnabled) return null
  const stored = sessionStorage.getItem(storageKey)
  return stored ? (JSON.parse(stored) as Session) : null
}

/**
 * Holds the current session. Only the demo session exists for now;
 * real sign-in will populate this from the API.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(readStoredSession)

  const startDemo = useCallback(async () => {
    const demoSession = await getDemoSession()
    sessionStorage.setItem(storageKey, JSON.stringify(demoSession))
    setSession(demoSession)
  }, [])

  const endSession = useCallback(async () => {
    await signOut()
    sessionStorage.removeItem(storageKey)
    setSession(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ session, demoEnabled, startDemo, endSession }),
    [session, startDemo, endSession],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
