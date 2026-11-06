import { useCallback } from 'react'
import { getCalendarMonth, getCalendarSummary, getReminderSettings, listUpcomingEvents } from '../services/calendarService'
import type { IsoDate } from '../types'
import { useAsync } from './useAsync'

/** `month` is the first day of the month to show, or null for the current month. */
export function useCalendar(month: IsoDate | null) {
  const loadMonth = useCallback(() => getCalendarMonth(month), [month])

  const [summary] = useAsync(getCalendarSummary)
  const [calendarMonth] = useAsync(loadMonth)
  const [upcoming] = useAsync(listUpcomingEvents)
  const [reminders, setReminders] = useAsync(getReminderSettings)

  return { summary, calendarMonth, upcoming, reminders, setReminders }
}
