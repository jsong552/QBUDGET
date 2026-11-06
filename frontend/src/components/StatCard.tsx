import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { IconCircle } from './IconCircle'
import { toneClasses, type Tone } from './tones'

interface StatCardProps {
  tone: Tone
  icon: LucideIcon
  label: string
  value: string
  caption: ReactNode
}

/** Summary card with a coloured top edge, used across the Expenses, Forecast and Calendar pages. */
export function StatCard({ tone, icon, label, value, caption }: StatCardProps) {
  return (
    <div className={`flex gap-6 rounded-2xl border-t-4 bg-surface px-6 pt-5 pb-6 shadow-card ${toneClasses[tone].border}`}>
      <IconCircle icon={icon} tone={tone} size="lg" />
      <div>
        <p className="text-[15px] text-muted">{label}</p>
        <p className="mt-1 text-[28px] leading-tight font-bold tracking-tight text-ink">{value}</p>
        <div className="mt-1.5 text-sm text-muted">{caption}</div>
      </div>
    </div>
  )
}
