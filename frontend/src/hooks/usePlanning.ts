// Connects planning data and mutations to React without putting API calls in page components.
import { useCallback } from 'react'
import * as service from '../services/planningService'
import { useAsync } from './useAsync'
import { useMutation } from './useMutation'
import { useReloadOnGeneratedTransactions } from './useReloadOnGeneratedTransactions'
import type { CategoryBudget, RecurringEntry, SemesterPlan, Bursary, StudentFee } from '../types/planning'
export function useBudgets() {
  const resource = useAsync(service.getBudgets)
  useReloadOnGeneratedTransactions(resource.reload)
  const { run, error: mutationError, clearError: clearMutationError } = useMutation()
  const write = useCallback((action: () => Promise<unknown>) => run(action, { onSuccess: resource.reload }), [run, resource.reload])
  return { data: resource.data, error: resource.error ?? mutationError, mutationError, clearMutationError,
    save: (value: Omit<CategoryBudget, 'id'>) => write(() => service.saveBudget(value)), remove: (id: string) => write(() => service.deleteBudget(id)),
    addCategory: (name: string) => write(() => service.addCategory(name)), removeCategory: (id: string) => write(() => service.deleteCategory(id)) }
}
export function useRecurring() {
  const resource = useAsync(service.getRecurring)
  const categories = useAsync(service.getBudgets)
  const { run, error: mutationError, clearError: clearMutationError } = useMutation()
  const write = useCallback((action: () => Promise<unknown>) => run(action, { onSuccess: resource.reload }), [run, resource.reload])
  return { data: resource.data, categories: categories.data?.categories ?? [], error: resource.error ?? categories.error ?? mutationError, mutationError, clearMutationError,
    save: (id: string | null, value: Omit<RecurringEntry, 'id'>) => write(() => service.saveRecurring(id, value)), remove: (id: string) => write(() => service.deleteRecurring(id)),
    /** Generates due entries. Resolves to how many were created, or null if the request failed. */
    sync: async () => {
      let created = 0
      const ok = await run(service.syncRecurring, { onSuccess: (result) => { created = result.created; resource.reload() } })
      return ok ? created : null
    } }
}
export function useSemester() {
  const resource = useAsync(service.getSemester)
  // Loaded once with the page. A failure only means the plan form falls back to free-text fields, so it is not a page error.
  const rates = useAsync(service.getTuitionRates)
  const { run, error: mutationError, clearError: clearMutationError } = useMutation()
  const write = useCallback((action: () => Promise<unknown>) => run(action, { onSuccess: resource.reload }), [run, resource.reload])
  return { data: resource.data, error: resource.error ?? mutationError, mutationError, clearMutationError,
    /** Tuition rates, or undefined while loading or when they could not be loaded. */
    rates: rates.data,
    savePlan: (v: SemesterPlan) => write(() => service.saveSemester(v)),
    saveBursary: (id: string | null, v: Omit<Bursary, 'id'>) => write(() => service.saveBursary(id, v)), removeBursary: (id: string) => write(() => service.deleteBursary(id)),
    saveFee: (id: string | null, v: Omit<StudentFee, 'id'>) => write(() => service.saveFee(id, v)), removeFee: (id: string) => write(() => service.deleteFee(id)) }
}
