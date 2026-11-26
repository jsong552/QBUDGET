import { useState } from 'react'
import { CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { dateTicks, formatDateTick, timeDomain, valueTicks } from '../lib/chart'
import { formatMoney } from '../lib/format'
import { forecastChartRows } from '../lib/forecastChart'
import type { ForecastSeries } from '../types'

const lines = [
  { key: 'income', label: 'Recorded income', color: 'var(--color-primary)', projected: false },
  { key: 'expenses', label: 'Recorded expenses', color: 'var(--color-danger)', projected: false },
  { key: 'projectedIncome', label: 'Projected income', color: 'var(--color-success)', projected: true },
  { key: 'projected', label: 'Projected expenses', color: 'var(--color-info)', projected: true },
] as const
const axisTick = { fill: 'var(--color-muted)', fontSize: 11 }

export function ForecastChart({ series }: { series: ForecastSeries }) {
  const [showIncome, setShowIncome] = useState(false)
  const rows = forecastChartRows(series)
  const [start, end] = timeDomain(rows.map((row) => row.t))
  const x = dateTicks(start, end, 7)
  const maxValue = Math.max(0, ...rows.flatMap((row) => [row.expenses ?? 0, row.projected ?? 0,
    ...(showIncome ? [row.income ?? 0, row.projectedIncome ?? 0] : [])]))
  const yTicks = valueTicks(maxValue, 4)
  const shown = lines.filter((line) => (showIncome || !line.key.toLowerCase().includes('income')) &&
    (line.key !== 'projectedIncome' || series.projectedIncome?.length))
  return <div aria-label="Recorded and projected cash flow chart">
    <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-muted">
      {shown.map((line) => <span key={line.key} className="flex items-center gap-2">
        <span className="w-5 border-t-2" style={{ borderColor: line.color, borderTopStyle: line.projected ? 'dashed' : 'solid' }} />
        {line.label}
      </span>)}
    </div>
    <label className="mt-3 flex cursor-pointer items-center justify-end gap-2 text-xs text-muted">
      <input type="checkbox" checked={showIncome} onChange={(event) => setShowIncome(event.target.checked)} />
      Include income comparison
    </label>
    <ResponsiveContainer width="100%" height={240} className="mt-3">
      <ComposedChart data={rows} margin={{ top: 12, right: 16, bottom: 0, left: 8 }}>
        <CartesianGrid vertical={false} stroke="var(--color-line)" />
        <XAxis dataKey="t" type="number" scale="time" domain={[start, end]} ticks={x.ticks}
          tickFormatter={(timestamp) => formatDateTick(timestamp, x.unit)} tick={axisTick}
          axisLine={false} tickLine={false} tickMargin={8} padding={{ left: 12, right: 12 }} />
        <YAxis domain={[0, yTicks[yTicks.length - 1]]} ticks={yTicks}
          tickFormatter={(cents) => formatMoney(cents, { cents: false })} tick={axisTick}
          axisLine={false} tickLine={false} width={64} />
        <Tooltip labelFormatter={(value) => formatDateTick(Number(value), series.granularity === 'weekly' ? 'day' : 'monthYear')}
          formatter={(value) => formatMoney(Number(value))} />
        {shown.map((line) => <Line key={line.key} dataKey={line.key} name={line.label} type="linear"
          stroke={line.color} strokeWidth={2.5} strokeDasharray={line.projected ? '6 4' : undefined}
          dot={{ r: 4, fill: line.projected ? 'var(--color-surface)' : line.color, stroke: line.color, strokeWidth: 2 }}
          activeDot={{ r: 6 }} isAnimationActive={false} />)}
      </ComposedChart>
    </ResponsiveContainer>
    <p className="mt-3 text-xs text-muted">Solid lines show recorded transactions. Dashed lines show expected period totals, including recorded amounts in the current period. Hover for exact amounts.</p>
  </div>
}
