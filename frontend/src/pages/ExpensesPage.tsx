import { ConfirmDialog } from '../components/ConfirmDialog'
import { RecordForm, type RecordField } from '../components/RecordForm'
import { pageError } from '../lib/errors'
import { amountToCents } from '../lib/moneyInput'
import { DataError } from '../components/DataError'
import { ArrowDown, ArrowUp, CalendarDays, CirclePlus, Pencil, Search, Trash2, Wallet } from 'lucide-react'
import { DataCell, DataRow, DataTable, type DataColumn } from '../components/DataTable'
import { IconButton } from '../components/IconButton'
import { useMemo, useState } from 'react'
import { Button } from '../components/Button'
import { Card, CardHeader } from '../components/Card'
import { CategoryBadge, TransactionTypeBadge } from '../components/CategoryBadge'
import { PageHeader } from '../components/PageHeader'
import { Select, type SelectOption } from '../components/Select'
import { StatCard } from '../components/StatCard'
import { TextField } from '../components/TextField'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { useTransactions } from '../hooks/useTransactions'
import { formatDate, formatMoney, formatMoneyChange, localTodayIso } from '../lib/format'
import type {
  Category,
  CategoryId,
  Transaction,
  TransactionFilters,
  TransactionInput,
  TransactionPeriodFilter,
  TransactionSortKey,
  TransactionTypeFilter,
} from '../types'

const searchDebounceMs = 300

const defaultFilters: Omit<TransactionFilters, 'search'> = {
  type: 'all',
  categoryId: 'all',
  period: 'all_time',
  sortBy: 'date',
  sortDirection: 'desc',
}

const typeOptions: SelectOption<TransactionTypeFilter>[] = [
  { value: 'all', label: 'All types' },
  { value: 'income', label: 'Income' },
  { value: 'expense', label: 'Expense' },
]

const periodOptions: SelectOption<TransactionPeriodFilter>[] = [
  { value: 'all_time', label: 'All time' },
  { value: 'this_week', label: 'This week' },
  { value: 'this_month', label: 'This month' },
  { value: 'last_month', label: 'Last month' },
  { value: 'this_term', label: 'This term' },
]

const columns: DataColumn<TransactionSortKey | 'actions'>[] = [
  { key: 'date', label: 'Date', sort: 'range', className: 'w-[15%]' },
  { key: 'description', label: 'Description', sort: 'menu', className: 'w-[23%]' },
  { key: 'category', label: 'Category', sort: 'menu', className: 'w-[19%]' },
  { key: 'type', label: 'Type', sort: 'menu', className: 'w-[15%]' },
  { key: 'amount', label: 'Amount', sort: 'range', className: 'w-[16%]' },
  { key: 'actions', label: 'Actions' },
]

function categoryOptions(categories: Category[]): SelectOption<CategoryId | 'all'>[] {
  return [{ value: 'all', label: 'All categories' }, ...categories.map((category) => ({ value: category.id, label: category.name }))]
}

interface TransactionRowProps {
  transaction: Transaction
  onEditTransaction: (transaction: Transaction) => void
  onDeleteTransaction: (transaction: Transaction) => void
}

function TransactionRow({ transaction, onEditTransaction, onDeleteTransaction }: TransactionRowProps) {
  function onEditClick() {
    onEditTransaction(transaction)
  }

  function onDeleteClick() {
    onDeleteTransaction(transaction)
  }

  return (
    <DataRow>
      <DataCell>{formatDate(transaction.date)}</DataCell>
      <DataCell>{transaction.description}</DataCell>
      <DataCell>
        <CategoryBadge category={transaction.category} />
      </DataCell>
      <DataCell>
        <TransactionTypeBadge type={transaction.type} />
      </DataCell>
      <DataCell className={`font-medium ${transaction.amountCents < 0 ? 'text-danger' : 'text-success'}`}>
        {formatMoney(transaction.amountCents)}
      </DataCell>
      <DataCell>
        <div className="flex gap-4">
          <IconButton icon={Pencil} label={`Edit ${transaction.description}`} onClick={onEditClick} />
          <IconButton icon={Trash2} label={`Delete ${transaction.description}`} tone="danger" onClick={onDeleteClick} />
        </div>
      </DataCell>
    </DataRow>
  )
}

