import { focusRing } from './focus'

interface SegmentedOption<T extends string> {
  value: T
  label: string
}

interface SegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
  /** Accessible name for the group, e.g. "Activity range". Pass it on every new use. */
  label?: string
  size?: 'sm' | 'md'
}

/** Pill-style toggle group (Week / Month / Term, Month / Week, ...). */
export function SegmentedControl<T extends string>({ options, value, onChange, label, size = 'md' }: SegmentedControlProps<T>) {
  const padding = size === 'sm' ? 'px-2.5 py-1 text-[11px]' : 'px-3.5 py-1.5 text-[13px]'

  return (
    <div role="group" aria-label={label} className="inline-flex rounded-lg bg-surface-muted p-1">
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={`rounded-md font-medium transition-colors ${focusRing} ${padding} ${
              selected ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
