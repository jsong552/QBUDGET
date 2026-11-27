Function Tests
==============

These are tests for the backend classes. There's one test file for each
service, plus Date and the validation rules. None of them need Firebase
or the internet. The ones that save data use the fake in-memory store in
backend/tests/memory_store.hpp, and the login test uses a fake Firebase.
All of them use Nov 8 2026 as "today" so the results never change.


NotificationService test (notification_service_test.cpp)
--------------------------------------------------------
NotificationService makes the alerts in the app: payment reminders and
warnings when you go over a budget. Here's what each test does and what
it should give back:

1. No events and no budgets
   Gives it nothing at all.
   Output: no notifications.

2. Default lead time is 1 day
   Gives it payments due today, tomorrow and in 2 days, with the default
   reminder setting.
   Output: reminders for today and tomorrow only. The one in 2 days is too
   far away.

3. 3 day lead time
   Payments due in 3 days and in 4 days, with the setting on "3 days".
   Output: a reminder for the 3 day one only.

4. 1 week lead time
   Payments due in 7 days and in 8 days, with the setting on "1 week".
   Output: a reminder for the 7 day one only.

5. Unknown lead time
   The setting is something that doesn't exist ("2_weeks").
   Output: it just acts like the 1 day default.

6. Reminders turned off for an event
   Two payments due today, one with its reminder turned off.
   Output: only the one with the reminder on shows up.

7. Payment reminders turned off in settings
   A payment due today and a category that's over budget, but payment
   reminders are off.
   Output: no payment reminder, but the budget warning still shows up.

8. What a payment reminder looks like
   A phone bill due tomorrow.
   Output: one notification with the message
   "Phone bill is due 2026-11-09", marked as unread, with today's date.

9. Only over budget categories get warned
   Groceries is under budget, Dining is over.
   Output: one warning, for Dining.

10. What a budget warning looks like
    Dining is over budget for November.
    Output: "Dining has exceeded its budget for 2026-11-01 to 2026-11-30".
    (It says the 30th, not December 1st.)

11. Same category, different time periods
    Dining is over budget for both the week and the month.
    Output: two separate warnings, one for each.

12. Order of the notifications
    Two payments and two over budget categories.
    Output: the payment reminders come first, then the budget warnings.

13. Overdue payments
    A payment that was due 2 days ago.
    Output: it still gets a reminder.


TransactionService test (transaction_service_test.cpp)
------------------------------------------------------
Adding, editing and deleting income and expenses, and adding them up.

1. Add a $15 lunch and a $500 paycheque.
   Output: both saved with the right amount, note, category and date.
2. Amount of $0, a positive expense, a negative income or a blank
   description.
   Output: all rejected, nothing saved.
3. A category that doesn't exist, or the retired "food" category.
   Output: rejected.
4. A new entry already marked as recurring or deleted.
   Output: those flags get cleared.
5. Edit an entry's amount and category.
   Output: changes saved. Editing a missing entry gives a 404, and moving
   it to a retired category is rejected.
6. Edit an old entry that's still in a retired category.
   Output: allowed, as long as the category doesn't change.
7. Delete an entry, then delete it again.
   Output: it's gone, and the second delete gives a 404.
8. Delete an entry made by a recurring payment.
   Output: hidden from the list but kept as "voided" so it doesn't come
   back.
9. Filter by income, by Rent, by "WEEKLY" and by November.
   Output: 1, 1, 1 and 3 results. Search ignores case and checks notes.
10. Sort the list.
    Output: newest first by default, then by amount, then A to Z.
11. Unknown filter type or sort key.
    Output: rejected.
12. $1000 income and $34.50 of expenses.
    Output: balance is exactly $965.50. The November total only counts
    November.
13. A voided entry and a future-dated entry.
    Output: neither is counted in the totals.
14. $75 on groceries and $25 on rent.
    Output: breakdown is 75% and 25%. Categories with nothing spent are
    left out, and income isn't counted as spending.
15. Chart points for November.
    Output: one monthly point, one weekly point, and the income option
    shows income instead.


