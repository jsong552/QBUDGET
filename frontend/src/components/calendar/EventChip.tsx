import { AlertCircle, Check, Repeat } from 'lucide-react'
import { formatMoney } from '../../lib/format'
import type { CalendarEvent } from '../../types'
import { focusRing } from '../focus'
import { toneClasses } from '../tones'
import { getEventStatus, getEventStyle, type EventStatus } from './eventStyles'

interface EventChipProps {
  event: CalendarEvent
  today: string
  onSelect: (event: CalendarEvent) => void
  /** Week view: stacked chip with the full title, the amount and the status written out. */
  detailed?: boolean
}

interface StatusIconsProps {
  status: EventStatus
  recurring: boolean
  skipped: boolean
  /** Month cells are narrow: show only the most important marker (overdue, then paid, then recurring). */
  compact?: boolean
}

/** Recurring, paid and overdue markers. They are decorative: the chip's accessible name says the same in words. */
function StatusIcons({ status, recurring, skipped, compact = false }: StatusIconsProps) {
  const paid = status.settled && !skipped
  const showLate = status.late
  const showPaid = paid && !(compact && showLate)
  const showRecurring = recurring && !(compact && (showLate || showPaid))
  return (
    <>
      {showRecurring && <Repeat className="size-3 shrink-0" strokeWidth={2.25} aria-hidden />}
      {showPaid && <Check className="size-3 shrink-0" strokeWidth={2.5} aria-hidden />}
      {showLate && <AlertCircle className="size-3.5 shrink-0 text-danger" strokeWidth={2.25} aria-hidden />}
    </>
  )
}

/** Month cells are narrow, so the marker sits as a small badge on the chip's corner instead of taking text space. */
function CornerMarker({ status, recurring, skipped }: Omit<StatusIconsProps, 'compact'>) {
  if (!status.late && !status.settled && !recurring) return null
  if (skipped && !recurring) return null
  return (
    <span className="absolute -top-1.5 -right-1.5 grid size-4 place-items-center rounded-full bg-surface text-ink shadow-sm ring-1 ring-line [&>svg]:size-2.5">
      <StatusIcons status={status} recurring={recurring} skipped={skipped} compact />
    </span>
  )
}

/** Entry on the calendar, coloured by kind. Recurring, paid and overdue entries also carry an icon, and the status is in its name. */
export function EventChip({ event, today, onSelect, detailed = false }: EventChipProps) {
  const { icon: KindIcon, tone } = getEventStyle(event.kind)
  const status = getEventStatus(event, today)
  const recurring = event.source === 'recurring'
  const name = `${event.title}, ${formatMoney(event.amountCents)}, ${status.label}${recurring ? ', recurring' : ''}`
  const look = `${toneClasses[tone].soft} ${status.settled ? 'opacity-60' : ''} ${status.late ? 'ring-1 ring-danger/50' : ''} ${focusRing}`

  function onClick() {
    onSelect(event)
  }

  if (detailed) {
    return (
      <button type="button" aria-label={name} title={name} onClick={onClick} className={`relative z-10 block w-full rounded-md px-2 py-1.5 text-left ${look}`}>
        <span className="flex items-start gap-1.5 text-xs font-semibold leading-tight">
          <KindIcon className="mt-px size-3.5 shrink-0" strokeWidth={2} />
          <span className={`min-w-0 ${event.skipped ? 'line-through' : ''}`}>{event.title}</span>
        </span>
        <span className="mt-1 block text-[13px] font-bold">{formatMoney(event.amountCents)}</span>
        <span className="mt-0.5 flex items-center gap-1 text-[11px] font-medium">
          <StatusIcons status={status} recurring={recurring} skipped={Boolean(event.skipped)} />
          {status.label}
        </span>
      </button>
    )
  }

  return (
    <button
      type="button"
      aria-label={name}
      title={name}
      onClick={onClick}
      className={`relative z-10 flex w-full items-center gap-1 rounded-md px-1.5 py-1 text-left text-[11px] font-medium ${look}`}
    >
      <KindIcon className="size-3.5 shrink-0" strokeWidth={2} />
      <span className={`line-clamp-2 min-w-0 flex-1 leading-tight break-words ${event.skipped ? 'line-through' : ''}`}>{event.shortTitle || event.title}</span>
      <CornerMarker status={status} recurring={recurring} skipped={Boolean(event.skipped)} />
    </button>
  )
}
