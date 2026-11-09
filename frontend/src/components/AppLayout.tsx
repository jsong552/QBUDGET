import { useEffect, useState } from 'react'
import { syncRecurring } from '../services/planningService'
import { DataError } from './DataError'
import { Outlet } from 'react-router'
import { useAuth } from '../hooks/useAuth'
import { Sidebar } from './Sidebar'

export function AppLayout() {
  const { error } = useAuth()
  const [syncError, setSyncError] = useState<unknown>(null)
  const [ready, setReady] = useState(false)
  useEffect(() => { let active = true; void syncRecurring().catch((failure: unknown) => { if (active) setSyncError(failure) }).finally(() => { if (active) setReady(true) }); return () => { active = false } }, [])
  return (
    <div className="min-h-screen min-w-[1280px] bg-canvas">
      <Sidebar />
      <main className="ml-60 px-10 pt-5 pb-10">
        {error && <p role="alert" className="mb-4 text-danger">{error}</p>}
        <DataError error={syncError} />
        {ready ? <Outlet /> : <p role="status">Processing due recurring entries...</p>}
      </main>
    </div>
  )
}
