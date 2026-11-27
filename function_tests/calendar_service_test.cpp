/*
 * File: calendar_service_test.cpp
 * Description: Function tests for CalendarService and RecurrenceService (Use Case 4:
 *              CreateCalendarEvent). Covers creating, listing, updating and removing payment
 *              events, upcoming/urgent payments, recurring dates (weekly, monthly, month-end),
 *              end dates and pausing, and generating transactions without duplicates,
 *              including after a schedule's start date or frequency is edited (rent and
 *              paycheque), with deleted and hand-edited months. Uses the in-memory test store.
 */
#include "../backend/src/calendar_service.hpp"
#include "../backend/tests/memory_store.hpp"
#include <functional>
#include <iostream>
using namespace qbudget;

namespace {
int checks = 0;
int failures = 0;

void check(bool value, const std::string &message) {
    checks++;
    if (!value) {
        failures++;
        std::cerr << "  FAIL: " << message << '\n';
    }
}

void fails(int status, const std::function<void()> &action, const std::string &message) {
    try {
        action();
        check(false, message + " (no error thrown)");
    } catch (const ApiError &error) {
        check(error.status == status, message + " (wrong status " + std::to_string(error.status) + ")");
    }
}

void test(const std::string &name, const std::function<void()> &body) {
    int before = failures;
    try {
        body();
    } catch (const std::exception &error) {
        failures++;
        std::cerr << "  EXCEPTION: " << error.what() << '\n';
    }
    std::cout << (failures == before ? "[PASS] " : "[FAIL] ") << name << '\n';
}

const Date now("2026-11-08");

CalendarEvent event(const std::string &title, const std::string &date, MoneyCents amount = 90000,
                    bool paid = false) {
    return {"", title, "rent", Date(date), amount, true, paid};
}

RecurringEntry schedule(const std::string &start, RecurrenceFrequency frequency = RecurrenceFrequency::Monthly,
                        std::optional<Date> end = std::nullopt, const std::string &category = "rent") {
    return {"", "Rent", category, TransactionType::Expense, -90000, Date(start), end, frequency, true};
}

RecurringEntry paycheque(const std::string &start, RecurrenceFrequency frequency = RecurrenceFrequency::Monthly) {
    return {"", "Paycheque", "income", TransactionType::Income, 120000, Date(start), std::nullopt, frequency, true};
}

// Ids of the generated transactions the user can see (deleted/voided ones left out), oldest first.
std::vector<std::string> visibleIds(const TransactionService &transactions) {
    std::vector<std::string> ids;
    for (const auto &row : transactions.list())
        ids.push_back(row.id);
    std::sort(ids.begin(), ids.end());
    return ids;
}

bool isVoided(const TransactionRepository &repo, const std::string &id) {
    auto row = repo.find(id);
    return row && row->voided;
}

struct Setup {
    MemoryStore store;
    EventRepository eventRepo{store};
    RecurringRepository recurringRepo{store};
    TransactionRepository transactionRepo{store};
    CategoryRepository categoryRepo{store};
    CategoryService categories{categoryRepo};
    CalendarService calendar{eventRepo, &transactionRepo};
    RecurrenceService recurring{recurringRepo, transactionRepo, categories};
    TransactionService transactions{transactionRepo, categories};
};
} // namespace

