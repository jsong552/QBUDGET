import { apiClient } from '../lib/apiClient'
import type { ForecastGranularity, MonthlyProjection, SeriesPoint } from '../types'

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
}
export const getAiForecastStatus = () => apiClient.get<{ enabled: boolean }>('/forecast/ai/status')
export const generateAiForecast = () => apiClient.post<AiForecast>('/forecast/ai', {})
