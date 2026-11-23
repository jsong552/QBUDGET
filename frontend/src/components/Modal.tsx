import { useEffect, useId, useRef, type ReactNode, type SyntheticEvent } from 'react'

interface ModalProps {
  title: string
  /** Called on Escape. Ignored while `busy`. */
  onClose: () => void
  busy?: boolean
  /** Tailwind width class. */
  width?: string
  children: ReactNode
}

/** Native modal dialog in the card style. Opens on mount; the caller removes it to close it. */
export function Modal({ title, onClose, busy = false, width = 'w-[520px]', children }: ModalProps) {
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const element = dialog.current
    if (element && !element.open) element.showModal()
  }, [])

  function onCancel(event: SyntheticEvent<HTMLDialogElement>) {
    event.preventDefault()
    if (!busy) onClose()
  }

  return (
    <dialog
      ref={dialog}
      onCancel={onCancel}
      aria-labelledby={titleId}
      className={`m-auto max-w-[calc(100vw-2rem)] rounded-2xl bg-surface px-6 pt-5 pb-6 text-ink shadow-card backdrop:bg-ink/40 ${width}`}
    >
      <h2 id={titleId} className="text-xl font-bold tracking-tight text-ink">
        {title}
      </h2>
      {children}
    </dialog>
  )
}

/** Inline error line used inside dialogs, above the buttons. */
export function DialogError({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p role="alert" className="rounded-lg bg-danger-soft px-4 py-3 text-sm text-danger">
      {message}
    </p>
  )
}
