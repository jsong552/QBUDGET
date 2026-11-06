import type { IsoDate } from '../types'
import { parseIsoDate } from './format'

const dayMs = 24 * 60 * 60 * 1000

/** Converts an ISO date to a timestamp for a numeric (time) chart axis. */
export function toTimestamp(date: IsoDate): number {
  return parseIsoDate(date).getTime()
}

/** [start, end] of a time axis. Widens a single point by a day each way and falls back to today for no points. */
export function timeDomain(times: number[]): [number, number] {
  if (times.length === 0) {
    const now = Date.now()
    return [now - dayMs, now]
  }
  const start = Math.min(...times)
  const end = Math.max(...times)
  return start === end ? [start - dayMs, end + dayMs] : [start, end]
}

/**
 * Evenly spaced, round tick values (in cents) from 0 up to at least `maxValue`,
 * e.g. max 59000 with 3 intervals -> [0, 20000, 40000, 60000]. Steps are at least $1 so labels never repeat.
 */
export function valueTicks(maxValue: number, intervals: number): number[] {
  const safeMax = maxValue > 0 ? maxValue : 10000
  const rawStep = Math.max(safeMax / intervals, 100)
  const magnitude = 10 ** Math.floor(Math.log10(rawStep))
  const step = [1, 2, 2.5, 5, 10].map((factor) => factor * magnitude).find((candidate) => candidate >= rawStep) ?? 10 * magnitude
  const count = Math.ceil(safeMax / step)
  return Array.from({ length: count + 1 }, (_, i) => i * step)
}

export type DateTickUnit = 'day' | 'month' | 'monthYear'

export interface DateTicks {
  ticks: number[]
  unit: DateTickUnit
}

/**
 * Readable date ticks between two timestamps (inclusive of the start).
 * Spans over ~2 months tick on the 1st of each month; shorter spans tick on round days (1, 5, 10, 15 ...).
 */
export function dateTicks(startMs: number, endMs: number, maxTicks = 5): DateTicks {
  const start = new Date(startMs)
  const spanDays = Math.max((endMs - startMs) / dayMs, 0)

  if (spanDays > 62) {
    const ticks: number[] = []
    const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1))
    if (cursor.getTime() < startMs) cursor.setUTCMonth(cursor.getUTCMonth() + 1)
    while (cursor.getTime() <= endMs) {
      ticks.push(cursor.getTime())
      cursor.setUTCMonth(cursor.getUTCMonth() + 1)
    }
    const stride = Math.ceil(ticks.length / maxTicks)
    return { ticks: ticks.filter((_, i) => i % stride === 0), unit: spanDays > 366 ? 'monthYear' : 'month' }
  }

  const step = [1, 2, 5, 7, 10, 14, 15].find((candidate) => spanDays / candidate <= maxTicks - 1) ?? 15
  const ticks = [startMs]
  for (let t = startMs + dayMs; t <= endMs; t += dayMs) {
    const dayOfMonth = new Date(t).getUTCDate()
    const onStep = step === 7 || step === 14 ? Math.round((t - startMs) / dayMs) % step === 0 : dayOfMonth % step === 0
    if (onStep && t - ticks[ticks.length - 1] >= step * dayMs * 0.75) ticks.push(t)
  }
  return { ticks, unit: 'day' }
}

const tickFormatters: Record<DateTickUnit, Intl.DateTimeFormat> = {
  day: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }),
  month: new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' }),
  monthYear: new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' }),
}

export function formatDateTick(timestamp: number, unit: DateTickUnit): string {
  return tickFormatters[unit].format(new Date(timestamp))
}
