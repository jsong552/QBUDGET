import { Plus } from 'lucide-react'
import { formatDate } from '../../lib/format'
import type { CalendarDay } from '../../lib/calendar'
import type { CalendarEvent, IsoDate } from '../../types'
import { focusRing } from '../focus'
import { toneClasses } from '../tones'
import { EventChip } from './EventChip'
import { eventsByDate, getEventStatus, getEventStyle, type CalendarGridProps } from './eventStyles'

function DayNumber({ day, isToday }: { day: CalendarDay; isToday: boolean }) {
  if (isToday) {
    return <span className="grid size-7 place-items-center rounded-full bg-primary text-sm font-semibold text-on-primary">{day.dayOfMonth}</span>
  }
  return <span className={`grid size-7 place-items-center text-sm ${day.inMonth ? 'font-semibold text-ink' : 'text-subtle'}`}>{day.dayOfMonth}</span>
}

interface DayCellProps {
  day: CalendarDay
  events: CalendarEvent[]
  today: IsoDate
  onCreateEvent: (date: IsoDate) => void
  onSelectEvent: (event: CalendarEvent) => void
}

function DayCell({ day, events, today, onCreateEvent, onSelectEvent }: DayCellProps) {
  const isToday = day.date === today
  // Small dot like the sketch: the first open entry with a reminder.
  const reminder = events.find((event) => event.hasReminder && !getEventStatus(event, today).settled)

  function onCellClick() {
    onCreateEvent(day.date)
  }

  return (
    <div role="gridcell" className={`relative min-h-24 border-l border-line px-1.5 pt-1.5 pb-2 first:border-l-0 ${isToday ? 'bg-info-soft/40' : ''}`}>
      {/* The whole cell creates an entry; chips sit above this button, so no button is nested in another. */}
      <button
        type="button"
        aria-label={`Create event on ${formatDate(day.date, 'weekdayLong')}`}
        onClick={onCellClick}
        className={`group absolute inset-0 rounded-sm hover:bg-surface-muted/70 ${focusRing} focus-visible:ring-offset-0`}
      >
        <Plus className="absolute top-2 left-2 size-3.5 text-subtle opacity-0 group-hover:opacity-100" strokeWidth={2} aria-hidden />
      </button>
      <div className="pointer-events-none relative flex justify-center">
        <DayNumber day={day} isToday={isToday} />
        {reminder && <span className={`absolute top-1 right-1.5 size-2 rounded-full ${toneClasses[getEventStyle(reminder.kind).tone].solid}`} aria-hidden />}
      </div>
      <div className="relative mt-1 space-y-1">
        {events.map((event) => (
          <EventChip key={event.id} event={event} today={today} onSelect={onSelectEvent} />
        ))}
      </div>
    </div>
  )
}

/** Month view in the sketch's style: weekday row, light rules between days, today as a navy circle. */
export function MonthGrid({ days, weekdayLabels, events, today, onCreateEvent, onSelectEvent }: CalendarGridProps) {
  const byDate = eventsByDate(events)
  return (
    <div role="grid" className="mt-4 overflow-hidden rounded-xl border border-line">
      <div role="row" className="grid grid-cols-7 border-b border-line bg-surface-muted/60">
        {weekdayLabels.map((label) => (
          <div key={label} role="columnheader" className="py-2.5 text-center text-sm font-medium text-ink">
            {label}
          </div>
        ))}
      </div>
      {days.map((week) => (
        <div key={week[0].date} role="row" className="grid grid-cols-7 border-b border-line last:border-b-0">
          {week.map((day) => (
            <DayCell key={day.date} day={day} events={byDate.get(day.date) ?? []} today={today} onCreateEvent={onCreateEvent} onSelectEvent={onSelectEvent} />
          ))}
        </div>
      ))}
    </div>
  )
}
