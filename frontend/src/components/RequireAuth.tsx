import type { ReactNode } from 'react'
import { Navigate } from 'react-router'
import { useAuth } from '../hooks/useAuth'

export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()
  if (loading) return <p role="status" className="p-8 text-muted">Restoring your session…</p>
  if (!session) return <Navigate to="/login" replace />
  return <div key={session.user.id}>{children}</div>
}
