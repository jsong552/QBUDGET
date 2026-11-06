# Frontend service layer

This folder is where the frontend talks to the API. Every screen gets its data from a function in here.
Right now most functions return mock data. To connect the C++ API, replace the body of each function with a
real request. No page, hook or component needs to change.

## How data flows

```
pages/ExpensesPage.tsx          renders the screen; button handlers call hook functions only
  └─ hooks/useTransactions.ts   loads data, runs writes, reloads what a write affects
       └─ services/transactionService.ts   one async function per API call  ← you work here
            └─ data/mockData.ts            temporary data, removed once the API is live
```

- **Pages and components never import services or `mockData.ts`.** Pages call hooks; hooks call services;
  only services read mock data. Sign-in is the one exception at the hook level: `context/AuthProvider.tsx`
  calls `authService` (see below).
- **`src/types/index.ts` is the contract.** Each service returns one of these types. If the API's JSON matches
  them (camelCase keys, same field names), a service just returns the response. If it doesn't, convert the
  response inside the service so the rest of the app stays unchanged.
- **Unknown values are safe.** Key unions such as `CategoryId`, `EventKind`, `GoalKind` and `NotificationKey`
  list the values the UI has icons and colours for. Any other string still renders, with a neutral grey style.

### Loading, reloading and errors

Hooks load data with `useAsync(load)` (`hooks/useAsync.ts`), which returns `{ data, error, reload, setData }`:

- `load` runs on mount and again whenever its arguments change. For example, the Week/Month/Term toggle on Home
  re-runs `getSpendingActivity(range)`.
- `reload()` runs it again on demand.
- A failed load is logged and stored in `error`. The section keeps showing its last good `data`; there is no
  error UI yet.

### Writes and refresh

Writes (create/update/remove) live in the hooks, not the pages. Each one goes through `useMutation().run`
(`hooks/useMutation.ts`), which never rejects. It resolves to `true`/`false`, logs failures and exposes the
last write error. After a successful write, the hook reloads everything that depends on it:

| Hook function | Service call | Reloads on success |
| --- | --- | --- |
| `useTransactions().addTransaction / editTransaction / deleteTransaction` | `create/update/removeTransaction` | transaction list, Expenses summary cards |
| `useForecast().addGoal / editGoal / deleteGoal` | `createGoal / updateGoal / removeGoal` | goals list |
| `useCalendar().addEvent` | `createEvent` | Calendar summary cards, month grid, upcoming events |
| `useSettings().saveProfile` | `updateProfile` | stores the returned `User` in the session, so the header updates |

Settings that change on screen before the request finishes roll back if it fails:
`useCalendar().changeReminders`, `useSettings().changeDisplay` and `useSettings().toggleNotification`.

To make a new write, add the service function, then a hook function that calls `run(() => service(...),
{ onSuccess: reloadWhatChanged, onFailure: rollBack })`.

## Sign-in and the API token

`context/AuthProvider.tsx` owns the one session. `useAuth()` exposes `signIn`, `signUp`, `signOut`,
`continueAsDemo` and `updateUser`, and they all store or clear the same `Session { user, token }`. The page
header (name, initials) and Settings both read `session.user`, via `useCurrentUser()`.

To connect real sign-in, only `services/authService.ts` changes:

1. `signIn(request)` / `signUp(request)` sign in with Firebase, get the Firebase ID token, call `GET /api/me`
   (or `POST /api/me` for sign-up) with it, and return `{ user, token }`.
2. `AuthProvider` stores the session (in `sessionStorage`, key `qbudget.session`) and passes `token` to
   `setAuthToken()` in `lib/apiClient.ts`.
3. From then on, `apiClient` adds `Authorization: Bearer <token>` to every request. While sign-in is mocked
   the token is `null` and no header is sent. The C++ API should verify the token; cookies are not used.
4. Firebase ID tokens expire after an hour. When the Firebase SDK refreshes the token, call `setAuthToken` again,
   or store the new session.

The "Continue to demo" button (development builds only) calls `getDemoSession()` and stores the session the
same way.

## Swapping a mock for a real call

