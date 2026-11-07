interface SegmentedOption<T extends string> {
  value: T
  label: string
}

interface SegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
  size?: 'sm' | 'md'
}

/** Pill-style toggle group (Week / Month / Term, Month / Week, ...). */
export function SegmentedControl<T extends string>({ options, value, onChange, size = 'md' }: SegmentedControlProps<T>) {
  const padding = size === 'sm' ? 'px-2.5 py-1 text-[11px]' : 'px-3.5 py-1.5 text-[13px]'

  return (
    <div role="tablist" className="inline-flex rounded-lg bg-surface-muted p-1">
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(option.value)}
            className={`rounded-md font-medium transition-colors ${padding} ${
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
