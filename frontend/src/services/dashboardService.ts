import { apiClient } from '../lib/apiClient'
import type { ActivityRange, CategoryBreakdown, DashboardSummary, SpendingActivity } from '../types'
export const getDashboardSummary = () => apiClient.get<DashboardSummary>('/dashboard/summary')
export const getSpendingActivity = (range: ActivityRange) => apiClient.get<SpendingActivity>(`/dashboard/activity?range=${range}`)
export const getMonthCategoryBreakdown = () => apiClient.get<CategoryBreakdown>('/dashboard/categories')
