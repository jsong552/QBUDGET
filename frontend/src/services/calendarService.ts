import { mockCalendarMonth, mockCalendarSummary, mockReminderSettings, mockUpcomingEvents } from '../data/mockData'
import type { CalendarEventInput, CalendarMonth, CalendarSummary, IsoDate, ReminderSettings, UpcomingEvent } from '../types'
import { mockMutation, mockResponse } from './mock'

// BACKEND: GET /api/calendar/summary
export function getCalendarSummary(): Promise<CalendarSummary> {
  return mockResponse(mockCalendarSummary)
}

// BACKEND: GET /api/calendar/events?month=YYYY-MM (no month = current month)
// The mock always returns September 2024.
export function getCalendarMonth(month: IsoDate | null): Promise<CalendarMonth> {
  console.info('[mock] getCalendarMonth', month ?? 'current')
  return mockResponse(mockCalendarMonth)
}

// BACKEND: GET /api/calendar/upcoming?limit=4
export function listUpcomingEvents(): Promise<UpcomingEvent[]> {
  return mockResponse(mockUpcomingEvents)
}

// BACKEND: POST /api/calendar/events
export function createEvent(input: CalendarEventInput): Promise<void> {
  return mockMutation('createEvent', input)
}

// BACKEND: GET /api/calendar/reminders
export function getReminderSettings(): Promise<ReminderSettings> {
  return mockResponse(mockReminderSettings)
}

// BACKEND: PUT /api/calendar/reminders
export function updateReminderSettings(settings: ReminderSettings): Promise<void> {
  return mockMutation('updateReminderSettings', settings)
}