int main() {
    test("Create events and list them in date order", [] {
        Setup s;
        s.calendar.create(event("Tuition", "2026-12-15", 500000));
        s.calendar.create(event("Rent", "2026-12-01"));
        s.calendar.create(event("Phone", "2026-11-20", 6500));
        auto list = s.calendar.list();
        check(list.size() == 3, "Three events saved");
        check(list[0].title == "Phone" && list[2].title == "Tuition", "Sorted earliest first");
    });

    test("List events within a date range", [] {
        Setup s;
        s.calendar.create(event("Nov rent", "2026-11-01"));
        s.calendar.create(event("Dec rent", "2026-12-01"));
        auto november = s.calendar.list(DateRange::containing(now, BudgetPeriod::Monthly));
        check(november.size() == 1 && november[0].title == "Nov rent", "Only November's event");
    });

    test("Upcoming shows every unpaid payment, including overdue ones", [] {
        Setup s;
        s.calendar.create(event("Today", "2026-11-08"));
        s.calendar.create(event("Past", "2026-11-05"));
        s.calendar.create(event("Paid", "2026-11-10", 90000, true));
        s.calendar.create(event("Later", "2026-11-20"));
        auto upcoming = s.calendar.upcoming(now);
        check(upcoming.size() == 3, "Past, Today and Later (paid one left out)");
        check(upcoming[0].event.title == "Past" && upcoming[0].daysAway == -3, "Overdue is -3 days away");
        check(upcoming[0].urgent, "Overdue payments are urgent");
        check(upcoming[1].event.title == "Today" && upcoming[1].daysAway == 0, "Due today is 0 days away");
        check(upcoming[2].daysAway == 12, "Nov 20 is 12 days away");
    });

    test("Payments 3 days away or less are urgent", [] {
        Setup s;
        s.calendar.create(event("Three", "2026-11-11"));
        s.calendar.create(event("Four", "2026-11-12"));
        auto upcoming = s.calendar.upcoming(now);
        check(upcoming[0].urgent, "3 days away is urgent");
        check(!upcoming[1].urgent, "4 days away is not urgent");
    });

    test("Marking an event paid removes it from upcoming, and events can be removed", [] {
        Setup s;
        auto id = s.calendar.create(event("Rent", "2026-11-20"));
        s.calendar.update(id, event("Rent", "2026-11-20", 90000, true));
        check(s.calendar.upcoming(now).empty(), "Paid event no longer upcoming");
        check(s.calendar.list().size() == 1, "But it's still on the calendar");
        s.calendar.remove(id);
        check(s.calendar.list().empty(), "Removed");
    });

    test("Recording a payment marks its event as paid", [] {
        Setup s;
        auto id = s.calendar.create(event("Rent", "2026-11-20"));
        Transaction payment{"", Date("2026-11-20"), "Rent", "rent", TransactionType::Expense, -90000, "", ""};
        s.transactionRepo.save("cal_" + id, payment, false);
        check(s.calendar.list()[0].paid, "Event shows as paid");
        check(s.calendar.upcoming(now).empty(), "No longer upcoming");
    });

    test("A recorded payment keeps its amount, date and kind", [] {
        Setup s;
        auto id = s.calendar.create(event("Rent", "2026-11-20"));
        Transaction payment{"", Date("2026-11-20"), "Rent", "rent", TransactionType::Expense, -90000, "", ""};
        s.transactionRepo.save("cal_" + id, payment, false);
        fails(400, [&] { s.calendar.update(id, event("Rent", "2026-11-20", 95000)); }, "Changing the amount");
        fails(400, [&] { s.calendar.update(id, event("Rent", "2026-11-21")); }, "Changing the date");
        s.calendar.update(id, event("November rent", "2026-11-20"));
        check(s.calendar.list()[0].title == "November rent", "Renaming is still allowed");
    });

    test("Invalid events are rejected", [] {
        Setup s;
        fails(400, [&] { s.calendar.create(event("Rent", "2026-12-01", 0)); }, "Zero amount");
        fails(400, [&] { s.calendar.create(event("", "2026-12-01")); }, "Blank title");
        fails(404, [&] { s.calendar.update("missing", event("Rent", "2026-12-01")); }, "Editing a missing event");
    });

    test("Monthly dates stay on the original day (Jan 31, Feb 28, Mar 31)", [] {
        auto dates = RecurrenceService::occurrences(schedule("2026-01-31"),
                                                    {Date("2026-01-01"), Date("2026-04-01")});
        check(dates.size() == 3, "Three months");
        check(dates[0] == Date("2026-01-31") && dates[1] == Date("2026-02-28") && dates[2] == Date("2026-03-31"),
              "Clamped in February, back to the 31st in March");
    });

    test("Weekly dates are 7 days apart and only inside the range", [] {
        auto dates = RecurrenceService::occurrences(schedule("2026-10-05", RecurrenceFrequency::Weekly),
                                                    {Date("2026-11-01"), Date("2026-11-20")});
        check(dates.size() == 3, "Nov 2, 9 and 16");
        check(dates[0] == Date("2026-11-02") && dates[2] == Date("2026-11-16"), "Starts from the first in range");
    });

    test("End dates are included, and paused schedules give no dates", [] {
        auto ending = schedule("2026-09-01", RecurrenceFrequency::Monthly, Date("2026-11-01"));
        auto dates = RecurrenceService::occurrences(ending, {Date("2026-09-01"), Date("2027-01-01")});
        check(dates.size() == 3 && dates[2] == Date("2026-11-01"), "Sep, Oct and Nov 1 (end day included)");
        auto paused = schedule("2026-09-01");
        paused.active = false;
        check(RecurrenceService::occurrences(paused, {Date("2026-09-01"), Date("2027-01-01")}).empty(),
              "Paused schedule");
    });

    test("Sync creates transactions that are due, up to today", [] {
        Setup s;
        auto id = s.recurring.create(schedule("2026-09-01"));
        check(s.recurring.sync(now) == 3, "Sep 1, Oct 1 and Nov 1 created; Dec 1 not yet");
        auto row = s.transactionRepo.find("rec_" + id + "_2026-11-01");
        check(row && row->recurrenceId == id && row->amountCents == -90000, "Linked to the schedule");
        check(row && row->categoryId == "rent" && row->description == "Rent", "Copies the schedule's details");
    });

    test("Running sync again doesn't create duplicates", [] {
        Setup s;
        s.recurring.create(schedule("2026-09-01"));
        s.recurring.sync(now);
        check(s.recurring.sync(now) == 0, "Second sync adds nothing");
        check(s.transactionRepo.list().size() == 3, "Still 3 transactions");
    });

    test("A deleted generated transaction isn't created again", [] {
        Setup s;
        auto id = s.recurring.create(schedule("2026-09-01"));
        s.recurring.sync(now);
        s.transactions.remove("rec_" + id + "_2026-10-01");
        check(s.recurring.sync(now) == 0, "Deleted month stays deleted");
        check(s.transactions.list().size() == 2, "User sees 2 transactions");
    });

    test("Paused and removed schedules stop creating transactions", [] {
        Setup s;
        auto id = s.recurring.create(schedule("2026-09-01"));
        auto paused = schedule("2026-09-01");
        paused.active = false;
        s.recurring.update(id, paused);
        check(s.recurring.sync(now) == 0, "Paused schedule creates nothing");
        s.recurring.remove(id);
        check(s.recurring.list().empty(), "Schedule removed");
    });

    test("Recurring descriptions are trimmed and can't be blank", [] {
        Setup s;
        auto value = schedule("2026-09-01");
        value.description = "   Rent   ";
        s.recurring.create(value);
        check(s.recurring.list()[0].description == "Rent", "Spaces removed");
        value.description = "   ";
        fails(400, [&] { s.recurring.create(value); }, "Spaces-only description");
    });

    test("Recurring entries are listed by start date, then description", [] {
        Setup s;
        auto rent = schedule("2026-09-01");
        auto phone = schedule("2026-09-01");
        phone.description = "Phone";
        auto gym = schedule("2026-08-01");
        gym.description = "Gym";
        s.recurring.create(rent);
        s.recurring.create(phone);
        s.recurring.create(gym);
        auto list = s.recurring.list();
        check(list[0].description == "Gym", "Earliest start date first");
        check(list[1].description == "Phone" && list[2].description == "Rent", "Same date sorted A to Z");
    });

    test("Invalid recurring entries are rejected", [] {
        Setup s;
        auto wrongType = schedule("2026-09-01", RecurrenceFrequency::Monthly, std::nullopt, "income");
        fails(400, [&] { s.recurring.create(wrongType); }, "Expense in the income category");
        fails(404, [&] { s.recurring.remove("missing"); }, "Removing a missing entry");
        fails(400, [&] { s.recurring.create(schedule("2026-09-01", RecurrenceFrequency::Monthly, std::nullopt, "food")); },
              "Archived category");
        fails(400, [&] { s.recurring.create(schedule("2026-09-01", RecurrenceFrequency::Monthly, Date("2026-08-01"))); },
              "Ends before it starts");
        fails(404, [&] { s.recurring.update("missing", schedule("2026-09-01")); }, "Editing a missing entry");
    });

    // Regression tests for TEST_REPORT.md bug B2: editing a schedule's start date or frequency used
    // to leave the old schedule's generated transactions behind, charging a month twice.
    test("Moving rent's start date back doesn't leave the old month behind", [] {
        Setup s;
        auto id = s.recurring.create(schedule("2026-11-08"));
        s.recurring.sync(now);
        check(visibleIds(s.transactions).size() == 1, "First sync: Nov 8 rent only");
        s.recurring.update(id, schedule("2026-09-01")); // "my lease started in September"
        s.recurring.sync(now);
        auto p = "rec_" + id + "_";
        check(visibleIds(s.transactions) == std::vector<std::string>{p + "2026-09-01", p + "2026-10-01", p + "2026-11-01"},
              "Sep 1, Oct 1 and Nov 1 only");
        check(isVoided(s.transactionRepo, p + "2026-11-08"), "Old Nov 8 rent is voided, not deleted");
        check(Ledger(s.transactionRepo.list(), now).totals().expensesCents == 270000, "Spending is 3 x $900, not 4");
        check(s.recurring.sync(now) == 0 && visibleIds(s.transactions).size() == 3, "Syncing again changes nothing");
    });

    test("Moving a paycheque's start date back doesn't leave the old payday behind", [] {
        Setup s;
        auto id = s.recurring.create(paycheque("2026-11-05"));
        s.recurring.sync(now);
        s.recurring.update(id, paycheque("2026-09-15"));
        s.recurring.sync(now);
        auto p = "rec_" + id + "_";
        check(visibleIds(s.transactions) == std::vector<std::string>{p + "2026-09-15", p + "2026-10-15"},
              "Sep 15 and Oct 15 only (Nov 15 isn't due yet)");
        check(isVoided(s.transactionRepo, p + "2026-11-05"), "Old Nov 5 payday is voided");
        check(Ledger(s.transactionRepo.list(), now).totals().incomeCents == 240000, "Income is 2 x $1200, not 3");
    });

    test("Changing rent from monthly to weekly keeps only the weekly dates", [] {
        Setup s;
        auto id = s.recurring.create(schedule("2026-10-01"));
        s.recurring.sync(now); // Oct 1 and Nov 1
        s.recurring.update(id, schedule("2026-10-01", RecurrenceFrequency::Weekly));
        s.recurring.sync(now);
        auto p = "rec_" + id + "_";
        check(visibleIds(s.transactions) == std::vector<std::string>{p + "2026-10-01", p + "2026-10-08", p + "2026-10-15",
                                                                     p + "2026-10-22", p + "2026-10-29", p + "2026-11-05"},
              "Oct 1, 8, 15, 22, 29 and Nov 5");
        check(isVoided(s.transactionRepo, p + "2026-11-01"), "Monthly Nov 1 rent is voided");
        check(Ledger(s.transactionRepo.list(), now).totals().expensesCents == 540000, "Spending is 6 x $900, not 7");
    });

    test("Changing a paycheque from monthly to weekly keeps only the weekly dates", [] {
        Setup s;
        auto id = s.recurring.create(paycheque("2026-10-02"));
        s.recurring.sync(now); // Oct 2 and Nov 2
        s.recurring.update(id, paycheque("2026-10-02", RecurrenceFrequency::Weekly));
        s.recurring.sync(now);
        auto p = "rec_" + id + "_";
        check(visibleIds(s.transactions) == std::vector<std::string>{p + "2026-10-02", p + "2026-10-09", p + "2026-10-16",
                                                                     p + "2026-10-23", p + "2026-10-30", p + "2026-11-06"},
              "Oct 2, 9, 16, 23, 30 and Nov 6");
        check(isVoided(s.transactionRepo, p + "2026-11-02"), "Monthly Nov 2 payday is voided");
        check(Ledger(s.transactionRepo.list(), now).totals().incomeCents == 720000, "Income is 6 x $1200, not 7");
    });

    test("A month the user deleted stays deleted after the schedule is edited", [] {
        Setup s;
        auto id = s.recurring.create(schedule("2026-09-01"));
        s.recurring.sync(now); // Sep 1, Oct 1, Nov 1
        auto p = "rec_" + id + "_";
        s.transactions.remove(p + "2026-09-01");
        s.recurring.update(id, schedule("2026-09-01", RecurrenceFrequency::Weekly));
        s.recurring.sync(now);
        check(isVoided(s.transactionRepo, p + "2026-09-01"), "Deleted Sep 1 is still deleted (it's also a weekly date)");
        check(isVoided(s.transactionRepo, p + "2026-10-01") && isVoided(s.transactionRepo, p + "2026-11-01"),
              "Monthly Oct 1 and Nov 1 voided");
        check(visibleIds(s.transactions).size() == 9, "Weekly Sep 8 to Nov 3 = 9 visible (10 dates minus deleted Sep 1)");
        check(s.recurring.sync(now) == 0 && visibleIds(s.transactions).size() == 9, "Syncing again doesn't bring Sep 1 back");
    });

    test("Hand-edited months: kept if still a schedule date, voided if not", [] {
        // The fix doesn't track hand edits. It keeps a generated transaction while its date is still
        // one of the schedule's dates, and voids it (like a delete) once it isn't, edited or not.
        Setup s;
        auto id = s.recurring.create(schedule("2026-10-01"));
        s.recurring.sync(now); // Oct 1 and Nov 1
        auto p = "rec_" + id + "_";
        auto october = *s.transactionRepo.find(p + "2026-10-01");
        october.amountCents = -95000;
        october.note = "Paid with a $50 late fee";
        s.transactions.update(october.id, october);
        auto november = *s.transactionRepo.find(p + "2026-11-01");
        november.note = "Paid by e-transfer";
        s.transactions.update(november.id, november);
        s.recurring.update(id, schedule("2026-10-01", RecurrenceFrequency::Weekly));
        s.recurring.sync(now);
        auto kept = s.transactionRepo.find(p + "2026-10-01");
        check(kept && !kept->voided && kept->amountCents == -95000 && kept->note == "Paid with a $50 late fee",
              "Edited Oct 1 (also a weekly date) keeps the user's amount and note");
        check(isVoided(s.transactionRepo, p + "2026-11-01"), "Edited Nov 1 (not a weekly date) is voided anyway");
        check(visibleIds(s.transactions).size() == 6, "6 weekly rows, no duplicate November rent");
    });

    std::cout << '\n' << checks - failures << '/' << checks << " Calendar and Recurrence checks passed.\n";
    return failures == 0 ? 0 : 1;
}