All requests go through `src/lib/apiClient.ts`. It prefixes `/api` and applies the base URL from
`VITE_API_URL`; locally that is empty and Vite proxies `/api` to the C++ server on :8080. It also attaches the
bearer token (above) and throws an `ApiError` on non-2xx responses.

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
  where a value is signed (`Transaction.amountCents`). Change fields (`incomeChangeCents`,
  `spentChangePercent`, ...) are signed too; the UI shows +/− and ↑/↓ from the sign. Never send floats or
  formatted strings. The frontend formats money only with `formatMoney()` in `src/lib/format.ts`.
- **The API does all the maths.** The frontend doesn't calculate balances, budgets, allowances, forecasts,
  percentages or "days away"; it displays what the API returns. For example, the API sends `spentPercent`,
  `percent` and `daysAway`.
- **Wording that depends on the data comes from the API.** This covers the greeting, change labels such as
  "from last month", card captions such as "For Fall 2024 semester", and the monthly breakdown description.
  Fixed labels and option lists stay in the pages.
- **Dates are ISO `YYYY-MM-DD` strings.** The "today" label above every page title comes from one call,
  `getTodayLabel()`, so all screens use the server's date.
- **Charts work out their own axes** from the points they receive. Send any number of points with any values.
  `SpendingActivity.highlight`, if set, should be one of its `points`. Donut colours are chosen by category ID
  (`components/categoryStyles.ts`), so the order of `items` doesn't matter.

## Service functions

