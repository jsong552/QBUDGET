Function Tests
==============

These are tests for the backend classes. Right now there's only one, for
NotificationService. I'll be adding more tests for the other classes later.


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


How to run it
-------------
From the main QBUDGET folder in PowerShell:

  g++ -std=c++17 -Wall -Wextra -I backend/vendor function_tests/notification_service_test.cpp -o backend/build/notification-service-test.exe -lws2_32 -lwinhttp
  ./backend/build/notification-service-test.exe

When everything passes it prints:

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

If a test fails it says [FAIL] instead, with a line explaining what went wrong.
