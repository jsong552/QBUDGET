import { expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import type { useCalendar } from '../hooks/useCalendar'
import { CalendarPage } from './CalendarPage'

vi.mock('../components/PageHeader', () => ({ PageHeader: () => null }))

// The full shape useCalendar returns, so the page is rendered the way it runs.
const calendar: ReturnType<typeof useCalendar> = {
  summary: { overdueCount: 0, overdueTotalCents: 0, upcomingCount: 0, upcomingTotalCents: 0, windowDays: 30, nextPayment: null },
  calendarMonth: undefined,
  upcoming: [],
  reminders: undefined,
  error: null,
  mutationError: null,
  clearMutationError: vi.fn(),
  addEvent: vi.fn(),
  editEvent: vi.fn(),
  deleteEvent: vi.fn(),
  recordPayment: vi.fn(),
  changeReminders: vi.fn(),
}
vi.mock('../hooks/useCalendar', () => ({ useCalendar: () => calendar }))

it('renders a new account with no scheduled payment without crashing', () => {
  expect(renderToStaticMarkup(<MemoryRouter><CalendarPage /></MemoryRouter>)).toContain('No payments')
})
