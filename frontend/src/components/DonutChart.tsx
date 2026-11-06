import { Pie, PieChart } from 'recharts'
import { toneClasses, type Tone } from './tones'

export interface DonutSlice {
  id: string
  value: number
  tone: Tone
}

interface DonutChartProps {
  slices: DonutSlice[]
  centerValue: string
  centerLabel: string
  size?: number
  thickness?: number
}

/** Ring chart, clockwise from the top. Slice sizes are proportional to the values the API returns. */
export function DonutChart({ slices, centerValue, centerLabel, size = 160, thickness = 22 }: DonutChartProps) {
  const outerRadius = size / 2
  const data = slices
    .filter((slice) => slice.value > 0)
    .map((slice) => ({ id: slice.id, value: slice.value, fill: toneClasses[slice.tone].color }))

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <PieChart width={size} height={size} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
        <Pie
          data={data}
          dataKey="value"
          nameKey="id"
          cx="50%"
          cy="50%"
          innerRadius={outerRadius - thickness}
          outerRadius={outerRadius}
          startAngle={90}
          endAngle={-270}
          stroke="var(--color-surface)"
          strokeWidth={2}
          isAnimationActive={false}
        />
      </PieChart>
      <div className="pointer-events-none absolute inset-0 grid place-content-center text-center">
        <p className="text-[22px] leading-tight font-bold text-ink">{centerValue}</p>
        <p className="text-xs text-muted">{centerLabel}</p>
      </div>
    </div>
  )
}
