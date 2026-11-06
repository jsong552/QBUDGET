import type {
  AppNotification,
  BudgetGoal,
  CalendarEvent,
  CalendarMonth,
  CalendarSummary,
  Category,
  CategoryBreakdown,
  DashboardSummary,
  DisplayPreferences,
  ForecastSeries,
  ForecastSummary,
  MonthlyProjection,
  NotificationPreference,
  ReminderSettings,
  SpendingActivity,
  Transaction,
  TransactionSummary,
  UpcomingEvent,
  User,
} from '../types'

export const mockTodayLabel = 'Tuesday, September 10'

export const mockUser: User = {
  id: 'user-1',
  fullName: 'Alex Johnson',
  firstName: 'Alex',
  initials: 'AJ',
  email: 'alex.johnson@student.ca',
  studentId: '12345678',
}

const categories = {
  groceries: { id: 'groceries', name: 'Groceries' },
  food: { id: 'food', name: 'Food' },
  dining: { id: 'dining', name: 'Dining' },
  housing: { id: 'housing', name: 'Housing' },
  school: { id: 'school', name: 'School' },
  transportation: { id: 'transportation', name: 'Transportation' },
  utilities: { id: 'utilities', name: 'Utilities' },
  income: { id: 'income', name: 'Income' },
  other: { id: 'other', name: 'Other' },
} satisfies Record<string, Category>

export const mockCategories: Category[] = [
  categories.groceries,
  categories.dining,
  categories.housing,
  categories.school,
  categories.transportation,
  categories.utilities,
  categories.income,
  categories.other,
]

// ---------- Dashboard ----------

export const mockDashboardSummary: DashboardSummary = {
  todayLabel: 'Tuesday, September 16',
  availableBalanceCents: 124860,
  periodEnd: '2024-10-01',
  budgetStatus: 'on_track',
  spentCents: 75140,
  budgetCents: 200000,
  spentPercent: 38,
  spentThisMonthCents: 75140,
  spentChangePercent: 8,
  comparedToMonthLabel: 'August',
  dailyAllowanceCents: 8324,
  daysRemaining: 15,
}

export const mockSpendingActivity: Omit<SpendingActivity, 'range'> = {
  points: [
    { date: '2024-09-01', amountCents: 10000 },
    { date: '2024-09-04', amountCents: 24000 },
    { date: '2024-09-06', amountCents: 19000 },
    { date: '2024-09-09', amountCents: 40000 },
    { date: '2024-09-11', amountCents: 27500 },
    { date: '2024-09-12', amountCents: 39000 },
    { date: '2024-09-13', amountCents: 50000 },
    { date: '2024-09-14', amountCents: 56500 },
    { date: '2024-09-15', amountCents: 59000 },
  ],
  highlight: { date: '2024-09-12', amountCents: 39000 },
}

export const mockMonthCategoryBreakdown: CategoryBreakdown = {
  totalCents: 75100,
  items: [
    { category: categories.groceries, amountCents: 28600 },
    { category: categories.housing, amountCents: 21000 },
    { category: categories.school, amountCents: 14200 },
    { category: categories.other, amountCents: 11300 },
  ],
}

// ---------- Transactions ----------

export const mockTransactionSummary: TransactionSummary = {
  todayLabel: 'Tuesday, September 10',
  totalIncomeCents: 234000,
  incomeChangeCents: 24000,
  totalExpensesCents: 109140,
  expensesChangeCents: 12050,
  remainingBalanceCents: 124860,
  periodEnd: '2024-10-01',
}

export const mockTransactions: Transaction[] = [
  { id: 'txn-1', date: '2024-09-10', description: 'Grocery shopping', category: categories.groceries, type: 'expense', amountCents: -8524 },
  { id: 'txn-2', date: '2024-09-09', description: 'Part-time job', category: categories.income, type: 'income', amountCents: 45000 },
  { id: 'txn-3', date: '2024-09-07', description: 'Rent payment', category: categories.housing, type: 'expense', amountCents: -70000 },
  { id: 'txn-4', date: '2024-09-05', description: 'Coffee shop', category: categories.dining, type: 'expense', amountCents: -560 },
  { id: 'txn-5', date: '2024-09-03', description: 'Textbook', category: categories.school, type: 'expense', amountCents: -12000 },
]

// ---------- Forecast ----------

export const mockForecastSummary: ForecastSummary = {
  todayLabel: 'Tuesday, September 10',
  projectedIncomeCents: 850000,
  projectedExpensesCents: 725140,
  projectedBalanceCents: 124860,
  termLabel: 'Fall 2024',
}

export const mockForecastSeries: Omit<ForecastSeries, 'granularity'> = {
  income: [
    { date: '2024-09-01', amountCents: 140000 },
    { date: '2024-09-16', amountCents: 150000 },
    { date: '2024-10-01', amountCents: 158000 },
    { date: '2024-11-01', amountCents: 158000 },
    { date: '2024-12-01', amountCents: 195000 },
  ],
  expenses: [
    { date: '2024-09-01', amountCents: 30000 },
    { date: '2024-09-16', amountCents: 90000 },
    { date: '2024-10-01', amountCents: 100000 },
    { date: '2024-11-01', amountCents: 120000 },
  ],
  projectedExpenses: [
    { date: '2024-11-01', amountCents: 120000 },
    { date: '2024-12-01', amountCents: 150000 },
  ],
}

