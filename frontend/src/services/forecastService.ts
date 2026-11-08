import { apiClient } from '../lib/apiClient'
import type { CategoryBreakdown, ForecastGranularity, ForecastSeries, ForecastSummary, MonthlyBreakdown } from '../types'
export const getForecastSummary = () => apiClient.get<ForecastSummary>('/forecast/summary')
export const getForecastSeries = (granularity: ForecastGranularity) => apiClient.get<ForecastSeries>(`/forecast/series?granularity=${granularity}`)
export const getForecastCategoryBreakdown = () => apiClient.get<CategoryBreakdown>('/forecast/categories')
export const getMonthlyBreakdown = () => apiClient.get<MonthlyBreakdown>('/forecast/monthly')
