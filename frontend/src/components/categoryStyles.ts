import { BookOpen, BriefcaseBusiness, Bus, Coffee, House, Lightbulb, ShoppingCart, Tag, Utensils, type LucideIcon } from 'lucide-react'
import type { CategoryId } from '../types'
import type { Tone } from './tones'

export interface CategoryStyle {
  icon: LucideIcon
  /** Badge colour (Expenses table). */
  tone: Tone
}

/** Neutral style for any category the UI has no entry for. */
export const fallbackCategoryStyle: CategoryStyle = { icon: Tag, tone: 'quiet' }

const categoryStyles: Partial<Record<CategoryId, CategoryStyle>> = {
  groceries: { icon: ShoppingCart, tone: 'info' },
  food: { icon: Utensils, tone: 'danger' },
  dining: { icon: Coffee, tone: 'accent' },
  housing: { icon: House, tone: 'danger' },
  school: { icon: BookOpen, tone: 'plum' },
  transportation: { icon: Bus, tone: 'accent' },
  utilities: { icon: Lightbulb, tone: 'accent' },
  income: { icon: BriefcaseBusiness, tone: 'success' },
  other: { icon: Tag, tone: 'quiet' },
}

export function getCategoryStyle(id: CategoryId): CategoryStyle {
  return categoryStyles[id] ?? fallbackCategoryStyle
}

/**
 * Donut and legend colours by category ID, so a category keeps its colour whatever order the API returns.
 * The Home and Forecast sketches colour some categories differently, so each chart has its own map for now.
 * Merge them into one once the category list is settled.
 */
export type ChartPalette = Partial<Record<CategoryId, Tone>>

export const homeChartPalette: ChartPalette = {
  groceries: 'primary',
  housing: 'danger',
  school: 'accent',
  other: 'quiet',
}

export const forecastChartPalette: ChartPalette = {
  housing: 'primary',
  food: 'danger',
  transportation: 'accent',
  school: 'infoLight',
  other: 'plum',
}

export function getChartTone(palette: ChartPalette, id: CategoryId): Tone {
  return palette[id] ?? 'quiet'
}
