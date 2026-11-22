import { ChevronDown, type LucideIcon } from 'lucide-react'
import { useId, type ChangeEvent } from 'react'
import { fieldFocusRing } from './focus'

export interface SelectOption<T extends string> {
  value: T
  label: string
}

interface SelectProps<T extends string> {
  label: string
  value: T
  options: SelectOption<T>[]
  onChange: (value: T) => void
  icon?: LucideIcon
  className?: string
  /** Shows `label` above the field, styled like TextField's label. */
  showLabel?: boolean
  disabled?: boolean
  required?: boolean
}

/** Native select styled to match the sketches. `label` is the accessible name; pass `showLabel` to also show it above the field. */
export function Select<T extends string>({ label, value, options, onChange, icon: Icon, className = '', showLabel = false, disabled = false, required = false }: SelectProps<T>) {
  const id = useId()

  function onSelectChange(event: ChangeEvent<HTMLSelectElement>) {
    onChange(event.target.value as T)
  }

  return (
    <div className={className}>
      {showLabel && (
        <label htmlFor={id} className="mb-2 block text-[15px] font-medium text-ink">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && <Icon className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-ink" strokeWidth={1.75} />}
        <select
          id={id}
          aria-label={showLabel ? undefined : label}
          disabled={disabled}
          required={required}
          value={value}
          onChange={onSelectChange}
          className={`h-11 w-full appearance-none rounded-lg border border-line-strong bg-surface pr-10 text-[15px] text-ink ${fieldFocusRing} disabled:bg-surface-disabled disabled:text-muted ${
            Icon ? 'pl-11' : 'pl-4'
          }`}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute top-1/2 right-4 size-[18px] -translate-y-1/2 text-ink" strokeWidth={1.75} />
      </div>
    </div>
  )
}
