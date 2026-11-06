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

/** Ring chart. Slice sizes are proportional to the values the API returns. */
export function DonutChart({ slices, centerValue, centerLabel, size = 160, thickness = 22 }: DonutChartProps) {
  const radius = (size - thickness) / 2
  const circumference = 2 * Math.PI * radius
  const total = slices.reduce((sum, slice) => sum + slice.value, 0) || 1
  const gap = 2

  const lengths = slices.map((slice) => (slice.value / total) * circumference)
  const arcs = slices.map((slice, i) => ({
    ...slice,
    length: Math.max(lengths[i] - gap, 0),
    offset: lengths.slice(0, i).reduce((sum, length) => sum + length, 0),
  }))

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        {arcs.map((arc) => (
          <circle
            key={arc.id}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={thickness}
            strokeDasharray={`${arc.length} ${circumference - arc.length}`}
            strokeDashoffset={-arc.offset}
            className={toneClasses[arc.tone].stroke}
          />
        ))}
      </svg>
      <div className="absolute inset-0 m-auto grid place-content-center rounded-full text-center">
        <p className="text-[22px] leading-tight font-bold text-ink">{centerValue}</p>
        <p className="text-xs text-muted">{centerLabel}</p>
      </div>
    </div>
  )
}
