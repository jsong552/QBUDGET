import { ArrowDown, EllipsisVertical, GraduationCap, House, Plus, Target, TrendingUp, Wallet, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../components/Button'
import { Card, CardHeader } from '../components/Card'
import { DonutChart } from '../components/DonutChart'
import { ForecastChart } from '../components/ForecastChart'
import { IconCircle } from '../components/IconCircle'
import { PageHeader } from '../components/PageHeader'
import { ProgressBar } from '../components/ProgressBar'
import { SegmentedControl } from '../components/SegmentedControl'
import { StatCard } from '../components/StatCard'
import { forecastChartPalette, getChartTone } from '../components/categoryStyles'
import { toneClasses, type Tone } from '../components/tones'
import { useForecast } from '../hooks/useForecast'
import { formatDate, formatMoney } from '../lib/format'
import type { BudgetGoal, BudgetGoalInput, CategoryBreakdown, ForecastGranularity, GoalKind, MonthlyBreakdown } from '../types'

const granularityOptions: { value: ForecastGranularity; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'semester', label: 'Semester' },
]

interface GoalStyle {
  icon: LucideIcon
  iconTone: Tone
  barTone: Tone
}

const goalStyles: Partial<Record<GoalKind, GoalStyle>> = {
  savings: { icon: GraduationCap, iconTone: 'success', barTone: 'success' },
  spending_limit: { icon: House, iconTone: 'danger', barTone: 'accent' },
}

/** Neutral style for goal kinds the UI has no entry for. */
const fallbackGoalStyle: GoalStyle = { icon: Target, iconTone: 'quiet', barTone: 'quiet' }

const newGoalDraft: BudgetGoalInput = { kind: 'savings', title: '', targetCents: 0 }

