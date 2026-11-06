# Frontend service layer

This folder is where the frontend talks to the API. Every screen gets its data from a function in here.
Right now most functions return mock data. To connect the C++ API, replace the body of each function with a
real request. No page or component needs to change.

## How data flows

```
pages/ExpensesPage.tsx          renders the screen and owns button handlers
  └─ hooks/useTransactions.ts   loads data when the page mounts or a filter changes
       └─ services/transactionService.ts   one async function per API call  ← you work here
            └─ data/mockData.ts            temporary data, removed once the API is live
```

- **Pages and components never import `mockData.ts`.** Only services do.
- **`src/types/index.ts` is the contract.** Each service returns one of these types. If the API's JSON matches
  them (camelCase keys, same field names), a service just returns the response. If it doesn't, convert the
  response inside the service so the rest of the app stays unchanged.
- Hooks use `useAsync` (`hooks/useAsync.ts`). It runs the service function and re-runs it when its arguments
  change. The Week/Month/Term toggle on Home, for example, calls `getSpendingActivity(range)` again.
- Button handlers in pages (`onAddExpense`, `onDeleteTransaction`, ...) call the write functions
  (create/update/remove). Today those write functions only `console.info` the payload.

## Swapping a mock for a real call

All requests go through `src/lib/apiClient.ts`. It prefixes `/api` and applies the base URL from
`VITE_API_URL`; locally that is empty and Vite proxies `/api` to the C++ server on :8080. It also throws an
`ApiError` on non-2xx responses.

Before:

```ts
// BACKEND: GET /api/transactions/summary
export function getTransactionSummary(): Promise<TransactionSummary> {
  return mockResponse(mockTransactionSummary)
}
```

After:

```ts
import { apiClient } from '../lib/apiClient'

export function getTransactionSummary(): Promise<TransactionSummary> {
  return apiClient.get<TransactionSummary>('/transactions/summary')
}
```

Write functions follow the same pattern:

```ts
export function createTransaction(input: TransactionInput): Promise<void> {
  return apiClient.post<void>('/transactions', input)
}
```

