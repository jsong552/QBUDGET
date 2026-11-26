import { apiClient } from '../lib/apiClient'
import type { ForecastGranularity, MonthlyProjection, SeriesPoint } from '../types'

export interface ForecastHistoryMonth {
  start: string
  endExclusive: string
  isPartialMonth: boolean
  recordCount: number
  incomeCents: number
  expensesCents: number
  netCents: number
  categorySpending: { category: string; expensesCents: number }[]
}

export interface AiForecast {
  source: 'gemini' | 'baseline'
  reason: string
  message: string
  asOf: string
  model: string | null
  generatedAt: number | null
  cached: boolean
  summary: string
  risks: string[]
  suggestions: string[]
  assumptions: string[]
  months: MonthlyProjection[]
  projectedExpenses: Record<ForecastGranularity, SeriesPoint[]>
  projectedIncome?: Record<ForecastGranularity, SeriesPoint[]>
  snapshot?: {
    currentBalanceCents: number
    history: ForecastHistoryMonth[]
    budgetsIncluded: number
    goalsIncluded: number
  }
}
export const getAiForecastStatus = () => apiClient.get<{ enabled: boolean }>('/forecast/ai/status')
export const generateAiForecast = () => apiClient.post<AiForecast>('/forecast/ai', {})
