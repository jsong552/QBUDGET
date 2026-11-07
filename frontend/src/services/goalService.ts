import { mockBudgetGoals } from '../data/mockData'
import type { BudgetGoal, BudgetGoalInput } from '../types'
import { mockMutation, mockResponse } from './mock'

// BACKEND: GET /api/goals
export function listGoals(): Promise<BudgetGoal[]> {
  return mockResponse(mockBudgetGoals)
}

// BACKEND: POST /api/goals
export function createGoal(input: BudgetGoalInput): Promise<void> {
  return mockMutation('createGoal', input)
}

// BACKEND: PUT /api/goals/{id}
export function updateGoal(id: string, input: BudgetGoalInput): Promise<void> {
  return mockMutation('updateGoal', { id, ...input })
}

// BACKEND: DELETE /api/goals/{id}
export function removeGoal(id: string): Promise<void> {
  return mockMutation('removeGoal', { id })
}
