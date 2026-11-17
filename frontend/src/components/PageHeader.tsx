import { Bell } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { useCurrentUser } from '../hooks/useAuth'
import { useNotifications } from '../hooks/useNotifications'
import { useTodayLabel } from '../hooks/useTodayLabel'

interface PageHeaderProps {
  title: ReactNode
  subtitle: string
}

export function PageHeader({ title, subtitle }: PageHeaderProps) {
  const navigate = useNavigate()
  const [showNotifications, setShowNotifications] = useState(false)
  const user = useCurrentUser()
  const dateLabel = useTodayLabel()
  const notifications = useNotifications()

  function onOpenNotifications() {
    setShowNotifications((shown) => !shown)
  }

  function onOpenProfileMenu() {
    navigate('/settings')
  }

  return (
    <header className="flex items-start justify-between">
      <div>
        <p className="h-4 text-xs font-bold tracking-wide text-danger uppercase">{dateLabel}</p>
        <h1 className="mt-1 min-h-[1.25em] text-[34px] leading-tight font-bold tracking-tight text-ink">{title}</h1>
        <p className="mt-1 text-[15px] text-muted">{subtitle}</p>
      </div>
      <div className="relative mt-4 flex items-center gap-4">
        {showNotifications && <div className="absolute top-14 right-0 z-20 w-80 rounded-lg border border-line bg-surface p-4 shadow-lg" role="region" aria-label="Payment reminders">
          <h2 className="font-bold">Payment reminders</h2>
          {notifications.length ? <ul>{notifications.map((n) => <li key={n.id} className="mt-3 text-sm">{n.message}</li>)}</ul> : <p className="mt-2 text-sm text-muted">No payment reminders due.</p>}
        </div>}
        <button
          type="button"
          aria-label="Notifications"
          onClick={onOpenNotifications}
          className="grid size-11 place-items-center rounded-full bg-surface text-ink shadow-sm"
        >
          <Bell className="size-5" strokeWidth={1.75} />
        </button>
        <button
          type="button"
          aria-label="Profile"
          onClick={onOpenProfileMenu}
          className="grid size-12 place-items-center rounded-xl bg-accent text-[15px] font-bold text-on-accent shadow-sm"
        >
          {user.initials}
        </button>
      </div>
    </header>
  )
}
