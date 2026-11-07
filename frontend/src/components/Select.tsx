import { ChevronDown, type LucideIcon } from 'lucide-react'
import type { ChangeEvent } from 'react'

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
}

/** Native select styled to match the sketches. The visible label is provided by the caller; `label` is for screen readers. */
export function Select<T extends string>({ label, value, options, onChange, icon: Icon, className = '' }: SelectProps<T>) {
  function onSelectChange(event: ChangeEvent<HTMLSelectElement>) {
    onChange(event.target.value as T)
  }

  return (
    <div className={`relative ${className}`}>
      {Icon && <Icon className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-ink" strokeWidth={1.75} />}
      <select
        aria-label={label}
        value={value}
        onChange={onSelectChange}
        className={`h-11 w-full appearance-none rounded-lg border border-line-strong bg-surface pr-10 text-[15px] text-ink outline-none focus:border-primary ${
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
  )
}
