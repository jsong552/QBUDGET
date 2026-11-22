import { useState, type ReactNode } from 'react'
import { errorMessage } from '../lib/errors'
import { Button } from './Button'
import { DialogError, Modal } from './Modal'

interface ConfirmDialogProps {
  title: string
  message: ReactNode
  confirmLabel?: string
  busyLabel?: string
  /** `danger` for destructive actions such as delete. */
  variant?: 'primary' | 'danger'
  /** Return false (or throw) to keep the dialog open and show the error. */
  onConfirm: () => Promise<boolean> | boolean | void
  onClose: () => void
  /** Error from the failed request, e.g. a hook's mutationError. Shown when `onConfirm` returns false. */
  error?: unknown
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  busyLabel = 'Working…',
  variant = 'primary',
  onConfirm,
  onClose,
  error,
}: ConfirmDialogProps) {
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const [thrownMessage, setThrownMessage] = useState<string | null>(null)

  async function onConfirmClick() {
    setBusy(true)
    setFailed(false)
    setThrownMessage(null)
    try {
      const result = await onConfirm()
      if (result === false) setFailed(true)
      else onClose()
    } catch (failure) {
      setThrownMessage(errorMessage(failure))
    } finally {
      setBusy(false)
    }
  }

  const shownError = thrownMessage ?? (failed ? (error ? errorMessage(error) : 'Could not complete this. Please try again.') : null)

  return (
    <Modal title={title} onClose={onClose} busy={busy} width="w-[440px]">
      <div className="mt-2 text-[15px] text-muted">{message}</div>
      <div className="mt-5 space-y-5">
        <DialogError message={shownError} />
        <div className="flex justify-end gap-3">
          <Button variant="outline" disabled={busy} onClick={onClose}>
            Cancel
          </Button>
          <Button variant={variant} disabled={busy} onClick={onConfirmClick}>
            {busy ? busyLabel : confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
