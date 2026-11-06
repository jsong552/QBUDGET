import type { IsoDate } from '../types'
import { parseIsoDate } from './format'

export interface ChartPoint {
  x: number
  y: number
}

/** Smooth path through the points (Catmull-Rom converted to cubic Béziers). */
export function smoothPath(points: ChartPoint[]): string {
  if (points.length === 0) return ''
  let path = `M ${points[0].x} ${points[0].y}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] ?? p2
    const c1x = p1.x + (p2.x - p0.x) / 6
    const c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6
    const c2y = p2.y - (p3.y - p1.y) / 6
    path += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`
  }
  return path
}

/** Straight-segment path through the points. */
export function linePath(points: ChartPoint[]): string {
  return points.map((point, i) => `${i === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')
}

/** Closes a line path down to the baseline so it can be filled. */
export function areaPath(line: string, points: ChartPoint[], baselineY: number): string {
  if (points.length === 0) return ''
  return `${line} L ${points[points.length - 1].x} ${baselineY} L ${points[0].x} ${baselineY} Z`
}

/** Maps dates onto a horizontal pixel range. */
export function dateScale(start: IsoDate, end: IsoDate, left: number, right: number) {
  const startMs = parseIsoDate(start).getTime()
  const span = parseIsoDate(end).getTime() - startMs || 1
  return (date: IsoDate) => left + ((parseIsoDate(date).getTime() - startMs) / span) * (right - left)
}

/** Maps cents onto a vertical pixel range (0 at the bottom). */
export function valueScale(maxCents: number, top: number, bottom: number) {
  return (cents: number) => bottom - (cents / maxCents) * (bottom - top)
}

export function axisTicks(maxCents: number, stepCents: number): number[] {
  const ticks: number[] = []
  for (let value = 0; value <= maxCents; value += stepCents) ticks.push(value)
  return ticks
}
