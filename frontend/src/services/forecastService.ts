import { apiClient } from '../lib/apiClient'
import type { BudgetGoal, CategoryBreakdown, ForecastGranularity, ForecastSeries, ForecastSummary, MonthlyBreakdown } from '../types'
export interface ForecastView {
  summary: ForecastSummary
  series: ForecastSeries
  categories: CategoryBreakdown
  breakdown: MonthlyBreakdown
  goals: BudgetGoal[]
}
export const getForecast = (granularity: ForecastGranularity) => apiClient.get<ForecastView>(`/forecast?granularity=${granularity}`)
export const getForecastSummary = () => apiClient.get<ForecastSummary>('/forecast/summary')
export const getForecastSeries = (granularity: ForecastGranularity) => apiClient.get<ForecastSeries>(`/forecast/series?granularity=${granularity}`)
export const getForecastCategoryBreakdown = () => apiClient.get<CategoryBreakdown>('/forecast/categories')
export const getMonthlyBreakdown = () => apiClient.get<MonthlyBreakdown>('/forecast/monthly')
