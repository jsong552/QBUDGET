import { Bell } from 'lucide-react'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { useCurrentUser } from '../hooks/useAuth'
import { useNotifications } from '../hooks/useNotifications'
import { useTodayLabel } from '../hooks/useTodayLabel'
import { formatDate } from '../lib/format'
import type { AppNotification } from '../types'
import { focusRing } from './focus'
import { IconCircle } from './IconCircle'

interface PageHeaderProps {
  title: ReactNode
  subtitle: string
}

function NotificationRow({ notification }: { notification: AppNotification }) {
  return (
    <li className="flex items-start gap-3 py-3">
      <IconCircle icon={Bell} tone="accent" size="sm" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-ink">{notification.message}</p>
        {notification.createdAt && <p className="mt-0.5 text-[13px] text-muted">{formatDate(notification.createdAt)}</p>}
      </div>
    </li>
  )
}

export function PageHeader({ title, subtitle }: PageHeaderProps) {
  const navigate = useNavigate()
  const [showNotifications, setShowNotifications] = useState(false)
  const user = useCurrentUser()
  const dateLabel = useTodayLabel()
  const notifications = useNotifications()
  const popoverId = useId()
  const menu = useRef<HTMLDivElement>(null)
  const bell = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!showNotifications) return

    function onDocumentPointerDown(event: MouseEvent) {
      if (menu.current && !menu.current.contains(event.target as Node)) setShowNotifications(false)
    }

    function onDocumentKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      setShowNotifications(false)
      bell.current?.focus()
    }

    document.addEventListener('mousedown', onDocumentPointerDown)
    document.addEventListener('keydown', onDocumentKeyDown)
    return () => {
      document.removeEventListener('mousedown', onDocumentPointerDown)
      document.removeEventListener('keydown', onDocumentKeyDown)
    }
  }, [showNotifications])

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
      <div className="mt-4 flex items-center gap-4">
        <div ref={menu} className="relative">
          <button
            ref={bell}
            type="button"
            aria-label={notifications.length ? `Notifications (${notifications.length})` : 'Notifications'}
            aria-expanded={showNotifications}
            aria-controls={popoverId}
            onClick={onOpenNotifications}
            className={`relative grid size-11 place-items-center rounded-full bg-surface text-ink shadow-sm ${focusRing}`}
          >
            <Bell className="size-5" strokeWidth={1.75} />
            {notifications.length > 0 && <span className="absolute top-2.5 right-3 size-2 rounded-full bg-accent ring-2 ring-surface" />}
          </button>
          <div
            id={popoverId}
            role="region"
            aria-label="Payment reminders"
            hidden={!showNotifications}
            className="absolute top-14 right-0 z-20 w-80 rounded-2xl bg-surface px-5 pt-4 pb-2 shadow-card ring-1 ring-line"
          >
            <h2 className="text-base font-bold tracking-tight text-ink">Payment reminders</h2>
            {notifications.length ? (
              <ul className="mt-1 divide-y divide-line">
                {notifications.map((notification) => (
                  <NotificationRow key={notification.id} notification={notification} />
                ))}
              </ul>
            ) : (
              <p className="py-3 text-sm text-muted">No payment reminders due.</p>
            )}
          </div>
        </div>
        <button
          type="button"
          aria-label="Profile"
          onClick={onOpenProfileMenu}
          className={`grid size-12 place-items-center rounded-xl bg-accent text-[15px] font-bold text-on-accent shadow-sm ${focusRing}`}
        >
          {user.initials}
        </button>
      </div>
    </header>
  )
}
