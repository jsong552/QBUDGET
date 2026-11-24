/*
 * Description: Function tests for TransactionService and Ledger (FR-1 to FR-4, FR-12, NFR-5,
 *              Use Case 2: AddExpense). Covers adding, editing and deleting income and expenses,
 *              input rejection, filtering and sorting, and the Ledger totals, category spending,
 *              breakdown percentages and chart points. Uses the in-memory test store.
 */
#include "../backend/src/transaction_service.hpp"
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

Transaction expense(const std::string &date, MoneyCents amount, const std::string &category = "groceries",
                    const std::string &description = "Lunch", const std::string &note = "") {
    return {"", Date(date), description, category, TransactionType::Expense, amount, note, ""};
}

Transaction income(const std::string &date, MoneyCents amount, const std::string &description = "OSAP") {
    return {"", Date(date), description, "income", TransactionType::Income, amount, "", ""};
}

// Fresh store and services for each test so tests don't affect each other.
struct Setup {
    MemoryStore store;
    TransactionRepository transactionRepo{store};
    CategoryRepository categoryRepo{store};
    CategoryService categories{categoryRepo};
    TransactionService service{transactionRepo, categories};
};
} // namespace

int main() {
    test("Add an expense and an income entry (FR-1, FR-2)", [] {
        Setup s;
        auto lunch = s.service.create(expense("2026-11-08", -1500, "groceries", "Lunch", "with friends"));
        s.service.create(income("2026-11-01", 50000, "Part-time job"));
        auto rows = s.service.list();
        check(rows.size() == 2, "Both entries saved");
        auto saved = s.transactionRepo.find(lunch);
        check(saved && saved->amountCents == -1500 && saved->note == "with friends", "Amount and note stored");
        check(saved && saved->categoryId == "groceries" && saved->date == Date("2026-11-08"), "Category and date");
    });

    test("Invalid amounts are rejected with an error (FR-4)", [] {
        Setup s;
        fails(400, [&] { s.service.create(expense("2026-11-08", 0)); }, "Zero amount");
        fails(400, [&] { s.service.create(expense("2026-11-08", 1500)); }, "Expense entered as positive");
        fails(400, [&] { s.service.create(income("2026-11-08", -50000)); }, "Income entered as negative");
        fails(400, [&] { s.service.create(expense("2026-11-08", -1500, "groceries", "  ")); }, "Blank description");
        check(s.service.list().empty(), "Nothing was saved");
    });

    test("Entries must use an existing, active category", [] {
        Setup s;
        fails(400, [&] { s.service.create(expense("2026-11-08", -1500, "spaceships")); }, "Unknown category");
        fails(400, [&] { s.service.create(expense("2026-11-08", -1500, "food")); }, "Old archived category");
    });

    test("New entries can't pretend to be recurring or deleted", [] {
        Setup s;
        auto value = expense("2026-11-08", -1500);
        value.recurrenceId = "fake";
        value.voided = true;
        auto id = s.service.create(value);
        auto saved = s.transactionRepo.find(id);
        check(saved && saved->recurrenceId.empty() && !saved->voided, "Flags cleared on create");
    });

    test("Edit an entry (FR-3)", [] {
        Setup s;
        auto id = s.service.create(expense("2026-11-08", -1500));
        s.service.update(id, expense("2026-11-08", -2000, "rent", "Rent share"));
        auto saved = s.transactionRepo.find(id);
        check(saved && saved->amountCents == -2000 && saved->categoryId == "rent", "Changes saved");
        fails(404, [&] { s.service.update("missing", expense("2026-11-08", -100)); }, "Editing a missing entry");
        fails(400, [&] { s.service.update(id, expense("2026-11-08", -100, "food")); },
              "Moving to an archived category");
    });

    test("Old entries in an archived category can still be edited", [] {
        Setup s;
        auto id = s.transactionRepo.add(expense("2025-06-01", -1200, "food")); // saved before "food" was retired
        s.service.update(id, expense("2025-06-01", -1300, "food"));
        check(s.transactionRepo.find(id)->amountCents == -1300, "Same category is kept without error");
    });

    test("Delete an entry (FR-3)", [] {
        Setup s;
        auto id = s.service.create(expense("2026-11-08", -1500));
        s.service.remove(id);
        check(s.service.list().empty() && !s.transactionRepo.find(id), "Manual entry is removed");
        fails(404, [&] { s.service.remove(id); }, "Deleting twice");
    });

    test("Deleting a recurring-generated entry hides it but keeps a record", [] {
        Setup s;
        auto generated = expense("2026-11-01", -90000, "rent", "Rent");
        generated.recurrenceId = "monthly_rent";
        s.transactionRepo.save("rec_monthly_rent_2026-11-01", generated, false);
        s.service.remove("rec_monthly_rent_2026-11-01");
        check(s.service.list().empty(), "Hidden from the list");
        auto kept = s.transactionRepo.find("rec_monthly_rent_2026-11-01");
        check(kept && kept->voided, "Kept as voided so it isn't generated again");
    });

    test("Filter by type, category, search text and date range", [] {
        Setup s;
        s.service.create(expense("2026-11-02", -4500, "groceries", "Metro run", "weekly shop"));
        s.service.create(expense("2026-11-05", -90000, "rent", "November rent"));
        s.service.create(income("2026-11-01", 50000, "Part-time job"));
        s.service.create(expense("2026-10-20", -1200, "hobbies", "Climbing"));
        TransactionFilter filter;
        filter.type = "income";
        check(s.service.list(filter).size() == 1, "Income only");
        filter = {};
        filter.categoryId = "rent";
        check(s.service.list(filter).size() == 1, "Rent category only");
        filter = {};
        filter.search = "WEEKLY";
        check(s.service.list(filter).size() == 1, "Search is case-insensitive and checks notes");
        filter = {};
        filter.range = DateRange::containing(now, BudgetPeriod::Monthly);
        check(s.service.list(filter).size() == 3, "November only");
    });

    test("Sort by date, amount and description", [] {
        Setup s;
        s.service.create(expense("2026-11-02", -4500, "groceries", "Metro"));
        s.service.create(expense("2026-11-05", -900, "hobbies", "Arcade"));
        s.service.create(expense("2026-11-01", -12000, "rent", "Utilities"));
        auto byDate = s.service.list();
        check(byDate[0].date == Date("2026-11-05"), "Default is newest first");
        TransactionFilter filter;
        filter.sortBy = "amount";
        filter.descending = false;
        check(s.service.list(filter)[0].amountCents == -12000, "Smallest (biggest expense) first");
        filter.sortBy = "description";
        check(s.service.list(filter)[0].description == "Arcade", "A to Z");
    });

    test("Invalid filter options are rejected", [] {
        Setup s;
        TransactionFilter badType;
        badType.type = "refund";
        fails(400, [&] { s.service.list(badType); }, "Unknown type filter");
        TransactionFilter badSort;
        badSort.sortBy = "colour";
        fails(400, [&] { s.service.list(badSort); }, "Unknown sort key");
    });

    test("Ledger totals income, expenses and balance (FR-12, NFR-5)", [] {
        Ledger ledger({income("2026-11-01", 100000), expense("2026-11-02", -2450), expense("2026-10-15", -1000)}, now);
        auto all = ledger.totals();
        check(all.incomeCents == 100000 && all.expensesCents == 3450, "All-time totals in cents");
        check(all.balance() == 96550, "Balance $1000 - $34.50 = $965.50 exactly");
        auto november = ledger.totals(DateRange::containing(now, BudgetPeriod::Monthly));
        check(november.expensesCents == 2450, "Selected period only");
    });

    test("Ledger skips voided and future-dated entries", [] {
        auto voided = expense("2026-11-02", -5000);
        voided.voided = true;
        Ledger ledger({voided, expense("2026-11-20", -7000), expense("2026-11-03", -1000)}, now);
        check(ledger.totals().expensesCents == 1000, "Only the real, past expense counts");
    });

    test("Category spending and breakdown percentages", [] {
        Ledger ledger({expense("2026-11-02", -7500, "groceries"), expense("2026-11-03", -2500, "rent"),
                       income("2026-11-01", 50000)},
                      now);
        auto month = DateRange::containing(now, BudgetPeriod::Monthly);
        check(ledger.categorySpending("groceries", month) == 7500, "Groceries spending");
        check(ledger.categorySpending("income", month) == 0, "Income is not spending");
        std::vector<Category> categories = {{"groceries", "Groceries"}, {"rent", "Rent"}, {"hobbies", "Hobbies"}};
        auto parts = ledger.breakdown(month, categories);
        check(parts.size() == 2, "Categories with no spending are left out");
        check(parts[0].percent == 75 && parts[1].percent == 25, "75% groceries, 25% rent");
    });

    test("Chart points group spending by week or month", [] {
        Ledger ledger({expense("2026-11-02", -1000), expense("2026-11-04", -500), expense("2026-11-07", -250),
                       income("2026-11-03", 20000)},
                      now);
        auto month = DateRange::containing(now, BudgetPeriod::Monthly);
        auto monthly = ledger.points(month, "monthly", false);
        check(monthly.size() == 1 && monthly[0].amountCents == 1750, "All November spending in one point");
        auto weekly = ledger.points(month, "weekly", false);
        check(weekly.size() == 1 && weekly[0].date == Date("2026-11-02"), "Nov 2-7 is one Monday week");
        auto earned = ledger.points(month, "monthly", true);
        check(earned.size() == 1 && earned[0].amountCents == 20000, "Income flag shows income instead");
    });

    std::cout << '\n' << checks - failures << '/' << checks << " TransactionService checks passed.\n";
    return failures == 0 ? 0 : 1;
}