CategoryService test (category_service_test.cpp)
------------------------------------------------
1. Default categories.
   Output: Groceries, Rent, Tuition, Personal Hygiene, Hobbies, Other and
   Income.
2. Old retired categories (Food, Dining, ...).
   Output: hidden unless you ask for archived ones too.
3. Add "Coffee".
   Output: saved as an active custom category.
4. Duplicate name, a default's name, empty, spaces only or over 80
   characters.
   Output: all rejected. Exactly 80 characters is fine.
5. Remove "Coffee".
   Output: hidden from the list, still findable, and can't be used for
   new entries.
6. Remove Groceries.
   Output: rejected, defaults can't be removed.
7. Look up a category that doesn't exist.
   Output: rejected.
8. A saved category using the id "groceries".
   Output: the built-in Groceries still wins, no duplicate.


BudgetService and GoalService test (budget_service_test.cpp)
------------------------------------------------------------
1. Set a $200 monthly Groceries budget.
   Output: saved.
2. Set it again at $250, then add a weekly one.
   Output: the monthly one is replaced, the weekly one is separate.
3. $0 budget, unknown category or retired category.
   Output: rejected.
4. Remove a budget.
   Output: gone.
5. $200 budget with $150 spent.
   Output: $50 remaining, not over.
6. $225 spent, then exactly $200 spent.
   Output: over by $25. Exactly $200 is not over.
7. Spending on Oct 30, Sun Nov 1, Nov 3 and Sun Nov 8.
   Output: monthly counts $60 (no October), weekly counts $40 (the week
   starts Mon Nov 2). Old transactions are kept.
8. Semester tuition budget.
   Output: only counts Sep 1 to Dec 31.
9. Income, and a budget for a removed category.
   Output: income isn't spending, and the removed category is skipped.
10. Create, edit and remove a savings goal.
    Output: works. Blank title or $0 target is rejected.
11. $1000 earned, $250 spent, $1500 goal.
    Output: $750 saved, 50%.
12. Negative balance, then past the target.
    Output: 0%, then capped at 100%.
13. "Spend under $400" goal.
    Output: only this month's $100 counts, 25%.


CalendarService and RecurrenceService test (calendar_service_test.cpp)
----------------------------------------------------------------------
1. Add three payments.
   Output: listed earliest first.
2. List November only.
   Output: just the November payment.
3. Upcoming payments on Nov 8.
   Output: every unpaid payment, including overdue ones. Nov 5 is -3 days
   away, today is 0 and Nov 20 is 12. Overdue counts as urgent.
4. Payments 3 and 4 days away.
   Output: 3 days is urgent, 4 days is not.
5. Mark a payment paid, then remove it.
   Output: no longer upcoming but still on the calendar, then gone.
6. Record a payment for an event.
   Output: the event shows as paid.
7. Change a recorded payment's amount, date and title.
   Output: amount and date changes rejected, renaming is fine.
8. $0 amount, blank title or editing a missing event.
   Output: rejected (404 for the missing one).
9. Monthly from Jan 31.
   Output: Jan 31, Feb 28, Mar 31.
10. Weekly schedule.
    Output: every 7 days, only inside the dates asked for.
11. End date of Nov 1, and a paused schedule.
    Output: Nov 1 is still included. Paused gives no dates.
12. Monthly rent from Sep 1, synced on Nov 8.
    Output: 3 transactions (Sep, Oct, Nov), not December yet.
13. Sync again.
    Output: nothing new, still 3.
14. Delete October's rent, then sync.
    Output: it doesn't come back.
15. Pause or remove the schedule.
    Output: nothing new gets created.
16. Description "   Rent   ", then spaces only.
    Output: saved as "Rent", then rejected.
17. Three schedules with different start dates and names.
    Output: listed by start date, then A to Z.
18. Expense in the Income category, retired category, ends before it
    starts, or editing/removing a missing schedule.
    Output: rejected.


ForecastService test (forecast_service_test.cpp)
------------------------------------------------
Today is Nov 8, so there are 22 days left in November.

1. Nothing entered.
   Output: 4 months (Nov to Feb) of zeros.
