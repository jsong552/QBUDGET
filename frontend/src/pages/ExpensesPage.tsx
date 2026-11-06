import { ArrowDown, ArrowUp, CalendarDays, ChevronDown, ChevronsUpDown, CirclePlus, Pencil, Search, Trash2, Wallet } from 'lucide-react'
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
import { formatDate, formatMoney, formatMoneyChange } from '../lib/format'
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
  { value: 'this_month', label: 'This month' },
  { value: 'last_month', label: 'Last month' },
  { value: 'this_term', label: 'This term' },
]

const newExpenseDraft: TransactionInput = {
  date: '',
  description: '',
  categoryId: 'other',
  type: 'expense',
  amountCents: 0,
}

interface Column {
  key: TransactionSortKey | 'actions'
  label: string
  sort: 'range' | 'menu' | null
  className: string
}

const columns: Column[] = [
  { key: 'date', label: 'Date', sort: 'range', className: 'w-[15%]' },
  { key: 'description', label: 'Description', sort: 'menu', className: 'w-[23%]' },
  { key: 'category', label: 'Category', sort: 'menu', className: 'w-[19%]' },
  { key: 'type', label: 'Type', sort: 'menu', className: 'w-[15%]' },
  { key: 'amount', label: 'Amount', sort: 'range', className: 'w-[16%]' },
  { key: 'actions', label: 'Actions', sort: null, className: '' },
]

function toTransactionInput(transaction: Transaction): TransactionInput {
  return {
    date: transaction.date,
    description: transaction.description,
    categoryId: transaction.category.id,
    type: transaction.type,
    amountCents: transaction.amountCents,
  }
}

function categoryOptions(categories: Category[]): SelectOption<CategoryId | 'all'>[] {
  return [{ value: 'all', label: 'All categories' }, ...categories.map((category) => ({ value: category.id, label: category.name }))]
}

interface TransactionRowProps {
  transaction: Transaction
  onEditTransaction: (transaction: Transaction) => Promise<boolean>
  onDeleteTransaction: (transaction: Transaction) => Promise<boolean>
}

function TransactionRow({ transaction, onEditTransaction, onDeleteTransaction }: TransactionRowProps) {
  function onEditClick() {
    onEditTransaction(transaction)
  }

  function onDeleteClick() {
    onDeleteTransaction(transaction)
  }

  return (
    <tr className="border-b border-line text-[15px] text-ink">
      <td className="px-6 py-2.5">{formatDate(transaction.date)}</td>
      <td className="px-3 py-2.5">{transaction.description}</td>
      <td className="px-3 py-2.5">
        <CategoryBadge category={transaction.category} />
      </td>
      <td className="px-3 py-2.5">
        <TransactionTypeBadge type={transaction.type} />
      </td>
      <td className={`px-3 py-2.5 font-medium ${transaction.amountCents < 0 ? 'text-danger' : 'text-success'}`}>
        {formatMoney(transaction.amountCents)}
      </td>
      <td className="px-3 py-2.5">
        <div className="flex gap-4">
          <button
            type="button"
            aria-label={`Edit ${transaction.description}`}
            onClick={onEditClick}
            className="grid size-10 place-items-center rounded-lg border border-line-strong text-ink hover:bg-surface-muted"
          >
            <Pencil className="size-4" strokeWidth={1.75} />
          </button>
          <button
            type="button"
            aria-label={`Delete ${transaction.description}`}
            onClick={onDeleteClick}
            className="grid size-10 place-items-center rounded-lg border border-line-strong text-danger hover:bg-danger-soft"
          >
            <Trash2 className="size-4" strokeWidth={1.75} />
          </button>
        </div>
      </td>
    </tr>
  )
}

function SortHeader({ column, onSortChange }: { column: Column; onSortChange: (key: TransactionSortKey) => void }) {
  const { key, sort } = column
  if (key === 'actions' || sort === null) return <span>{column.label}</span>

  const SortIcon = sort === 'range' ? ChevronsUpDown : ChevronDown

  function onHeaderClick() {
    if (key !== 'actions') onSortChange(key)
  }

  return (
    <button type="button" onClick={onHeaderClick} className="inline-flex items-center gap-1.5 font-medium">
      {column.label}
      <SortIcon className="size-3.5" strokeWidth={2.25} />
    </button>
  )
}

export function ExpensesPage() {
  const [searchText, setSearchText] = useState('')
  const [filterChoices, setFilters] = useState(defaultFilters)
  const search = useDebouncedValue(searchText, searchDebounceMs)
  const filters = useMemo<TransactionFilters>(() => ({ ...filterChoices, search }), [filterChoices, search])
  const { summary, transactions, categories, addTransaction, editTransaction, deleteTransaction } = useTransactions(filters)

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

  function onSortChange(sortBy: TransactionSortKey) {
    setFilters((current) => ({
      ...current,
      sortBy,
      sortDirection: current.sortBy === sortBy && current.sortDirection === 'desc' ? 'asc' : 'desc',
    }))
  }

  function onAddExpense() {
    return addTransaction(newExpenseDraft)
  }

  function onEditTransaction(transaction: Transaction) {
    return editTransaction(transaction.id, toTransactionInput(transaction))
  }

  function onDeleteTransaction(transaction: Transaction) {
    return deleteTransaction(transaction.id)
  }

  return (
    <div>
      <PageHeader title="Expenses" subtitle="View, add and manage your income and expenses." />

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
                Add expense
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

        <table className="mt-5 w-full table-fixed">
          <thead>
            <tr className="bg-surface-muted text-left text-sm text-ink">
              {columns.map((column, i) => (
                <th key={column.key} className={`py-3 font-medium ${i === 0 ? 'rounded-l-lg px-6' : 'px-3'} ${column.className}`}>
                  <SortHeader column={column} onSortChange={onSortChange} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {transactions?.map((transaction) => (
              <TransactionRow
                key={transaction.id}
                transaction={transaction}
                onEditTransaction={onEditTransaction}
                onDeleteTransaction={onDeleteTransaction}
              />
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
