// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { ForecastPage } from './ForecastPage'
import { setAuthTokenProvider } from '../lib/apiClient'
import type { ForecastView } from '../services/forecastService'
import type { AiForecast } from '../services/aiForecastService'
import type { ForecastSeries } from '../types'

vi.mock('../components/PageHeader', () => ({ PageHeader: () => <h1>Forecast</h1> }))
vi.mock('../components/DonutChart', () => ({ DonutChart: () => null }))
vi.mock('../components/ForecastChart', () => ({ ForecastChart: ({ series }: { series: ForecastSeries }) => <div data-testid="projection">{JSON.stringify(series.projectedExpenses)}</div> }))

const standard: ForecastView = {
  summary: { projectedIncomeCents: 10000, projectedExpensesCents: 5000, projectedBalanceCents: 5000,
    projectedIncomeCaption: 'Income', projectedExpensesCaption: 'Standard spending', projectedBalanceCaption: 'Standard balance', termLabel: 'Current term' },
  series: { granularity: 'monthly', income: [], expenses: [], projectedExpenses: [{ date: '2026-12-01', amountCents: 5000 }] },
  categories: { totalCents: 0, items: [] }, goals: [],
  breakdown: { description: 'Standard estimate', months: [{ month: '2026-12-01', incomeCents: 10000, expensesCents: 5000, projectedBalanceCents: 5000 }] },
}
const generated: AiForecast = { source: 'gemini', reason: '', message: '', asOf: '2026-11-25', model: 'gemini-test',
  generatedAt: 1795600000, cached: false, summary: 'Spending is likely to rise.', risks: ['Rent is due soon.'], suggestions: ['Review optional spending.'], assumptions: ['Income stays steady.'],
  months: [{ month: '2026-12-01', incomeCents: 10000, expensesCents: 7000, projectedBalanceCents: 3000 }],
  projectedExpenses: { monthly: [{ date: '2026-12-01', amountCents: 7000 }], weekly: [{ date: '2026-11-30', amountCents: 1750 }], semester: [{ date: '2026-09-01', amountCents: 7000 }] },
}
let root: Root
let container: HTMLDivElement
let enabled = true
let generate: () => Promise<Response>
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } })
const fetchMock = vi.fn()
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  enabled = true
  generate = async () => json(generated)
  fetchMock.mockImplementation((url: string) => {
    if (url.endsWith('/ai/status')) return Promise.resolve(json({ enabled }))
    if (url.endsWith('/forecast/ai')) return generate()
    if (url.includes('/forecast?')) return Promise.resolve(json(standard))
    throw new Error(`Unexpected request: ${url}`)
  })
  vi.stubGlobal('fetch', fetchMock)
  setAuthTokenProvider(async () => 'firebase-test-token')
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
})
afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  setAuthTokenProvider(null)
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})
async function mount() { await act(async () => root.render(<ForecastPage />)) }
function button(label: string) {
  const result = Array.from(container.querySelectorAll('button')).find((item) => item.textContent === label)
  if (!result) throw new Error(`Missing button: ${label}`)
  return result
}
async function click(label: string) { await act(async () => button(label).click()) }
const aiCalls = () => fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/forecast/ai'))

it('only sends budget analysis when requested, then updates cards, chart and table', async () => {
  await mount()
  expect(aiCalls()).toHaveLength(0)
  expect(container.textContent).toContain('Generating sends summarized')
  await click('Generate AI forecast')
  expect(aiCalls()).toHaveLength(1)
  expect(aiCalls()[0][1].headers.Authorization).toBe('Bearer firebase-test-token')
  expect(aiCalls()[0][1].body).toBe('{}')
  expect(container.textContent).toContain('Spending is likely to rise.')
  expect(container.textContent).toContain('Review optional spending.')
  expect(container.textContent).toContain('Gemini spending estimate')
  expect(container.querySelector('[data-testid="projection"]')?.textContent).toContain('7000')
  expect(container.querySelector('tbody')?.textContent).toContain('70.00')
  await click('Use standard forecast')
  expect(container.querySelector('[data-testid="projection"]')?.textContent).toContain('5000')
  await click('Use AI forecast')
  await click('Weekly')
  expect(container.querySelector('[data-testid="projection"]')?.textContent).toContain('1750')
  expect(aiCalls()).toHaveLength(1)
})
it('shows missing configuration without calling Gemini', async () => {
  enabled = false
  await mount()
  expect(button('Generate AI forecast').disabled).toBe(true)
  expect(container.textContent).toContain('not enabled yet')
  expect(aiCalls()).toHaveLength(0)
})
it('keeps the standard forecast after quota or invalid-response fallback', async () => {
  generate = async () => json({ ...generated, source: 'baseline', reason: 'quota', message: 'Usage limit reached.', model: null })
  await mount()
  await click('Generate AI forecast')
  expect(container.textContent).toContain('Usage limit reached.')
  expect(container.querySelector('[data-testid="projection"]')?.textContent).toContain('5000')
  expect(container.textContent).not.toContain('Spending is likely to rise.')
})
it('shows authentication errors and allows retry without hiding the standard forecast', async () => {
  generate = async () => json({ error: 'Please sign in again.' }, 401)
  await mount()
  await click('Generate AI forecast')
  expect(container.querySelector('[role="alert"]')?.textContent).toContain('Please sign in again.')
  expect(button('Generate AI forecast').disabled).toBe(false)
  expect(container.querySelector('[data-testid="projection"]')?.textContent).toContain('5000')
})
it('prevents duplicate clicks and discards pending AI output when budget data changes', async () => {
  let resolve!: (value: Response) => void
  generate = () => new Promise((done) => { resolve = done })
  await mount()
  await click('Generate AI forecast')
  expect(button('Generating…').disabled).toBe(true)
  await click('Generating…')
  expect(aiCalls()).toHaveLength(1)
  await act(async () => window.dispatchEvent(new Event('qbudget:data-changed')))
  await act(async () => resolve(json(generated)))
  expect(container.textContent).not.toContain('Spending is likely to rise.')
  expect(container.querySelector('[data-testid="projection"]')?.textContent).toContain('5000')
})
it('clears an existing AI forecast after recurring entries are generated', async () => {
  await mount()
  await click('Generate AI forecast')
  await act(async () => window.dispatchEvent(new Event('qbudget:transactions-generated')))
  expect(container.textContent).not.toContain('Spending is likely to rise.')
  expect(container.querySelector('[data-testid="projection"]')?.textContent).toContain('5000')
})
it('renders model text safely as text', async () => {
  generate = async () => json({ ...generated, summary: '<img src=x onerror=alert(1)>' })
  await mount()
  await click('Generate AI forecast')
  expect(container.textContent).toContain('<img src=x onerror=alert(1)>')
  expect(container.querySelector('img')).toBeNull()
})
