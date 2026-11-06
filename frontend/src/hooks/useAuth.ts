import { useContext } from 'react'
import { AuthContext } from '../context/authContext'

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}

/** The signed-in user. Only call inside routes wrapped by RequireAuth. */
export function useCurrentUser() {
  const { session } = useAuth()
  if (!session) throw new Error('useCurrentUser requires a session')
  return session.user
}
