import { toneClasses, type Tone } from './tones'

interface ProgressBarProps {
  /** 0-100, as provided by the API. */
  percent: number
  tone: Tone
  trackClassName?: string
  height?: 'thin' | 'regular'
}

export function ProgressBar({ percent, tone, trackClassName = 'bg-line', height = 'regular' }: ProgressBarProps) {
  return (
    <div className={`w-full overflow-hidden rounded-full ${height === 'thin' ? 'h-1' : 'h-2.5'} ${trackClassName}`}>
      <div className={`h-full rounded-full ${toneClasses[tone].solid}`} style={{ width: `${Math.min(percent, 100)}%` }} />
    </div>
  )
}