function CategoryCard({ breakdown, termLabel }: { breakdown: CategoryBreakdown; termLabel: string }) {
  const slices = breakdown.items.map((item) => ({
    id: item.category.id,
    value: item.amountCents,
    tone: getChartTone(forecastChartPalette, item.category.id),
  }))

  return (
    <Card className="px-6 pt-5 pb-6">
      <CardHeader title="Spending by category" subtitle={`Projected expenses for ${termLabel}.`} />
      <div className="mt-5 flex items-center gap-7">
        <DonutChart slices={slices} centerValue={formatMoney(breakdown.totalCents, { cents: false })} centerLabel="total" size={148} thickness={24} />
        <ul className="flex-1 space-y-3.5">
          {breakdown.items.map((item, i) => (
            <li key={item.category.id} className="flex items-center text-[15px]">
              <span className={`size-3 rounded-full ${toneClasses[slices[i].tone].solid}`} />
              <span className="ml-3 flex-1 text-muted">{item.category.name}</span>
              <span className="ml-auto font-bold text-ink">{formatMoney(item.amountCents, { cents: false })}</span>
              <span className="w-12 text-right text-sm text-muted">{item.percent}%</span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  )
}

function GoalRow({ goal, onOpenGoalMenu }: { goal: BudgetGoal; onOpenGoalMenu: (goal: BudgetGoal) => void }) {
  const style = goalStyles[goal.kind] ?? fallbackGoalStyle

  function onMenuClick() {
    onOpenGoalMenu(goal)
  }

  return (
    <li className="flex items-center gap-4 rounded-xl border border-line px-3 py-2.5">
      <IconCircle icon={style.icon} tone={style.iconTone} size="md" />
      <div className="flex-1">
        <p className="text-[15px] font-medium whitespace-nowrap text-ink">{goal.title}</p>
        <div className="mt-1.5">
          <ProgressBar percent={goal.percent} tone={style.barTone} trackClassName="bg-line" />
        </div>
      </div>
      <div className="w-24 shrink-0 text-sm">
        <p className="text-muted">
          {formatMoney(goal.currentCents, { cents: false })} / {formatMoney(goal.targetCents, { cents: false })}
        </p>
        <p className={`font-semibold ${toneClasses[style.barTone].text}`}>{goal.percent}%</p>
      </div>
      <button type="button" aria-label={`Options for ${goal.title}`} onClick={onMenuClick} className="p-1 text-muted hover:text-ink">
        <EllipsisVertical className="size-5" />
      </button>
    </li>
  )
}

function BreakdownTable({ breakdown }: { breakdown: MonthlyBreakdown }) {
  return (
    <table className="mt-4 w-full text-sm">
      <thead>
        <tr className="bg-surface-muted text-ink">
          <th className="rounded-l-md px-5 py-1.5 text-left font-medium">Month</th>
          <th className="px-3 py-1.5 text-center font-medium">Income</th>
          <th className="px-3 py-1.5 text-center font-medium">Expenses</th>
          <th className="rounded-r-md px-3 py-1.5 text-center font-medium">Projected balance</th>
        </tr>
      </thead>
      <tbody>
        {breakdown.months.map((row) => (
          <tr key={row.month} className="border-b border-line">
            <td className="px-5 py-1.5 text-ink">{formatDate(row.month, 'month')}</td>
            <td className="px-3 py-1.5 text-center text-success">{formatMoney(row.incomeCents)}</td>
            <td className="px-3 py-1.5 text-center text-danger">{formatMoney(row.expensesCents)}</td>
            <td className="px-3 py-1.5 text-center text-ink">{formatMoney(row.projectedBalanceCents)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function ForecastPage() {
  const [granularity, setGranularity] = useState<ForecastGranularity>('monthly')
  const { summary, series, categories, breakdown, goals, addGoal } = useForecast(granularity)

  function onGranularityChange(next: ForecastGranularity) {
    setGranularity(next)
  }

  function onAddGoal() {
    return addGoal(newGoalDraft)
  }

  function onOpenGoalMenu(goal: BudgetGoal) {
    console.info('[ui] open goal menu', goal.id)
  }

  return (
    <div>
      <PageHeader
        title="Forecast"
        subtitle="View your spending trends, set goals, and see a prediction of your budget."
      />

      {summary && (
        <div className="mt-5 grid grid-cols-3 gap-5">
          <StatCard tone="success" icon={TrendingUp} label="Projected income" value={formatMoney(summary.projectedIncomeCents)} caption={summary.projectedIncomeCaption} />
          <StatCard tone="danger" icon={ArrowDown} label="Projected expenses" value={formatMoney(summary.projectedExpensesCents)} caption={summary.projectedExpensesCaption} />
          <StatCard tone="accent" icon={Wallet} label="Projected balance" value={formatMoney(summary.projectedBalanceCents)} caption={summary.projectedBalanceCaption} />
        </div>
      )}

      <div className="mt-4 grid grid-cols-[1.4fr_1fr] gap-5">
        <Card className="px-6 pt-5 pb-4">
          <CardHeader
            title="Spending forecast"
            subtitle="Compare your income and expenses over time."
            action={<SegmentedControl options={granularityOptions} value={granularity} onChange={onGranularityChange} />}
          />
          <div className="mt-2">{series && <ForecastChart series={series} />}</div>
        </Card>
        {categories && summary && <CategoryCard breakdown={categories} termLabel={summary.termLabel} />}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-5">
        <Card className="px-5 pt-5 pb-4">
          <CardHeader
            title="Budget goals"
            subtitle="Set and track your financial goals for the semester."
            action={
              <Button icon={Plus} onClick={onAddGoal}>
                Add goal
              </Button>
            }
          />
          <ul className="mt-4 space-y-2.5">
            {goals?.map((goal) => (
              <GoalRow key={goal.id} goal={goal} onOpenGoalMenu={onOpenGoalMenu} />
            ))}
          </ul>
        </Card>
        <Card className="px-5 pt-5 pb-4">
          <CardHeader title="Predicted monthly breakdown" subtitle={breakdown?.description} />
          {breakdown && <BreakdownTable breakdown={breakdown} />}
        </Card>
      </div>
    </div>
  )
}
