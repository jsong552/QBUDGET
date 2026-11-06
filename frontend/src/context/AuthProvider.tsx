import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { setAuthToken } from '../lib/apiClient'
import * as authService from '../services/authService'
import type { Session, SignInRequest, User } from '../types'
import { AuthContext, type AuthContextValue } from './authContext'

// On in development unless VITE_AUTH_BYPASS is explicitly "false"; never in production builds.
const demoEnabled = import.meta.env.DEV && import.meta.env.VITE_AUTH_BYPASS !== 'false'
const storageKey = 'qbudget.session'

function readStoredSession(): Session | null {
  try {
    const stored = sessionStorage.getItem(storageKey)
    return stored ? (JSON.parse(stored) as Session) : null
  } catch {
    return null
  }
}

/** Persists the session and hands its token to apiClient. Runs before any request that needs it. */
function persistSession(session: Session | null) {
  if (session) sessionStorage.setItem(storageKey, JSON.stringify(session))
  else sessionStorage.removeItem(storageKey)
  setAuthToken(session?.token ?? null)
}

function restoreSession(): Session | null {
  const session = readStoredSession()
  setAuthToken(session?.token ?? null)
  return session
}

/**
 * Holds the one session for the app: real sign-in, sign-up and the demo entry all store it here.
 * The page header, Settings and the API token all read from it.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(restoreSession)

  const storeSession = useCallback((next: Session | null) => {
    persistSession(next)
    setSession(next)
  }, [])

  const signIn = useCallback(async (request: SignInRequest) => storeSession(await authService.signIn(request)), [storeSession])

  const signUp = useCallback(async (request: SignInRequest) => storeSession(await authService.signUp(request)), [storeSession])

  const continueAsDemo = useCallback(async () => storeSession(await authService.getDemoSession()), [storeSession])

  const signOut = useCallback(async () => {
    try {
      await authService.signOut()
    } catch (failure) {
      console.error('[auth] sign-out request failed', failure)
    } finally {
      storeSession(null)
    }
  }, [storeSession])

  const updateUser = useCallback(
    (user: User) => {
      setSession((current) => {
        if (!current) return current
        const next = { ...current, user }
        persistSession(next)
        return next
      })
    },
    [],
  )

  const value = useMemo<AuthContextValue>(
    () => ({ session, demoEnabled, signIn, signUp, signOut, continueAsDemo, updateUser }),
    [session, signIn, signUp, signOut, continueAsDemo, updateUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
