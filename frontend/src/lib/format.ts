import type { IsoDate } from '../types'

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
  | 'medium' // Sep 10, 2024
  | 'short' // Sep 10
  | 'monthDay' // October 1
  | 'month' // September
  | 'monthShort' // Sep
  | 'monthYear' // September 2024

const dateOptions: Record<DateStyle, Intl.DateTimeFormatOptions> = {
  medium: { month: 'short', day: 'numeric', year: 'numeric' },
  short: { month: 'short', day: 'numeric' },
  monthDay: { month: 'long', day: 'numeric' },
  month: { month: 'long' },
  monthShort: { month: 'short' },
  monthYear: { month: 'long', year: 'numeric' },
}

/** Parses a `YYYY-MM-DD` string as a calendar date (no time zone shift). */
export function parseIsoDate(date: IsoDate): Date {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

export function formatDate(date: IsoDate, style: DateStyle = 'medium'): string {
  return new Intl.DateTimeFormat('en-US', { ...dateOptions[style], timeZone: 'UTC' }).format(parseIsoDate(date))
}

export function formatDaysAway(days: number): string {
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
