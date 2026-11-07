import { mockCategories, mockTransactionSummary, mockTransactions } from '../data/mockData'
import type { Category, Transaction, TransactionFilters, TransactionInput, TransactionSummary } from '../types'
import { mockMutation, mockResponse } from './mock'

// BACKEND: GET /api/transactions/summary
export function getTransactionSummary(): Promise<TransactionSummary> {
  return mockResponse(mockTransactionSummary)
}

// BACKEND: GET /api/transactions?search=&type=&category=&period=&sort=&direction=
// Filtering and sorting happen on the server; the mock always returns the full list.
export function listTransactions(filters: TransactionFilters): Promise<Transaction[]> {
  console.info('[mock] listTransactions', filters)
  return mockResponse(mockTransactions)
}

// BACKEND: GET /api/categories
export function listCategories(): Promise<Category[]> {
  return mockResponse(mockCategories)
}

// BACKEND: POST /api/transactions
export function createTransaction(input: TransactionInput): Promise<void> {
  return mockMutation('createTransaction', input)
}

// BACKEND: PUT /api/transactions/{id}
export function updateTransaction(id: string, input: TransactionInput): Promise<void> {
  return mockMutation('updateTransaction', { id, ...input })
}

// BACKEND: DELETE /api/transactions/{id}
export function removeTransaction(id: string): Promise<void> {
  return mockMutation('removeTransaction', { id })
}
