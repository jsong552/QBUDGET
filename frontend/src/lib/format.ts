import type { DateFormatPreference, IsoDate } from '../types'
import { getDateFormat } from './dateFormat'

interface MoneyOptions {
  /** Show the cents part. Defaults to true. */
  cents?: boolean
}

const moneyFormatters = {
  withCents: new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    currencyDisplay: 'narrowSymbol',
  }),
  wholeDollars: new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }),
}

/** Formats integer cents as a dollar string, e.g. 124860 -> "$1,248.60". */
export function formatMoney(amountCents: number, { cents = true }: MoneyOptions = {}): string {
  const formatter = cents ? moneyFormatters.withCents : moneyFormatters.wholeDollars
  return formatter.format(amountCents / 100)
}

export type DateStyle =
  | 'medium' // full date in the user's chosen format: Sep 10, 2024 / 10/09/2024 / 2024-09-10
  | 'short' // Sep 10
  | 'monthDay' // October 1
  | 'month' // September
  | 'monthShort' // Sep
  | 'monthYear' // September 2024
  | 'weekdayLong' // Tuesday, September 10

const dateOptions: Record<DateStyle, Intl.DateTimeFormatOptions> = {
  medium: { month: 'short', day: 'numeric', year: 'numeric' },
  short: { month: 'short', day: 'numeric' },
  monthDay: { month: 'long', day: 'numeric' },
  month: { month: 'long' },
  monthShort: { month: 'short' },
  monthYear: { month: 'long', year: 'numeric' },
  weekdayLong: { weekday: 'long', month: 'long', day: 'numeric' },
}

/** Parses a `YYYY-MM-DD` string as a calendar date (no time zone shift). */
export function parseIsoDate(date: IsoDate): Date {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

/** `medium` (the default) follows the user's date format setting; the spelled-out styles are the same for everyone. */
export function formatDate(date: IsoDate, style: DateStyle = 'medium'): string {
  if (style === 'medium') return formatFullDate(date, getDateFormat())
  return new Intl.DateTimeFormat('en-US', { ...dateOptions[style], timeZone: 'UTC' }).format(parseIsoDate(date))
}

/** A full date in `format`: "Sep 10, 2024", "10/09/2024" or "2024-09-10". */
export function formatFullDate(date: IsoDate, format: DateFormatPreference): string {
  const value = parseIsoDate(date)
  if (format === 'MMM_DD_YYYY') return new Intl.DateTimeFormat('en-US', { ...dateOptions.medium, timeZone: 'UTC' }).format(value)
  // Reject bad dates the same way Intl does above, so behaviour doesn't depend on the chosen format.
  if (Number.isNaN(value.getTime())) throw new RangeError('Invalid time value')
  const year = String(value.getUTCFullYear()).padStart(4, '0')
  const month = String(value.getUTCMonth() + 1).padStart(2, '0')
  const day = String(value.getUTCDate()).padStart(2, '0')
  return format === 'DD_MM_YYYY' ? `${day}/${month}/${year}` : `${year}-${month}-${day}`
}

export function formatDaysAway(days: number): string {
  if (days < 0) return `${Math.abs(days)} ${days === -1 ? 'day' : 'days'} overdue`
  if (days === 0) return 'Today'
  return days === 1 ? '1 day away' : `${days} days away`
}

/** Signed money change with a spaced sign, e.g. 24000 -> "+ $240.00", -5000 -> "− $50.00". */
export function formatMoneyChange(amountCents: number): string {
  return `${amountCents < 0 ? '−' : '+'} ${formatMoney(Math.abs(amountCents))}`
}

/** Percentage change with a direction arrow, e.g. 8 -> "↑ 8%", -3 -> "↓ 3%", 0 -> "0%". */
export function formatPercentChange(percent: number): string {
  if (percent === 0) return '0%'
  return `${percent > 0 ? '↑' : '↓'} ${Math.abs(percent)}%`
}

/** Human label for a stored value: "credit_card" -> "Credit card", "weekly" -> "Weekly". */
export function formatLabel(value: string): string {
  const words = value.replace(/[_-]+/g, ' ').trim().toLowerCase()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

/** Today's date in the user's time zone as YYYY-MM-DD (toISOString would give the UTC date). */
export function localTodayIso(): IsoDate {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/**
 * Range whose end date is exclusive (as the API sends it), shown with the last included day:
 * ("2024-09-01", "2024-10-01") -> "Sep 1 – Sep 30, 2024"; the start keeps its year when the years differ.
 * Numeric date formats show both ends in full: "01/09/2024 – 30/09/2024" or "2024-09-01 – 2024-09-30".
 */
export function formatDateRange(start: IsoDate, endExclusive: IsoDate): string {
  const last = parseIsoDate(endExclusive)
  last.setUTCDate(last.getUTCDate() - 1)
  const lastDay = last.toISOString().slice(0, 10)
  const format = getDateFormat()
  if (format !== 'MMM_DD_YYYY') return `${formatFullDate(start, format)} – ${formatFullDate(lastDay, format)}`
  const sameYear = start.slice(0, 4) === lastDay.slice(0, 4)
  return `${formatDate(start, sameYear ? 'short' : 'medium')} – ${formatDate(lastDay)}`
}
