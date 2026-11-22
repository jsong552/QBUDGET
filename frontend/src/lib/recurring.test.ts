import { expect, it } from 'vitest'
import { categoriesForRecurringType, defaultRecurringCategory, earliestRecurringStart } from './recurring'

const categories = [
  { id: 'groceries', name: 'Groceries' },
  { id: 'other', name: 'Other' },
  { id: 'income', name: 'Income' },
  { id: 'old', name: 'Old', custom: true, archived: true },
]

it('offers only the income category for income and every other active one for expenses', () => {
  expect(categoriesForRecurringType('income', categories).map((c) => c.id)).toEqual(['income'])
  expect(categoriesForRecurringType('expense', categories).map((c) => c.id)).toEqual(['groceries', 'other'])
})

it('picks a valid default when the type changes', () => {
  expect(defaultRecurringCategory('income', categories)).toBe('income')
  expect(defaultRecurringCategory('expense', categories)).toBe('other')
  expect(defaultRecurringCategory('expense', [{ id: 'rent', name: 'Rent' }])).toBe('rent')
  expect(defaultRecurringCategory('income', [{ id: 'rent', name: 'Rent' }])).toBe('')
})

it('keeps start dates within the 1000-occurrence limit, counted up to the end date when it is earlier', () => {
  expect(earliestRecurringStart('weekly', '2026-11-22')).toBe('2007-11-22')
  expect(earliestRecurringStart('monthly', '2026-11-22')).toBe('1943-11-22')
  expect(earliestRecurringStart('weekly', '2026-11-22', '2010-01-01')).toBe('1991-01-01')
  expect(earliestRecurringStart('weekly', '2026-11-22', '2030-01-01')).toBe('2007-11-22')
})
