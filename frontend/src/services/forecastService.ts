import { mockForecastSeries, mockForecastSummary, mockMonthlyProjections, mockTermCategoryBreakdown } from '../data/mockData'
import type { CategoryBreakdown, ForecastGranularity, ForecastSeries, ForecastSummary, MonthlyProjection } from '../types'
import { mockResponse } from './mock'

// BACKEND: GET /api/forecast/summary
export function getForecastSummary(): Promise<ForecastSummary> {
  return mockResponse(mockForecastSummary)
}

// BACKEND: GET /api/forecast/series?granularity={weekly|monthly|semester}
// The mock returns the same series for every granularity.
export function getForecastSeries(granularity: ForecastGranularity): Promise<ForecastSeries> {
  return mockResponse({ ...mockForecastSeries, granularity })
}

// BACKEND: GET /api/forecast/categories
export function getForecastCategoryBreakdown(): Promise<CategoryBreakdown> {
  return mockResponse(mockTermCategoryBreakdown)
}

// BACKEND: GET /api/forecast/monthly?months=4
export function getMonthlyProjections(): Promise<MonthlyProjection[]> {
  return mockResponse(mockMonthlyProjections)
}
