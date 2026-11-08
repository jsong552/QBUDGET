import { RecordForm } from '../components/RecordForm'
import { amountToCents } from '../lib/moneyInput'
import { DataError } from '../components/DataError'
import {
  Bell,
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  GraduationCap,
  House,
  Lightbulb,
  Plus,
  Tag,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { IconCircle } from '../components/IconCircle'
import { PageHeader } from '../components/PageHeader'
import { SegmentedControl } from '../components/SegmentedControl'
import { Select, type SelectOption } from '../components/Select'
import { StatCard } from '../components/StatCard'
import { Toggle } from '../components/Toggle'
import { toneClasses, type Tone } from '../components/tones'
import { useCalendar } from '../hooks/useCalendar'
import { buildMonthGrid, shiftMonth, weekdayLabels, type CalendarDay } from '../lib/calendar'
import { formatDate, formatDaysAway, formatMoney } from '../lib/format'
import type { CalendarEvent, CalendarMonth, CalendarView, EventKind, IsoDate, ReminderLeadTime, UpcomingEvent } from '../types'

interface EventStyle {
  icon: LucideIcon
  tone: Tone
}

const eventStyles: Partial<Record<EventKind, EventStyle>> = {
  rent: { icon: House, tone: 'danger' },
  credit_card: { icon: CreditCard, tone: 'info' },
  tuition: { icon: GraduationCap, tone: 'success' },
  utilities: { icon: Lightbulb, tone: 'accent' },
  textbook: { icon: BookOpen, tone: 'plum' },
}

/** Neutral style for event kinds the UI has no entry for. */
const fallbackEventStyle: EventStyle = { icon: Tag, tone: 'quiet' }

function getEventStyle(kind: EventKind): EventStyle {
  return eventStyles[kind] ?? fallbackEventStyle
}

const viewOptions: { value: CalendarView; label: string }[] = [
  { value: 'month', label: 'Month' },
  { value: 'week', label: 'Week' },
]

const leadTimeOptions: SelectOption<ReminderLeadTime>[] = [
  { value: '1_day', label: '1 day before' },
  { value: '3_days', label: '3 days before' },
  { value: '1_week', label: '1 week before' },
]



function EventPill({ event }: { event: CalendarEvent }) {
  const { icon: Icon, tone } = getEventStyle(event.kind)
  return (
    <span className={`mx-auto flex w-fit items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium whitespace-nowrap ${toneClasses[tone].soft}`}>
      <Icon className="size-3.5" strokeWidth={2} />
      {event.shortTitle}
    </span>
  )
}

interface DayCellProps {
  day: CalendarDay
  events: CalendarEvent[]
  isToday: boolean
  isNextPayment: boolean
}

function DayCell({ day, events, isToday, isNextPayment }: DayCellProps) {
  const reminderEvent = events.find((event) => event.hasReminder)

  let numberClass = 'text-ink'
  if (!day.inMonth) numberClass = 'text-subtle font-normal'
  else if (isToday) numberClass = 'grid size-6 place-items-center rounded-full bg-primary text-on-primary'
  else if (isNextPayment) numberClass = 'text-danger'

  return (
    <td className={`h-[72px] border border-line align-top ${isToday ? 'bg-info-soft' : ''}`}>
      <div className="relative flex justify-center pt-2.5">
        <span className={`text-sm font-semibold ${numberClass}`}>{day.dayOfMonth}</span>
        {reminderEvent && (
          <span className={`absolute top-2.5 right-3 size-2.5 rounded-full ${toneClasses[getEventStyle(reminderEvent.kind).tone].solid}`} />
        )}
      </div>
      <div className="mt-1.5 space-y-1 px-2">
        {events.map((event) => (
          <EventPill key={event.id} event={event} />
        ))}
      </div>
    </td>
  )
}

function MonthGrid({ calendarMonth, nextPaymentDate }: { calendarMonth: CalendarMonth; nextPaymentDate: IsoDate | undefined }) {
  const weeks = buildMonthGrid(calendarMonth.month)
  const eventsByDate = new Map<IsoDate, CalendarEvent[]>()
  for (const event of calendarMonth.events) {
    eventsByDate.set(event.date, [...(eventsByDate.get(event.date) ?? []), event])
  }

  return (
    <table className="mt-5 w-full table-fixed border-collapse">
      <thead>
        <tr>
          {weekdayLabels.map((label) => (
            <th key={label} className="border border-line py-2 text-sm font-medium text-ink">
              {label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {weeks.map((week) => (
          <tr key={week[0].date}>
            {week.map((day) => (
              <DayCell
                key={day.date}
                day={day}
                events={day.inMonth ? (eventsByDate.get(day.date) ?? []) : []}
                isToday={day.date === calendarMonth.today}
                isNextPayment={day.date === nextPaymentDate}
              />
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function UpcomingEventRow({ upcoming }: { upcoming: UpcomingEvent }) {
  const { event } = upcoming
  const { icon, tone } = getEventStyle(event.kind)

  return (
    <li className="flex items-center gap-3.5 rounded-xl border border-line px-3 py-2.5">
      <IconCircle icon={icon} tone={tone} size="sm" />
      <div className="flex-1">
        <p className="text-sm font-semibold whitespace-nowrap text-ink">{event.title}</p>
        <p className="text-[13px] text-muted">{formatDate(event.date)}</p>
      </div>
      <div className="text-right">
        <p className={`text-sm font-bold ${upcoming.isUrgent ? 'text-danger' : 'text-ink'}`}>{formatMoney(event.amountCents)}</p>
        <p className="text-xs text-muted">{formatDaysAway(upcoming.daysAway)}</p>
      </div>
    </li>
  )
}

export function CalendarPage() {
  const [requestedMonth, setRequestedMonth] = useState<IsoDate | null>(null)
  const [view, setView] = useState<CalendarView>('month')
  const [adding, setAdding] = useState(false)
  const { summary, calendarMonth, upcoming, reminders, error, addEvent, changeReminders } = useCalendar(requestedMonth, view)

  function onPreviousMonth() {
    if (calendarMonth) setRequestedMonth(shiftMonth(calendarMonth.month, -1))
  }

  function onNextMonth() {
    if (calendarMonth) setRequestedMonth(shiftMonth(calendarMonth.month, 1))
  }

  function onViewChange(nextView: CalendarView) {
    setView(nextView)
  }

  function onCreateEvent() {
    setAdding(true)
  }

  function onViewAllEvents() {
    if (upcoming?.length) setRequestedMonth(upcoming[0].event.date.slice(0, 7) + '-01')
  }

  function onEmailRemindersChange(emailEnabled: boolean) {
    return changeReminders({ emailEnabled })
  }

  function onLeadTimeChange(leadTime: ReminderLeadTime) {
    return changeReminders({ leadTime })
  }

  return (
    <div>
      <DataError error={error} />
      {adding && <RecordForm title="Schedule a payment" initial={{ title: '', date: new Date().toISOString().slice(0, 10), kind: 'rent', amount: '' }} fields={[
        { name: 'title', label: 'Title' }, { name: 'date', label: 'Due date', type: 'date' }, { name: 'kind', label: 'Kind', options: ['rent', 'credit_card', 'tuition', 'utilities', 'textbook', 'other'].map((value) => ({ value, label: value.replace('_', ' ') })) }, { name: 'amount', label: 'Amount (CAD)', type: 'number' },
      ]} onClose={() => setAdding(false)} onSave={(v) => addEvent({ title: v.title, date: v.date, kind: v.kind, amountCents: amountToCents(v.amount), hasReminder: true })} />}
      <PageHeader
        title="Calendar"
        subtitle="Keep track of your upcoming payments and important financial dates."
      />

      {summary && (
        <div className="mt-5 grid grid-cols-3 gap-5">
          <StatCard
            tone="danger"
            icon={CalendarDays}
            label="Upcoming payments"
            value={String(summary.upcomingCount)}
            caption={`In the next ${summary.windowDays} days`}
          />
          <StatCard
            tone="accent"
            icon={Wallet}
            label="Total upcoming amount"
            value={formatMoney(summary.upcomingTotalCents)}
            caption={`In the next ${summary.windowDays} days`}
          />
          <StatCard
            tone="info"
            icon={Bell}
            label="Next payment"
            value={summary.nextPayment ? formatMoney(summary.nextPayment.amountCents) : 'No payments'}
            caption={summary.nextPayment ? `${summary.nextPayment.label} - ${formatDate(summary.nextPayment.date)}` : 'Add a scheduled payment to get started.'}
          />
        </div>
      )}

      <div className="mt-5 grid grid-cols-[2fr_1fr] gap-5">
        <Card className="px-0 pt-5 pb-0">
          {calendarMonth && (
            <>
              <div className="flex items-center px-5">
                <h2 className="text-2xl font-bold tracking-tight text-ink">{formatDate(calendarMonth.month, 'monthYear')}</h2>
                <div className="ml-8 flex gap-5">
                  <button type="button" aria-label="Previous month" onClick={onPreviousMonth} className="text-ink">
                    <ChevronLeft className="size-5" />
                  </button>
                  <button type="button" aria-label="Next month" onClick={onNextMonth} className="text-ink">
                    <ChevronRight className="size-5" />
                  </button>
                </div>
                <div className="ml-auto flex items-center gap-4">
                  <SegmentedControl options={viewOptions} value={view} onChange={onViewChange} />
                  <Button icon={Plus} onClick={onCreateEvent} className="px-5">
                    Create event
                  </Button>
                </div>
              </div>
              <MonthGrid calendarMonth={calendarMonth} nextPaymentDate={summary?.nextPayment?.date} />
            </>
          )}
        </Card>

        <Card className="px-5 pt-5 pb-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold tracking-tight text-ink">Upcoming events</h2>
            <button type="button" onClick={onViewAllEvents} className="flex items-center gap-0.5 text-sm text-muted hover:text-ink">
              Show next payment <ChevronRight className="size-4" />
            </button>
          </div>
          <ul className="mt-3 space-y-2">
            {upcoming?.map((item) => (
              <UpcomingEventRow key={item.event.id} upcoming={item} />
            ))}
          </ul>

          {reminders && (
            <div className="mt-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold tracking-tight text-ink">Email reminders</h3>
                <Toggle disabled checked={reminders.emailEnabled} label="Email reminders" onChange={onEmailRemindersChange} />
              </div>
              <p className="mt-1 text-sm text-muted">Email delivery is not available yet. Reminder timing below controls in-app alerts.</p>
              <Select label="Reminder timing" value={reminders.leadTime} options={leadTimeOptions} onChange={onLeadTimeChange} className="mt-4" />
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
