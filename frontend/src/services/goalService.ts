import { apiClient } from '../lib/apiClient'
import type { BudgetGoal, BudgetGoalInput } from '../types'
export const listGoals = () => apiClient.get<BudgetGoal[]>('/goals')
export const createGoal = (input: BudgetGoalInput) => apiClient.post<void>('/goals', input)
export const updateGoal = (id: string, input: BudgetGoalInput) => apiClient.put<void>(`/goals/${encodeURIComponent(id)}`, input)
export const removeGoal = (id: string) => apiClient.delete<void>(`/goals/${encodeURIComponent(id)}`)