2. Ask for 1, 12, 0 and 13 months.
   Output: 1 and 12 work, 0 and 13 are rejected.
3. $30 spent in the last 30 days ($1 a day).
   Output: November $22, December $31. Balance goes -$52 then -$83.
4. $1000 earned back in September.
   Output: not in the average, but the balance starts at $1000.
5. A transaction dated in the future.
   Output: ignored.
6. Unpaid $500 payment on Nov 20, plus paid, past and December payments.
   Output: November is at least $500. Paid and past ones are ignored, and
   December's lands in December.
7. $22 average with a $10 payment.
   Output: stays $22 (the bigger one wins).
8. $1200 monthly paycheque and $10 weekly groceries.
   Output: November income $1200, expenses $40, balance $1160.
9. $1 over 30 days, for 22 days.
   Output: 73 cents (73.3 rounded).
10. Chart for $22 in November.
    Output: one $22 point monthly, or $7, $7, $7, $1 weekly.
11. Chart for $22.01.
    Output: the extra cent goes in the first week, nothing lost.
12. Chart for November and December.
    Output: December keeps its full $31. By semester, both add up to $53.


StudentService test (student_service_test.cpp)
----------------------------------------------
1. Add a bursary, change it to Received, remove it.
   Output: works. A $0 bursary is rejected.
2. Add fees as Kept or Opted Out, change one, remove one.
   Output: works. A blank name is rejected.
3. Default semester.
   Output: Sep 1 to Jan 1 in the fall, Jan 1 to May 1 in the winter.
4. Save a plan (Computing, 5 courses at $1000).
   Output: it loads back the same.
5. $5000 income, an approved $500 bursary, a pending $300 bursary, a kept
   $20 fee and $1000 December rent.
   Output: tuition $5100, income $5500 (pending not counted), costs
   $6120, short by $620.
6. Opted out of a $250 and a $40 fee.
   Output: $290 saved. Only the kept fee is a cost.
7. A fee from last year, a paid payment, a tuition payment and a January
   payment.
   Output: none of them are counted.


ProfileService and SettingsService test (profile_settings_test.cpp)
-------------------------------------------------------------------
1. New profile.
   Output: uses the name from sign-in, no student ID yet.
2. No name given.
   Output: uses the part of the email before the @, or "Student".
3. Save a full name and student ID.
   Output: those come back instead.
