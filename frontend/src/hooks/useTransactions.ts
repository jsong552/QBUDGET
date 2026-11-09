import { useCallback } from 'react'
import {
  createTransaction,
  getTransactionView,
  removeTransaction,
  updateTransaction,
} from '../services/transactionService'
import type { TransactionFilters, TransactionInput } from '../types'
import { useAsync } from './useAsync'
import { useMutation } from './useMutation'

export function useTransactions(filters: TransactionFilters) {
  const loadView = useCallback(() => getTransactionView(filters), [filters])
  const view = useAsync(loadView)
  const { run, error: mutationError } = useMutation()
  const reloadAfterChange = view.reload

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
    summary: view.data?.summary,
    transactions: view.data?.transactions,
    categories: view.data?.categories,
    error: view.error ?? mutationError,
    addTransaction,
    editTransaction,
    deleteTransaction,
  }
}
