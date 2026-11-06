import { useCallback } from 'react'
import { getDashboardSummary, getMonthCategoryBreakdown, getSpendingActivity } from '../services/dashboardService'
import type { ActivityRange } from '../types'
import { useAsync } from './useAsync'

export function useDashboard(range: ActivityRange) {
  const loadActivity = useCallback(() => getSpendingActivity(range), [range])

  const [summary] = useAsync(getDashboardSummary)
  const [activity] = useAsync(loadActivity)
  const [categories] = useAsync(getMonthCategoryBreakdown)

  return { summary, activity, categories }
}
