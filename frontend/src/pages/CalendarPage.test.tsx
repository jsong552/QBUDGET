import { expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { CalendarPage } from './CalendarPage'
vi.mock('../components/PageHeader', () => ({ PageHeader: () => null }))
vi.mock('../hooks/useCalendar', () => ({ useCalendar: () => ({
  summary: { upcomingCount: 0, upcomingTotalCents: 0, windowDays: 30, nextPayment: null },
  calendarMonth: undefined, upcoming: [], reminders: undefined, error: null,
  addEvent: vi.fn(), changeReminders: vi.fn(),
}) }))
it('renders a new account with no scheduled payment without crashing', () => {
  expect(renderToStaticMarkup(<CalendarPage />)).toContain('No payments')
})
