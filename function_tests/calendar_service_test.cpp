/*
 * Description: Function tests for CalendarService and RecurrenceService (Use Case 4:
 *              CreateCalendarEvent). Covers creating, listing, updating and removing payment
 *              events, upcoming/urgent payments, recurring dates (weekly, monthly, month-end),
 *              end dates and pausing, and generating transactions without duplicates.
 *              Uses the in-memory test store.
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

    std::cout << '\n' << checks - failures << '/' << checks << " Calendar and Recurrence checks passed.\n";
    return failures == 0 ? 0 : 1;
}
