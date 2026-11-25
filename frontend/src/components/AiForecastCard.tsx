import { Sparkles } from 'lucide-react'
import type { useAiForecast } from '../hooks/useAiForecast'
import { errorMessage } from '../lib/errors'
import { Button } from './Button'
import { Card, CardHeader } from './Card'

function Insights({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null
  return <div><h3 className="font-semibold text-ink">{title}</h3>
    <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-muted">
      {items.map((item, index) => <li key={index}>{item}</li>)}
    </ul></div>
}

export function AiForecastCard({ ai }: { ai: ReturnType<typeof useAiForecast> }) {
  const generated = ai.data?.source === 'gemini' ? ai.data : undefined
  return <Card className="mt-5 px-6 py-5">
    <CardHeader title="AI budget forecast" subtitle="Explore your spending outlook with Gemini."
      action={<div className="flex gap-3">
        {generated && <Button variant="outline" onClick={() => ai.setSelected(!ai.selected)}>
          {ai.selected ? 'Use standard forecast' : 'Use AI forecast'}
        </Button>}
        <Button icon={Sparkles} disabled={ai.busy || ai.checking || !ai.enabled} onClick={() => { void ai.generate() }}>
          {ai.busy ? 'Generating…' : generated ? 'Refresh AI forecast' : 'Generate AI forecast'}
        </Button>
      </div>} />
    <p className="mt-3 max-w-4xl text-sm text-muted">
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
      <p className="text-ink">{generated.summary}</p>
      <div className="grid grid-cols-2 gap-6"><Insights title="Budget risks" items={generated.risks} /><Insights title="Ways to save" items={generated.suggestions} /></div>
      <Insights title="Assumptions" items={generated.assumptions} />
      <p className="text-xs text-subtle">Income uses your standard projection. Balances include recorded transactions. Generating does not change your saved data.</p>
    </div>}
  </Card>
}
