import { useState } from 'react'
import { useNavigate } from 'react-router'
import { AlertTriangle, Bell, CalendarDays, ChevronLeft, ChevronRight, Plus, Wallet } from 'lucide-react'
import { RecordForm, type RecordField } from '../components/RecordForm'
import { Button } from '../components/Button'
import { Card, CardHeader } from '../components/Card'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { PageHeader } from '../components/PageHeader'
import { DataError } from '../components/DataError'
import { IconButton } from '../components/IconButton'
import { SegmentedControl } from '../components/SegmentedControl'
import { Select } from '../components/Select'
import { StatCard } from '../components/StatCard'
import { Toggle } from '../components/Toggle'
import { focusRing } from '../components/focus'
import { EventDetails } from '../components/calendar/EventDetails'
import { MonthGrid } from '../components/calendar/MonthGrid'
import { UpcomingEventRow } from '../components/calendar/UpcomingEventRow'
import { WeekView } from '../components/calendar/WeekView'
import { useCalendar } from '../hooks/useCalendar'
import { buildMonthGrid, buildWeek, shiftDays, shiftMonth, weekdayLabels } from '../lib/calendar'
import { pageError } from '../lib/errors'
import { amountToCents } from '../lib/moneyInput'
import { formatDate, formatDateRange, formatLabel, formatMoney, localTodayIso } from '../lib/format'
import type { CalendarEvent, CalendarSummary, CalendarView, IsoDate, ReminderLeadTime } from '../types'

const leadTimes: { value: ReminderLeadTime; label: string }[] = [
  { value: '1_day', label: '1 day before' }, { value: '3_days', label: '3 days before' },
  { value: '1_week', label: '1 week before' },
]

const viewOptions: { value: CalendarView; label: string }[] = [{ value: 'month', label: 'Month' }, { value: 'week', label: 'Week' }]

const eventKinds = ['rent', 'credit_card', 'tuition', 'utilities', 'textbook', 'other']

const eventFields: RecordField[] = [
  { name: 'title', label: 'Title' },
  { name: 'date', label: 'Due date', type: 'date', half: true },
  { name: 'amount', label: 'Amount (CAD)', type: 'number', half: true },
  { name: 'kind', label: 'Kind', options: eventKinds.map(value => ({ value, label: formatLabel(value) })), half: true },
  { name: 'reminder', label: 'In-app reminder', options: [{ value: 'true', label: 'Enabled' }, { value: 'false', label: 'Disabled' }], half: true },
]

/** Upcoming rows shown before "View all" expands the list. */
const collapsedUpcomingCount = 4

function CalendarStats({ summary }: { summary: CalendarSummary }) {
  const overdueCount = summary.overdueCount ?? 0
  return (
    <div className="mt-6 grid grid-cols-4 gap-5">
      <StatCard tone="danger" icon={CalendarDays} label="Upcoming payments" value={String(summary.upcomingCount)} caption={`In the next ${summary.windowDays} days`} />
      <StatCard tone="accent" icon={Wallet} label="Total upcoming amount" value={formatMoney(summary.upcomingTotalCents)} caption={`In the next ${summary.windowDays} days`} />
      <StatCard
        tone="info"
        icon={Bell}
        label="Next payment"
        value={summary.nextPayment ? formatMoney(summary.nextPayment.amountCents) : 'No payments'}
        caption={summary.nextPayment ? `${summary.nextPayment.label} • ${formatDate(summary.nextPayment.date)}` : 'Add a scheduled payment to get started.'}
      />
      <StatCard
        tone="danger"
        icon={AlertTriangle}
        label="Overdue"
        value={formatMoney(summary.overdueTotalCents ?? 0)}
        caption={<span className={overdueCount > 0 ? 'text-danger' : ''}>{overdueCount} unpaid {overdueCount === 1 ? 'payment' : 'payments'} before today</span>}
      />
    </div>
  )
}

