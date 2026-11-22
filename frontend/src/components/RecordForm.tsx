import { useState, type FormEvent } from 'react'
import { errorMessage } from '../lib/errors'
import { Button } from './Button'
import { ConfirmDialog } from './ConfirmDialog'
import { DialogError, Modal } from './Modal'
import { Select } from './Select'
import { TextField } from './TextField'

export interface RecordField {
  name: string
  label: string
  required?: boolean
  min?: string
  step?: string
  type?: 'text' | 'date' | 'number'
  options?: { value: string; label: string }[]
  /** Sits next to the following half-width field instead of taking a full row. */
  half?: boolean
  /** Text fields only. Defaults to 200. */
  maxLength?: number
  placeholder?: string
}

interface RecordFormProps {
  title: string
  fields: RecordField[]
  initial: Record<string, string>
  /** Resolve to false (or throw) to keep the form open and show an error. */
  onSave: (values: Record<string, string>) => Promise<boolean>
  onClose: () => void
  onDelete?: () => Promise<boolean>
  /** Error from the request that just failed (e.g. a hook's mutationError). Shown inside the form when a save or delete fails. */
  error?: unknown
  /** Body of the delete confirmation. */
  deleteMessage?: string
}

const defaultMaxLength = 200

export function RecordForm({ title, fields, initial, onSave, onClose, onDelete, error, deleteMessage = 'This cannot be undone.' }: RecordFormProps) {
  const [values, setValues] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [saveFailed, setSaveFailed] = useState(false)
  const [thrownMessage, setThrownMessage] = useState<string | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  function onFieldChange(name: string, value: string) {
    setValues((current) => ({ ...current, [name]: value }))
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setSaveFailed(false)
    setThrownMessage(null)
    try {
      if (await onSave(values)) onClose()
      else setSaveFailed(true)
    } catch (failure) {
      setThrownMessage(errorMessage(failure))
    } finally {
      setBusy(false)
    }
  }

  function onDeleteClick() {
    setConfirmingDelete(true)
  }

  function onCloseDeleteConfirm() {
    setConfirmingDelete(false)
  }

  async function onConfirmDelete() {
    if (!onDelete) return false
    const deleted = await onDelete()
    if (deleted) onClose()
    return deleted
  }

  const saveError = saveFailed ? (error ? errorMessage(error) : 'Could not save. Check the page error and try again.') : null

  return (
    <Modal title={title} onClose={onClose} busy={busy || confirmingDelete}>
      <form onSubmit={onSubmit} className="mt-5">
        <div className="grid grid-cols-2 gap-x-4 gap-y-4">
          {fields.map((field) => (
            <div key={field.name} className={field.half ? 'col-span-1' : 'col-span-2'}>
              {field.options ? (
                <Select
                  label={field.label}
                  showLabel
                  required
                  disabled={busy}
                  value={values[field.name] ?? ''}
                  options={field.options}
                  onChange={(value) => onFieldChange(field.name, value)}
                />
              ) : (
                <TextField
                  label={field.label}
                  type={field.type ?? 'text'}
                  size="md"
                  required={field.required !== false}
                  disabled={busy}
                  placeholder={field.placeholder}
                  step={field.step ?? (field.type === 'number' ? '0.01' : undefined)}
                  min={field.min ?? (field.type === 'number' ? '0.01' : undefined)}
                  maxLength={field.type === 'date' || field.type === 'number' ? undefined : (field.maxLength ?? defaultMaxLength)}
                  value={values[field.name] ?? ''}
                  onValueChange={(value) => onFieldChange(field.name, value)}
                />
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 space-y-5">
          <DialogError message={thrownMessage ?? saveError} />
          <div className="flex items-center gap-3">
            {onDelete && (
              <Button variant="danger" disabled={busy} onClick={onDeleteClick}>
                Delete
              </Button>
            )}
            <div className="ml-auto flex gap-3">
              <Button variant="outline" disabled={busy} onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      </form>

      {confirmingDelete && (
        <ConfirmDialog
          title="Delete this record?"
          message={deleteMessage}
          confirmLabel="Delete"
          busyLabel="Deleting…"
          variant="danger"
          error={error}
          onConfirm={onConfirmDelete}
          onClose={onCloseDeleteConfirm}
        />
      )}
    </Modal>
  )
}
