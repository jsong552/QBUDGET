import { expect, it } from 'vitest'
import type { CalendarEvent } from '../../types'
import { eventsByDate, getEventStatus, getEventStyle } from './eventStyles'

const base: CalendarEvent = { id: 'e1', title: 'Rent', shortTitle: 'Rent', kind: 'rent', date: '2024-09-15', amountCents: 70000, hasReminder: true }
const today = '2024-09-10'

it('labels entries the same way the calendar always has', () => {
  expect(getEventStatus(base, today).label).toBe('Unpaid')
  expect(getEventStatus({ ...base, date: '2024-09-05' }, today)).toMatchObject({ label: 'Overdue', late: true })
  expect(getEventStatus({ ...base, paid: true }, today)).toMatchObject({ label: 'Paid', settled: true })
  expect(getEventStatus({ ...base, type: 'income' }, today).label).toBe('Expected income')
  expect(getEventStatus({ ...base, type: 'income', date: '2024-09-01' }, today).label).toBe('Not received')
  expect(getEventStatus({ ...base, type: 'income', paid: true }, today).label).toBe('Received')
  expect(getEventStatus({ ...base, skipped: true, date: '2024-09-01' }, today)).toMatchObject({ label: 'Skipped (transaction deleted)', late: false })
})

it('colours entries by kind with a neutral fallback', () => {
  expect(getEventStyle('textbook').tone).toBe('plum')
  expect(getEventStyle('utilities').tone).toBe('accent')
  expect(getEventStyle('other').tone).toBe('quiet')
})

it('groups entries by date', () => {
  const grouped = eventsByDate([base, { ...base, id: 'e2' }, { ...base, id: 'e3', date: '2024-09-16' }])
  expect(grouped.get('2024-09-15')).toHaveLength(2)
  expect(grouped.get('2024-09-16')).toHaveLength(1)
})
