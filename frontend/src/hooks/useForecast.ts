import { useCallback } from 'react'
import { getForecastCategoryBreakdown, getForecastSeries, getForecastSummary, getMonthlyBreakdown } from '../services/forecastService'
import { createGoal, listGoals, removeGoal, updateGoal } from '../services/goalService'
import type { BudgetGoalInput, ForecastGranularity } from '../types'
import { useAsync } from './useAsync'
import { useMutation } from './useMutation'

export function useForecast(granularity: ForecastGranularity) {
  const loadSeries = useCallback(() => getForecastSeries(granularity), [granularity])

  const summary = useAsync(getForecastSummary)
  const series = useAsync(loadSeries)
  const categories = useAsync(getForecastCategoryBreakdown)
  const breakdown = useAsync(getMonthlyBreakdown)
  const goals = useAsync(listGoals)
  const { run, error: mutationError } = useMutation()

  const reloadGoals = goals.reload

  const addGoal = useCallback((input: BudgetGoalInput) => run(() => createGoal(input), { onSuccess: reloadGoals }), [run, reloadGoals])

  const editGoal = useCallback(
    (id: string, input: BudgetGoalInput) => run(() => updateGoal(id, input), { onSuccess: reloadGoals }),
    [run, reloadGoals],
  )

  const deleteGoal = useCallback((id: string) => run(() => removeGoal(id), { onSuccess: reloadGoals }), [run, reloadGoals])

  return {
    summary: summary.data,
    series: series.data,
    categories: categories.data,
    breakdown: breakdown.data,
    goals: goals.data,
    error: summary.error ?? series.error ?? categories.error ?? breakdown.error ?? goals.error ?? mutationError,
    addGoal,
    editGoal,
    deleteGoal,
  }
}
