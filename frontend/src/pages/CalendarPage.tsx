import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { Bell, CalendarDays, ChevronLeft, ChevronRight, Plus, Wallet } from 'lucide-react'
import { RecordForm } from '../components/RecordForm'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { PageHeader } from '../components/PageHeader'
import { DataError } from '../components/DataError'
import { SegmentedControl } from '../components/SegmentedControl'
import { Select } from '../components/Select'
import { StatCard } from '../components/StatCard'
import { Toggle } from '../components/Toggle'
import { useCalendar } from '../hooks/useCalendar'
import { buildMonthGrid, buildWeek, localToday, shiftDays, shiftMonth, weekdayLabels } from '../lib/calendar'
import { amountToCents } from '../lib/moneyInput'
import { formatDate, formatDaysAway, formatMoney } from '../lib/format'
import type { CalendarEvent, CalendarView, IsoDate, ReminderLeadTime } from '../types'

const leadTimes: { value: ReminderLeadTime; label: string }[] = [
  { value: '1_day', label: '1 day before' }, { value: '3_days', label: '3 days before' },
  { value: '1_week', label: '1 week before' },
]

function status(event: CalendarEvent, today: string) {
  if (event.skipped) return 'Skipped (transaction deleted)'
  if (event.paid) return event.type === 'income' ? 'Received' : 'Paid'
  if (event.date < today) return event.type === 'income' ? 'Not received' : 'Overdue'
  return event.type === 'income' ? 'Expected income' : 'Unpaid'
}

