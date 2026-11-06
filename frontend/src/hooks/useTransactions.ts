import { useCallback } from 'react'
import { getTransactionSummary, listCategories, listTransactions } from '../services/transactionService'
import type { TransactionFilters } from '../types'
import { useAsync } from './useAsync'

export function useTransactions(filters: TransactionFilters) {
  const loadTransactions = useCallback(() => listTransactions(filters), [filters])

  const [summary] = useAsync(getTransactionSummary)
  const [transactions] = useAsync(loadTransactions)
  const [categories] = useAsync(listCategories)

  return { summary, transactions, categories }
}
