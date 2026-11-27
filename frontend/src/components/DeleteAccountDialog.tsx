import { useState } from 'react'
import { ConfirmDialog } from './ConfirmDialog'
import { TextField } from './TextField'

interface DeleteAccountDialogProps {
  /** Deletes the account once the password is confirmed. Rejects with a message to show if it can't. */
  onDelete: (password: string) => Promise<void>
  onClose: () => void
}

/**
 * Confirms permanently deleting the account. Firebase only deletes an account right after a real sign-in, so the
 * password is asked for again; that also stops anyone at an unlocked computer from deleting the account.
 */
export function DeleteAccountDialog({ onDelete, onClose }: DeleteAccountDialogProps) {
  const [password, setPassword] = useState('')

  /** A rejection keeps the dialog open and shows its message; on success the user is signed out. */
  async function onConfirm() {
    await onDelete(password)
    return true
  }

  return (
    <ConfirmDialog
      title="Delete your account?"
      message={
        <>
          <p>
            This permanently deletes your QBudget account and all of your data: transactions, budgets, goals, calendar
            payments, recurring entries, your semester plan and your settings. This can&apos;t be undone.
          </p>
          <TextField
            label="Enter your password to confirm"
            type="password"
            autoComplete="current-password"
            value={password}
            onValueChange={setPassword}
            size="md"
            className="mt-4"
          />
        </>
      }
      confirmLabel="Delete account"
      busyLabel="Deleting…"
      variant="danger"
      onConfirm={onConfirm}
      onClose={onClose}
    />
  )
}