export function CalendarPage() {
  const [anchor, setAnchor] = useState<IsoDate>(localToday)
  const [view, setView] = useState<CalendarView>('month')
  const [editor, setEditor] = useState<{ event?: CalendarEvent; date: string } | null>(null)
  const [selected, setSelected] = useState<CalendarEvent | null>(null)
  const [payment, setPayment] = useState<CalendarEvent | null>(null)
  const details = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (selected) details.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [selected])
  const { summary, calendarMonth, upcoming, reminders, error, addEvent, editEvent, deleteEvent, changeReminders, recordPayment } = useCalendar(anchor, view)
  const today = calendarMonth?.today ?? localToday()
  const monday = calendarMonth?.weekStart === 'monday'
  const labels = monday ? [...weekdayLabels.slice(1), weekdayLabels[0]] : weekdayLabels
  const weeks = calendarMonth ? (calendarMonth.view === 'week'
    ? [buildWeek(calendarMonth.rangeStart)]
    : buildMonthGrid(calendarMonth.month, calendarMonth.weekStart)) : []
  const pending = upcoming ?? []
  const overdue = pending.filter(item => item.daysAway < 0)
  const future = pending.filter(item => item.daysAway >= 0)
  const selectedEvent = selected && (calendarMonth?.events.find(e => e.id === selected.id) ?? pending.find(e => e.event.id === selected.id)?.event ?? selected)

  function move(direction: number) {
    setAnchor(view === 'week' ? shiftDays(anchor, direction * 7) : shiftMonth(anchor, direction))
  }

  return <div>
    <PageHeader title="Calendar" subtitle="Plan payments, track recurring entries, and stay ahead of due dates." />
    <DataError error={error} />
    {summary && <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard tone="danger" icon={CalendarDays} label="Upcoming payments" value={String(summary.upcomingCount)} caption="In the next 30 days" />
      <StatCard tone="accent" icon={Wallet} label="Total upcoming amount" value={formatMoney(summary.upcomingTotalCents)} caption="Unpaid expenses in the next 30 days" />
      <StatCard tone="info" icon={Bell} label="Next payment" value={summary.nextPayment ? formatMoney(summary.nextPayment.amountCents) : 'No payments'} caption={summary.nextPayment ? `${summary.nextPayment.label} - ${formatDate(summary.nextPayment.date)}` : 'Add a scheduled payment to get started.'} />
      <StatCard tone="danger" icon={CalendarDays} label="Overdue payments" value={formatMoney(summary.overdueTotalCents ?? 0)} caption={`${summary.overdueCount ?? 0} unpaid payments before today`} />
    </div>}

    <div className="mt-5 grid gap-5 xl:grid-cols-[2fr_1fr]">
      <Card className="min-w-0 p-5">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="mr-auto text-xl font-bold">{view === 'week' && calendarMonth
            ? `${formatDate(calendarMonth.rangeStart)} – ${formatDate(shiftDays(calendarMonth.rangeEnd, -1))}`
            : formatDate(anchor, 'monthYear')}</h2>
          <button type="button" aria-label={`Previous ${view}`} onClick={() => move(-1)} className="rounded p-2 hover:bg-surface-muted"><ChevronLeft /></button>
          <Button variant="outline" onClick={() => setAnchor(localToday())}>Today</Button>
          <button type="button" aria-label={`Next ${view}`} onClick={() => move(1)} className="rounded p-2 hover:bg-surface-muted"><ChevronRight /></button>
          <SegmentedControl<CalendarView> options={[{ value: 'month', label: 'Month' }, { value: 'week', label: 'Week' }]} value={view} onChange={setView} />
          <Button icon={Plus} onClick={() => setEditor({ date: anchor })}>Create event</Button>
        </div>
        <p className="mt-3 text-sm text-muted">Click a date to schedule a payment, or an entry to view its details. Recurring entries are marked ↻.</p>
        {!calendarMonth && !error && <p role="status" className="mt-5">Loading calendar…</p>}
        {calendarMonth && <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[560px] table-fixed border-collapse">
          <thead><tr>{labels.map(label => <th key={label} className="border border-line py-2 text-sm">{label}</th>)}</tr></thead>
          <tbody>{weeks.map(week => <tr key={week[0].date}>{week.map(day => {
            const events = calendarMonth.events.filter(e => e.date === day.date)
            return <td key={day.date} className={`h-28 border border-line p-1 align-top ${day.date === today ? 'bg-info-soft' : ''}`}>
              <button type="button" aria-label={`Create payment on ${day.date}`} onClick={() => setEditor({ date: day.date })} className={`mb-1 w-full rounded py-1 text-sm hover:bg-surface-muted ${day.inMonth ? 'font-semibold' : 'text-muted'}`}>{day.dayOfMonth}</button>
              {events.map(event => <button type="button" key={event.id} onClick={() => setSelected(event)} title={`${event.title}: ${formatMoney(event.amountCents)} — ${status(event, today)}`} className={`mb-1 block w-full truncate rounded px-1.5 py-1 text-left text-xs ${event.paid || event.skipped ? 'bg-surface-muted text-muted' : event.type === 'income' ? 'bg-success-soft text-success' : event.date < today ? 'bg-danger-soft text-danger' : 'bg-info-soft text-ink'}`}>
                {event.source === 'recurring' ? '↻ ' : ''}{event.paid ? '✓ ' : ''}{event.title}
                {view === 'week' && <span className="block">{formatMoney(event.amountCents)}</span>}
              </button>)}
            </td>
          })}</tr>)}</tbody>
        </table></div>}
        {calendarMonth && calendarMonth.events.length === 0 && <p className="mt-4 text-sm text-muted">No entries in this {view}. Select a date to add one.</p>}
      </Card>

      <Card className="p-5">
        <h2 className="text-lg font-bold">Overdue payments</h2>
        {overdue.length === 0 && <p className="mt-2 text-sm text-muted">You have no overdue payments.</p>}
        <ul className="mt-3 max-h-72 space-y-2 overflow-y-auto">{overdue.map(item => <li key={item.event.id}><button type="button" onClick={() => setSelected(item.event)} className="w-full rounded-lg border border-danger/40 p-3 text-left"><span className="block font-semibold">{item.event.title}</span><span className="text-sm text-danger">{formatMoney(item.event.amountCents)} · {formatDaysAway(item.daysAway)}</span></button></li>)}</ul>
        <h2 className="mt-6 text-lg font-bold">Upcoming payments</h2>
        <p className="text-xs text-muted">Unpaid expenses over the next 12 months.</p>
        {future.length === 0 && <p className="mt-2 text-sm text-muted">No upcoming payments.</p>}
        <ul className="mt-3 max-h-80 space-y-2 overflow-y-auto">{future.map(item => <li key={item.event.id}><button type="button" onClick={() => setSelected(item.event)} className="w-full rounded-lg border border-line p-3 text-left hover:bg-surface-muted"><span className="block font-semibold">{item.event.source === 'recurring' ? '↻ ' : ''}{item.event.title}</span><span className="text-sm text-muted">{formatMoney(item.event.amountCents)} · {formatDate(item.event.date)} · {formatDaysAway(item.daysAway)}</span></button></li>)}</ul>
        {reminders && <div className="mt-6 border-t border-line pt-4">
          <div className="flex justify-between"><h3 className="font-semibold">Email reminders</h3><Toggle disabled checked={false} label="Email reminders" onChange={() => {}} /></div>
          <p className="mt-2 text-sm text-muted">Email delivery is not available yet. Timing below controls in-app alerts; overdue reminders remain visible until resolved.</p>
          <Select label="Reminder timing" value={reminders.leadTime} options={leadTimes} onChange={leadTime => { void changeReminders({ leadTime }) }} className="mt-3" />
        </div>}
      </Card>
    </div>

    {selectedEvent && <div ref={details} aria-live="polite"><Card className="mt-5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-bold">{selectedEvent.title}</h2><Button variant="outline" onClick={() => setSelected(null)}>Close details</Button></div>
      <p className="mt-2">{formatDate(selectedEvent.date)} · {formatMoney(selectedEvent.amountCents)} · {status(selectedEvent, today)}</p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button variant="outline" onClick={() => setAnchor(selectedEvent.date)}>Show on calendar</Button>
        {selectedEvent.source === 'recurring' ? <Link className="text-primary underline" to="/recurring">Edit recurring schedule</Link> : <Button variant="outline" onClick={() => { setEditor({ event: selectedEvent, date: selectedEvent.date }); setSelected(null) }}>Edit event</Button>}
        {!selectedEvent.paid && !selectedEvent.skipped && <Button onClick={() => setPayment(selectedEvent)}>{selectedEvent.type === 'income' ? 'Record income received' : 'Record payment'}</Button>}
        {selectedEvent.transactionId && <Link className="text-primary underline" to="/expenses">View or edit recorded transaction</Link>}
      </div>
      <p className="mt-3 text-sm text-muted">Recording adds one transaction to your ledger. If you already entered this payment manually, do not record it again. Deleting an event or schedule keeps existing transactions.</p>
      {selectedEvent.skipped && <p className="mt-2 text-sm text-muted">This transaction was deleted. It will not be regenerated by recurring synchronization; add a manual transaction if you need to record it again.</p>}
    </Card></div>}

    {editor && <RecordForm title={editor.event ? 'Edit scheduled payment' : 'Schedule a payment'} initial={{ title: editor.event?.title ?? '', date: editor.date, kind: editor.event?.kind ?? 'rent', amount: editor.event ? (editor.event.amountCents / 100).toFixed(2) : '', reminder: editor.event?.hasReminder === false ? 'false' : 'true' }} fields={[
      { name: 'title', label: 'Title' }, { name: 'date', label: 'Due date', type: 'date' },
      { name: 'kind', label: 'Kind', options: ['rent', 'credit_card', 'tuition', 'utilities', 'textbook', 'other'].map(value => ({ value, label: value.replace('_', ' ') })) },
      { name: 'amount', label: 'Amount (CAD)', type: 'number' },
      { name: 'reminder', label: 'In-app reminder', options: [{ value: 'true', label: 'Enabled' }, { value: 'false', label: 'Disabled' }] },
    ]} onClose={() => setEditor(null)} onDelete={editor.event ? () => deleteEvent(editor.event!.id) : undefined} onSave={values => {
      const input = { title: values.title, date: values.date, kind: values.kind, amountCents: amountToCents(values.amount), hasReminder: values.reminder === 'true', paid: editor.event?.transactionId ? false : editor.event?.paid ?? false }
      return editor.event ? editEvent(editor.event.id, input) : addEvent(input)
    }} />}

    {payment && <RecordForm title={payment.type === 'income' ? 'Record income received' : 'Record payment'} initial={{ paidDate: today }} fields={[{ name: 'paidDate', label: `Date received/paid — ${formatMoney(payment.amountCents)}`, type: 'date' }]} onClose={() => setPayment(null)} onSave={async values => {
      const ok = await recordPayment({ source: payment.source ?? 'event', sourceId: payment.sourceId ?? payment.id, date: payment.date, paidDate: values.paidDate })
      if (ok) setSelected(null)
      return ok
    }} />}
  </div>
}
