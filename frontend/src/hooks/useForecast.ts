import { useCallback } from 'react'
import { getForecast } from '../services/forecastService'
import { createGoal, removeGoal, updateGoal } from '../services/goalService'
import type { BudgetGoalInput, ForecastGranularity } from '../types'
import { useAsync } from './useAsync'
import { useMutation } from './useMutation'

export function useForecast(granularity: ForecastGranularity) {
  const load = useCallback(() => getForecast(granularity), [granularity])
  const resource = useAsync(load)
  const { run, error: mutationError } = useMutation()

  const reloadGoals = resource.reload

  const addGoal = useCallback((input: BudgetGoalInput) => run(() => createGoal(input), { onSuccess: reloadGoals }), [run, reloadGoals])

  const editGoal = useCallback(
    (id: string, input: BudgetGoalInput) => run(() => updateGoal(id, input), { onSuccess: reloadGoals }),
    [run, reloadGoals],
  )

  const deleteGoal = useCallback((id: string) => run(() => removeGoal(id), { onSuccess: reloadGoals }), [run, reloadGoals])

  return {
    summary: resource.data?.summary,
    series: resource.data?.series,
    categories: resource.data?.categories,
    breakdown: resource.data?.breakdown,
    goals: resource.data?.goals,
    error: resource.error ?? mutationError,
    addGoal,
    editGoal,
    deleteGoal,
  }
}
