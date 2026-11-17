// HTTP adapter only; all planning calculations are implemented in C++.
import { apiClient } from '../lib/apiClient'
import type { BudgetData, CategoryBudget, RecurringEntry, SemesterData, SemesterPlan, Bursary, StudentFee } from '../types/planning'
export const getBudgets = () => apiClient.get<BudgetData>('/budgets')
export const saveBudget = (value: Omit<CategoryBudget, 'id'>) => apiClient.put<void>('/budgets', value)
export const deleteBudget = (id: string) => apiClient.delete<void>(`/budgets/${encodeURIComponent(id)}`)
export const addCategory = (name: string) => apiClient.post<{ id: string }>('/categories', { name })
export const deleteCategory = (id: string) => apiClient.delete<void>(`/categories/${encodeURIComponent(id)}`)
export const getRecurring = () => apiClient.get<RecurringEntry[]>('/recurring')
export const syncRecurring = () => apiClient.post<{ created: number }>('/recurring/sync', {})
export async function saveRecurring(id: string | null, value: Omit<RecurringEntry, 'id'>) {
  if (id) await apiClient.put<void>(`/recurring/${encodeURIComponent(id)}`, value)
  else await apiClient.post<void>('/recurring', value)
  await syncRecurring()
}
export const deleteRecurring = (id: string) => apiClient.delete<void>(`/recurring/${encodeURIComponent(id)}`)
export const getSemester = () => apiClient.get<SemesterData>('/semester')
export const saveSemester = (value: SemesterPlan) => apiClient.put<void>('/semester', value)
export const saveBursary = (id: string | null, value: Omit<Bursary, 'id'>) => id ? apiClient.put<void>(`/bursaries/${encodeURIComponent(id)}`, value) : apiClient.post<void>('/bursaries', value)
export const deleteBursary = (id: string) => apiClient.delete<void>(`/bursaries/${encodeURIComponent(id)}`)
export const saveFee = (id: string | null, value: Omit<StudentFee, 'id'>) => id ? apiClient.put<void>(`/fees/${encodeURIComponent(id)}`, value) : apiClient.post<void>('/fees', value)
export const deleteFee = (id: string) => apiClient.delete<void>(`/fees/${encodeURIComponent(id)}`)
