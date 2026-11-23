import { AlertCircle } from 'lucide-react'
import { errorMessage } from '../lib/errors'
import { Button } from './Button'

interface DataErrorProps {
  error: unknown
  /** Bold first line, e.g. "Could not load your budgets". */
  title?: string
  /** Shows a Try again button. */
  onRetry?: () => void
}

/** Page-level error banner. Place it directly below PageHeader. */
export function DataError({ error, title, onRetry }: DataErrorProps) {
  if (!error) return null
  return (
    <div role="alert" className="mt-5 flex items-start gap-3 rounded-2xl border border-danger/30 bg-danger-soft px-5 py-4 text-danger">
      <AlertCircle className="mt-0.5 size-5 shrink-0" strokeWidth={2} />
      <div className="flex-1 text-[15px]">
        {title && <p className="font-semibold">{title}</p>}
        <p className={title ? 'mt-0.5' : ''}>{errorMessage(error)}</p>
      </div>
      {onRetry && (
        <Button variant="outline" onClick={onRetry} className="shrink-0 py-2">
          Try again
        </Button>
      )}
    </div>
  )
}