export function CalendarPage() {
  const navigate = useNavigate()
  const [anchor, setAnchor] = useState<IsoDate>(localTodayIso)
  const [view, setView] = useState<CalendarView>('month')
  const [editor, setEditor] = useState<{ event?: CalendarEvent; date: string } | null>(null)
  const [selected, setSelected] = useState<CalendarEvent | null>(null)
  const [payment, setPayment] = useState<CalendarEvent | null>(null)
  const [deleting, setDeleting] = useState<CalendarEvent | null>(null)
  const [showAllUpcoming, setShowAllUpcoming] = useState(false)
  const { summary, calendarMonth, upcoming, reminders, error, mutationError, clearMutationError, addEvent, editEvent, deleteEvent, changeReminders, recordPayment } = useCalendar(anchor, view)
  const today = calendarMonth?.today ?? localTodayIso()
  const monday = calendarMonth?.weekStart === 'monday'
  const labels = monday ? [...weekdayLabels.slice(1), weekdayLabels[0]] : weekdayLabels
  const weeks = calendarMonth ? (calendarMonth.view === 'week'
    ? [buildWeek(calendarMonth.rangeStart)]
    : buildMonthGrid(calendarMonth.month, calendarMonth.weekStart)) : []
  const pending = upcoming ?? []
  const overdue = pending.filter(item => item.daysAway < 0)
  const future = pending.filter(item => item.daysAway >= 0)
  const visibleFuture = showAllUpcoming ? future : future.slice(0, collapsedUpcomingCount)
  // Re-read the selected entry from fresh data so its status updates after a payment is recorded.
  const selectedEvent = selected && (calendarMonth?.events.find(e => e.id === selected.id) ?? pending.find(e => e.event.id === selected.id)?.event ?? selected)
  const dialogOpen = editor !== null || payment !== null || deleting !== null

  function move(direction: number) {
    setAnchor(view === 'week' ? shiftDays(anchor, direction * 7) : shiftMonth(anchor, direction))
  }

  function onPrevious() {
    move(-1)
  }

  function onNext() {
    move(1)
  }

  function onGoToToday() {
    setAnchor(localTodayIso())
  }

  function onViewChange(next: CalendarView) {
    setView(next)
  }

  function onOpenEditor(next: { event?: CalendarEvent; date: string }) {
    clearMutationError()
    setEditor(next)
  }

  function onCreateEvent() {
    onOpenEditor({ date: anchor })
  }

  function onCreateEventOn(date: IsoDate) {
    onOpenEditor({ date })
  }

  function onCloseEditor() {
    clearMutationError()
    setEditor(null)
  }

  function onSaveEvent(values: Record<string, string>) {
    const input = { title: values.title, date: values.date, kind: values.kind, amountCents: amountToCents(values.amount), hasReminder: values.reminder === 'true', paid: editor?.event?.transactionId ? false : editor?.event?.paid ?? false }
    return editor?.event ? editEvent(editor.event.id, input) : addEvent(input)
  }

  function onDeleteFromEditor() {
    return editor?.event ? deleteEvent(editor.event.id) : Promise.resolve(false)
  }

  function onSelectEvent(event: CalendarEvent) {
    setSelected(event)
  }

  function onCloseDetails() {
    setSelected(null)
  }

  function onShowOnCalendar(event: CalendarEvent) {
    setAnchor(event.date)
    setSelected(null)
  }

  function onEditFromDetails(event: CalendarEvent) {
    setSelected(null)
    onOpenEditor({ event, date: event.date })
  }

  function onEditSchedule() {
    setSelected(null)
    navigate('/recurring')
  }

  function onViewTransaction() {
    setSelected(null)
    navigate('/expenses')
  }

  function onOpenPayment(event: CalendarEvent) {
    clearMutationError()
    setPayment(event)
  }

  function onClosePayment() {
    clearMutationError()
    setPayment(null)
  }

  async function onSavePayment(values: Record<string, string>) {
    if (!payment) return false
    const ok = await recordPayment({ source: payment.source ?? 'event', sourceId: payment.sourceId ?? payment.id, date: payment.date, paidDate: values.paidDate })
    if (ok) setSelected(null)
    return ok
  }

  function onDeleteFromDetails(event: CalendarEvent) {
    clearMutationError()
    setDeleting(event)
  }

  async function onConfirmDelete() {
    if (!deleting) return false
    const ok = await deleteEvent(deleting.id)
    if (ok) setSelected(null)
    return ok
  }

  function onCloseDelete() {
    clearMutationError()
    setDeleting(null)
  }

  function onToggleAllUpcoming() {
    setShowAllUpcoming((shown) => !shown)
  }

  function onEmailRemindersChange(emailEnabled: boolean) {
    return changeReminders({ emailEnabled })
  }

  function onLeadTimeChange(leadTime: ReminderLeadTime) {
    return changeReminders({ leadTime })
  }

  return <div>
    <PageHeader title="Calendar" subtitle="Keep track of your upcoming payments and important financial dates." />
    <DataError error={pageError(error, mutationError, dialogOpen)} />
    {summary && <CalendarStats summary={summary} />}

    <div className="mt-5 grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-5">
      <Card className="px-5 pt-5 pb-5">
        <div className="flex items-center gap-2">
          <h2 className="mr-2 text-[22px] font-bold tracking-tight whitespace-nowrap text-ink">
            {view === 'week' && calendarMonth ? formatDateRange(calendarMonth.rangeStart, calendarMonth.rangeEnd) : formatDate(anchor, 'monthYear')}
          </h2>
          <IconButton icon={ChevronLeft} label={`Previous ${view}`} onClick={onPrevious} />
          <IconButton icon={ChevronRight} label={`Next ${view}`} onClick={onNext} />
          <Button variant="outline" onClick={onGoToToday} className="px-3 py-2">Today</Button>
          <div className="ml-auto flex items-center gap-3">
            <SegmentedControl<CalendarView> label="Calendar view" options={viewOptions} value={view} onChange={onViewChange} />
            <Button icon={Plus} onClick={onCreateEvent} className="whitespace-nowrap">Create event</Button>
          </div>
        </div>
        {!calendarMonth && !error && <p role="status" className="mt-5 text-sm text-muted">Loading calendar…</p>}
        {calendarMonth && (calendarMonth.view === 'week'
          ? <WeekView days={weeks} weekdayLabels={labels} events={calendarMonth.events} today={today} onCreateEvent={onCreateEventOn} onSelectEvent={onSelectEvent} />
          : <MonthGrid days={weeks} weekdayLabels={labels} events={calendarMonth.events} today={today} onCreateEvent={onCreateEventOn} onSelectEvent={onSelectEvent} />)}
        {calendarMonth && calendarMonth.events.length === 0 && <p className="mt-4 text-sm text-muted">No entries in this {view}. Select a day to add one.</p>}
      </Card>

      <Card className="px-5 pt-5 pb-5">
        <CardHeader
          title="Upcoming events"
          action={future.length > collapsedUpcomingCount && (
            <button type="button" onClick={onToggleAllUpcoming} aria-expanded={showAllUpcoming} className={`mt-1 inline-flex items-center gap-1 rounded text-sm font-medium text-muted hover:text-ink ${focusRing}`}>
              {showAllUpcoming ? 'Show less' : 'View all'}
              <ChevronRight className={`size-4 transition-transform ${showAllUpcoming ? 'rotate-90' : ''}`} strokeWidth={2} />
            </button>
          )}
        />

        {overdue.length > 0 && (
          <section aria-label="Overdue payments" className="mt-4">
            <p className="text-[11px] font-bold tracking-wider text-danger uppercase">Overdue</p>
            <ul className="mt-2 space-y-2">
              {overdue.map(item => <UpcomingEventRow key={item.event.id} upcoming={item} onSelect={onSelectEvent} />)}
            </ul>
          </section>
        )}

        <section aria-label="Upcoming payments" className="mt-4">
          {overdue.length > 0 && <p className="text-[11px] font-bold tracking-wider text-muted uppercase">Next 12 months</p>}
          {!upcoming && !error && <p role="status" className="mt-2 text-sm text-muted">Loading…</p>}
          {upcoming && future.length === 0 && <p className="mt-2 text-sm text-muted">No upcoming payments.</p>}
          <ul className="mt-2 space-y-2">
            {visibleFuture.map(item => <UpcomingEventRow key={item.event.id} upcoming={item} onSelect={onSelectEvent} />)}
          </ul>
        </section>

        {reminders && (
          <div className="mt-6 border-t border-line pt-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-bold tracking-tight text-ink">Email reminders</h3>
              {/* The API does not send email yet, so the switch stays off and disabled. */}
              <Toggle disabled checked={reminders.emailEnabled} label="Email reminders" onChange={onEmailRemindersChange} />
            </div>
            <p className="mt-1 text-sm text-muted">Receive email notifications for upcoming payments.</p>
            <p className="mt-0.5 text-[13px] text-subtle">Coming soon</p>
            <p className="mt-4 mb-2 text-sm font-medium text-ink">In-app reminder timing</p>
            <Select label="Reminder timing" value={reminders.leadTime} options={leadTimes} onChange={onLeadTimeChange} />
          </div>
        )}
      </Card>
    </div>

    {selectedEvent && !editor && !payment && !deleting && (
      <EventDetails
        event={selectedEvent}
        today={today}
        onClose={onCloseDetails}
        onShowOnCalendar={onShowOnCalendar}
        onEdit={onEditFromDetails}
        onDelete={onDeleteFromDetails}
        onRecordPayment={onOpenPayment}
        onEditSchedule={onEditSchedule}
        onViewTransaction={onViewTransaction}
      />
    )}

    {editor && (
      <RecordForm
        title={editor.event ? 'Edit scheduled payment' : 'Schedule a payment'}
        initial={{ title: editor.event?.title ?? '', date: editor.date, kind: editor.event?.kind ?? 'rent', amount: editor.event ? (editor.event.amountCents / 100).toFixed(2) : '', reminder: editor.event?.hasReminder === false ? 'false' : 'true' }}
        fields={eventFields}
        error={mutationError}
        deleteMessage="The event will be removed from your calendar. Recorded transactions are kept."
        onClose={onCloseEditor}
        onDelete={editor.event ? onDeleteFromEditor : undefined}
        onSave={onSaveEvent}
      />
    )}

    {payment && (
      <RecordForm
        title={payment.type === 'income' ? 'Record income received' : 'Record payment'}
        initial={{ paidDate: today }}
        fields={[{ name: 'paidDate', label: `${payment.type === 'income' ? 'Date received' : 'Date paid'} — ${formatMoney(payment.amountCents)}`, type: 'date' }]}
        error={mutationError}
        onClose={onClosePayment}
        onSave={onSavePayment}
      />
    )}

    {deleting && (
      <ConfirmDialog
        title="Delete event?"
        message={`"${deleting.title}" will be removed from your calendar. Recorded transactions are kept.`}
        confirmLabel="Delete"
        busyLabel="Deleting…"
        variant="danger"
        error={mutationError}
        onConfirm={onConfirmDelete}
        onClose={onCloseDelete}
      />
    )}
  </div>
}
