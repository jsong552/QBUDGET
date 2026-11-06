import { CalendarDays, ChevronRight, CreditCard, type LucideIcon } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Card, CardHeader } from '../components/Card'
import { DonutChart } from '../components/DonutChart'
import { PageHeader } from '../components/PageHeader'
import { ProgressBar } from '../components/ProgressBar'
import { SegmentedControl } from '../components/SegmentedControl'
import { SpendingActivityChart } from '../components/SpendingActivityChart'
import { getChartTone, homeChartPalette } from '../components/categoryStyles'
import { toneClasses, type Tone } from '../components/tones'
import { useCurrentUser } from '../hooks/useAuth'
import { useDashboard } from '../hooks/useDashboard'
import { formatDate, formatMoney, formatPercentChange } from '../lib/format'
import type { ActivityRange, BudgetStatus, CategoryBreakdown, DashboardSummary } from '../types'

const rangeOptions: { value: ActivityRange; label: string }[] = [
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'term', label: 'Term' },
]

const statusLabels: Record<BudgetStatus, string> = {
  on_track: 'On track',
  at_risk: 'At risk',
  over_budget: 'Over budget',
}

function BalanceCard({ summary }: { summary: DashboardSummary }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-primary px-6 pt-5 pb-5 text-on-primary shadow-card">
      <div className="absolute -top-16 -right-10 size-44 rounded-full bg-on-primary/5" />
      <div className="relative flex items-center justify-between">
        <p className="text-sm text-on-sidebar-muted">Available balance</p>
        <span className="rounded-md bg-on-primary/15 px-2.5 py-1 text-xs font-semibold">{statusLabels[summary.budgetStatus]}</span>
      </div>
      <p className="relative mt-3 text-[34px] leading-tight font-bold tracking-tight">{formatMoney(summary.availableBalanceCents)}</p>
      <p className="relative text-sm text-on-sidebar-muted">to spend until {formatDate(summary.periodEnd, 'monthDay')}</p>
      <div className="relative mt-7">
        <ProgressBar percent={summary.spentPercent} tone="accent" trackClassName="bg-on-primary/20" height="thin" />
        <div className="mt-2 flex justify-between text-[11px] text-on-sidebar-muted">
          <span>{formatMoney(summary.spentCents)} spent</span>
          <span>{formatMoney(summary.budgetCents, { cents: false })} budget</span>
        </div>
      </div>
    </div>
  )
}

interface MiniStatCardProps {
  tone: Tone
  icon: LucideIcon
  label: string
  value: string
  caption: ReactNode
}

function MiniStatCard({ tone, icon: Icon, label, value, caption }: MiniStatCardProps) {
  return (
    <div className={`rounded-2xl border-t-4 bg-surface px-5 pt-4 pb-5 shadow-card ${toneClasses[tone].border}`}>
      <span className={`grid size-9 place-items-center rounded-lg ${toneClasses[tone].soft}`}>
        <Icon className="size-[18px]" strokeWidth={2} />
      </span>
      <p className="mt-4 text-sm text-muted">{label}</p>
      <p className="mt-1 text-[26px] leading-tight font-bold tracking-tight text-ink">{value}</p>
      <p className="mt-3 text-xs text-muted">{caption}</p>
    </div>
  )
}

function CategoryCard({ breakdown, onViewAllCategories }: { breakdown: CategoryBreakdown; onViewAllCategories: () => void }) {
  const slices = breakdown.items.map((item) => ({
    id: item.category.id,
    value: item.amountCents,
    tone: getChartTone(homeChartPalette, item.category.id),
  }))

  return (
    <Card className="px-6 pt-5 pb-6">
      <CardHeader
        eyebrow="This month"
        title="By category"
        action={
          <button type="button" onClick={onViewAllCategories} className="mt-4 flex items-center gap-0.5 text-sm font-semibold text-ink">
            View all <ChevronRight className="size-4" />
          </button>
        }
      />
      <div className="mt-5 flex items-center gap-8">
        <DonutChart slices={slices} centerValue={formatMoney(breakdown.totalCents, { cents: false })} centerLabel="total" size={150} thickness={22} />
        <ul className="flex-1 space-y-4">
          {breakdown.items.map((item, i) => (
            <li key={item.category.id} className="flex items-center text-sm">
              <span className={`size-2 rounded-full ${toneClasses[slices[i].tone].solid}`} />
              <span className="ml-3 text-muted">{item.category.name}</span>
              <span className="ml-auto font-bold text-ink">{formatMoney(item.amountCents, { cents: false })}</span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  )
}

export function HomePage() {
  const user = useCurrentUser()
  const [range, setRange] = useState<ActivityRange>('month')
  const { summary, activity, categories } = useDashboard(range)

  function onRangeChange(nextRange: ActivityRange) {
    setRange(nextRange)
  }

  function onViewAllCategories() {
    console.info('[ui] view all categories')
  }

  return (
    <div>
      <PageHeader
        title={
          summary && (
            <>
              {summary.greeting}, <span className="text-primary">{user.firstName}.</span>
            </>
          )
        }
        subtitle="Here's how your semester budget is looking."
      />

      {summary && (
        <div className="mt-6 grid grid-cols-[1.7fr_1fr_1fr] gap-4">
          <BalanceCard summary={summary} />
          <MiniStatCard
            tone="danger"
            icon={CreditCard}
            label="Spent this month"
            value={formatMoney(summary.spentThisMonthCents)}
            caption={`${formatPercentChange(summary.spentChangePercent)} ${summary.spentChangeLabel}`}
          />
          <MiniStatCard
            tone="accent"
            icon={CalendarDays}
            label="Daily allowance"
            value={formatMoney(summary.dailyAllowanceCents)}
            caption={`${summary.daysRemaining} days remaining`}
          />
        </div>
      )}

      <div className="mt-4 grid grid-cols-[1.55fr_1fr] gap-4">
        <Card className="px-6 pt-5 pb-4">
          <CardHeader
            eyebrow="Overview"
            title="Spending activity"
            action={<SegmentedControl options={rangeOptions} value={range} onChange={onRangeChange} size="sm" />}
          />
          <div className="mt-4">{activity && <SpendingActivityChart activity={activity} />}</div>
        </Card>
        {categories && <CategoryCard breakdown={categories} onViewAllCategories={onViewAllCategories} />}
      </div>
    </div>
  )
}
