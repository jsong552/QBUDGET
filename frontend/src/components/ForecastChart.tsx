import { useId } from 'react'
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, XAxis, YAxis, type DotItemDotProps } from 'recharts'
import { dateTicks, formatDateTick, timeDomain, toTimestamp, valueTicks } from '../lib/chart'
import { formatMoney } from '../lib/format'
import type { ForecastSeries, IsoDate, SeriesPoint } from '../types'

const legend = [
  { label: 'Income', dot: 'bg-primary' },
  { label: 'Expenses', dot: 'bg-danger' },
  { label: 'Projected expenses', dot: 'bg-info-light' },
]

const axisTick = { fill: 'var(--color-muted)', fontSize: 11 }

interface ForecastRow {
  t: number
  income?: number
  expenses?: number
  projected?: number
  /** Expenses or, past the last actual value, projected expenses. Drives the red fill. */
  expenseFill?: number
}

/** Merges the three series into one row per date, as the chart expects. */
function toRows(series: ForecastSeries): ForecastRow[] {
  const rows = new Map<IsoDate, ForecastRow>()
  const add = (points: SeriesPoint[], key: 'income' | 'expenses' | 'projected') => {
    for (const point of points) {
      const row = rows.get(point.date) ?? { t: toTimestamp(point.date) }
      row[key] = point.amountCents
      rows.set(point.date, row)
    }
  }
  add(series.income, 'income')
  add(series.expenses, 'expenses')
  add(series.projectedExpenses, 'projected')

  return [...rows.values()]
    .sort((a, b) => a.t - b.t)
    .map((row) => ({ ...row, expenseFill: row.expenses ?? row.projected }))
}

function formatValueTick(cents: number) {
  return formatMoney(cents, { cents: false })
}

/** Hollow marker on projected points, skipping any that are also actual expenses (where the dashed line starts). */
function ProjectedDot({ cx, cy, payload }: DotItemDotProps) {
  const row = payload as ForecastRow
  if (row.projected == null || row.expenses != null || cx == null || cy == null) return <g />
  return <circle cx={cx} cy={cy} r={4} fill="var(--color-surface)" stroke="var(--color-danger)" strokeWidth={1.75} />
}

function renderProjectedDot(props: DotItemDotProps) {
  return <ProjectedDot key={`projected-${props.index}`} {...props} />
}

export function ForecastChart({ series }: { series: ForecastSeries }) {
  const incomeGradientId = useId()
  const expenseGradientId = useId()
  const rows = toRows(series)
  const [start, end] = timeDomain(rows.map((row) => row.t))
  const x = dateTicks(start, end, 5)
  const maxValue = Math.max(0, ...rows.flatMap((row) => [row.income ?? 0, row.expenses ?? 0, row.projected ?? 0]))
  const yTicks = valueTicks(maxValue, 4)

  function formatXTick(timestamp: number) {
    return formatDateTick(timestamp, x.unit)
  }

  return (
    <div>
      <div className="flex justify-center gap-7 text-[13px] text-muted">
        {legend.map((item) => (
          <span key={item.label} className="flex items-center gap-2">
            <span className={`size-2.5 rounded-full ${item.dot}`} />
            {item.label}
          </span>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={150} className="mt-2">
        <ComposedChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={incomeGradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.14} />
              <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id={expenseGradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-danger)" stopOpacity={0.22} />
              <stop offset="100%" stopColor="var(--color-danger)" stopOpacity={0.03} />
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
            tickMargin={8}
            padding={{ left: 12, right: 12 }}
          />
          <YAxis
            domain={[0, yTicks[yTicks.length - 1]]}
            ticks={yTicks}
            tickFormatter={formatValueTick}
            tick={axisTick}
            axisLine={false}
            tickLine={false}
            width={52}
          />

          <Area dataKey="income" type="linear" stroke="none" fill={`url(#${incomeGradientId})`} isAnimationActive={false} activeDot={false} />
          <Area dataKey="expenseFill" type="linear" stroke="none" fill={`url(#${expenseGradientId})`} isAnimationActive={false} activeDot={false} />

          <Line
            dataKey="income"
            type="linear"
            stroke="var(--color-primary)"
            strokeWidth={2.5}
            dot={{ r: 4.5, fill: 'var(--color-primary)', stroke: 'none' }}
            activeDot={false}
            connectNulls
            isAnimationActive={false}
          />
          <Line
            dataKey="expenses"
            type="linear"
            stroke="var(--color-danger)"
            strokeWidth={2.5}
            dot={{ r: 4.5, fill: 'var(--color-danger)', stroke: 'none' }}
            activeDot={false}
            connectNulls
            isAnimationActive={false}
          />
          <Line
            dataKey="projected"
            type="linear"
            stroke="var(--color-danger)"
            strokeWidth={2}
            strokeDasharray="6 5"
            dot={renderProjectedDot}
            activeDot={false}
            connectNulls
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
