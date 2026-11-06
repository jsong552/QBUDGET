import { useId } from 'react'
import { areaPath, axisTicks, dateScale, smoothPath, valueScale } from '../lib/chart'
import { formatDate, formatMoney } from '../lib/format'
import type { SpendingActivity } from '../types'

const width = 560
const height = 170
const plot = { left: 36, right: width - 8, top: 8, bottom: height - 26 }

export function SpendingActivityChart({ activity }: { activity: SpendingActivity }) {
  const gradientId = useId()
  const labels = activity.axisLabels
  const x = dateScale(labels[0], labels[labels.length - 1], plot.left, plot.right)
  const y = valueScale(activity.axisMaxCents, plot.top, plot.bottom)

  const points = activity.points.map((point) => ({ x: x(point.date), y: y(point.amountCents) }))
  const line = smoothPath(points)

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Spending activity chart">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" className="[stop-color:var(--color-primary)]" stopOpacity={0.18} />
          <stop offset="100%" className="[stop-color:var(--color-primary)]" stopOpacity={0.02} />
        </linearGradient>
      </defs>

      {axisTicks(activity.axisMaxCents, activity.axisStepCents).map((tick) => (
        <g key={tick}>
          <line x1={plot.left} x2={plot.right} y1={y(tick)} y2={y(tick)} className="stroke-line" strokeWidth={1} />
          <text x={0} y={y(tick) + 3} className="fill-subtle text-[8px]">
            {formatMoney(tick, { cents: false })}
          </text>
        </g>
      ))}

      {labels.map((label, i) => (
        <text
          key={label}
          x={x(label)}
          y={height - 6}
          textAnchor={i === 0 ? 'start' : i === labels.length - 1 ? 'end' : 'middle'}
          className="fill-subtle text-[8px]"
        >
          {formatDate(label, 'short')}
        </text>
      ))}

      <path d={areaPath(line, points, plot.bottom)} fill={`url(#${gradientId})`} />
      <path d={line} fill="none" className="stroke-primary" strokeWidth={2.25} strokeLinecap="round" />

      {activity.highlight && (
        <circle
          cx={x(activity.highlight.date)}
          cy={y(activity.highlight.amountCents)}
          r={3.5}
          className="fill-accent stroke-surface"
          strokeWidth={1.5}
        />
      )}
    </svg>
  )
}
