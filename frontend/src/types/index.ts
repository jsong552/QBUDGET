/**
 * Shared data types. These describe the shapes the API is expected to return.
 * Core C++ counterparts: backend/src/models.hpp. Storage and ownership rules:
 * docs/data-model.md. Keep both definitions aligned when changing the API.
 *
 * Conventions:
 * - All money values are integer cents (`...Cents`). Expenses are negative where a value is signed.
 * - Dates are ISO strings (`YYYY-MM-DD`).
 * - Percentages are whole numbers (0-100) calculated by the API.
 * - Key unions (CategoryId, EventKind, ...) list the values the UI has styles for. Other strings are allowed and
 *   render with a neutral fallback style.
 */

export type IsoDate = string

// ---------- Users & auth ----------

export interface User {
  /** Firebase Auth UID. Supplied by the backend from verified identity. */
  id: string
  fullName: string
  firstName: string
  initials: string
  email: string
  studentId: string | null
}

export interface Session {
  user: User
  /** Firebase ID token for the authenticated session. */
  token: string | null
}

export interface SignInRequest {
  email: string
  password: string
}

// ---------- Categories ----------

export type CategoryId =
  | 'groceries'
  | 'food'
  | 'dining'
  | 'housing'
  | 'school'
  | 'transportation'
  | 'utilities'
  | 'income'
  | 'other'
  | (string & {})

export interface Category {
  custom?: boolean
  archived?: boolean
  id: CategoryId
  name: string
}

export interface CategoryTotal {
  category: Category
  amountCents: number
  /** Share of the total, 0-100. Only present where the API provides it. */
  percent?: number
}

export interface CategoryBreakdown {
  totalCents: number
  items: CategoryTotal[]
}

// ---------- Dashboard ----------

export type BudgetStatus = 'on_track' | 'at_risk' | 'over_budget'

export interface DashboardSummary {
  /** e.g. "Good morning" (the page appends the user's first name). */
  greeting: string
  availableBalanceCents: number
  periodEnd: IsoDate
  budgetStatus: BudgetStatus
  spentCents: number
  budgetCents: number
  /** Share of the budget already spent, 0-100. */
  spentPercent: number
  spentThisMonthCents: number
  /** Signed: positive = spent more than the comparison period. */
  spentChangePercent: number
  /** e.g. "from August". */
  spentChangeLabel: string
  dailyAllowanceCents: number
  daysRemaining: number
}

export type ActivityRange = 'week' | 'month' | 'term'

export interface SeriesPoint {
  date: IsoDate
  amountCents: number
}

export interface SpendingActivity {
  range: ActivityRange
  points: SeriesPoint[]
  /** Point to emphasise on the chart, if any. Should match one of `points`. */
  highlight: SeriesPoint | null
}

// ---------- Transactions ----------

export type TransactionType = 'income' | 'expense'

export interface Transaction {
  note?: string
  id: string
  date: IsoDate
  description: string
  category: Category
  type: TransactionType
  /** Signed: negative for expenses, positive for income. */
  amountCents: number
}

export interface TransactionSummary {
  totalIncomeCents: number
  /** Signed change vs the comparison period. */
  incomeChangeCents: number
  /** e.g. "from last month". */
  incomeChangeLabel: string
  totalExpensesCents: number
  /** Signed change vs the comparison period. */
  expensesChangeCents: number
  expensesChangeLabel: string
  remainingBalanceCents: number
  periodEnd: IsoDate
}

export type TransactionTypeFilter = 'all' | TransactionType
export type TransactionPeriodFilter = 'this_week' | 'all_time' | 'this_month' | 'last_month' | 'this_term'
export type TransactionSortKey = 'date' | 'description' | 'category' | 'type' | 'amount'

export interface TransactionFilters {
  search: string
  type: TransactionTypeFilter
  categoryId: CategoryId | 'all'
  period: TransactionPeriodFilter
  sortBy: TransactionSortKey
  sortDirection: 'asc' | 'desc'
}

