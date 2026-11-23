import type { LucideIcon } from 'lucide-react'
import { focusRing } from './focus'

interface IconButtonProps {
  icon: LucideIcon
  /** Accessible name, unique per row, e.g. "Edit Rent payment". */
  label: string
  onClick: () => void
  tone?: 'default' | 'danger'
  disabled?: boolean
}

const tones = {
  default: 'text-ink hover:bg-surface-muted',
  danger: 'text-danger hover:bg-danger-soft',
}

/** Square outline button with an icon only, used for row actions (edit, delete). */
export function IconButton({ icon: Icon, label, onClick, tone = 'default', disabled = false }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`grid size-10 shrink-0 place-items-center rounded-lg border border-line-strong transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${tones[tone]} ${focusRing}`}
    >
      <Icon className="size-4" strokeWidth={1.75} />
    </button>
  )
}
