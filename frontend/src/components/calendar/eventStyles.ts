import { BookOpen, CreditCard, GraduationCap, House, Lightbulb, Tag, type LucideIcon } from 'lucide-react'
import type { CalendarDay } from '../../lib/calendar'
import type { CalendarEvent, EventKind, IsoDate } from '../../types'
import type { Tone } from '../tones'

export interface EventStyle {
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

/** Neutral style for "other" and any kind the UI has no entry for. */
const fallbackEventStyle: EventStyle = { icon: Tag, tone: 'quiet' }

export function getEventStyle(kind: EventKind): EventStyle {
  return eventStyles[kind] ?? fallbackEventStyle
}

export type EventStatusKey = 'skipped' | 'paid' | 'received' | 'overdue' | 'not_received' | 'unpaid' | 'expected'

export interface EventStatus {
  key: EventStatusKey
  label: string
  tone: Tone
  /** Paid, received or skipped: nothing left to do. */
  settled: boolean
  /** Past its date and not settled. */
  late: boolean
}

/** Status of a calendar entry on `today`; incoming payments use income wording. */
export function getEventStatus(event: CalendarEvent, today: string): EventStatus {
  const income = event.type === 'income'
  if (event.skipped) return { key: 'skipped', label: 'Skipped (transaction deleted)', tone: 'quiet', settled: true, late: false }
  if (event.paid) return income
    ? { key: 'received', label: 'Received', tone: 'success', settled: true, late: false }
    : { key: 'paid', label: 'Paid', tone: 'success', settled: true, late: false }
  if (event.date < today) return income
    ? { key: 'not_received', label: 'Not received', tone: 'danger', settled: false, late: true }
    : { key: 'overdue', label: 'Overdue', tone: 'danger', settled: false, late: true }
  return income
    ? { key: 'expected', label: 'Expected income', tone: 'success', settled: false, late: false }
    : { key: 'unpaid', label: 'Unpaid', tone: 'info', settled: false, late: false }
}

export interface CalendarGridProps {
  days: CalendarDay[][]
  weekdayLabels: string[]
  events: CalendarEvent[]
  today: IsoDate
  onCreateEvent: (date: IsoDate) => void
  onSelectEvent: (event: CalendarEvent) => void
}

export function eventsByDate(events: CalendarEvent[]): Map<IsoDate, CalendarEvent[]> {
  const byDate = new Map<IsoDate, CalendarEvent[]>()
  for (const event of events) byDate.set(event.date, [...(byDate.get(event.date) ?? []), event])
  return byDate
}
