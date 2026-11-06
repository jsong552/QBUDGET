import { useCallback } from 'react'
import { getForecastCategoryBreakdown, getForecastSeries, getForecastSummary, getMonthlyProjections } from '../services/forecastService'
import { listGoals } from '../services/goalService'
import type { ForecastGranularity } from '../types'
import { useAsync } from './useAsync'

export function useForecast(granularity: ForecastGranularity) {
  const loadSeries = useCallback(() => getForecastSeries(granularity), [granularity])

  const [summary] = useAsync(getForecastSummary)
  const [series] = useAsync(loadSeries)
  const [categories] = useAsync(getForecastCategoryBreakdown)
  const [projections] = useAsync(getMonthlyProjections)
  const [goals] = useAsync(listGoals)

  return { summary, series, categories, projections, goals }
}
