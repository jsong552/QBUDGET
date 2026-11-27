import type { ForecastSeries, SeriesPoint } from '../types'
import { toTimestamp } from './chart'

export interface ForecastRow {
  t: number
  income?: number
  expenses?: number
  projected?: number
  projectedIncome?: number
}

/** A period forecast is actual-to-date + future amounts, not just its remaining days.
 * Works for month, Monday-start week and four-month term buckets supplied by C++.
 * Missing actuals stay absent instead of drawing a misleading zero or bridge.
 */
export function forecastChartRows(series: ForecastSeries): ForecastRow[] {
  const rows = new Map<string, ForecastRow>()
  const add = (points: SeriesPoint[], key: keyof Omit<ForecastRow, 't'>) => {
    for (const point of points) {
      const row = rows.get(point.date) ?? { t: toTimestamp(point.date) }
      row[key] = point.amountCents
      rows.set(point.date, row)
    }
  }
  add(series.income, 'income')
  add(series.expenses, 'expenses')
  add(series.projectedExpenses, 'projected')
  add(series.projectedIncome ?? [], 'projectedIncome')
  return [...rows.values()].sort((a, b) => a.t - b.t).map((row) => ({
    ...row,
    projected: row.projected == null ? undefined : row.projected + (row.expenses ?? 0),
    projectedIncome: row.projectedIncome == null ? undefined : row.projectedIncome + (row.income ?? 0),
  }))
}
