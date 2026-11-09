# Data model and persistence

The authoritative C++ domain records are in `backend/src/models.hpp`, with Date/DateRange in `date.hpp`, JSON mappings in `codecs.hpp`, and invariant checks in `validation.hpp`. Frontend JSON contracts are in `frontend/src/types/index.ts` and `types/planning.ts`.

## Per-user document layout

```text
users/{verifiedUid}                         UserProfile
  transactions/{id}                        Transaction
  categories/{id}                          Custom Category (built-ins are in code)
  budgets/{categoryId}_{period}             CategoryBudget
  goals/{id}                               SavingsGoal
  events/{id}                              CalendarEvent
  recurring/{id}                           RecurringEntry
  bursaries/{id}                            Bursary
  fees/{id}                                StudentFee
  settings/display                         DisplayPreferences
  settings/reminders                       ReminderSettings
  settings/notifications                   NotificationPreferences
  settings/semester                        SemesterPlan
```

`id` is derived from the document path, not duplicated in document fields. Ownership comes from the verified Firebase token, not a JSON ownerUid supplied by the client. Passwords and tokens are not stored in these documents. Removing the user root document alone does not recursively delete subcollections; account deletion is not implemented.

Money is CAD integer cents. Expenses in the transaction ledger and recurring templates are negative; all costs/limits elsewhere are positive. Dates are ISO date-only strings, not Firestore timestamps. Optional fields such as studentId/endDate use null. JSON codecs read defaults for old transaction note/recurrenceId/voided and calendar paid fields, preserving older records.

Calculated ledger totals, budget remaining, goal progress, forecast series, semester summaries and notifications are transient results, not independent documents. This avoids stale duplicated totals.

## Relationships and deletion

A Category has many Transaction and CategoryBudget references through categoryId. A RecurringEntry generates many Transactions with recurrenceId. Each user's collections are isolated; category IDs have meaning only within that user and the fixed catalogue.

Custom category removal archives it. Existing transactions remain readable and editable with their original category. Budget summaries omit archived categories. Existing schedules retain their original category unless edited/paused. Manual transaction deletion removes its document; generated transaction deletion leaves voided=true so retries cannot regenerate it. Schedule deletion does not erase prior transactions. Deleting goals/events/bursaries/fees removes their documents.

Budget IDs enforce one definition per category/period. Recurrence IDs use rec_<scheduleId>_<date> with create-only writes. Other records use Firestore-generated IDs. No multi-document cascade or cross-record transaction is assumed.

## Migration and deployment

Republish the root firestore.rules before using new screens. Existing data requires no bulk rewrite for the newly optional fields. Legacy prototype categories remain recognized as archived built-ins; users can reclassify entries to the RD defaults. Existing overall spending-limit goals remain goals rather than being silently migrated into category budgets.

There is no local-file persistence or import/export implementation. FR-18 in the RD must be reconciled with the chosen Firestore design.
