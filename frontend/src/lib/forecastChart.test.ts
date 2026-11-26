import { describe, expect, it } from 'vitest'
import { forecastChartRows } from './forecastChart'
import type { ForecastGranularity, ForecastSeries } from '../types'

describe('recorded and projected period totals', () => {
  it.each(['monthly', 'weekly', 'semester'] as ForecastGranularity[])('adds actual and remaining amounts exactly once for %s', (granularity) => {
    const series: ForecastSeries = { granularity,
      income: [{ date: '2026-11-01', amountCents: 180000 }],
      expenses: [{ date: '2026-11-01', amountCents: 122095 }],
      projectedExpenses: [{ date: '2026-11-01', amountCents: 20349 }, { date: '2026-12-01', amountCents: 126165 }],
      projectedIncome: [{ date: '2026-11-01', amountCents: 30000 }, { date: '2026-12-01', amountCents: 186000 }],
    }
    const original = structuredClone(series)
    const rows = forecastChartRows(series)
    expect(rows[0]).toMatchObject({ expenses: 122095, projected: 142444, income: 180000, projectedIncome: 210000 })
    expect(rows[1]).toMatchObject({ projected: 126165, projectedIncome: 186000 })
    expect(rows[1].expenses).toBeUndefined()
    expect(forecastChartRows(series)).toEqual(rows)
    expect(series).toEqual(original)
  })
  it('keeps empty histories and a single projected point visible without fabricating actuals', () => {
    const rows = forecastChartRows({ granularity: 'monthly', income: [], expenses: [], projectedExpenses: [{ date: '2026-11-01', amountCents: 100 }] })
    expect(rows).toHaveLength(1)
    expect(rows[0].projected).toBe(100)
    expect(rows[0].expenses).toBeUndefined()
  })
  it('does not project completed periods or drop zero projections at month end', () => {
    const rows = forecastChartRows({ granularity: 'monthly', income: [],
      expenses: [{ date: '2026-10-01', amountCents: 80000 }, { date: '2026-11-01', amountCents: 90000 }],
      projectedExpenses: [{ date: '2026-11-01', amountCents: 0 }] })
    expect(rows[0].projected).toBeUndefined()
    expect(rows[1].projected).toBe(90000)
  })
})
