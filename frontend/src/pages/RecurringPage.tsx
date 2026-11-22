import { useState } from 'react'
import { useRecurring } from '../hooks/usePlanning'
import { PageHeader } from '../components/PageHeader'
import { Card } from '../components/Card'
import { Button } from '../components/Button'
import { DataError } from '../components/DataError'
import { RecordForm, type RecordField } from '../components/RecordForm'
import { pageError } from '../lib/errors'
import { amountToCents } from '../lib/moneyInput'
import { formatLabel, formatMoney, localTodayIso } from '../lib/format'
import type { RecurringEntry } from '../types/planning'
export function RecurringPage() {
  const { data, categories, error, mutationError, clearMutationError, save, remove, sync } = useRecurring()
  const [editing, setEditing] = useState<RecurringEntry | null | undefined>()
  const editableCategories = editing && !categories.some(c => c.id === editing.categoryId)
    ? [...categories, { id: editing.categoryId, name: `${editing.categoryId} (archived)` }] : categories
  const fields: RecordField[] = [
    { name: 'description', label: 'Description / income source' },
    { name: 'type', label: 'Type', options: ['expense', 'income'].map(value => ({ value, label: formatLabel(value) })), half: true },
    { name: 'categoryId', label: 'Category', options: editableCategories.map(c => ({ value: c.id, label: c.name })), half: true },
    { name: 'amount', label: 'Amount (CAD)', type: 'number', half: true },
    { name: 'frequency', label: 'Frequency', options: ['weekly', 'monthly'].map(value => ({ value, label: formatLabel(value) })), half: true },
    { name: 'startDate', label: 'First date', type: 'date', half: true }, { name: 'endDate', label: 'Last date (optional)', type: 'date', required: false, half: true },
    { name: 'active', label: 'Status', options: [{ value: 'true', label: 'Active' }, { value: 'false', label: 'Paused' }] },
  ]

  function onAddEntry() {
    clearMutationError()
    setEditing(null)
  }

  function onEditEntry(row: RecurringEntry) {
    clearMutationError()
    setEditing(row)
  }

  function onCloseEntryForm() {
    clearMutationError()
    setEditing(undefined)
  }

  function onSaveEntry(v: Record<string, string>) {
    return save(editing?.id ?? null, { description: v.description, categoryId: v.categoryId, type: v.type as 'income' | 'expense', amountCents: amountToCents(v.amount) * (v.type === 'expense' ? -1 : 1), startDate: v.startDate, endDate: v.endDate || null, frequency: v.frequency as 'weekly' | 'monthly', active: v.active === 'true' })
  }

  function onDeleteEntry() {
    return editing ? remove(editing.id) : Promise.resolve(false)
  }

  function onProcessDueEntries() {
    return sync()
  }

  return <div><PageHeader title="Recurring entries" subtitle="Generate regular bills and paycheques. Due entries are processed when you sign in or click Process due entries." /><DataError error={pageError(error, mutationError, editing !== undefined)} />
    <div className="my-5 flex gap-3"><Button disabled={!categories.length} onClick={onAddEntry}>Add recurring entry</Button><Button variant="outline" onClick={onProcessDueEntries}>Process due entries</Button></div>
    {editing !== undefined && <RecordForm title={editing ? 'Edit recurring entry' : 'Add recurring entry'} initial={{ description: editing?.description ?? '', categoryId: editing?.categoryId ?? 'other', type: editing?.type ?? 'expense', amount: editing ? (Math.abs(editing.amountCents) / 100).toFixed(2) : '', startDate: editing?.startDate ?? localTodayIso(), endDate: editing?.endDate ?? '', frequency: editing?.frequency ?? 'monthly', active: editing?.active === false ? 'false' : 'true' }} fields={fields}
      error={mutationError} deleteMessage="The schedule will be removed. Transactions it already created are kept." onClose={onCloseEntryForm} onDelete={editing ? onDeleteEntry : undefined} onSave={onSaveEntry} />}
    <Card className="p-6">{data?.length === 0 && <p>No recurring entries yet.</p>}<ul>{data?.map(row => <li key={row.id} className="flex items-center justify-between border-b border-line py-4"><div><strong>{row.description}</strong><p className="text-muted">{formatMoney(row.amountCents)} / {row.frequency} from {row.startDate} {row.active ? '' : '(paused)'}</p></div><Button variant="outline" onClick={() => onEditEntry(row)}>Edit</Button></li>)}</ul></Card>
  </div>
}
