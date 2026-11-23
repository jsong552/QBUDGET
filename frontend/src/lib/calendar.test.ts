import { expect, it } from 'vitest'
import { buildMonthGrid, buildWeek, shiftDays, shiftMonth } from './calendar'
import { formatDaysAway } from './format'

it('builds a full week across a year boundary', () => {
  expect(buildWeek('2026-12-28').map(day => day.date)).toEqual([
    '2026-12-28', '2026-12-29', '2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02', '2027-01-03',
  ])
  expect(shiftDays('2024-02-28', 1)).toBe('2024-02-29')
  expect(shiftDays('2024-03-01', -1)).toBe('2024-02-29')
})
it('pads months using the selected week start and navigates without date overflow', () => {
  expect(buildMonthGrid('2026-11-01')[0][0].date).toBe('2026-11-01')
  expect(buildMonthGrid('2026-11-01', 'monday')[0][0].date).toBe('2026-10-26')
  expect(buildMonthGrid('2024-02-01').flat().filter(day => day.inMonth)).toHaveLength(29)
  expect(shiftMonth('2026-12-31', 1)).toBe('2027-01-01')
})
it('labels overdue dates clearly', () => {
  expect(formatDaysAway(-1)).toBe('1 day overdue')
  expect(formatDaysAway(-4)).toBe('4 days overdue')
  expect(formatDaysAway(0)).toBe('Today')
})
