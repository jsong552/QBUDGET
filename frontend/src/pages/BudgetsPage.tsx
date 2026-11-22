import { useState } from 'react'
import { ArrowDown, CirclePlus, Pencil, PiggyBank, Trash2, Wallet } from 'lucide-react'
import { useBudgets } from '../hooks/usePlanning'
import { PageHeader } from '../components/PageHeader'
import { Card, CardHeader } from '../components/Card'
import { Button } from '../components/Button'
import { CategoryBadge } from '../components/CategoryBadge'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { DataCell, DataRow, DataTable, type DataColumn } from '../components/DataTable'
import { DataError } from '../components/DataError'
import { IconButton } from '../components/IconButton'
import { ProgressBar } from '../components/ProgressBar'
import { RecordForm } from '../components/RecordForm'
import { StatCard } from '../components/StatCard'
import { StatusBadge } from '../components/StatusBadge'
import { pageError } from '../lib/errors'
import { amountToCents } from '../lib/moneyInput'
import { formatDateRange, formatLabel, formatMoney } from '../lib/format'
import type { Category } from '../types'
import type { BudgetPeriod, BudgetSummary, CategoryBudget } from '../types/planning'

const budgetPeriods: BudgetPeriod[] = ['weekly', 'monthly', 'semester']

const budgetColumns: DataColumn[] = [
  { key: 'category', label: 'Category', className: 'w-[14%]' },
  { key: 'period', label: 'Period', className: 'w-[9%]' },
  { key: 'dates', label: 'Dates', className: 'w-[16%]' },
  { key: 'budget', label: 'Budget', className: 'w-[10%]' },
  { key: 'spent', label: 'Spent', className: 'w-[10%]' },
  { key: 'remaining', label: 'Remaining', className: 'w-[11%]' },
  { key: 'progress', label: 'Progress', className: 'w-[11%]' },
  { key: 'status', label: 'Status', className: 'w-[11%]' },
  { key: 'actions', label: 'Actions' },
]

function spentPercent(item: BudgetSummary): number {
  return item.budgetedCents > 0 ? (item.spentCents / item.budgetedCents) * 100 : 0
}

function sumCents(summaries: BudgetSummary[], field: 'budgetedCents' | 'spentCents' | 'remainingCents'): number {
  return summaries.reduce((total, item) => total + item[field], 0)
}

interface BudgetRowProps {
  item: BudgetSummary
  onEditBudget: (categoryId: string, period: BudgetPeriod) => void
}

function BudgetRow({ item, onEditBudget }: BudgetRowProps) {
  const over = item.overBudget || item.remainingCents < 0

  function onEditClick() {
    onEditBudget(item.category.id, item.period)
  }

  return (
    <DataRow>
      <DataCell>
        <CategoryBadge category={item.category} />
      </DataCell>
      <DataCell>{formatLabel(item.period)}</DataCell>
      <DataCell className="text-sm text-muted">{formatDateRange(item.startDate, item.endDate)}</DataCell>
      <DataCell>{formatMoney(item.budgetedCents)}</DataCell>
      <DataCell>{formatMoney(item.spentCents)}</DataCell>
      <DataCell className={`font-medium ${over ? 'text-danger' : 'text-success'}`}>{formatMoney(item.remainingCents)}</DataCell>
      <DataCell>
        <ProgressBar percent={spentPercent(item)} tone={item.overBudget ? 'danger' : 'primary'} />
      </DataCell>
      <DataCell>
        <StatusBadge status={item.overBudget ? 'over_budget' : 'on_track'} />
      </DataCell>
      <DataCell>
        <IconButton icon={Pencil} label={`Edit ${item.category.name} ${item.period} budget`} onClick={onEditClick} />
      </DataCell>
    </DataRow>
  )
}

interface CategoryItemProps {
  category: Category
  onRemoveCategory: (category: Category) => void
}

function CategoryItem({ category, onRemoveCategory }: CategoryItemProps) {
  function onRemoveClick() {
    onRemoveCategory(category)
  }

  return (
    <li className="flex items-center gap-2">
      <CategoryBadge category={category} />
      {category.custom && <IconButton icon={Trash2} label={`Remove ${category.name}`} tone="danger" onClick={onRemoveClick} />}
    </li>
  )
}

