import { apiClient } from '../lib/apiClient'
import type { CalendarEventInput, CalendarMonth, CalendarSummary, CalendarView, IsoDate, ReminderSettings, UpcomingEvent } from '../types'
export const getCalendarSummary = () => apiClient.get<CalendarSummary>('/calendar/summary')
export function getCalendarMonth(month: IsoDate | null, view: CalendarView) {
  const params = new URLSearchParams({ view })
  if (month) params.set('month', month)
  return apiClient.get<CalendarMonth>(`/calendar/events?${params}`)
}
export const listUpcomingEvents = () => apiClient.get<UpcomingEvent[]>('/calendar/upcoming')
export const createEvent = (input: CalendarEventInput) => apiClient.post<void>('/calendar/events', input)
export const getReminderSettings = () => apiClient.get<ReminderSettings>('/calendar/reminders')
export const updateReminderSettings = (settings: ReminderSettings) => apiClient.put<void>('/calendar/reminders', settings)
