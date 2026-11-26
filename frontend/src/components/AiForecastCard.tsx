import { Sparkles } from 'lucide-react'
import type { useAiForecast } from '../hooks/useAiForecast'
import type { AiForecast } from '../services/aiForecastService'
import { errorMessage } from '../lib/errors'
import { formatDate, formatLabel, formatMoney, formatMoneyChange } from '../lib/format'
import { Button } from './Button'
import { Card, CardHeader } from './Card'

function Insights({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null
  return <div><h3 className="font-semibold text-ink">{title}</h3>
    <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-muted">
      {items.map((item, index) => <li key={index}>{item}</li>)}
    </ul></div>
}

/** Headline facts use validated numbers, never arithmetic or category claims from model prose. */
function BudgetSummaryFacts({ forecast }: { forecast: AiForecast }) {
  const current = forecast.snapshot?.history.at(-1)
  if (!current) return <p className="text-ink">{forecast.summary}</p>
  const largest = [...current.categorySpending].sort((a, b) => b.expensesCents - a.expensesCents)[0]
  const next = forecast.months.find((month) => month.month.slice(0, 7) > forecast.asOf.slice(0, 7))
  return <div className="grid grid-cols-3 gap-5" aria-label="Budget summary facts">
    <div className="rounded-xl bg-surface-muted p-4">
      <h3 className="text-sm font-medium text-muted">{formatDate(current.start, 'month')} {current.isPartialMonth ? 'so far' : 'recorded'}</h3>
      <p className="mt-2 text-xl font-bold text-ink">{formatMoney(current.netCents)} net</p>
      <p className="mt-2 text-sm text-muted">Income {formatMoney(current.incomeCents)} minus expenses {formatMoney(current.expensesCents)}.</p>
    </div>
    <div className="rounded-xl bg-surface-muted p-4">
      <h3 className="text-sm font-medium text-muted">Largest spending category</h3>
      <p className="mt-2 text-xl font-bold text-ink">{largest ? formatLabel(largest.category) : 'No spending'}</p>
      <p className="mt-2 text-sm text-muted">{largest ? `${formatMoney(largest.expensesCents)} · ${current.expensesCents > 0 ? Math.round(100 * largest.expensesCents / current.expensesCents) : 0}% of recorded spending this month.` : 'Add expenses to see your spending drivers.'}</p>
    </div>
    <div className="rounded-xl bg-surface-muted p-4">
      <h3 className="text-sm font-medium text-muted">{next ? `${formatDate(next.month, 'month')} outlook` : 'Upcoming cash flow'}</h3>
      <p className="mt-2 text-xl font-bold text-ink">{next ? `${formatMoney(next.incomeCents - next.expensesCents)} net` : 'No future month'}</p>
      {next && <p className="mt-2 text-sm text-muted">Expected income {formatMoney(next.incomeCents)} minus spending {formatMoney(next.expensesCents)}.</p>}
    </div>
  </div>
}

export function AiForecastCard({ ai }: { ai: ReturnType<typeof useAiForecast> }) {
  const generated = ai.data?.source === 'gemini' ? ai.data : undefined
  return <Card className="mt-5 px-6 py-5">
    <CardHeader title="Budget summary" subtitle="Your recorded spending, income and outlook with Gemini."
      action={<div className="flex gap-3">
        {generated && <Button variant="outline" onClick={() => ai.setSelected(!ai.selected)}>
          {ai.selected ? 'Use standard forecast' : 'Use AI forecast'}
        </Button>}
        <Button icon={Sparkles} disabled={ai.busy || ai.checking || !ai.enabled} onClick={() => { void ai.generate() }}>
          {ai.busy ? 'Generating…' : generated ? 'Refresh AI forecast' : 'Generate AI forecast'}
        </Button>
      </div>} />
    <p className="mt-3 max-w-4xl text-xs text-muted">
      Generating sends summarized income, spending, scheduled costs, budgets and goal amounts to Google Gemini.
      Names, email, transaction descriptions and notes are excluded. Estimates can be wrong; review them before making decisions.
    </p>
    {ai.checking && <p role="status" className="mt-3 text-sm text-muted">Checking AI availability…</p>}
    {!ai.checking && !ai.enabled && !ai.statusError && <p className="mt-3 text-sm text-muted">AI forecasting is not enabled yet. Your standard forecast is available below.</p>}
    {Boolean(ai.statusError) && <div role="alert" className="mt-3 text-sm text-danger">Could not check AI availability. <Button variant="outline" onClick={ai.retryStatus}>Retry</Button></div>}
    {ai.busy && <p role="status" className="mt-3 text-sm text-muted">Gemini is reviewing your budget. You can keep using the forecast below.</p>}
    {Boolean(ai.error) && <p role="alert" className="mt-3 text-sm text-danger">{errorMessage(ai.error)} Your standard forecast is available below.</p>}
    {ai.data?.source === 'baseline' && <p role="status" className="mt-3 text-sm text-muted">{ai.data.message}</p>}
    {generated && <div className="mt-4 space-y-4" aria-live="polite">
      <p className="text-sm font-medium text-primary">{ai.selected ? 'Showing Gemini projections' : 'Showing standard projections'} · {generated.generatedAt ? new Date(generated.generatedAt * 1000).toLocaleString() : generated.asOf}{generated.cached ? ' · Reused recent analysis' : ''}</p>
      <BudgetSummaryFacts forecast={generated} />
      {!ai.selected && <p className="text-sm text-muted">The summary describes the saved AI analysis. The chart and totals below are showing the standard forecast.</p>}
    </div>}
  </Card>
}

export function AiForecastDetails({ ai }: { ai: ReturnType<typeof useAiForecast> }) {
  const generated = ai.data?.source === 'gemini' ? ai.data : undefined
  if (!generated) return null
  const history = generated.snapshot?.history ?? []
  const current = history.at(-1)
  const previous = history.at(-2)
  const categories = [...(current?.categorySpending ?? [])].sort((a, b) => b.expensesCents - a.expensesCents)
  return <Card className="mt-4 px-6 py-5">
    <CardHeader title="What is driving your forecast?" subtitle="Recorded amounts below come from your transactions; the recommendations are AI estimates." />
    {current && <div className="mt-4 grid grid-cols-2 gap-8">
      <div>
        <h3 className="font-semibold">Income and spending history</h3>
        <table className="mt-3 w-full text-sm">
          <thead><tr className="text-muted"><th className="py-2 text-left">Period</th><th className="text-right">Income</th><th className="text-right">Expenses</th><th className="text-right">Net</th></tr></thead>
          <tbody>{history.map((month) => <tr key={month.start} className="border-t border-line">
            <td className="py-2">{formatDate(month.start, 'monthShort')}{month.isPartialMonth ? ' to date' : ''}</td>
            <td className="text-right">{formatMoney(month.incomeCents)}</td><td className="text-right">{formatMoney(month.expensesCents)}</td>
            <td className={`text-right font-medium ${month.netCents < 0 ? 'text-danger' : 'text-success'}`}>{formatMoney(month.netCents)}</td>
          </tr>)}</tbody>
        </table>
        <p className="mt-3 text-xs text-muted">Recorded balance: {formatMoney(generated.snapshot!.currentBalanceCents)}. This is income minus expenses in QBudget, not a linked bank balance. Missing records are not proof of zero activity.</p>
      </div>
      <div>
        <h3 className="font-semibold">Where your money goes this month</h3>
        <table className="mt-3 w-full text-sm">
          <thead><tr className="text-muted"><th className="py-2 text-left">Category</th><th className="text-right">Spent to date</th><th className="text-right">vs. last month</th></tr></thead>
          <tbody>{categories.slice(0, 5).map((item) => {
            const prior = previous?.categorySpending.find((row) => row.category === item.category)?.expensesCents ?? 0
            return <tr key={item.category} className="border-t border-line"><td className="py-2">{formatLabel(item.category)}</td>
              <td className="text-right">{formatMoney(item.expensesCents)}</td><td className="text-right">{previous?.recordCount ? formatMoneyChange(item.expensesCents - prior) : 'No prior records'}</td></tr>
          })}</tbody>
        </table>
        <p className="mt-3 text-xs text-muted">Current month to date vs. the full previous month; this is not a like-for-like rate comparison. {generated.snapshot?.budgetsIncluded === 0 ? 'No category budgets set. ' : ''}{generated.snapshot?.goalsIncluded === 0 ? 'No savings goals set.' : ''}</p>
      </div>
    </div>}
    <div className="mt-5 grid grid-cols-2 gap-8 border-t border-line pt-5"><Insights title="Watch next" items={generated.risks} /><Insights title="Practical next steps" items={generated.suggestions} /></div>
    <details className="mt-4 text-sm text-muted"><summary className="cursor-pointer">Assumptions and forecast method</summary>
      <div className="mt-3"><Insights title="Assumptions" items={generated.assumptions} /></div>
      <p className="mt-3">Income uses the previous two complete months when both have income records; otherwise it uses the last 30 days. Scheduled income is a minimum. The current month subtracts income already received from the monthly estimate. Later spending estimates use Gemini. Weekly projections spread each monthly amount across its remaining days; they do not predict individual payment dates.</p>
    </details>
  </Card>
}
