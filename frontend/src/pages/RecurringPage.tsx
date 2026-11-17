import { useState } from 'react'
import { useRecurring } from '../hooks/usePlanning'
import { PageHeader } from '../components/PageHeader'
import { Card } from '../components/Card'
import { Button } from '../components/Button'
import { DataError } from '../components/DataError'
import { RecordForm } from '../components/RecordForm'
import { amountToCents } from '../lib/moneyInput'
import { formatMoney } from '../lib/format'
import type { RecurringEntry } from '../types/planning'
export function RecurringPage() {
  const { data, categories, error, save, remove, sync } = useRecurring()
  const [editing, setEditing] = useState<RecurringEntry | null | undefined>()
  const editableCategories = editing && !categories.some(c => c.id === editing.categoryId)
    ? [...categories, { id: editing.categoryId, name: `${editing.categoryId} (archived)` }] : categories
  return <div><PageHeader title="Recurring entries" subtitle="Generate regular bills and paycheques. Due entries are processed when you sign in or click Process due entries." /><DataError error={error} />
    <div className="my-5 flex gap-3"><Button disabled={!categories.length} onClick={() => setEditing(null)}>Add recurring entry</Button><Button variant="outline" onClick={() => void sync()}>Process due entries</Button></div>
    {editing !== undefined && <RecordForm title={editing ? 'Edit recurring entry' : 'Add recurring entry'} initial={{ description: editing?.description ?? '', categoryId: editing?.categoryId ?? 'other', type: editing?.type ?? 'expense', amount: editing ? (Math.abs(editing.amountCents) / 100).toFixed(2) : '', startDate: editing?.startDate ?? new Date().toISOString().slice(0, 10), endDate: editing?.endDate ?? '', frequency: editing?.frequency ?? 'monthly', active: editing?.active === false ? 'false' : 'true' }} fields={[
      { name: 'description', label: 'Description / income source' }, { name: 'type', label: 'Type', options: ['expense', 'income'].map(value => ({ value, label: value })) },
      { name: 'categoryId', label: 'Category', options: editableCategories.map(c => ({ value: c.id, label: c.name })) }, { name: 'amount', label: 'Amount (CAD)', type: 'number' },
      { name: 'startDate', label: 'First date', type: 'date' }, { name: 'endDate', label: 'Last date (optional)', type: 'date', required: false },
      { name: 'frequency', label: 'Frequency', options: ['weekly', 'monthly'].map(value => ({ value, label: value })) }, { name: 'active', label: 'Status', options: [{ value: 'true', label: 'Active' }, { value: 'false', label: 'Paused' }] },
    ]} onClose={() => setEditing(undefined)} onDelete={editing ? () => remove(editing.id) : undefined} onSave={v => save(editing?.id ?? null, { description: v.description, categoryId: v.categoryId, type: v.type as 'income' | 'expense', amountCents: amountToCents(v.amount) * (v.type === 'expense' ? -1 : 1), startDate: v.startDate, endDate: v.endDate || null, frequency: v.frequency as 'weekly' | 'monthly', active: v.active === 'true' })} />}
    <Card className="p-6">{data?.length === 0 && <p>No recurring entries yet.</p>}<ul>{data?.map(row => <li key={row.id} className="flex items-center justify-between border-b border-line py-4"><div><strong>{row.description}</strong><p className="text-muted">{formatMoney(row.amountCents)} / {row.frequency} from {row.startDate} {row.active ? '' : '(paused)'}</p></div><Button variant="outline" onClick={() => setEditing(row)}>Edit</Button></li>)}</ul></Card>
  </div>
}
