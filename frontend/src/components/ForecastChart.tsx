import { useId } from 'react'
import { areaPath, axisTicks, dateScale, linePath, valueScale, type ChartPoint } from '../lib/chart'
import { formatDate, formatMoney } from '../lib/format'
import type { ForecastSeries, SeriesPoint } from '../types'

const width = 720
const height = 160
const plot = { left: 56, right: width - 12, top: 12, bottom: height - 24 }

const legend = [
  { label: 'Income', dot: 'bg-primary' },
  { label: 'Expenses', dot: 'bg-danger' },
  { label: 'Projected expenses', dot: 'bg-info-light' },
]

export function ForecastChart({ series }: { series: ForecastSeries }) {
  const incomeGradientId = useId()
  const expenseGradientId = useId()
  const labels = series.axisLabels
  const x = dateScale(labels[0], labels[labels.length - 1], plot.left, plot.right)
  const y = valueScale(series.axisMaxCents, plot.top, plot.bottom)

  const toPoints = (points: SeriesPoint[]): ChartPoint[] => points.map((point) => ({ x: x(point.date), y: y(point.amountCents) }))
  const income = toPoints(series.income)
  const expenses = toPoints(series.expenses)
  const projected = toPoints(series.projectedExpenses)
  const expenseArea = [...expenses, ...projected.slice(1)]

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

      <svg viewBox={`0 0 ${width} ${height}`} className="mt-3 w-full" role="img" aria-label="Spending forecast chart">
        <defs>
          <linearGradient id={incomeGradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" className="[stop-color:var(--color-primary)]" stopOpacity={0.14} />
            <stop offset="100%" className="[stop-color:var(--color-primary)]" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id={expenseGradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" className="[stop-color:var(--color-danger)]" stopOpacity={0.22} />
            <stop offset="100%" className="[stop-color:var(--color-danger)]" stopOpacity={0.03} />
          </linearGradient>
        </defs>

        {axisTicks(series.axisMaxCents, series.axisStepCents).map((tick) => (
          <g key={tick}>
            <line x1={plot.left} x2={plot.right} y1={y(tick)} y2={y(tick)} className="stroke-line" strokeWidth={1} />
            <text x={plot.left - 14} y={y(tick) + 4} textAnchor="end" className="fill-muted text-[11px]">
              {formatMoney(tick, { cents: false })}
            </text>
          </g>
        ))}

        {labels.map((label) => (
          <text key={label} x={x(label)} y={height - 4} textAnchor="middle" className="fill-muted text-[10px]">
            {formatDate(label, 'monthShort')}
          </text>
        ))}

        <path d={areaPath(linePath(income), income, plot.bottom)} fill={`url(#${incomeGradientId})`} />
        <path d={areaPath(linePath(expenseArea), expenseArea, plot.bottom)} fill={`url(#${expenseGradientId})`} />

        <path d={linePath(income)} fill="none" className="stroke-primary" strokeWidth={2.5} />
        <path d={linePath(expenses)} fill="none" className="stroke-danger" strokeWidth={2.5} />
        <path d={linePath(projected)} fill="none" className="stroke-danger" strokeWidth={2} strokeDasharray="6 5" />

        {income.map((point) => (
          <circle key={`income-${point.x}`} cx={point.x} cy={point.y} r={4.5} className="fill-primary" />
        ))}
        {expenses.map((point) => (
          <circle key={`expense-${point.x}`} cx={point.x} cy={point.y} r={4.5} className="fill-danger" />
        ))}
        {projected.slice(1).map((point) => (
          <circle key={`projected-${point.x}`} cx={point.x} cy={point.y} r={4} className="fill-surface stroke-danger" strokeWidth={1.75} />
        ))}
      </svg>
    </div>
  )
}
