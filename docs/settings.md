# Settings page behavior

The Settings page covers the profile, display preferences, notification preferences
and account management. The backend is `ProfileService`, `SettingsService` and
`AccountService` (`backend/src/profile_service.hpp`, `account_service.hpp`), routed
under `/api/me`. The frontend uses `useSettings` and the app-wide
`DisplayPreferencesProvider`.

## Profile

- Stored in the `users/{uid}` document (`fullName`, `studentId`).
- Full name: surrounding spaces are removed; 1–100 characters (counted as
  characters, so accented names aren't cut short); no line breaks or tabs.
- Student ID: optional, exactly 8 digits. Saving it blank clears it.
- These rules apply when saving (`ProfileService::update`, `validateRecord` in
  `validation.hpp`), so profiles saved under older rules still load.
- The email address comes from the Firebase sign-in and can't be edited.
- A profile photo isn't implemented; the camera button stays disabled.

## Display preferences

Stored in `users/{uid}/settings/display`. Defaults: theme System, CAD, week starts
Sunday, date format "Sep 10, 2024".

- **Theme** (Light, Dark, System). `DisplayPreferencesProvider` puts a `dark` class on
  `<html>`, and `index.css` gives every colour token a dark value under `:root.dark`,
  so components need no dark-specific classes. A few exceptions are at the bottom
  of `index.css`. System follows the operating system live. The theme is also
  remembered on the device (`localStorage` key `qbudget.theme`), and a small script
  in `index.html` applies it before the app loads so dark mode never flashes white.
  `lib/theme.ts` has the same logic, and `theme.test.ts` checks the two agree.
  **When adding a colour token, give it a light value in `@theme` and a dark value in
  `:root.dark`.**
- **Date format** ("Sep 10, 2024", "10/09/2024", "2024-09-10"). It applies to full
  dates and date ranges shown with `formatDate` (default style) and
  `formatDateRange` in `lib/format.ts`: Expenses, Recurring, the Calendar's next
  payment and upcoming list, Budgets and Semester ranges, fee deadlines, and the
  dates under notifications. Unchanged by design: spelled-out dates ("November 30",
  "November 2026"), chart axis labels, the date line above page titles and dates
  inside server-written text (notification messages, the Forecast caption), and
  date entry boxes, which the browser draws in the computer's regional format.
  The format is remembered on the device (`qbudget.dateFormat`). Known limitation:
  if a page draws its dates before the user's preferences arrive (first sign-in on
  a device, or switching accounts), it keeps the previous format until the next
  page change.
- **Currency**: CAD only. The backend rejects anything else, because relabelling
  amounts isn't conversion.
- **Start week on**: used by the Calendar.

## Notification preferences

`users/{uid}/settings/notifications` holds four on/off flags. Only Payment
reminders can be switched, because it's the only notification `NotificationService`
sends; the other switches are disabled. Over-budget warnings are always shown.

To offer a new type once `NotificationService` sends it (checking the matching
flag), set `available` to `true` for it in `SettingsService::notificationTypes()`.
The Settings switch then enables itself.

API: `GET /api/me/notification-preferences`, and
`PATCH /api/me/notification-preferences/{key}` with `{"enabled": true|false}`.
Unavailable types get 400 and unknown types get 404.

## Email reminders (Calendar page)

`users/{uid}/settings/reminders` stores the lead time (1 day, 3 days or 1 week) and
`emailEnabled`, which must stay off until email delivery exists. Turning it on later
means removing the check in `SettingsService::saveReminders` and the
`emailEnabled == false` condition in `firestore.rules` (then republishing the rules).

## Change password and sign out

Change password sends Firebase's password-reset email. Sign out ends the Firebase
session and returns to the sign-in page.

## Delete account

- Settings > Delete account asks for the password, because Firebase only deletes an
  account right after a real sign-in. It then calls `DELETE /api/me`. On success the
  app forgets this device's theme and date format and signs out.
- `AccountService` refuses unless the user signed in within the last 4 minutes (the
  login token's `auth_time`; Firebase's own limit is about 5), so nothing is deleted
  if Firebase would refuse. It then deletes every collection in
  `AccountService::collections()` (categories first, so unpublished rules fail
  before anything is deleted, then recurring schedules), the profile document,
  and finally the Firebase sign-in (`AuthService::deleteSignIn`). Deletes go to
  Firestore in batches of up to 500. It's safe to retry if it fails part-way.
- **Add any new per-user collection to `AccountService::collections()`**, or deleting
  an account leaves its records behind. `account_deletion_test.cpp` fails if anything
  written through the API is left over.
- It needs the current `firestore.rules` published: owners may delete their own
  category documents (the app's "remove category" still only archives).

## Tests

- Backend: `function_tests/profile_settings_test.cpp`, `auth_service_test.cpp` and
  `account_deletion_test.cpp`. `function_tests/README.txt` describes each check.
- Frontend (`npm test`): `theme`, `dateFormat`, `format`, `DisplayPreferencesProvider`,
  `settingsService` and `DeleteAccountDialog` tests.
