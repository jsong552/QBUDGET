interface ToggleProps {
  checked: boolean
  label: string
  onChange: (checked: boolean) => void
}

export function Toggle({ checked, label, onChange }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
        checked ? 'bg-primary' : 'bg-line-strong'
      }`}
    >
      <span
        className={`inline-block size-[18px] rounded-full bg-surface shadow transition-transform ${
          checked ? 'translate-x-[23px]' : 'translate-x-[3px]'
        }`}
      />
    </button>
  )
}
