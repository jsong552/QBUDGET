import { useState } from 'react'
import { useBudgets } from '../hooks/usePlanning'
import { PageHeader } from '../components/PageHeader'
import { Card } from '../components/Card'
import { Button } from '../components/Button'
import { DataError } from '../components/DataError'
import { RecordForm } from '../components/RecordForm'
import { amountToCents } from '../lib/moneyInput'
import { formatMoney } from '../lib/format'
import type { BudgetPeriod, CategoryBudget } from '../types/planning'
export function BudgetsPage() {
  const { data, error, save, remove, addCategory, removeCategory } = useBudgets()
  const [editing, setEditing] = useState<CategoryBudget | null | undefined>()
  const [categoryForm, setCategoryForm] = useState(false)
  return <div><PageHeader title="Category budgets" subtitle="Set weekly, monthly, or semester limits. History is retained when a new period starts." /><DataError error={error} />
    <div className="my-5 flex gap-3"><Button onClick={() => setEditing(null)} disabled={!data?.categories.length}>Set category budget</Button><Button variant="outline" onClick={() => setCategoryForm(true)}>Add category</Button></div>
    {editing !== undefined && <RecordForm title="Set category budget" initial={{ categoryId: editing?.categoryId ?? data?.categories[0]?.id ?? '', period: editing?.period ?? 'monthly', amount: editing ? (editing.amountCents / 100).toFixed(2) : '' }} fields={[
      { name: 'categoryId', label: 'Category', options: (data?.categories ?? []).map(c => ({ value: c.id, label: c.name })) },
      { name: 'period', label: 'Period', options: ['weekly', 'monthly', 'semester'].map(value => ({ value, label: value })) },
      { name: 'amount', label: 'Budget (CAD)', type: 'number' },
    ]} onClose={() => setEditing(undefined)} onDelete={editing ? () => remove(editing.id) : undefined} onSave={v => save({ categoryId: v.categoryId, period: v.period as BudgetPeriod, amountCents: amountToCents(v.amount) })} />}
    {categoryForm && <RecordForm title="Add category" fields={[{ name: 'name', label: 'Name' }]} initial={{ name: '' }} onSave={v => addCategory(v.name)} onClose={() => setCategoryForm(false)} />}
    <Card className="p-6"><h2 className="text-xl font-bold">Current periods</h2>
      {data?.summaries.length === 0 && <p className="mt-4 text-muted">No category budgets set yet.</p>}
      <table className="mt-4 w-full text-left"><thead><tr><th>Category / period</th><th>Budget</th><th>Spent</th><th>Remaining</th><th>Action</th></tr></thead><tbody>
        {data?.summaries.map(item => <tr key={`${item.category.id}-${item.period}`} className="border-t border-line"><td className="py-4">{item.category.name}<div className="text-sm text-muted">{item.period}: {item.startDate} to {item.endDate} (exclusive)</div></td><td>{formatMoney(item.budgetedCents)}</td><td>{formatMoney(item.spentCents)}</td><td className={item.overBudget ? 'text-danger' : 'text-success'}>{formatMoney(item.remainingCents)}{item.overBudget && <strong className="block">Over budget</strong>}</td><td><Button variant="outline" onClick={() => setEditing(data.budgets.find(b => b.categoryId === item.category.id && b.period === item.period))}>Edit</Button></td></tr>)}
      </tbody></table>
    </Card><Card className="mt-5 p-6"><h2 className="text-xl font-bold">Categories</h2><ul className="mt-3 grid grid-cols-3 gap-3">{data?.categories.map(c => <li key={c.id} className="flex items-center justify-between rounded border border-line p-3">{c.name}{c.custom && <Button variant="danger" onClick={() => { if (window.confirm(`Remove ${c.name}? Existing records keep their category.`)) void removeCategory(c.id) }}>Remove</Button>}</li>)}</ul></Card>
  </div>
}
