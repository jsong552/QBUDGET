import { Plus } from 'lucide-react'
import { formatDate } from '../../lib/format'
import type { CalendarDay } from '../../lib/calendar'
import type { CalendarEvent, IsoDate } from '../../types'
import { focusRing } from '../focus'
import { EventChip } from './EventChip'
import { eventsByDate, type CalendarGridProps } from './eventStyles'

interface WeekColumnProps {
  day: CalendarDay
  label: string
  events: CalendarEvent[]
  today: IsoDate
  onCreateEvent: (date: IsoDate) => void
  onSelectEvent: (event: CalendarEvent) => void
}

function WeekColumn({ day, label, events, today, onCreateEvent, onSelectEvent }: WeekColumnProps) {
  const isToday = day.date === today

  function onAddClick() {
    onCreateEvent(day.date)
  }

  return (
    <div role="gridcell" className={`flex min-h-64 flex-col border-l border-line first:border-l-0 ${isToday ? 'bg-info-soft/40' : ''}`}>
      <div className="flex flex-col items-center gap-1 border-b border-line py-2.5">
        <span className="text-sm font-medium text-muted">{label}</span>
        <span className={`grid size-8 place-items-center rounded-full text-base font-semibold ${isToday ? 'bg-primary text-on-primary' : 'text-ink'}`}>
          {day.dayOfMonth}
        </span>
      </div>
      <div className="flex-1 space-y-1.5 p-1.5">
        {events.length === 0 && <p className="pt-2 text-center text-xs text-subtle">No entries</p>}
        {events.map((event) => (
          <EventChip key={event.id} event={event} today={today} onSelect={onSelectEvent} detailed />
        ))}
      </div>
      <button
        type="button"
        aria-label={`Create event on ${formatDate(day.date, 'weekdayLong')}`}
        onClick={onAddClick}
        className={`m-1.5 flex items-center justify-center gap-1 rounded-md py-1.5 text-xs font-medium text-muted hover:bg-surface-muted hover:text-ink ${focusRing}`}
      >
        <Plus className="size-3.5" strokeWidth={2} aria-hidden />
        Add
      </button>
    </div>
  )
}

/** Week view: seven columns, each listing that day's entries with amounts and status. */
export function WeekView({ days, weekdayLabels, events, today, onCreateEvent, onSelectEvent }: CalendarGridProps) {
  const byDate = eventsByDate(events)
  const week = days[0] ?? []
  return (
    <div role="grid" className="mt-4 overflow-hidden rounded-xl border border-line">
      <div role="row" className="grid grid-cols-7">
        {week.map((day, index) => (
          <WeekColumn
            key={day.date}
            day={day}
            label={weekdayLabels[index]}
            events={byDate.get(day.date) ?? []}
            today={today}
            onCreateEvent={onCreateEvent}
            onSelectEvent={onSelectEvent}
          />
        ))}
      </div>
    </div>
  )
}
