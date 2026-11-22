import { useState } from 'react'
import { useBudgets } from '../hooks/usePlanning'
import { PageHeader } from '../components/PageHeader'
import { Card } from '../components/Card'
import { Button } from '../components/Button'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { DataError } from '../components/DataError'
import { RecordForm } from '../components/RecordForm'
import { pageError } from '../lib/errors'
import { amountToCents } from '../lib/moneyInput'
import { formatLabel, formatMoney } from '../lib/format'
import type { Category } from '../types'
import type { BudgetPeriod, CategoryBudget } from '../types/planning'

const budgetPeriods: BudgetPeriod[] = ['weekly', 'monthly', 'semester']

export function BudgetsPage() {
  const { data, error, mutationError, clearMutationError, save, remove, addCategory, removeCategory } = useBudgets()
  const [editing, setEditing] = useState<CategoryBudget | null | undefined>()
  const [categoryForm, setCategoryForm] = useState(false)
  const [removingCategory, setRemovingCategory] = useState<Category | null>(null)
  const dialogOpen = editing !== undefined || categoryForm || removingCategory !== null

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

  return <div><PageHeader title="Category budgets" subtitle="Set weekly, monthly, or semester limits. History is retained when a new period starts." /><DataError error={pageError(error, mutationError, dialogOpen)} />
    <div className="my-5 flex gap-3"><Button onClick={onSetBudget} disabled={!data?.categories.length}>Set category budget</Button><Button variant="outline" onClick={onAddCategory}>Add category</Button></div>
    {editing !== undefined && <RecordForm title="Set category budget" initial={{ categoryId: editing?.categoryId ?? data?.categories[0]?.id ?? '', period: editing?.period ?? 'monthly', amount: editing ? (editing.amountCents / 100).toFixed(2) : '' }} fields={[
      { name: 'categoryId', label: 'Category', options: (data?.categories ?? []).map(c => ({ value: c.id, label: c.name })) },
      { name: 'period', label: 'Period', options: budgetPeriods.map(value => ({ value, label: formatLabel(value) })), half: true },
      { name: 'amount', label: 'Budget (CAD)', type: 'number', half: true },
    ]} error={mutationError} deleteMessage="This budget will be removed. Your transactions are kept." onClose={onCloseBudgetForm} onDelete={editing ? onDeleteBudget : undefined} onSave={onSaveBudget} />}
    {categoryForm && <RecordForm title="Add category" fields={[{ name: 'name', label: 'Name', maxLength: 80 }]} initial={{ name: '' }} error={mutationError} onSave={onSaveCategory} onClose={onCloseCategoryForm} />}
    {removingCategory && <ConfirmDialog title={`Remove ${removingCategory.name}?`} message="Existing records keep their category." confirmLabel="Remove" busyLabel="Removing…" variant="danger" error={mutationError} onConfirm={onConfirmRemoveCategory} onClose={onCloseRemoveCategory} />}
    <Card className="p-6"><h2 className="text-xl font-bold">Current periods</h2>
      {data?.summaries.length === 0 && <p className="mt-4 text-muted">No category budgets set yet.</p>}
      <table className="mt-4 w-full text-left"><thead><tr><th>Category / period</th><th>Budget</th><th>Spent</th><th>Remaining</th><th>Action</th></tr></thead><tbody>
        {data?.summaries.map(item => <tr key={`${item.category.id}-${item.period}`} className="border-t border-line"><td className="py-4">{item.category.name}<div className="text-sm text-muted">{item.period}: {item.startDate} to {item.endDate} (exclusive)</div></td><td>{formatMoney(item.budgetedCents)}</td><td>{formatMoney(item.spentCents)}</td><td className={item.overBudget ? 'text-danger' : 'text-success'}>{formatMoney(item.remainingCents)}{item.overBudget && <strong className="block">Over budget</strong>}</td><td><Button variant="outline" onClick={() => onEditBudget(item.category.id, item.period)}>Edit</Button></td></tr>)}
      </tbody></table>
    </Card><Card className="mt-5 p-6"><h2 className="text-xl font-bold">Categories</h2><ul className="mt-3 grid grid-cols-3 gap-3">{data?.categories.map(c => <li key={c.id} className="flex items-center justify-between rounded border border-line p-3">{c.name}{c.custom && <Button variant="danger" onClick={() => onRemoveCategory(c)}>Remove</Button>}</li>)}</ul></Card>
  </div>
}