| Function | Params → returns | Suggested endpoint | Used by |
| --- | --- | --- | --- |
| **appService** | | | |
| `getTodayLabel` | `() → string` | `GET /api/app/today` | Every page header: date above the title |
| **authService** (via `AuthProvider`) | | | |
| `signIn` | `(SignInRequest) → Session` | Firebase sign-in, then `GET /api/me` with the token | Login: **Sign in** button (Sign in tab) |
| `signUp` | `(SignInRequest) → Session` | Firebase sign-up, then `POST /api/me` with the token | Login: **Sign up** button (Sign up tab) |
| `signOut` | `() → void` | `POST /api/auth/sign-out` (optional) | Settings: **Sign out**. The session is cleared even if this fails |
| `getDemoSession` | `() → Session` | none (mock only) | Login: **Continue to demo** (development only) |
| **dashboardService** (via `useDashboard`) | | | |
| `getDashboardSummary` | `() → DashboardSummary` | `GET /api/dashboard/summary` | Home: greeting, balance card, Spent this month, Daily allowance |
| `getSpendingActivity` | `(ActivityRange) → SpendingActivity` | `GET /api/dashboard/activity?range=` | Home: Spending activity chart, **Week / Month / Term** |
| `getMonthCategoryBreakdown` | `() → CategoryBreakdown` | `GET /api/dashboard/categories?period=month` | Home: By category donut |
| **transactionService** (via `useTransactions`) | | | |
| `getTransactionSummary` | `() → TransactionSummary` | `GET /api/transactions/summary` | Expenses: three summary cards (reloaded after every change) |
| `listTransactions` | `(TransactionFilters) → Transaction[]` | `GET /api/transactions?search=&type=&category=&period=&sort=&direction=` | Expenses: table, search box (300 ms debounce), type/category/period filters, column sorting |
| `listCategories` | `() → Category[]` | `GET /api/categories` | Expenses: **All categories** filter options |
| `createTransaction` | `(TransactionInput) → void` | `POST /api/transactions` | Expenses: **Add expense** (`addTransaction`) |
| `updateTransaction` | `(id, TransactionInput) → void` | `PUT /api/transactions/{id}` | Expenses: pencil button on a row (`editTransaction`) |
| `removeTransaction` | `(id) → void` | `DELETE /api/transactions/{id}` | Expenses: bin button on a row (`deleteTransaction`) |
| **forecastService** (via `useForecast`) | | | |
| `getForecastSummary` | `() → ForecastSummary` | `GET /api/forecast/summary` | Forecast: three summary cards and their captions |
| `getForecastSeries` | `(ForecastGranularity) → ForecastSeries` | `GET /api/forecast/series?granularity=` | Forecast: Spending forecast chart, **Weekly / Monthly / Semester** |
| `getForecastCategoryBreakdown` | `() → CategoryBreakdown` | `GET /api/forecast/categories` | Forecast: Spending by category donut |
| `getMonthlyBreakdown` | `() → MonthlyBreakdown` | `GET /api/forecast/monthly` | Forecast: Predicted monthly breakdown table and its description |
| **goalService** (via `useForecast`) | | | |
| `listGoals` | `() → BudgetGoal[]` | `GET /api/goals` | Forecast: Budget goals list |
| `createGoal` | `(BudgetGoalInput) → void` | `POST /api/goals` | Forecast: **Add goal** (`addGoal`) |
| `updateGoal` | `(id, BudgetGoalInput) → void` | `PUT /api/goals/{id}` | `editGoal`, which no button calls yet (planned for the goal ⋮ menu) |
| `removeGoal` | `(id) → void` | `DELETE /api/goals/{id}` | `deleteGoal`, which no button calls yet (planned for the goal ⋮ menu) |
| **calendarService** (via `useCalendar`) | | | |
| `getCalendarSummary` | `() → CalendarSummary` | `GET /api/calendar/summary` | Calendar: three summary cards, red "next payment" day |
| `getCalendarMonth` | `(IsoDate \| null, CalendarView) → CalendarMonth` | `GET /api/calendar/events?month=YYYY-MM&view={month\|week}` | Calendar: grid, **‹ ›** month arrows (`null` = current month), **Month / Week** |
| `listUpcomingEvents` | `() → UpcomingEvent[]` | `GET /api/calendar/upcoming?limit=4` | Calendar: Upcoming events list |
| `createEvent` | `(CalendarEventInput) → void` | `POST /api/calendar/events` | Calendar: **Create event** (`addEvent`) |
| `getReminderSettings` | `() → ReminderSettings` | `GET /api/calendar/reminders` | Calendar: Email reminders toggle and timing dropdown |
| `updateReminderSettings` | `(ReminderSettings) → void` | `PUT /api/calendar/reminders` | Calendar: Email reminders toggle, **3 days before** dropdown (`changeReminders`, rolls back on failure) |
| **settingsService** (via `useSettings`) | | | |
| `updateProfile` | `(ProfileInput) → User` | `PUT /api/me` | Settings: **Save changes** (`saveProfile`; the returned user updates the header) |
| `uploadAvatar` | `() → void` | `POST /api/me/avatar` | Settings: camera button on the avatar (`changeAvatar`) |
| `getDisplayPreferences` | `() → DisplayPreferences` | `GET /api/me/preferences` | Settings: Display preferences |
| `updateDisplayPreferences` | `(Partial<DisplayPreferences>) → void` | `PATCH /api/me/preferences` | Settings: **Light / Dark / System**, currency, start week, date format (`changeDisplay`, rolls back on failure) |
| `getNotificationPreferences` | `() → NotificationPreference[]` | `GET /api/me/notification-preferences` | Settings: Notification preferences |
| `updateNotificationPreference` | `(NotificationKey, boolean) → void` | `PATCH /api/me/notification-preferences/{key}` | Settings: each notification toggle (`toggleNotification`, rolls back on failure) |
| `requestPasswordChange` | `() → void` | `POST /api/me/password` (or Firebase's reset email) | Settings: **Change password** (`changePassword`) |
| `deleteAccount` | `() → void` | `DELETE /api/me` | Settings: **Delete account** (`removeAccount`) |
| **notificationService** (via `useNotifications`) | | | |
| `listNotifications` | `() → AppNotification[]` | `GET /api/notifications` | Every page header (bell) |
| **healthService** (via `useBackendCheck`) | | | |
| `getHello` | `() → string` | `GET /api/hello` (live) | `/dev/backend`: **Test C++ backend** |

## Buttons with no service yet

These buttons only `console.info` for now. Each needs an endpoint, or a UI decision, before it can do anything:

| Button | Where | Handler |
| --- | --- | --- |
| **View all ›** | Home: By category card | `onViewAllCategories` (`pages/HomePage.tsx`) |
| **View all ›** | Calendar: Upcoming events card | `onViewAllEvents` (`pages/CalendarPage.tsx`) |
| Bell icon | Every page header | `onOpenNotifications` (`components/PageHeader.tsx`). It has the `listNotifications` data but no panel yet |
| Avatar (`AJ`) | Every page header | `onOpenProfileMenu` (`components/PageHeader.tsx`) |
| **⋮** goal menu | Forecast: each budget goal | `onOpenGoalMenu` (`pages/ForecastPage.tsx`). This will use `editGoal` / `deleteGoal` |

**Add expense**, **Add goal** and **Create event** send an empty draft until their forms exist. **Delete account**
has no confirmation step and doesn't sign out afterwards. Decide both when the real endpoints land.
