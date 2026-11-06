import type { LucideIcon } from 'lucide-react'
import { useId, type ChangeEvent } from 'react'

interface TextFieldProps {
  label?: string
  /** Used as the accessible name when there is no visible label. */
  ariaLabel?: string
  type?: 'text' | 'email' | 'password' | 'search'
  placeholder?: string
  /** Controlled value; leave out (with `defaultValue`) for an uncontrolled field. */
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  disabled?: boolean
  icon?: LucideIcon
  size?: 'md' | 'lg'
  className?: string
}

export function TextField({
  label,
  ariaLabel,
  type = 'text',
  placeholder,
  value,
  defaultValue,
  onValueChange,
  disabled = false,
  icon: Icon,
  size = 'lg',
  className = '',
}: TextFieldProps) {
  const id = useId()

  function onInputChange(event: ChangeEvent<HTMLInputElement>) {
    onValueChange?.(event.target.value)
  }

  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="mb-2 block text-[15px] font-medium text-ink">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && <Icon className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted" strokeWidth={1.75} />}
        <input
          id={id}
          type={type}
          aria-label={label ? undefined : ariaLabel}
          placeholder={placeholder}
          value={value}
          defaultValue={defaultValue}
          onChange={onInputChange}
          disabled={disabled}
          className={`${size === 'lg' ? 'h-12' : 'h-11'} w-full rounded-lg border border-line-strong bg-surface pr-4 text-[15px] text-ink outline-none placeholder:text-subtle focus:border-primary disabled:bg-surface-disabled disabled:text-muted ${
            Icon ? 'pl-12' : 'pl-4'
          }`}
        />
      </div>
    </div>
  )
}
