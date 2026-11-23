import { formatLabel } from '../lib/format'
import { toneClasses, type Tone } from './tones'

/** Tone for each status value the API uses. Unknown values are shown in the quiet tone. */
const statusTones: Record<string, Tone> = {
  active: 'success',
  paused: 'quiet',
  applied: 'info',
  approved: 'accent',
  received: 'success',
  kept: 'primary',
  opted_out: 'success',
  paid: 'success',
  overdue: 'danger',
  upcoming: 'info',
  over_budget: 'danger',
  on_track: 'success',
}

interface StatusBadgeProps {
  /** Stored value such as "opted_out"; shown as "Opted out". */
  status: string
  /** Overrides the shown text. */
  label?: string
  /** Overrides the colour picked from the status. */
  tone?: Tone
}

export function StatusBadge({ status, label, tone }: StatusBadgeProps) {
  const resolvedTone = tone ?? statusTones[status] ?? 'quiet'
  return (
    <span className={`inline-flex rounded-md px-2.5 py-1 text-sm font-medium whitespace-nowrap ${toneClasses[resolvedTone].soft}`}>
      {label ?? formatLabel(status)}
    </span>
  )
}
