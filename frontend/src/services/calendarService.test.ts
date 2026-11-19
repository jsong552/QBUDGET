import { beforeEach, expect, it, vi } from 'vitest'
const client = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() }))
vi.mock('../lib/apiClient', () => ({ apiClient: client }))
import { getCalendarMonth, recordCalendarPayment, updateEvent, removeEvent } from './calendarService'
beforeEach(() => vi.clearAllMocks())
it('sends the anchor date and selected view to the backend', () => {
  getCalendarMonth('2027-01-01', 'week')
  expect(client.get).toHaveBeenCalledWith('/calendar/events?view=week&month=2027-01-01')
})
it('records a single occurrence using its source and actual payment date', () => {
  const input = { source: 'recurring' as const, sourceId: 'rent', date: '2026-12-01', paidDate: '2026-11-30' }
  recordCalendarPayment(input)
  expect(client.post).toHaveBeenCalledWith('/calendar/pay', input)
})
it('encodes event IDs for update and delete', () => {
  const input = { title: 'Rent', date: '2026-12-01', kind: 'rent', amountCents: 10000, hasReminder: true }
  updateEvent('one/two', input)
  removeEvent('one/two')
  expect(client.put).toHaveBeenCalledWith('/calendar/events/one%2Ftwo', input)
  expect(client.delete).toHaveBeenCalledWith('/calendar/events/one%2Ftwo')
})