export interface TransactionInput {
  note?: string
  // Ownership comes from the verified bearer token, never from this input.
  date: IsoDate
  description: string
  categoryId: CategoryId
  type: TransactionType
  /** Nonzero safe integer cents: negative expense, positive income. */
  amountCents: number
}

// ---------- Forecast ----------

export interface ForecastSummary {
  projectedIncomeCents: number
  projectedIncomeCaption: string
  projectedExpensesCents: number
  projectedExpensesCaption: string
  projectedBalanceCents: number
  projectedBalanceCaption: string
  /** e.g. "Fall 2024". */
  termLabel: string
}

export type ForecastGranularity = 'weekly' | 'monthly' | 'semester'

export interface ForecastSeries {
  granularity: ForecastGranularity
  income: SeriesPoint[]
  expenses: SeriesPoint[]
  /** Continues the expenses line; its first point repeats the last actual expense point. */
  projectedExpenses: SeriesPoint[]
}

export interface MonthlyProjection {
  month: IsoDate
  incomeCents: number
  expensesCents: number
  projectedBalanceCents: number
}

export interface MonthlyBreakdown {
  /** e.g. "Estimated expenses for the next 3 months." */
  description: string
  months: MonthlyProjection[]
}

export type GoalKind = 'savings' | 'spending_limit' | (string & {})

export interface BudgetGoal {
  id: string
  kind: GoalKind
  title: string
  currentCents: number
  targetCents: number
  /** Progress toward the target, 0-100. */
  percent: number
}

export interface BudgetGoalInput {
  kind: GoalKind
  title: string
  targetCents: number
}

// ---------- Calendar ----------

export type EventKind = 'rent' | 'credit_card' | 'tuition' | 'utilities' | 'textbook' | (string & {})

export interface CalendarEvent {
  paid?: boolean
  id: string
  title: string
  /** Shorter label used inside calendar cells. */
  shortTitle: string
  kind: EventKind
  date: IsoDate
  amountCents: number
  hasReminder: boolean
}

export interface UpcomingEvent {
  event: CalendarEvent
  daysAway: number
  isUrgent: boolean
}

export interface CalendarSummary {
  upcomingCount: number
  upcomingTotalCents: number
  windowDays: number
  nextPayment: {
    label: string
    date: IsoDate
    amountCents: number
  } | null
}

export interface CalendarMonth {
  /** First day of the displayed month. */
  month: IsoDate
  today: IsoDate
  events: CalendarEvent[]
}

export type CalendarView = 'month' | 'week'

export interface CalendarEventInput {
  paid?: boolean
  title: string
  kind: EventKind
  date: IsoDate
  amountCents: number
  hasReminder: boolean
}

export type ReminderLeadTime = '1_day' | '3_days' | '1_week'

export interface ReminderSettings {
  emailEnabled: boolean
  leadTime: ReminderLeadTime
}

// ---------- Settings ----------

export interface ProfileInput {
  fullName: string
  studentId: string | null
}

export type ThemePreference = 'light' | 'dark' | 'system'
export type CurrencyCode = 'CAD' | 'USD'
export type WeekStart = 'sunday' | 'monday'
export type DateFormatPreference = 'MMM_DD_YYYY' | 'DD_MM_YYYY' | 'YYYY_MM_DD'

export interface DisplayPreferences {
  theme: ThemePreference
  currency: CurrencyCode
  weekStart: WeekStart
  dateFormat: DateFormatPreference
}

export type NotificationKey = 'payment_reminders' | 'forecast_updates' | 'goal_updates' | 'product_announcements' | (string & {})

export interface NotificationPreference {
  key: NotificationKey
  title: string
  description: string
  enabled: boolean
}

// ---------- Notifications ----------

export interface AppNotification {
  id: string
  message: string
  createdAt: IsoDate
  read: boolean
}
