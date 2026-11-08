import { Outlet } from 'react-router'
import { useAuth } from '../hooks/useAuth'
import { Sidebar } from './Sidebar'

export function AppLayout() {
  const { error } = useAuth()
  return (
    <div className="min-h-screen min-w-[1280px] bg-canvas">
      <Sidebar />
      <main className="ml-60 px-10 pt-5 pb-10">
        {error && <p role="alert" className="mb-4 text-danger">{error}</p>}
        <Outlet />
      </main>
    </div>
  )
}
