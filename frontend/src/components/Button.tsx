import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

type ButtonVariant = 'primary' | 'outline' | 'danger'

interface ButtonProps {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  type?: 'button' | 'submit'
  variant?: ButtonVariant
  icon?: LucideIcon
  fullWidth?: boolean
  className?: string
}

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-on-primary hover:bg-primary-hover shadow-sm',
  outline: 'border border-line-strong bg-surface text-ink hover:bg-surface-muted',
  danger: 'border border-danger/40 bg-danger-soft text-danger hover:bg-danger/15',
}

export function Button({ children, onClick, variant = 'primary', icon: Icon, fullWidth = false, className = '', disabled = false, type = 'button' }: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
        variants[variant]
      } ${fullWidth ? 'w-full' : ''} ${className}`}
    >
      {Icon && <Icon className="size-[18px]" strokeWidth={2} />}
      {children}
    </button>
  )
}
