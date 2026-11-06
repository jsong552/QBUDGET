import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
}

export function Card({ children, className = '' }: CardProps) {
  return <section className={`rounded-2xl bg-surface shadow-card ${className}`}>{children}</section>
}

interface CardHeaderProps {
  eyebrow?: string
  title: string
  subtitle?: string
  action?: ReactNode
}

export function CardHeader({ eyebrow, title, subtitle, action }: CardHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        {eyebrow && <p className="text-[11px] font-bold tracking-wider text-danger uppercase">{eyebrow}</p>}
        <h2 className={`${eyebrow ? 'mt-1' : ''} text-xl font-bold tracking-tight text-ink`}>{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
