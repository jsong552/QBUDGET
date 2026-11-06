import { useCallback } from 'react'
import {
  createTransaction,
  getTransactionSummary,
  listCategories,
  listTransactions,
  removeTransaction,
  updateTransaction,
} from '../services/transactionService'
import type { TransactionFilters, TransactionInput } from '../types'
import { useAsync } from './useAsync'
import { useMutation } from './useMutation'

export function useTransactions(filters: TransactionFilters) {
  const loadTransactions = useCallback(() => listTransactions(filters), [filters])

  const summary = useAsync(getTransactionSummary)
  const transactions = useAsync(loadTransactions)
  const categories = useAsync(listCategories)
  const { run, error: mutationError } = useMutation()

  const reloadSummary = summary.reload
  const reloadTransactions = transactions.reload

  /** A transaction change affects the list and the summary cards. */
  const reloadAfterChange = useCallback(() => {
    reloadTransactions()
    reloadSummary()
  }, [reloadTransactions, reloadSummary])

  const addTransaction = useCallback(
    (input: TransactionInput) => run(() => createTransaction(input), { onSuccess: reloadAfterChange }),
    [run, reloadAfterChange],
  )

  const editTransaction = useCallback(
    (id: string, input: TransactionInput) => run(() => updateTransaction(id, input), { onSuccess: reloadAfterChange }),
    [run, reloadAfterChange],
  )

  const deleteTransaction = useCallback(
    (id: string) => run(() => removeTransaction(id), { onSuccess: reloadAfterChange }),
    [run, reloadAfterChange],
  )

  return {
    summary: summary.data,
    transactions: transactions.data,
    categories: categories.data,
    error: summary.error ?? transactions.error ?? categories.error ?? mutationError,
    addTransaction,
    editTransaction,
    deleteTransaction,
  }
}
