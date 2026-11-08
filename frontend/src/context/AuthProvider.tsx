import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { setAuthTokenProvider } from '../lib/apiClient'
import { firebaseConfigured } from '../lib/firebase'
import * as authService from '../services/authService'
import type { Session, User } from '../types'
import { AuthContext, type AuthContextValue } from './authContext'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(firebaseConfigured)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Firebase owns persistence; never trust old mock sessions.
    try { sessionStorage.removeItem('qbudget.session') } catch { /* Storage may be disabled. */ }
    setAuthTokenProvider(authService.getCurrentToken)
    if (!firebaseConfigured) return () => setAuthTokenProvider(null)
    let unsubscribe: (() => void) | undefined
    const fail = (failure: unknown) => {
      setSession(null)
      setError(authService.authErrorMessage(failure))
      setLoading(false)
    }
    try {
      unsubscribe = authService.observeSession((next) => {
        setSession(next)
        setError(null)
        setLoading(false)
      }, fail)
    } catch (failure) { fail(failure) }
    return () => { unsubscribe?.(); setAuthTokenProvider(null) }
  }, [])

  const signOut = useCallback(async () => {
    try {
      await authService.signOut()
      setSession(null)
      setError(null)
    } catch (failure) {
      setError(authService.authErrorMessage(failure))
    }
  }, [])
  const updateUser = useCallback((user: User) => {
    setSession((current) => current && current.user.id === user.id ? { ...current, user } : current)
  }, [])
  const value = useMemo<AuthContextValue>(() => ({
    session, loading, error,
    signIn: authService.signIn, signUp: authService.signUp,
    signOut, updateUser,
  }), [session, loading, error, signOut, updateUser])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
