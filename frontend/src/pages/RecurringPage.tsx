import { useEffect, useState } from 'react'
import { CirclePlus, Pencil, RefreshCw, Trash2 } from 'lucide-react'
import { useRecurring } from '../hooks/usePlanning'
import { PageHeader } from '../components/PageHeader'
import { Card, CardHeader } from '../components/Card'
import { Button } from '../components/Button'
import { DataError } from '../components/DataError'
import { DataCell, DataRow, DataTable, type DataColumn } from '../components/DataTable'
import { IconButton } from '../components/IconButton'
import { StatusBadge } from '../components/StatusBadge'
import { CategoryBadge, TransactionTypeBadge } from '../components/CategoryBadge'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { RecordForm, type RecordField } from '../components/RecordForm'
import { pageError } from '../lib/errors'
import { amountToCents } from '../lib/moneyInput'
import { categoriesForRecurringType, defaultRecurringCategory, earliestRecurringStart } from '../lib/recurring'
import { formatDate, formatLabel, formatMoney, localTodayIso } from '../lib/format'
import type { Category } from '../types'
import type { RecurringEntry } from '../types/planning'

const removedCategoryName = 'Removed category (archived)'
const startDateHint = 'Very old start dates create a lot of past entries.'
const noteDurationMs = 6000
const alreadyRemovedNote = 'That item was already removed.'

const columns: DataColumn[] = [
  { key: 'description', label: 'Description', className: 'w-[18%]' },
  { key: 'category', label: 'Category', className: 'w-[20%]' },
  { key: 'type', label: 'Type', className: 'w-[8%]' },
  { key: 'amount', label: 'Amount', className: 'w-[9%]' },
  { key: 'frequency', label: 'Frequency', className: 'w-[8%]' },
  { key: 'schedule', label: 'Schedule', className: 'w-[18%]' },
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
  onDeleteEntry: (entry: RecurringEntry) => void
}

