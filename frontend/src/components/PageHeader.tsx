import { Bell } from 'lucide-react'
import type { ReactNode } from 'react'
import { useCurrentUser } from '../hooks/useAuth'
import { useNotifications } from '../hooks/useNotifications'

interface PageHeaderProps {
  dateLabel?: string
  title: ReactNode
  subtitle: string
}

export function PageHeader({ dateLabel, title, subtitle }: PageHeaderProps) {
  const user = useCurrentUser()
  const notifications = useNotifications()

  function onOpenNotifications() {
    console.info('[ui] open notifications', notifications)
  }

  function onOpenProfileMenu() {
    console.info('[ui] open profile menu', user.id)
  }

  return (
    <header className="flex items-start justify-between">
      <div>
        <p className="h-4 text-xs font-bold tracking-wide text-danger uppercase">{dateLabel}</p>
        <h1 className="mt-1 text-[34px] leading-tight font-bold tracking-tight text-ink">{title}</h1>
        <p className="mt-1 text-[15px] text-muted">{subtitle}</p>
      </div>
      <div className="mt-4 flex items-center gap-4">
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
