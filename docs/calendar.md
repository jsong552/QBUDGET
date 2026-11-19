# Calendar behavior

The calendar supports month and week views, Today and previous/next navigation,
and the user's saved Sunday/Monday week-start preference. Click a date to create
a scheduled payment or click an entry to inspect it, edit it, or record payment.
Recurring entries link to their schedule on the Recurring page.

## Recording and persistence

- Scheduled events remain in the existing per-user `events` collection.
- Recurring income/expense occurrences are projected from active schedules;
  viewing the calendar does not write transactions or duplicate event documents.
- Record payment / Record income received writes a transaction with an actual
  payment date (today or earlier). The amount comes from the saved event/schedule.
  Event expenses use Rent, Tuition, or Other; the transaction can be recategorized
  on Expenses. Recurring entries keep their schedule's category.
- Event transaction IDs are `cal_<eventId>`. Recurring IDs are
  `rec_<scheduleId>_<dueDate>`, shared with existing recurring synchronization.
  Create-only writes make retries safe, even if the first HTTP response is lost.
- Recording a future occurrence early prevents its later synchronization from
  recording it again. The existing recurring sync still records due occurrences
  automatically; those occurrences appear as paid/received.
- Existing events already marked paid remain paid without inventing a historical
  transaction. Unlinked manually entered expenses cannot be automatically matched;
  do not use Record payment for an expense you already entered separately.
- Recorded event amounts, due dates and kinds cannot be changed through the event
  editor. Edit actual transaction details on Expenses instead. Event titles and
  reminder flags can still be changed.
- Deleting an event/schedule retains transaction history. Deleting a generated
  transaction leaves the existing tombstone and displays the occurrence as skipped;
  it is not automatically regenerated. Add a manual transaction if needed.

No Firestore schema/rule changes are required beyond the repository's existing
rules. Restart/rebuild the backend after pulling these changes.

## Outstanding payments and reminders

The sidebar includes overdue unpaid expenses and upcoming unpaid expenses over
the next 12 months. Monthly/weekly views can navigate beyond that horizon.
Summary cards separate overdue amounts from the next 30 days. Recurring income
appears in the grid but is excluded from payment totals and payment reminders.
In-app alerts include overdue payments and honor each event's reminder flag,
the reminder lead time, and the account's payment-reminder preference.
Notifications refresh after successful API mutations, on window focus, and every
minute while mounted. Email remains disabled; no background email job is added.

## Verify locally

1. Start the app and sign in with a test account.
2. Create an event by clicking a date, refresh, then edit its title and reminder.
3. Switch to Week and navigate across a month/year boundary; check Today.
4. Create an unpaid past event: check overdue totals and the notification bell.
5. Record it with today's payment date: check Expenses and refresh the calendar.
   Retrying the same API payment request must not create another expense.
6. Add a recurring expense and income: inspect occurrences in both views.
   Record a future occurrence early, then sync when due; check for duplicates.
7. Delete an event after payment: verify the transaction remains. Delete a
   generated transaction: verify its occurrence is skipped, not regenerated.
8. Sign in with another account: none of the first account's entries should appear.

Automated coverage lives in `backend/tests/data_test.cpp`, the frontend calendar
date tests, calendar page tests, and API refresh-event tests. Backend regression
tests use an in-memory store and do not modify Firebase data.