export const mockTermCategoryBreakdown: CategoryBreakdown = {
  totalCents: 725100,
  items: [
    { category: categories.housing, amountCents: 280000, percent: 39 },
    { category: categories.food, amountCents: 132000, percent: 18 },
    { category: categories.transportation, amountCents: 72000, percent: 10 },
    { category: categories.school, amountCents: 120000, percent: 17 },
    { category: categories.other, amountCents: 121100, percent: 16 },
  ],
}

export const mockBudgetGoals: BudgetGoal[] = [
  { id: 'goal-1', kind: 'savings', title: 'Save for winter semester', currentCents: 80000, targetCents: 150000, percent: 53 },
  { id: 'goal-2', kind: 'spending_limit', title: 'Keep monthly expenses under $1,000', currentCents: 75100, targetCents: 100000, percent: 75 },
]

export const mockMonthlyProjections: MonthlyProjection[] = [
  { month: '2024-09-01', incomeCents: 234000, expensesCents: 109140, projectedBalanceCents: 124860 },
  { month: '2024-10-01', incomeCents: 200000, expensesCents: 135000, projectedBalanceCents: 189860 },
  { month: '2024-11-01', incomeCents: 200000, expensesCents: 142000, projectedBalanceCents: 247860 },
  { month: '2024-12-01', incomeCents: 216000, expensesCents: 152000, projectedBalanceCents: 311860 },
]

// ---------- Calendar ----------

const calendarEvents = {
  textbook: { id: 'evt-1', title: 'Textbook Payment', shortTitle: 'Textbook Payment', kind: 'textbook', date: '2024-09-03', amountCents: 12000, hasReminder: false },
  utilitiesSept: { id: 'evt-2', title: 'Utilities', shortTitle: 'Utilities', kind: 'utilities', date: '2024-09-12', amountCents: 10000, hasReminder: false },
  rent: { id: 'evt-3', title: 'Rent Payment', shortTitle: 'Rent Payment', kind: 'rent', date: '2024-09-15', amountCents: 70000, hasReminder: true },
  creditCard: { id: 'evt-4', title: 'Credit Card Payment', shortTitle: 'Credit Card', kind: 'credit_card', date: '2024-09-20', amountCents: 12000, hasReminder: true },
  tuition: { id: 'evt-5', title: 'Tuition Payment', shortTitle: 'Tuition Payment', kind: 'tuition', date: '2024-09-25', amountCents: 80000, hasReminder: true },
  utilitiesOct: { id: 'evt-6', title: 'Utilities', shortTitle: 'Utilities', kind: 'utilities', date: '2024-10-12', amountCents: 10000, hasReminder: false },
} satisfies Record<string, CalendarEvent>

export const mockCalendarSummary: CalendarSummary = {
  todayLabel: 'Tuesday, September 10',
  upcomingCount: 3,
  upcomingTotalCents: 172000,
  windowDays: 30,
  nextPayment: { label: 'Rent', date: '2024-09-15', amountCents: 70000 },
}

export const mockCalendarMonth: CalendarMonth = {
  month: '2024-09-01',
  today: '2024-09-10',
  events: [calendarEvents.textbook, calendarEvents.utilitiesSept, calendarEvents.rent, calendarEvents.creditCard, calendarEvents.tuition],
}

export const mockUpcomingEvents: UpcomingEvent[] = [
  { event: calendarEvents.rent, daysAway: 5, isUrgent: true },
  { event: calendarEvents.creditCard, daysAway: 10, isUrgent: false },
  { event: calendarEvents.tuition, daysAway: 15, isUrgent: false },
  { event: calendarEvents.utilitiesOct, daysAway: 32, isUrgent: true },
]

export const mockReminderSettings: ReminderSettings = {
  emailEnabled: true,
  leadTime: '3_days',
}

// ---------- Settings ----------

export const mockDisplayPreferences: DisplayPreferences = {
  theme: 'light',
  currency: 'CAD',
  weekStart: 'sunday',
  dateFormat: 'MMM_DD_YYYY',
}

export const mockNotificationPreferences: NotificationPreference[] = [
  { key: 'payment_reminders', title: 'Payment reminders', description: 'Receive email reminders for upcoming payments.', enabled: true },
  { key: 'forecast_updates', title: 'Forecast updates', description: 'Get notified when your projected balance changes.', enabled: true },
  { key: 'goal_updates', title: 'Budget goal updates', description: 'Receive updates on your budget goal progress.', enabled: true },
  { key: 'product_announcements', title: 'Product announcements', description: 'Get notified about new features and updates.', enabled: false },
]

// ---------- Notifications ----------

export const mockNotifications: AppNotification[] = [
  { id: 'note-1', message: 'Rent payment is due in 5 days.', createdAt: '2024-09-10', read: false },
]