function RecurringRow({ entry, categories, onEditEntry, onDeleteEntry }: RecurringRowProps) {
  function onEditClick() {
    onEditEntry(entry)
  }

  function onDeleteClick() {
    onDeleteEntry(entry)
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
        <div className="flex gap-2">
          <IconButton icon={Pencil} label={`Edit ${entry.description}`} onClick={onEditClick} />
          <IconButton icon={Trash2} label={`Delete ${entry.description}`} tone="danger" onClick={onDeleteClick} />
        </div>
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
  const [deleting, setDeleting] = useState<RecurringEntry | null>(null)
  const [processing, setProcessing] = useState(false)
  /** Muted line under the card header: the sync result or "already removed". Hides after a few seconds or on the next action. */
  const [note, setNote] = useState<string | null>(null)
  const today = localTodayIso()

  function onHideNote() {
    setNote(null)
  }

  useEffect(() => {
    if (!note) return
    const timer = window.setTimeout(onHideNote, noteDurationMs)
    return () => window.clearTimeout(timer)
  }, [note])

  /** Categories the form offers for the chosen type. The entry being edited keeps its saved category while type and category are unchanged. */
  function categoryOptionsFor(values: Record<string, string>): Category[] {
    const allowed = categoriesForRecurringType(values.type as RecurringEntry['type'], categories)
    const keepSaved = editing && values.categoryId === editing.categoryId && values.type === editing.type && !allowed.some((c) => c.id === editing.categoryId)
    return keepSaved ? [...allowed, findCategory(categories, editing.categoryId)] : allowed
  }

  function entryFields(values: Record<string, string>): RecordField[] {
    const active = values.active !== 'false'
    return [
      { name: 'description', label: 'Description / income source' },
      { name: 'type', label: 'Type', options: ['expense', 'income'].map(value => ({ value, label: formatLabel(value) })), half: true },
      { name: 'categoryId', label: 'Category', options: categoryOptionsFor(values).map(c => ({ value: c.id, label: c.name })), half: true },
      { name: 'amount', label: 'Amount (CAD)', type: 'number', half: true },
      { name: 'frequency', label: 'Frequency', options: ['weekly', 'monthly'].map(value => ({ value, label: formatLabel(value) })), half: true },
      {
        name: 'startDate',
        label: 'First date',
        type: 'date',
        half: true,
        hint: startDateHint,
        // Paused schedules create nothing, so the API accepts any start date for them.
        min: active ? earliestRecurringStart(values.frequency as RecurringEntry['frequency'], today, values.endDate || null) : undefined,
      },
      { name: 'endDate', label: 'Last date (optional)', type: 'date', required: false, half: true },
      { name: 'active', label: 'Status', options: [{ value: 'true', label: 'Active' }, { value: 'false', label: 'Paused' }] },
    ]
  }

  function onEntryValuesChange(values: Record<string, string>, changedField: string) {
    if (changedField !== 'type' || categoryOptionsFor(values).some((c) => c.id === values.categoryId)) return values
    return { ...values, categoryId: defaultRecurringCategory(values.type as RecurringEntry['type'], categories) }
  }

  function onAddEntry() {
    clearMutationError()
    setNote(null)
    setEditing(null)
  }

  function onEditEntry(row: RecurringEntry) {
    clearMutationError()
    setNote(null)
    setEditing(row)
  }

  function onCloseEntryForm() {
    clearMutationError()
    setEditing(undefined)
  }

  function onEntryAlreadyRemoved() {
    clearMutationError()
    setEditing(undefined)
    setDeleting(null)
    setNote(alreadyRemovedNote)
  }

  function onSaveEntry(v: Record<string, string>) {
    return save(editing?.id ?? null, { description: v.description.trim(), categoryId: v.categoryId, type: v.type as 'income' | 'expense', amountCents: amountToCents(v.amount) * (v.type === 'expense' ? -1 : 1), startDate: v.startDate, endDate: v.endDate || null, frequency: v.frequency as 'weekly' | 'monthly', active: v.active === 'true' }, { onNotFound: onEntryAlreadyRemoved })
  }

  function onDeleteEntry() {
    return editing ? remove(editing.id, { onNotFound: onEntryAlreadyRemoved }) : Promise.resolve(false)
  }

  function onDeleteRow(row: RecurringEntry) {
    clearMutationError()
    setNote(null)
    setDeleting(row)
  }

  function onConfirmDeleteRow() {
    return deleting ? remove(deleting.id, { onNotFound: onEntryAlreadyRemoved }) : false
  }

  function onCloseDeleteRow() {
    clearMutationError()
    setDeleting(null)
  }

  async function onProcessDueEntries() {
    setProcessing(true)
    setNote(null)
    const created = await sync()
    setProcessing(false)
    setNote(created === null ? null : syncResultMessage(created))
  }

  return (
    <div>
      <PageHeader title="Recurring entries" subtitle="Generate regular bills and paycheques. Due entries are processed when you sign in or click Process due entries." />
      <DataError error={pageError(error, mutationError, editing !== undefined || deleting !== null)} />

      {editing !== undefined && (
        <RecordForm
          title={editing ? 'Edit recurring entry' : 'Add recurring entry'}
          initial={{ description: editing?.description ?? '', categoryId: editing?.categoryId ?? defaultRecurringCategory('expense', categories), type: editing?.type ?? 'expense', amount: editing ? (Math.abs(editing.amountCents) / 100).toFixed(2) : '', startDate: editing?.startDate ?? today, endDate: editing?.endDate ?? '', frequency: editing?.frequency ?? 'monthly', active: editing?.active === false ? 'false' : 'true' }}
          fields={entryFields}
          onValuesChange={onEntryValuesChange}
          error={mutationError}
          deleteMessage="The schedule will be removed. Transactions it already created are kept."
          onClose={onCloseEntryForm}
          onDelete={editing ? onDeleteEntry : undefined}
          onSave={onSaveEntry}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Delete recurring entry?"
          message={`"${deleting.description}" will stop repeating. Transactions it already created are kept.`}
          confirmLabel="Delete"
          busyLabel="Deleting…"
          variant="danger"
          error={mutationError}
          onConfirm={onConfirmDeleteRow}
          onClose={onCloseDeleteRow}
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
          {note && (
            <p role="status" className="mt-3 text-sm text-muted">
              {note}
            </p>
          )}
        </div>

        {/* Rows stay in the order the API returns (by start date, then description). */}
        <DataTable
          columns={columns}
          loading={!data && !error}
          failed={!data && Boolean(error)}
          empty={data?.length === 0}
          emptyMessage="No recurring entries yet. Add a bill or paycheque that repeats."
          className="mt-5"
        >
          {data?.map((entry) => (
            <RecurringRow key={entry.id} entry={entry} categories={categories} onEditEntry={onEditEntry} onDeleteEntry={onDeleteRow} />
          ))}
        </DataTable>
      </Card>
    </div>
  )
}
