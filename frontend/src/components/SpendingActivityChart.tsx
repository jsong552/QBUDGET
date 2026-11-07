import { useId } from 'react'
import { Area, AreaChart, CartesianGrid, ReferenceDot, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import { dateTicks, formatDateTick, timeDomain, toTimestamp, valueTicks } from '../lib/chart'
import { formatMoney } from '../lib/format'
import type { SpendingActivity } from '../types'

const axisTick = { fill: 'var(--color-subtle)', fontSize: 10 }

function formatValueTick(cents: number) {
  return formatMoney(cents, { cents: false })
}

export function SpendingActivityChart({ activity }: { activity: SpendingActivity }) {
  const gradientId = useId()
  const data = activity.points.map((point) => ({ t: toTimestamp(point.date), amount: point.amountCents }))
  const [start, end] = timeDomain(data.map((point) => point.t))
  const x = dateTicks(start, end, 4)
  const yTicks = valueTicks(Math.max(0, ...data.map((point) => point.amount)), 3)

  function formatXTick(timestamp: number) {
    return formatDateTick(timestamp, x.unit)
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={data} margin={{ top: 6, right: 4, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.18} />
            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--color-line)" />
        <XAxis
          dataKey="t"
          type="number"
          scale="time"
          domain={[start, end]}
          ticks={x.ticks}
          tickFormatter={formatXTick}
          tick={axisTick}
          axisLine={false}
          tickLine={false}
          tickMargin={10}
          padding={{ left: 4, right: 4 }}
        />
        <YAxis
          domain={[0, yTicks[yTicks.length - 1]]}
          ticks={yTicks}
          tickFormatter={formatValueTick}
          tick={axisTick}
          axisLine={false}
          tickLine={false}
          width={38}
        />
        <Area
          dataKey="amount"
          type="monotone"
          stroke="var(--color-primary)"
          strokeWidth={2.25}
          fill={`url(#${gradientId})`}
          dot={false}
          activeDot={false}
          isAnimationActive={false}
        />
        {activity.highlight && (
          <ReferenceDot
            x={toTimestamp(activity.highlight.date)}
            y={activity.highlight.amountCents}
            r={3.5}
            fill="var(--color-accent)"
            stroke="var(--color-surface)"
            strokeWidth={1.5}
          />
        )}
      </AreaChart>
    </ResponsiveContainer>
  )
}
