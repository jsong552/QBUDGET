import type { AiForecast } from '../services/aiForecastService'
import type { ForecastGranularity, ForecastSeries, ForecastSummary, MonthlyBreakdown } from '../types'

/** Keep historical series and income intact; use only server-validated AI spending and calculated balances. */
export function applyAiForecast(summary: ForecastSummary | undefined, series: ForecastSeries | undefined,
  breakdown: MonthlyBreakdown | undefined, ai: AiForecast | undefined, granularity: ForecastGranularity) {
  if (!summary || !series || !breakdown || ai?.source !== 'gemini' || !ai.months.length) return { summary, series, breakdown }
  return {
    summary: { ...summary, projectedIncomeCents: ai.months.reduce((sum, month) => sum + month.incomeCents, 0),
      projectedExpensesCents: ai.months.reduce((sum, month) => sum + month.expensesCents, 0),
      projectedExpensesCaption: 'Gemini spending estimate', projectedBalanceCents: ai.months.at(-1)!.projectedBalanceCents,
      projectedBalanceCaption: 'Balance using Gemini spending estimates' },
    series: { ...series, projectedExpenses: ai.projectedExpenses[granularity] },
    breakdown: { description: 'Gemini spending estimates. The current month covers remaining days; later months are full months.', months: ai.months },
  }
}
