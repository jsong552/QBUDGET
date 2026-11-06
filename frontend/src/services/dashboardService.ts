import { mockDashboardSummary, mockMonthCategoryBreakdown, mockSpendingActivity } from '../data/mockData'
import type { ActivityRange, CategoryBreakdown, DashboardSummary, SpendingActivity } from '../types'
import { mockResponse } from './mock'

// BACKEND: GET /api/dashboard/summary
export function getDashboardSummary(): Promise<DashboardSummary> {
  return mockResponse(mockDashboardSummary)
}

// BACKEND: GET /api/dashboard/activity?range={week|month|term}
// The mock returns the same series for every range.
export function getSpendingActivity(range: ActivityRange): Promise<SpendingActivity> {
  return mockResponse({ ...mockSpendingActivity, range })
}

// BACKEND: GET /api/dashboard/categories?period=month
export function getMonthCategoryBreakdown(): Promise<CategoryBreakdown> {
  return mockResponse(mockMonthCategoryBreakdown)
}
