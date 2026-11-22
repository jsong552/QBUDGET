import { useEffect, useState } from 'react'
import { LoaderCircle } from 'lucide-react'
import { syncRecurring } from '../services/planningService'
import { DataError } from './DataError'
import { Outlet } from 'react-router'
import { useAuth } from '../hooks/useAuth'
import { Sidebar } from './Sidebar'

function SyncStatus() {
  return (
    <p role="status" className="absolute top-6 left-1/2 z-10 inline-flex -translate-x-1/2 items-center gap-2 rounded-lg bg-info-soft px-3 py-1.5 text-sm font-medium text-info shadow-sm">
      <LoaderCircle className="size-4 animate-spin" strokeWidth={2} />
      Updating recurring entries…
    </p>
  )
}

export function AppLayout() {
  const { error } = useAuth()
  const [syncError, setSyncError] = useState<unknown>(null)
  const [syncing, setSyncing] = useState(true)
  // Bumped when the sync created transactions, so the open page reloads and includes them.
  const [pageVersion, setPageVersion] = useState(0)
  useEffect(() => {
    let active = true
    void syncRecurring()
      .then((result) => { if (active && result?.created) setPageVersion((version) => version + 1) })
      .catch((failure: unknown) => { if (active) setSyncError(failure) })
      .finally(() => { if (active) setSyncing(false) })
    return () => { active = false }
  }, [])
  return (
    <div className="min-h-screen min-w-[1280px] bg-canvas">
      <Sidebar />
      <main className="relative ml-60 px-10 pt-5 pb-10">
        {syncing && <SyncStatus />}
        <DataError error={error} title="There is a problem with your session" />
        <DataError error={syncError} title="Recurring entries could not be updated" />
        <Outlet key={pageVersion} />
      </main>
    </div>
  )
}