4. Default settings.
   Output: system theme (follows the device's light/dark setting), CAD,
   week starts Sunday, email reminders off, 1 day lead time, only payment
   reminders on.
5. Save dark theme and Monday.
   Output: saved.
6. Saved display settings that have no theme.
   Output: the theme falls back to system, and the other saved settings
   are kept.
7. Themes "light", "dark", "system", then "purple", "" and "Dark".
   Output: the first three are accepted, the last three are rejected.
8. Save "3 days" lead time.
   Output: saved.
9. Turn on email reminders.
   Output: rejected for now, because email isn't set up in the backend.
10. Turn off payment reminders and turn on goal updates.
    Output: saved.
11. Save "  Alex Johnson " with student ID " 20231234 ".
    Output: saved as "Alex Johnson" and "20231234".
12. Save a student ID of only spaces.
    Output: the student ID is cleared.
13. Full name "", spaces only, or a tab and line break.
    Output: rejected with "Enter your full name."
14. Full name of 100 letters, 101 letters, and 100 accented letters
    (200 bytes).
    Output: 100 is fine, 101 is rejected, and the accented name is fine
    because the limit counts characters, not bytes.
15. Full name with a line break or a tab inside it.
    Output: rejected.
16. Student ID "20231234", then 7 digits, 9 digits, one with a letter and
    one with a space.
    Output: only "20231234" is accepted ("must be exactly 8 digits").
17. A rejected profile.
    Output: nothing is saved; the sign-in name is still used.
18. A profile saved under older rules ("  Old Name  ", "ABC 12").
    Output: it still loads unchanged.
19. A number sent as the name or as the student ID.
    Output: rejected with the same clear messages.
20. Theme "purple", date format "MM_DD_YYYY" or reminder timing
    "2_weeks" saved directly through the service.
    Output: all rejected, nothing saved.
21. The notification list.
    Output: four types in order; only payment reminders is available,
    and it's on by default.
22. Switch payment reminders off, then on.
    Output: both saved.
23. Switch on forecast updates, goal updates or product announcements.
    Output: rejected ("... aren't available yet"), nothing saved.
24. An unknown notification type.
    Output: 404.
25. The notification routes: list, then "enabled" sent as text or left
    out, then a real change.
    Output: the list shows availability, the two bad requests get "Send
    enabled as true or false.", and the real change is saved.
26. Save "  Sam Lee " with a blank student ID through the API.
    Output: "Sam Lee", initials "SL", no student ID.


AuthService test (auth_service_test.cpp)
----------------------------------------
1. No header, "Basic ..." or lowercase "bearer".
   Output: 401.
2. Empty token, a space or newline in it, or a huge token.
   Output: 401.
3. No Firebase API key set.
   Output: 503.
4. A valid token.
   Output: returns the user's ID, email, name and token, and the request
   goes to Firebase with the key and token.
5. Firebase says 400 or 401 (expired token).
   Output: 401.
6. Firebase says 500 (it's down).
   Output: 502.
7. No user found, or the account is disabled.
   Output: 401.
8. Decode "aGVsbG8", "_-8" and "a$b" (the text format inside login
   tokens).
   Output: "hello", the two bytes FF EF, and nothing for the invalid one.
9. Tokens with a sign-in time, without one, not a token at all, and
   garbled.
   Output: the sign-in time (1764060000) for the first, 0 (unknown) for
   the rest.
10. Delete a user's sign-in.
    Output: the request goes to Firebase's accounts:delete with the key
    and the user's token.
11. Firebase says the user doesn't exist (already deleted).
    Output: no error, so a retry can finish.
12. Firebase says the login is too old.
    Output: 403, "For your security, sign in again before deleting your
    account."
13. Firebase says the token is invalid, Firebase is down, or no API key.
    Output: 401, 502 and 503.


Account deletion test (account_deletion_test.cpp)
-------------------------------------------------
Deleting a whole account (DELETE /api/me). It deletes every record, then
the profile, then the Firebase sign-in.

1. Make records of every kind through the app (a custom category,
   transactions, a budget, a goal, a calendar payment that was paid, a
   recurring schedule and its transactions, a bursary, a fee, a semester
   plan, all settings and the profile), then delete the account.
   Output: nothing is left anywhere, and the sign-in is deleted once,
   only after all the data is gone.
2. Delete with a sign-in from 5 minutes ago.
   Output: 403 ("sign in again"), and nothing is deleted.
3. Signed in exactly 4 minutes ago, 4 minutes 1 second ago, and an
   unknown sign-in time.
   Output: the first is allowed, the other two get 403.
4. Delete an account that has no data.
   Output: the sign-in is still deleted.
5. Deleting the sign-in fails, then try again.
   Output: the first try reports the error (the data is already gone),
   and the second try deletes the sign-in.
6. A server that wasn't given a way to delete sign-ins.
   Output: 503, and nothing is deleted.
7. Delete 501 transactions and the profile through the Firestore client.
   Output: two batch requests (500, then 2), with the user's own login,
   only under users/alice, and the profile last.
8. Firestore refuses (rules not published).
   Output: 403, "...Publish firestore.rules...".


Date test (date_test.cpp)
-------------------------
1. Real dates, including Feb 29 2024.
   Output: accepted.
2. "2026-2-01", "2026/02/01", letters, Feb 30, Feb 29 2026, month 13,
   before 1970, after 2100.
   Output: all rejected.
3. Adding days across months, years and leap days.
   Output: correct dates.
4. Jan 31 + 1 month.
   Output: Feb 28 (Feb 29 in 2024).
5. Start of month, next month and last year.
   Output: the 1st of the right month.
6. Start of week for Sun Nov 8.
   Output: Mon Nov 2.
7. Start of semester.
   Output: Jan 1, May 1 or Sep 1.
8. Days between dates.
   Output: right count, negative for past dates, 29 for Feb 2024.
9. Comparing dates.
   Output: earlier is less than later.
10. A date range.
    Output: includes the first day but not the end day.
11. Weekly, monthly and semester ranges for Nov 8 and Feb 15.
    Output: Nov 2-9, Nov 1-Dec 1, Sep 1-Jan 1 and Jan 1-May 1.


Validation test (validation_test.cpp)
-------------------------------------
1. Names that are blank or over 200 characters.
   Output: rejected.
2. Positive expenses, negative income, or $0.
   Output: rejected.
3. Amounts past the maximum.
   Output: rejected.
4. Blank description, or a note over 1000 characters.
   Output: rejected. 1000 is fine.
5. Category names over 80 characters.
   Output: rejected.
6. Budgets with $0, a negative amount or a fake period.
   Output: rejected.
7. Goals with no title, $0 target or a fake kind.
   Output: rejected.
8. Events with $0 or a kind over 40 characters.
   Output: rejected.
9. Recurring entries that end before they start.
   Output: rejected. Ending on the start day is fine.
10. Bursaries and fees with $0 or a fake status.
    Output: rejected.
11. Adding money past the maximum.
    Output: rejected. Normal adding works.


How to run them
---------------
Run everything from the main QBUDGET folder in PowerShell.

To run one test (swap in any file name):

  g++ -std=c++17 -Wall -Wextra -I backend/vendor function_tests/budget_service_test.cpp -o backend/build/budget_service_test.exe -lws2_32 -lwinhttp
  ./backend/build/budget_service_test.exe

To run all of them:

  mkdir backend/build -Force | Out-Null
  Get-ChildItem function_tests/*_test.cpp | ForEach-Object {
      $exe = "backend/build/$($_.BaseName).exe"
      Remove-Item $exe -ErrorAction SilentlyContinue
      Write-Host "`n=== $($_.BaseName) ===" -ForegroundColor Cyan
      g++ -std=c++17 -Wall -Wextra -I backend/vendor $_.FullName -o $exe -lws2_32 -lwinhttp
      if ($LASTEXITCODE -eq 0) { & $exe } else { Write-Host "COMPILE ERROR" -ForegroundColor Red }
  }

Each test prints [PASS] for every test, then a total. When everything
passes, the totals are:

  account_deletion_test      30/30 Account deletion checks passed.
  auth_service_test          34/34 AuthService checks passed.
  budget_service_test        31/31 BudgetService checks passed.
  calendar_service_test      45/45 Calendar and Recurrence checks passed.
  category_service_test      30/30 CategoryService checks passed.
  date_test                  47/47 Date checks passed.
  forecast_service_test      33/33 ForecastService checks passed.
  notification_service_test  28/28 NotificationService checks passed.
  profile_settings_test      66/66 Profile and Settings checks passed.
  student_service_test       21/21 StudentService checks passed.
  transaction_service_test   39/39 TransactionService checks passed.
  validation_test            44/44 Validation checks passed.

For example, the notification test prints:

  [PASS] No events and no budgets produce no notifications
  [PASS] Default lead time is 1 day
  [PASS] 3_days lead time includes day 3 but not day 4
  [PASS] 1_week lead time includes day 7 but not day 8
  [PASS] Unrecognised lead time falls back to 1 day
  [PASS] Events with reminders turned off are skipped
  [PASS] Disabling payment reminders suppresses payments but keeps budget warnings
  [PASS] Payment notification has expected id, message, timestamp and unread state
  [PASS] Only over-budget categories produce warnings
  [PASS] Budget warning id and message use the period range (end shown inclusively)
  [PASS] Same category in different periods yields distinct ids
  [PASS] Payment reminders come before budget warnings, each in input order
  [PASS] Overdue events (negative daysAway) are still reminded

  28/28 NotificationService checks passed.

If a test fails it says [FAIL] instead, with a line explaining what went
wrong. If it says COMPILE ERROR, the code the test uses has changed.