export function ExpensesPage() {
  const [searchText, setSearchText] = useState('')
  const [filterChoices, setFilters] = useState(defaultFilters)
  const search = useDebouncedValue(searchText, searchDebounceMs)
  const filters = useMemo<TransactionFilters>(() => ({ ...filterChoices, search }), [filterChoices, search])
  const [editing, setEditing] = useState<Transaction | null | undefined>(undefined)
  const [deleting, setDeleting] = useState<Transaction | null>(null)
  const { summary, transactions, categories, error, mutationError, clearMutationError, addTransaction, editTransaction, deleteTransaction } = useTransactions(filters)
  const editableCategories = editing && !categories?.some((c) => c.id === editing.category.id)
    ? [...(categories ?? []), editing.category] : (categories ?? [])

  function onSearchChange(text: string) {
    setSearchText(text)
  }

  function onTypeFilterChange(type: TransactionTypeFilter) {
    setFilters((current) => ({ ...current, type }))
  }

  function onCategoryFilterChange(categoryId: CategoryId | 'all') {
    setFilters((current) => ({ ...current, categoryId }))
  }

  function onPeriodFilterChange(period: TransactionPeriodFilter) {
    setFilters((current) => ({ ...current, period }))
  }

  function onSortTableChange(key: TransactionSortKey | 'actions') {
    if (key !== 'actions') onSortChange(key)
  }

  function onSortChange(sortBy: TransactionSortKey) {
    setFilters((current) => ({
      ...current,
      sortBy,
      sortDirection: current.sortBy === sortBy && current.sortDirection === 'desc' ? 'asc' : 'desc',
    }))
  }

  function onAddExpense() {
    clearMutationError()
    setEditing(null)
  }

  function onEditTransaction(transaction: Transaction) {
    clearMutationError()
    setEditing(transaction)
  }

  function onCloseTransactionForm() {
    clearMutationError()
    setEditing(undefined)
  }

  function onSaveTransaction(values: Record<string, string>) {
    const type = values.type as 'income' | 'expense'
    const input: TransactionInput = {
      date: values.date,
      description: values.description,
      note: values.note,
      categoryId: values.categoryId,
      type,
      amountCents: amountToCents(values.amount) * (type === 'expense' ? -1 : 1),
    }
    return editing ? editTransaction(editing.id, input) : addTransaction(input)
  }

  function onDeleteTransaction(transaction: Transaction) {
    clearMutationError()
    setDeleting(transaction)
  }

  function onConfirmDeleteTransaction() {
    return deleting ? deleteTransaction(deleting.id) : false
  }

  function onCloseDeleteConfirm() {
    clearMutationError()
    setDeleting(null)
  }

  const transactionFields: RecordField[] = [
    { name: 'date', label: 'Date', type: 'date', half: true },
    { name: 'amount', label: 'Amount (CAD)', type: 'number', half: true },
    { name: 'description', label: 'Description / income source' },
    { name: 'type', label: 'Type', options: [{ value: 'expense', label: 'Expense' }, { value: 'income', label: 'Income' }], half: true },
    { name: 'categoryId', label: 'Category', options: editableCategories.map((c) => ({ value: c.id, label: c.name })), half: true },
    { name: 'note', label: 'Note (optional)', required: false, maxLength: 1000 },
  ]

  return (
    <div>
      <PageHeader title="Expenses" subtitle="View, add and manage your income and expenses." />
      <DataError error={pageError(error, mutationError, editing !== undefined || deleting !== null)} />

      {editing !== undefined && (
        <RecordForm
          title={editing ? 'Edit transaction' : 'Add transaction'}
          initial={{
            date: editing?.date ?? localTodayIso(),
            description: editing?.description ?? '',
            note: editing?.note ?? '',
            categoryId: editing?.category.id ?? 'other',
            type: editing?.type ?? 'expense',
            amount: editing ? (Math.abs(editing.amountCents) / 100).toFixed(2) : '',
          }}
          fields={transactionFields}
          error={mutationError}
          onClose={onCloseTransactionForm}
          onSave={onSaveTransaction}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Delete transaction?"
          message={`"${deleting.description}" will be removed from your history. This cannot be undone.`}
          confirmLabel="Delete"
          busyLabel="Deleting…"
          variant="danger"
          error={mutationError}
          onConfirm={onConfirmDeleteTransaction}
          onClose={onCloseDeleteConfirm}
        />
      )}
      {summary && (
        <div className="mt-6 grid grid-cols-3 gap-5">
          <StatCard
            tone="success"
            icon={ArrowUp}
            label="Total income"
            value={formatMoney(summary.totalIncomeCents)}
            caption={
              <span className="text-success">
                {formatMoneyChange(summary.incomeChangeCents)} <span>{summary.incomeChangeLabel}</span>
              </span>
            }
          />
          <StatCard
            tone="danger"
            icon={ArrowDown}
            label="Total expenses"
            value={formatMoney(summary.totalExpensesCents)}
            caption={
              <span className="text-danger">
                {formatMoneyChange(summary.expensesChangeCents)} {summary.expensesChangeLabel}
              </span>
            }
          />
          <StatCard
            tone="accent"
            icon={Wallet}
            label="Remaining balance"
            value={formatMoney(summary.remainingBalanceCents)}
            caption={`To spend until ${formatDate(summary.periodEnd, 'monthDay')}`}
          />
        </div>
      )}

      <Card className="mt-5 px-4 pt-5 pb-1">
        <div className="px-4">
          <CardHeader
            title="Transaction history"
            subtitle="View and manage all of your income and expenses."
            action={
              <Button icon={CirclePlus} onClick={onAddExpense} className="px-5 py-3 text-[15px]">
                Add transaction
              </Button>
            }
          />
        </div>

        <div className="mt-6 flex gap-4 px-2">
          <TextField
            ariaLabel="Search transactions"
            type="search"
            placeholder="Search transactions..."
            value={searchText}
            onValueChange={onSearchChange}
            icon={Search}
            size="md"
            className="flex-1"
          />
          <Select label="Type" value={filters.type} options={typeOptions} onChange={onTypeFilterChange} className="w-44" />
          <Select
            label="Category"
            value={filters.categoryId}
            options={categoryOptions(categories ?? [])}
            onChange={onCategoryFilterChange}
            className="w-52"
          />
          <Select label="Period" value={filters.period} options={periodOptions} onChange={onPeriodFilterChange} icon={CalendarDays} className="w-48" />
        </div>

        <DataTable
          columns={columns}
          onSortChange={onSortTableChange}
          loading={!transactions && !error}
          failed={!transactions && Boolean(error)}
          empty={transactions?.length === 0}
          emptyMessage="No transactions yet. Add income or an expense to get started."
          className="mt-5"
        >
          {transactions?.map((transaction) => (
            <TransactionRow
              key={transaction.id}
              transaction={transaction}
              onEditTransaction={onEditTransaction}
              onDeleteTransaction={onDeleteTransaction}
            />
          ))}
        </DataTable>
      </Card>
    </div>
  )
}