export function BudgetsPage() {
  const { data, error, mutationError, clearMutationError, save, remove, addCategory, removeCategory } = useBudgets()
  const [editing, setEditing] = useState<CategoryBudget | null | undefined>()
  const [categoryForm, setCategoryForm] = useState(false)
  const [removingCategory, setRemovingCategory] = useState<Category | null>(null)
  const dialogOpen = editing !== undefined || categoryForm || removingCategory !== null
  const summaries = data?.summaries ?? []
  const overBudgetCount = summaries.filter((item) => item.overBudget).length

  function onSetBudget() {
    clearMutationError()
    setEditing(null)
  }

  function onEditBudget(categoryId: string, period: BudgetPeriod) {
    clearMutationError()
    setEditing(data?.budgets.find((budget) => budget.categoryId === categoryId && budget.period === period))
  }

  function onCloseBudgetForm() {
    clearMutationError()
    setEditing(undefined)
  }

  function onSaveBudget(values: Record<string, string>) {
    return save({ categoryId: values.categoryId, period: values.period as BudgetPeriod, amountCents: amountToCents(values.amount) })
  }

  function onDeleteBudget() {
    return editing ? remove(editing.id) : Promise.resolve(false)
  }

  function onAddCategory() {
    clearMutationError()
    setCategoryForm(true)
  }

  function onCloseCategoryForm() {
    clearMutationError()
    setCategoryForm(false)
  }

  function onSaveCategory(values: Record<string, string>) {
    return addCategory(values.name)
  }

  function onRemoveCategory(category: Category) {
    clearMutationError()
    setRemovingCategory(category)
  }

  function onConfirmRemoveCategory() {
    return removingCategory ? removeCategory(removingCategory.id) : false
  }

  function onCloseRemoveCategory() {
    clearMutationError()
    setRemovingCategory(null)
  }

  return (
    <div>
      <PageHeader title="Category budgets" subtitle="Set weekly, monthly, or semester limits. History is retained when a new period starts." />
      <DataError error={pageError(error, mutationError, dialogOpen)} />

      {editing !== undefined && <RecordForm title="Set category budget" initial={{ categoryId: editing?.categoryId ?? data?.categories[0]?.id ?? '', period: editing?.period ?? 'monthly', amount: editing ? (editing.amountCents / 100).toFixed(2) : '' }} fields={[
        { name: 'categoryId', label: 'Category', options: (data?.categories ?? []).map(c => ({ value: c.id, label: c.name })) },
        { name: 'period', label: 'Period', options: budgetPeriods.map(value => ({ value, label: formatLabel(value) })), half: true },
        { name: 'amount', label: 'Budget (CAD)', type: 'number', half: true },
      ]} error={mutationError} deleteMessage="This budget will be removed. Your transactions are kept." onClose={onCloseBudgetForm} onDelete={editing ? onDeleteBudget : undefined} onSave={onSaveBudget} />}
      {categoryForm && <RecordForm title="Add category" fields={[{ name: 'name', label: 'Name', maxLength: 80 }]} initial={{ name: '' }} error={mutationError} onSave={onSaveCategory} onClose={onCloseCategoryForm} />}
      {removingCategory && <ConfirmDialog title={`Remove ${removingCategory.name}?`} message="Existing records keep their category." confirmLabel="Remove" busyLabel="Removing…" variant="danger" error={mutationError} onConfirm={onConfirmRemoveCategory} onClose={onCloseRemoveCategory} />}

      {data && (
        <div className="mt-6 grid grid-cols-3 gap-5">
          <StatCard
            tone="primary"
            icon={PiggyBank}
            label="Total budgeted"
            value={formatMoney(sumCents(summaries, 'budgetedCents'))}
            caption={`Across ${summaries.length} active ${summaries.length === 1 ? 'budget' : 'budgets'}`}
          />
          <StatCard tone="danger" icon={ArrowDown} label="Spent" value={formatMoney(sumCents(summaries, 'spentCents'))} caption="This period" />
          <StatCard
            tone="accent"
            icon={Wallet}
            label="Remaining"
            value={formatMoney(sumCents(summaries, 'remainingCents'))}
            caption={<span className={overBudgetCount > 0 ? 'text-danger' : 'text-success'}>{overBudgetCount} over budget</span>}
          />
        </div>
      )}

      <Card className="mt-5 px-4 pt-5 pb-1">
        <div className="px-4">
          <CardHeader
            title="Current periods"
            subtitle="Spending against each category budget this period."
            action={
              <Button icon={CirclePlus} onClick={onSetBudget} disabled={!data?.categories.length} className="px-5 py-3 text-[15px]">
                Set category budget
              </Button>
            }
          />
        </div>
        <DataTable
          columns={budgetColumns}
          loading={!data && !error}
          failed={!data && Boolean(error)}
          empty={data?.summaries.length === 0}
          emptyMessage="No category budgets set yet."
          className="mt-5"
        >
          {data?.summaries.map((item) => (
            <BudgetRow key={`${item.category.id}-${item.period}`} item={item} onEditBudget={onEditBudget} />
          ))}
        </DataTable>
      </Card>

      <Card className="mt-5 px-8 pt-5 pb-6">
        <CardHeader
          title="Categories"
          subtitle="Custom categories can be removed; built-in ones stay."
          action={
            <Button variant="outline" icon={CirclePlus} onClick={onAddCategory} className="px-5 py-3 text-[15px]">
              Add category
            </Button>
          }
        />
        {!data && !error && (
          <p role="status" className="mt-5 text-[15px] text-muted">
            Loading…
          </p>
        )}
        {!data && Boolean(error) && <p className="mt-5 text-[15px] text-muted">Could not load this list.</p>}
        {data?.categories.length === 0 && <p className="mt-5 text-[15px] text-muted">No categories yet. Add one to start budgeting.</p>}
        {data && data.categories.length > 0 && (
          <ul className="mt-5 flex flex-wrap gap-3">
            {data.categories.map((category) => (
              <CategoryItem key={category.id} category={category} onRemoveCategory={onRemoveCategory} />
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
