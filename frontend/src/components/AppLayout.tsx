import { Outlet } from 'react-router'
import { Sidebar } from './Sidebar'

export function AppLayout() {
  return (
    <div className="min-h-screen min-w-[1280px] bg-canvas">
      <Sidebar />
      <main className="ml-60 px-10 pt-5 pb-10">
        <Outlet />
      </main>
    </div>
  )
}
