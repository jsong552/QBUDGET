import type { IsoDate } from '../types'
import { parseIsoDate } from './format'

export interface CalendarDay {
  date: IsoDate
  dayOfMonth: number
  inMonth: boolean
}

function toIsoDate(date: Date): IsoDate {
  return date.toISOString().slice(0, 10)
}

/** Builds the weeks (Sunday first) shown in a month grid, padded with days from the neighbouring months. */
export function buildMonthGrid(month: IsoDate): CalendarDay[][] {
  const first = parseIsoDate(month)
  const monthIndex = first.getUTCMonth()
  const cursor = new Date(first)
  cursor.setUTCDate(1 - first.getUTCDay())

  const weeks: CalendarDay[][] = []
  do {
    const week: CalendarDay[] = []
    for (let i = 0; i < 7; i++) {
      week.push({ date: toIsoDate(cursor), dayOfMonth: cursor.getUTCDate(), inMonth: cursor.getUTCMonth() === monthIndex })
      cursor.setUTCDate(cursor.getUTCDate() + 1)
    }
    weeks.push(week)
  } while (cursor.getUTCMonth() === monthIndex)

  return weeks
}

/** First day of the month `delta` months away from `month`. */
export function shiftMonth(month: IsoDate, delta: number): IsoDate {
  const date = parseIsoDate(month)
  return toIsoDate(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + delta, 1)))
}

export const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
