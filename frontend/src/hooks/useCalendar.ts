import { useCallback } from 'react'
import {
  createEvent,
  recordCalendarPayment,
  type CalendarPaymentInput,
  updateEvent,
  removeEvent,
  getCalendarMonth,
  getCalendarSummary,
  getReminderSettings,
  listUpcomingEvents,
  updateReminderSettings,
} from '../services/calendarService'
import type { CalendarEventInput, CalendarView, IsoDate, ReminderSettings } from '../types'
import { useAsync } from './useAsync'
import { useMutation } from './useMutation'
import { useReloadOnGeneratedTransactions } from './useReloadOnGeneratedTransactions'

/** `month` is an anchor date in the requested month/week, or null for today. */
export function useCalendar(month: IsoDate | null, view: CalendarView) {
  const loadMonth = useCallback(() => getCalendarMonth(month, view), [month, view])

  const summary = useAsync(getCalendarSummary)
  const calendarMonth = useAsync(loadMonth)
  const upcoming = useAsync(listUpcomingEvents)
  const reminders = useAsync(getReminderSettings)
  const { run, error: mutationError, clearError: clearMutationError } = useMutation()

  const reloadSummary = summary.reload
  const reloadMonth = calendarMonth.reload
  const reloadUpcoming = upcoming.reload
  const setReminders = reminders.setData
  const currentReminders = reminders.data

  /** A new event affects the summary cards, the grid and the upcoming list. */
  const reloadAfterChange = useCallback(() => {
    reloadSummary()
    reloadMonth()
    reloadUpcoming()
  }, [reloadSummary, reloadMonth, reloadUpcoming])
  // AppLayout syncs in the background; a direct calendar visit may load before it finishes.
  useReloadOnGeneratedTransactions(reloadAfterChange)

  const addEvent = useCallback(
    (input: CalendarEventInput) => run(() => createEvent(input), { onSuccess: reloadAfterChange }),
    [run, reloadAfterChange],
  )

  /** Shows the new settings immediately and restores the previous ones if the request fails. */
  const changeReminders = useCallback(
    (changes: Partial<ReminderSettings>) => {
      if (!currentReminders) return Promise.resolve(false)
      const previous = currentReminders
      const next = { ...previous, ...changes }
      setReminders(next)
      return run(() => updateReminderSettings(next), { onFailure: () => setReminders(previous) })
    },
    [run, currentReminders, setReminders],
  )

  return {
    summary: summary.data,
    calendarMonth: calendarMonth.data,
    upcoming: upcoming.data,
    reminders: reminders.data,
    error: summary.error ?? calendarMonth.error ?? upcoming.error ?? reminders.error ?? mutationError,
    mutationError,
    clearMutationError,
    addEvent,
    editEvent: (id: string, input: CalendarEventInput) => run(() => updateEvent(id, input), { onSuccess: reloadAfterChange }),
    deleteEvent: (id: string) => run(() => removeEvent(id), { onSuccess: reloadAfterChange }),
    recordPayment: (input: CalendarPaymentInput) => run(() => recordCalendarPayment(input), { onSuccess: reloadAfterChange }),
    changeReminders,
  }
}
