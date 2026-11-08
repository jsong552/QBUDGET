import { useEffect, useRef, useState } from 'react'

import { Button } from './Button'



export interface RecordField {

  name: string

  label: string

  type?: 'text' | 'date' | 'number'

  options?: { value: string; label: string }[]

}

export function RecordForm({ title, fields, initial, onSave, onClose, onDelete }: {

  title: string; fields: RecordField[]; initial: Record<string, string>

  onSave: (values: Record<string, string>) => Promise<boolean>; onClose: () => void; onDelete?: () => Promise<boolean>

}) {

  const dialog = useRef<HTMLDialogElement>(null)

  const [values, setValues] = useState(initial)

  const [busy, setBusy] = useState(false)

  const [error, setError] = useState('')

  useEffect(() => { dialog.current?.showModal() }, [])

  async function save() {

    setBusy(true); setError('')

    try {

      if (await onSave(values)) onClose()

      else setError('Could not save. Check the page error and try again.')

    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not save.') }

    finally { setBusy(false) }

  }

  return <dialog ref={dialog} onCancel={(event) => { event.preventDefault(); if (!busy) onClose() }} aria-labelledby="record-title" className="m-auto w-[460px] rounded-xl bg-surface p-7 text-ink shadow-xl backdrop:bg-black/40">

    <h2 id="record-title" className="mb-5 text-xl font-bold">{title}</h2>

    <form onSubmit={(event) => { event.preventDefault(); void save() }} className="space-y-4">

      {fields.map((field) => <label key={field.name} className="block text-sm font-medium">{field.label}

        {field.options ? <select required disabled={busy} className="mt-1 block w-full rounded border border-line p-2" value={values[field.name] ?? ''} onChange={(e) => setValues({ ...values, [field.name]: e.target.value })}>

          {field.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}

        </select> : <input required disabled={busy} type={field.type ?? 'text'} step={field.type === 'number' ? '0.01' : undefined} min={field.type === 'number' ? '0.01' : undefined} maxLength={200} className="mt-1 block w-full rounded border border-line p-2" value={values[field.name] ?? ''} onChange={(e) => setValues({ ...values, [field.name]: e.target.value })} />}

      </label>)}

      {error && <p role="alert" className="text-danger">{error}</p>}

      <div className="flex justify-end gap-3">{onDelete && <Button variant="danger" disabled={busy} onClick={() => {
        if (!window.confirm('Delete this record?')) return
        setBusy(true)
        void onDelete().then((ok) => { if (ok) onClose(); else setError('Could not delete. Try again.') }).finally(() => setBusy(false))
      }}>Delete</Button>}<Button variant="outline" disabled={busy} onClick={onClose}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button></div>

    </form>

  </dialog>

}

