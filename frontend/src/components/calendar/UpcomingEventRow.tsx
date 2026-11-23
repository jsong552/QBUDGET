import { Repeat } from 'lucide-react'
import { formatDate, formatDaysAway, formatMoney } from '../../lib/format'
import type { CalendarEvent, UpcomingEvent } from '../../types'
import { focusRing } from '../focus'
import { IconCircle } from '../IconCircle'
import { getEventStyle } from './eventStyles'

interface UpcomingEventRowProps {
  upcoming: UpcomingEvent
  onSelect: (event: CalendarEvent) => void
}

/** Row in the "Upcoming events" card: kind icon, title and date, amount and how far away it is. Overdue rows use the danger tone. */
export function UpcomingEventRow({ upcoming, onSelect }: UpcomingEventRowProps) {
  const { event, daysAway } = upcoming
  const overdue = daysAway < 0
  const { icon, tone } = getEventStyle(event.kind)
  const urgent = overdue || upcoming.isUrgent

  function onClick() {
    onSelect(event)
  }

  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        aria-label={`${event.title}, ${formatMoney(event.amountCents)}, ${formatDate(event.date)}, ${formatDaysAway(daysAway)}${event.source === 'recurring' ? ', recurring' : ''}`}
        className={`flex w-full items-center gap-3.5 rounded-xl border px-3 py-2.5 text-left transition-colors ${
          overdue ? 'border-danger/40 bg-danger-soft/50 hover:bg-danger-soft' : 'border-line hover:bg-surface-muted'
        } ${focusRing}`}
      >
        <IconCircle icon={icon} tone={overdue ? 'danger' : tone} size="sm" />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 text-sm font-semibold text-ink">
            <span className="truncate">{event.title}</span>
            {event.source === 'recurring' && <Repeat className="size-3 shrink-0 text-muted" strokeWidth={2.25} aria-hidden />}
          </span>
          <span className="block text-[13px] text-muted">{formatDate(event.date)}</span>
        </span>
        <span className="shrink-0 text-right">
          <span className={`block text-sm font-bold ${urgent ? 'text-danger' : 'text-ink'}`}>{formatMoney(event.amountCents)}</span>
          <span className={`block text-xs ${overdue ? 'font-medium text-danger' : 'text-muted'}`}>{formatDaysAway(daysAway)}</span>
        </span>
      </button>
    </li>
  )
}
