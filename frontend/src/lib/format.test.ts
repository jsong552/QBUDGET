import { afterEach, describe, expect, it } from 'vitest'
import type { DateFormatPreference } from '../types'
import { defaultDateFormat, setDateFormat } from './dateFormat'
import { formatDate, formatDateRange, formatFullDate } from './format'

const formats: DateFormatPreference[] = ['MMM_DD_YYYY', 'DD_MM_YYYY', 'YYYY_MM_DD']
/** The en dash formatDateRange puts between the two dates. */
const to = ' – '

afterEach(() => {
  setDateFormat(defaultDateFormat)
})

describe('formatDate follows the date format setting', () => {
  it('shows "Sep 10, 2024" until a format is chosen', () => {
    expect(formatDate('2024-09-10')).toBe('Sep 10, 2024')
  })

  it.each([
    ['MMM_DD_YYYY', 'Sep 10, 2024'],
    ['DD_MM_YYYY', '10/09/2024'],
    ['YYYY_MM_DD', '2024-09-10'],
  ] as const)('%s shows %s', (format, expected) => {
    setDateFormat(format)
    expect(formatDate('2024-09-10')).toBe(expected)
    expect(formatDate('2024-09-10', 'medium')).toBe(expected)
  })

  it.each([
    ['2026-01-05', 'Jan 5, 2026', '05/01/2026', '2026-01-05'],
    ['2024-02-29', 'Feb 29, 2024', '29/02/2024', '2024-02-29'],
    ['2025-12-31', 'Dec 31, 2025', '31/12/2025', '2025-12-31'],
  ])('%s keeps the right day, zero-padded, in every format', (date, monthName, dayFirst, iso) => {
    expect(formatFullDate(date, 'MMM_DD_YYYY')).toBe(monthName)
    expect(formatFullDate(date, 'DD_MM_YYYY')).toBe(dayFirst)
    expect(formatFullDate(date, 'YYYY_MM_DD')).toBe(iso)
  })

  it('keeps spelled-out dates the same in every format', () => {
    for (const format of formats) {
      setDateFormat(format)
      expect(formatDate('2024-09-10', 'short')).toBe('Sep 10')
      expect(formatDate('2024-10-01', 'monthDay')).toBe('October 1')
      expect(formatDate('2024-09-10', 'month')).toBe('September')
      expect(formatDate('2024-09-10', 'monthShort')).toBe('Sep')
      expect(formatDate('2024-09-10', 'monthYear')).toBe('September 2024')
      expect(formatDate('2024-09-10', 'weekdayLong')).toBe('Tuesday, September 10')
    }
  })

  it('rejects an invalid date the same way in every format', () => {
    for (const format of formats) {
      setDateFormat(format)
      expect(() => formatDate('not-a-date')).toThrow(RangeError)
    }
  })
})

describe('formatDateRange follows the date format setting', () => {
  it.each([
    ['MMM_DD_YYYY', `Sep 1${to}Sep 30, 2024`],
    ['DD_MM_YYYY', `01/09/2024${to}30/09/2024`],
    ['YYYY_MM_DD', `2024-09-01${to}2024-09-30`],
  ] as const)('%s shows the last included day', (format, expected) => {
    setDateFormat(format)
    expect(formatDateRange('2024-09-01', '2024-10-01')).toBe(expected)
  })

  it.each([
    ['MMM_DD_YYYY', `Dec 28, 2026${to}Jan 3, 2027`],
    ['DD_MM_YYYY', `28/12/2026${to}03/01/2027`],
    ['YYYY_MM_DD', `2026-12-28${to}2027-01-03`],
  ] as const)('%s shows both years for a range across New Year', (format, expected) => {
    setDateFormat(format)
    expect(formatDateRange('2026-12-28', '2027-01-04')).toBe(expected)
  })
})
