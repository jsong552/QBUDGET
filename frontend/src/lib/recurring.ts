import type { Category, IsoDate } from '../types'
import type { RecurringEntry } from '../types/planning'
import { parseIsoDate } from './format'

type RecurringType = RecurringEntry['type']
type RecurringFrequency = RecurringEntry['frequency']

/**
 * Categories offered for a recurring entry: income entries use the income category, expenses any other active category.
 * The API only rejects an expense on the income category; the form is stricter on purpose.
 */
export function categoriesForRecurringType(type: RecurringType, categories: Category[]): Category[] {
  return categories.filter((category) => !category.archived && (type === 'income' ? category.id === 'income' : category.id !== 'income'))
}

/** Category to select when the type changes and the current one is no longer offered. */
export function defaultRecurringCategory(type: RecurringType, categories: Category[]): string {
  const allowed = categoriesForRecurringType(type, categories)
  return (allowed.find((category) => category.id === 'other') ?? allowed[0])?.id ?? ''
}

/**
 * Whole years back that always stay under the API limit of 1000 occurrences up to today (or the end date):
 * 1000 weeks is about 19.2 years and 1000 months about 83.3 years, so both are rounded down.
 */
const safeYearsBack: Record<RecurringFrequency, number> = { weekly: 19, monthly: 83 }

/** Earliest start date the form accepts for an active schedule. */
export function earliestRecurringStart(frequency: RecurringFrequency, today: IsoDate, endDate?: IsoDate | null): IsoDate {
  const date = parseIsoDate(endDate && endDate < today ? endDate : today)
  date.setUTCFullYear(date.getUTCFullYear() - (safeYearsBack[frequency] ?? safeYearsBack.weekly))
  return date.toISOString().slice(0, 10)
}