Once nothing imports a value from `data/mockData.ts`, delete that value. `healthService.getHello` is already a
real call and shows the pattern working end to end (open http://localhost:5173/dev/backend).

The endpoints below are suggestions taken from each function's `// BACKEND:` comment. Rename them as needed; only
the service file has to change.

## Data rules

- **Money is integer cents.** `124860` means $1,248.60. Every money field ends in `Cents`. Expenses are negative
  where a value is signed (`Transaction.amountCents`). Never send floats or formatted strings. The frontend
  formats money only with `formatMoney()` in `src/lib/format.ts`.
- **The API does all the maths.** The frontend doesn't calculate balances, budgets, allowances, forecasts,
  percentages or "days away"; it displays what the API returns. For example, the API sends `spentPercent`,
  `percent` and `daysAway`.
- **Dates are ISO `YYYY-MM-DD` strings.** "Today" labels (`todayLabel`, e.g. `"Tuesday, September 10"`) come
  from the API, so every screen uses the server's date.
- **Charts work out their own axes** from the points they receive. Send any number of points with any values.
  `SpendingActivity.highlight`, if set, should be one of its `points`.

## Service functions

| Function | Params → returns | Suggested endpoint | Used by |
| --- | --- | --- | --- |
| **appService** | | | |
| `getTodayLabel` | `() → string` | `GET /api/app/today` | Settings: date above the title |
| **authService** | | | |
| `signIn` | `(SignInRequest) → void` | `POST /api/auth/sign-in` | Login: **Sign in** button (Sign in tab) |
| `signUp` | `(SignInRequest) → void` | `POST /api/auth/sign-up` | Login: **Sign up** button (Sign up tab) |
| `signOut` | `() → void` | `POST /api/auth/sign-out` | Settings: **Sign out** |
| `getDemoSession` | `() → Session` | becomes `GET /api/auth/session` | Login: **Continue to demo** (development only) |
| **dashboardService** | | | |
| `getDashboardSummary` | `() → DashboardSummary` | `GET /api/dashboard/summary` | Home: balance card, Spent this month, Daily allowance, date |
| `getSpendingActivity` | `(ActivityRange) → SpendingActivity` | `GET /api/dashboard/activity?range=` | Home: Spending activity chart, **Week / Month / Term** |
| `getMonthCategoryBreakdown` | `() → CategoryBreakdown` | `GET /api/dashboard/categories?period=month` | Home: By category donut |
| **transactionService** | | | |
| `getTransactionSummary` | `() → TransactionSummary` | `GET /api/transactions/summary` | Expenses: three summary cards, date |
| `listTransactions` | `(TransactionFilters) → Transaction[]` | `GET /api/transactions?search=&type=&category=&period=&sort=&direction=` | Expenses: table, search box, type/category/period filters, column sorting |
| `listCategories` | `() → Category[]` | `GET /api/categories` | Expenses: **All categories** filter options |
| `createTransaction` | `(TransactionInput) → void` | `POST /api/transactions` | Expenses: **Add expense** |
| `updateTransaction` | `(id, TransactionInput) → void` | `PUT /api/transactions/{id}` | Expenses: pencil button on a row |
| `removeTransaction` | `(id) → void` | `DELETE /api/transactions/{id}` | Expenses: bin button on a row |
| **forecastService** | | | |
| `getForecastSummary` | `() → ForecastSummary` | `GET /api/forecast/summary` | Forecast: three summary cards, date |
| `getForecastSeries` | `(ForecastGranularity) → ForecastSeries` | `GET /api/forecast/series?granularity=` | Forecast: Spending forecast chart, **Weekly / Monthly / Semester** |
| `getForecastCategoryBreakdown` | `() → CategoryBreakdown` | `GET /api/forecast/categories` | Forecast: Spending by category donut |
| `getMonthlyProjections` | `() → MonthlyProjection[]` | `GET /api/forecast/monthly?months=4` | Forecast: Predicted monthly breakdown table |
| **goalService** | | | |
| `listGoals` | `() → BudgetGoal[]` | `GET /api/goals` | Forecast: Budget goals list |
| `createGoal` | `(BudgetGoalInput) → void` | `POST /api/goals` | Forecast: **Add goal** |
| `updateGoal` | `(id, BudgetGoalInput) → void` | `PUT /api/goals/{id}` | Not wired yet (planned for the goal ⋮ menu) |
| `removeGoal` | `(id) → void` | `DELETE /api/goals/{id}` | Not wired yet (planned for the goal ⋮ menu) |
| **calendarService** | | | |
| `getCalendarSummary` | `() → CalendarSummary` | `GET /api/calendar/summary` | Calendar: three summary cards, date, red "next payment" day |
| `getCalendarMonth` | `(IsoDate \| null) → CalendarMonth` | `GET /api/calendar/events?month=YYYY-MM` | Calendar: month grid, **‹ ›** month arrows (`null` = current month) |
| `listUpcomingEvents` | `() → UpcomingEvent[]` | `GET /api/calendar/upcoming?limit=4` | Calendar: Upcoming events list |
| `createEvent` | `(CalendarEventInput) → void` | `POST /api/calendar/events` | Calendar: **Create event** |
| `getReminderSettings` | `() → ReminderSettings` | `GET /api/calendar/reminders` | Calendar: Email reminders toggle and timing dropdown |
| `updateReminderSettings` | `(ReminderSettings) → void` | `PUT /api/calendar/reminders` | Calendar: Email reminders toggle, **3 days before** dropdown |
| **settingsService** | | | |
| `getProfile` | `() → User` | `GET /api/me` | Settings: Account information |
| `updateProfile` | `(ProfileInput) → void` | `PUT /api/me` | Settings: **Save changes** |
| `uploadAvatar` | `() → void` | `POST /api/me/avatar` | Settings: camera button on the avatar |
| `getDisplayPreferences` | `() → DisplayPreferences` | `GET /api/me/preferences` | Settings: Display preferences |
| `updateDisplayPreferences` | `(Partial<DisplayPreferences>) → void` | `PATCH /api/me/preferences` | Settings: **Light / Dark / System**, currency, start week, date format |
| `getNotificationPreferences` | `() → NotificationPreference[]` | `GET /api/me/notification-preferences` | Settings: Notification preferences |
| `updateNotificationPreference` | `(NotificationKey, boolean) → void` | `PATCH /api/me/notification-preferences/{key}` | Settings: each notification toggle |
| `requestPasswordChange` | `() → void` | `POST /api/me/password` | Settings: **Change password** |
| `deleteAccount` | `() → void` | `DELETE /api/me` | Settings: **Delete account** |
| **notificationService** | | | |
| `listNotifications` | `() → AppNotification[]` | `GET /api/notifications` | Every page header (bell) |
| **healthService** | | | |
| `getHello` | `() → string` | `GET /api/hello` (live) | `/dev/backend`: **Test C++ backend** |

The signed-in user shown in page headers (name, `AJ` initials) currently comes from the demo session. Once sign-in
is live it should come from `GET /api/auth/session` or `GET /api/me`.

## Buttons with no service yet

These buttons only `console.info` for now. Each needs an endpoint, or a UI decision, before it can do anything:

| Button | Where | Handler |
| --- | --- | --- |
| **View all ›** | Home: By category card | `onViewAllCategories` (`pages/HomePage.tsx`) |
| **View all ›** | Calendar: Upcoming events card | `onViewAllEvents` (`pages/CalendarPage.tsx`) |
| Bell icon | Every page header | `onOpenNotifications` (`components/PageHeader.tsx`). It has the `listNotifications` data but no panel yet |
| Avatar (`AJ`) | Every page header | `onOpenProfileMenu` (`components/PageHeader.tsx`) |
| **⋮** goal menu | Forecast: each budget goal | `onOpenGoalMenu` (`pages/ForecastPage.tsx`). This will use `updateGoal` / `removeGoal` |
