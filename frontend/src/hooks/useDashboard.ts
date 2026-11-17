import { useCallback } from 'react'
import { getDashboard } from '../services/dashboardService'
import type { ActivityRange } from '../types'
import { useAsync } from './useAsync'
export function useDashboard(range: ActivityRange) {
  const load = useCallback(() => getDashboard(range), [range])
  const view = useAsync(load)
  return { summary: view.data?.summary, activity: view.data?.activity, categories: view.data?.categories, error: view.error }
}
