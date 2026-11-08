import { apiClient } from '../lib/apiClient'
import type { Category, Transaction, TransactionFilters, TransactionInput, TransactionSummary } from '../types'
export const getTransactionSummary = () => apiClient.get<TransactionSummary>('/transactions/summary')
export function listTransactions(filters: TransactionFilters) {
  const params = new URLSearchParams({ search: filters.search, type: filters.type, category: filters.categoryId, period: filters.period, sort: filters.sortBy, direction: filters.sortDirection })
  return apiClient.get<Transaction[]>(`/transactions?${params}`)
}
export const listCategories = () => apiClient.get<Category[]>('/categories')
export const createTransaction = (input: TransactionInput) => apiClient.post<void>('/transactions', input)
export const updateTransaction = (id: string, input: TransactionInput) => apiClient.put<void>(`/transactions/${encodeURIComponent(id)}`, input)
export const removeTransaction = (id: string) => apiClient.delete<void>(`/transactions/${encodeURIComponent(id)}`)
