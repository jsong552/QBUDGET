// Connects planning data and mutations to React without putting API calls in page components.
import { useCallback } from 'react'
import * as service from '../services/planningService'
import { useAsync } from './useAsync'
import { useMutation } from './useMutation'
import type { CategoryBudget, RecurringEntry, SemesterPlan, Bursary, StudentFee } from '../types/planning'
export function useBudgets() {
  const resource = useAsync(service.getBudgets)
  const { run, error: mutationError } = useMutation()
  const write = useCallback((action: () => Promise<unknown>) => run(action, { onSuccess: resource.reload }), [run, resource.reload])
  return { data: resource.data, error: resource.error ?? mutationError,
    save: (value: Omit<CategoryBudget, 'id'>) => write(() => service.saveBudget(value)), remove: (id: string) => write(() => service.deleteBudget(id)),
    addCategory: (name: string) => write(() => service.addCategory(name)), removeCategory: (id: string) => write(() => service.deleteCategory(id)) }
}
export function useRecurring() {
  const resource = useAsync(service.getRecurring)
  const categories = useAsync(service.getBudgets)
  const { run, error: mutationError } = useMutation()
  const write = useCallback((action: () => Promise<unknown>) => run(action, { onSuccess: resource.reload }), [run, resource.reload])
  return { data: resource.data, categories: categories.data?.categories ?? [], error: resource.error ?? categories.error ?? mutationError,
    save: (id: string | null, value: Omit<RecurringEntry, 'id'>) => write(() => service.saveRecurring(id, value)), remove: (id: string) => write(() => service.deleteRecurring(id)), sync: () => write(service.syncRecurring) }
}
export function useSemester() {
  const resource = useAsync(service.getSemester)
  const { run, error: mutationError } = useMutation()
  const write = useCallback((action: () => Promise<unknown>) => run(action, { onSuccess: resource.reload }), [run, resource.reload])
  return { data: resource.data, error: resource.error ?? mutationError,
    savePlan: (v: SemesterPlan) => write(() => service.saveSemester(v)),
    saveBursary: (id: string | null, v: Omit<Bursary, 'id'>) => write(() => service.saveBursary(id, v)), removeBursary: (id: string) => write(() => service.deleteBursary(id)),
    saveFee: (id: string | null, v: Omit<StudentFee, 'id'>) => write(() => service.saveFee(id, v)), removeFee: (id: string) => write(() => service.deleteFee(id)) }
}
