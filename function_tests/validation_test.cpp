/*
 * Description: Function tests for the record validation rules (validation.hpp) and the money
 *              overflow check (addMoney in models.hpp). Every rule that runs before a record is
 *              saved is checked with one valid and one invalid case. Pure; no store or network.
 */
#include "../backend/src/validation.hpp"
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

void passes(const std::function<void()> &action, const std::string &message) {
    try {
        action();
        check(true, message);
    } catch (const std::exception &error) {
        check(false, message + " (threw: " + error.what() + ")");
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

Transaction expense(MoneyCents amount) {
    return {"", Date("2026-11-08"), "Lunch", "groceries", TransactionType::Expense, amount, "", ""};
}

Transaction income(MoneyCents amount) {
    return {"", Date("2026-11-08"), "OSAP", "income", TransactionType::Income, amount, "", ""};
}

RecurringEntry recurring(Date start, std::optional<Date> end) {
    return {"", "Rent", "rent", TransactionType::Expense, -90000, start, end, RecurrenceFrequency::Monthly, true};
}
} // namespace

int main() {
    test("Names must not be blank and must fit the length limit", [] {
        passes([] { validName("Rent"); }, "Normal name");
        fails(400, [] { validName(""); }, "Empty name");
        fails(400, [] { validName("   \t "); }, "Whitespace-only name");
        passes([] { validName(std::string(200, 'a')); }, "200 characters is the limit");
        fails(400, [] { validName(std::string(201, 'a')); }, "201 characters is too long");
    });

    test("Expenses must be negative and income must be positive", [] {
        passes([] { validateRecord(expense(-1500)); }, "$15 expense stored as -1500");
        passes([] { validateRecord(income(50000)); }, "$500 income stored as 50000");
        fails(400, [] { validateRecord(expense(1500)); }, "Positive expense");
        fails(400, [] { validateRecord(income(-50000)); }, "Negative income");
        fails(400, [] { validateRecord(expense(0)); }, "Zero expense (FR-4)");
        fails(400, [] { validateRecord(income(0)); }, "Zero income (FR-4)");
    });

    test("Amounts outside the supported range are rejected", [] {
        passes([] { validateRecord(income(maxRecordCents)); }, "Largest allowed amount");
        fails(400, [] { validateRecord(income(maxRecordCents + 1)); }, "One cent over the limit");
        fails(400, [] { validateRecord(expense(-maxRecordCents - 1)); }, "One cent under the negative limit");
    });

    test("Transaction description and note rules", [] {
        auto blank = expense(-1500);
        blank.description = " ";
        fails(400, [&] { validateRecord(blank); }, "Blank description");
        auto longNote = expense(-1500);
        longNote.note = std::string(1000, 'n');
        passes([&] { validateRecord(longNote); }, "1000-character note is allowed");
        longNote.note += "n";
        fails(400, [&] { validateRecord(longNote); }, "1001-character note is too long");
    });

    test("Category names are limited to 80 characters", [] {
        passes([] { validateRecord(Category{"", std::string(80, 'c')}); }, "80 characters");
        fails(400, [] { validateRecord(Category{"", std::string(81, 'c')}); }, "81 characters");
        fails(400, [] { validateRecord(Category{"", ""}); }, "Empty category name");
    });

    test("Budgets need a positive amount and a real period", [] {
        passes([] { validateRecord(CategoryBudget{"", "groceries", BudgetPeriod::Weekly, 5000}); }, "Weekly $50");
        fails(400, [] { validateRecord(CategoryBudget{"", "groceries", BudgetPeriod::Monthly, 0}); }, "Zero budget");
        fails(400, [] { validateRecord(CategoryBudget{"", "groceries", BudgetPeriod::Monthly, -100}); },
              "Negative budget");
        fails(400, [] { validateRecord(CategoryBudget{"", "groceries", static_cast<BudgetPeriod>(9), 5000}); },
              "Unknown period");
    });

    test("Savings goals need a title, positive target and real kind", [] {
        passes([] { validateRecord(SavingsGoal{"", "Spring trip", GoalKind::Savings, 100000}); }, "Valid goal");
        fails(400, [] { validateRecord(SavingsGoal{"", "", GoalKind::Savings, 100000}); }, "Blank title");
        fails(400, [] { validateRecord(SavingsGoal{"", "Trip", GoalKind::Savings, 0}); }, "Zero target");
        fails(400, [] { validateRecord(SavingsGoal{"", "Trip", static_cast<GoalKind>(7), 100}); }, "Unknown kind");
    });

    test("Calendar events need a title, short kind and positive amount", [] {
        CalendarEvent rent{"", "Rent", "rent", Date("2026-12-01"), 90000, true, false};
        passes([&] { validateRecord(rent); }, "Valid event");
        auto noAmount = rent;
        noAmount.amountCents = 0;
        fails(400, [&] { validateRecord(noAmount); }, "Zero amount");
        auto longKind = rent;
        longKind.kind = std::string(41, 'k');
        fails(400, [&] { validateRecord(longKind); }, "Kind over 40 characters");
    });

    test("Recurring entries cannot end before they start", [] {
        passes([] { validateRecord(recurring(Date("2026-09-01"), std::nullopt)); }, "No end date");
        passes([] { validateRecord(recurring(Date("2026-09-01"), Date("2026-09-01"))); }, "Ends on start day");
        fails(400, [] { validateRecord(recurring(Date("2026-09-01"), Date("2026-08-31"))); }, "Ends before start");
        auto badFrequency = recurring(Date("2026-09-01"), std::nullopt);
        badFrequency.frequency = static_cast<RecurrenceFrequency>(5);
        fails(400, [&] { validateRecord(badFrequency); }, "Unknown frequency");
    });

    test("Bursaries and student fees need a positive amount and a real status", [] {
        passes([] { validateRecord(Bursary{"", "Queen's Bursary", 150000, BursaryStatus::Approved}); }, "Bursary");
        fails(400, [] { validateRecord(Bursary{"", "Bursary", 0, BursaryStatus::Applied}); }, "Zero bursary");
        fails(400, [] { validateRecord(Bursary{"", "Bursary", 100, static_cast<BursaryStatus>(8)}); },
              "Unknown bursary status");
        passes([] { validateRecord(StudentFee{"", "Health plan", 25000, Date("2026-09-30"), FeeStatus::OptedOut}); },
               "Fee");
        fails(400, [] { validateRecord(StudentFee{"", "Fee", 25000, Date("2026-09-30"), static_cast<FeeStatus>(4)}); },
              "Unknown fee status");
    });

    test("addMoney adds normally but rejects totals that overflow", [] {
        check(addMoney(1500, 2500) == 4000, "15.00 + 25.00 = 40.00");
        check(addMoney(1500, -2500) == -1000, "Adding a negative subtracts");
        fails(400, [] { addMoney(maxApiMoneyCents, 1); }, "Total past the maximum");
        fails(400, [] { addMoney(-maxApiMoneyCents, -1); }, "Total past the minimum");
    });

    std::cout << '\n' << checks - failures << '/' << checks << " Validation checks passed.\n";
    return failures == 0 ? 0 : 1;
}
