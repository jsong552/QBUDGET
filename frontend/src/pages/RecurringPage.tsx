import { useState } from 'react'
import { CirclePlus, Pencil, RefreshCw } from 'lucide-react'
import { useRecurring } from '../hooks/usePlanning'
import { PageHeader } from '../components/PageHeader'
import { Card, CardHeader } from '../components/Card'
import { Button } from '../components/Button'
import { DataError } from '../components/DataError'
import { DataCell, DataRow, DataTable, type DataColumn } from '../components/DataTable'
import { IconButton } from '../components/IconButton'
import { StatusBadge } from '../components/StatusBadge'
import { CategoryBadge, TransactionTypeBadge } from '../components/CategoryBadge'
import { RecordForm, type RecordField } from '../components/RecordForm'
import { pageError } from '../lib/errors'
import { amountToCents } from '../lib/moneyInput'
import { formatDate, formatLabel, formatMoney, localTodayIso } from '../lib/format'
import type { Category } from '../types'
import type { RecurringEntry } from '../types/planning'

const removedCategoryName = 'Removed category (archived)'

const columns: DataColumn[] = [
  { key: 'description', label: 'Description', className: 'w-[18%]' },
  { key: 'category', label: 'Category', className: 'w-[22%]' },
  { key: 'type', label: 'Type', className: 'w-[8%]' },
  { key: 'amount', label: 'Amount', className: 'w-[9%]' },
  { key: 'frequency', label: 'Frequency', className: 'w-[8%]' },
  { key: 'schedule', label: 'Schedule', className: 'w-[19%]' },
  { key: 'status', label: 'Status', className: 'w-[9%]' },
  { key: 'actions', label: 'Actions' },
]

function findCategory(categories: Category[], categoryId: string): Category {
  return categories.find((c) => c.id === categoryId) ?? { id: categoryId, name: removedCategoryName }
}

function formatSchedule(entry: RecurringEntry): string {
  return entry.endDate ? `${formatDate(entry.startDate)} – ${formatDate(entry.endDate)}` : `From ${formatDate(entry.startDate)}`
}

interface RecurringRowProps {
  entry: RecurringEntry
  categories: Category[]
  onEditEntry: (entry: RecurringEntry) => void
}

function RecurringRow({ entry, categories, onEditEntry }: RecurringRowProps) {
  function onEditClick() {
    onEditEntry(entry)
  }

  return (
    <DataRow>
      <DataCell>{entry.description}</DataCell>
      <DataCell>
        <CategoryBadge category={findCategory(categories, entry.categoryId)} />
      </DataCell>
      <DataCell>
        <TransactionTypeBadge type={entry.type} />
      </DataCell>
      <DataCell className={`font-medium ${entry.amountCents < 0 ? 'text-danger' : 'text-success'}`}>{formatMoney(entry.amountCents)}</DataCell>
      <DataCell>{formatLabel(entry.frequency)}</DataCell>
      <DataCell className="text-sm whitespace-nowrap text-muted">{formatSchedule(entry)}</DataCell>
      <DataCell>
        <StatusBadge status={entry.active ? 'active' : 'paused'} />
      </DataCell>
      <DataCell>
        <IconButton icon={Pencil} label={`Edit ${entry.description}`} onClick={onEditClick} />
      </DataCell>
    </DataRow>
  )
}

function syncResultMessage(created: number) {
  if (created === 0) return 'Recurring entries are up to date. No new entries were due.'
  return `Created ${created} ${created === 1 ? 'entry' : 'entries'} from your recurring schedules.`
}

export function RecurringPage() {
  const { data, categories, error, mutationError, clearMutationError, save, remove, sync } = useRecurring()
  const [editing, setEditing] = useState<RecurringEntry | null | undefined>()
  const [processing, setProcessing] = useState(false)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)
  const editableCategories = editing && !categories.some(c => c.id === editing.categoryId)
    ? [...categories, { id: editing.categoryId, name: removedCategoryName }] : categories
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
    setSyncMessage(null)
    setEditing(null)
  }

  function onEditEntry(row: RecurringEntry) {
    clearMutationError()
    setSyncMessage(null)
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

  async function onProcessDueEntries() {
    setProcessing(true)
    setSyncMessage(null)
    const created = await sync()
    setProcessing(false)
    setSyncMessage(created === null ? null : syncResultMessage(created))
  }

  return (
    <div>
      <PageHeader title="Recurring entries" subtitle="Generate regular bills and paycheques. Due entries are processed when you sign in or click Process due entries." />
      <DataError error={pageError(error, mutationError, editing !== undefined)} />

      {editing !== undefined && (
        <RecordForm
          title={editing ? 'Edit recurring entry' : 'Add recurring entry'}
          initial={{ description: editing?.description ?? '', categoryId: editing?.categoryId ?? 'other', type: editing?.type ?? 'expense', amount: editing ? (Math.abs(editing.amountCents) / 100).toFixed(2) : '', startDate: editing?.startDate ?? localTodayIso(), endDate: editing?.endDate ?? '', frequency: editing?.frequency ?? 'monthly', active: editing?.active === false ? 'false' : 'true' }}
          fields={fields}
          error={mutationError}
          deleteMessage="The schedule will be removed. Transactions it already created are kept."
          onClose={onCloseEntryForm}
          onDelete={editing ? onDeleteEntry : undefined}
          onSave={onSaveEntry}
        />
      )}

      <Card className="mt-6 px-4 pt-5 pb-1">
        <div className="px-4">
          <CardHeader
            title="Your schedules"
            subtitle="Bills and income that repeat weekly or monthly."
            action={
              <div className="flex gap-3">
                <Button variant="outline" icon={RefreshCw} disabled={processing} onClick={onProcessDueEntries} className="px-5 py-3 text-[15px]">
                  {processing ? 'Processing…' : 'Process due entries'}
                </Button>
                <Button icon={CirclePlus} disabled={!categories.length} onClick={onAddEntry} className="px-5 py-3 text-[15px]">
                  Add recurring entry
                </Button>
              </div>
            }
          />
          {syncMessage && (
            <p role="status" className="mt-3 text-sm text-muted">
              {syncMessage}
            </p>
          )}
        </div>

        <DataTable
          columns={columns}
          loading={!data && !error}
          failed={!data && Boolean(error)}
          empty={data?.length === 0}
          emptyMessage="No recurring entries yet. Add a bill or paycheque that repeats."
          className="mt-5"
        >
          {data?.map((entry) => (
            <RecurringRow key={entry.id} entry={entry} categories={categories} onEditEntry={onEditEntry} />
          ))}
        </DataTable>
      </Card>
    </div>
  )
}
