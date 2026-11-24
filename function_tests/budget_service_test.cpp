/*
 * Description: Function tests for BudgetService and GoalService (FR-7 to FR-11, Use Case 3).
 *              Covers setting and replacing category budgets, weekly/monthly/semester periods,
 *              spent/remaining/over-budget results, period resets, and savings and spending-limit
 *              goal progress. Uses the in-memory test store.
 */
#include "../backend/src/budget_service.hpp"
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

Transaction spend(const std::string &date, MoneyCents amount, const std::string &category = "groceries") {
    return {"", Date(date), "Spending", category, TransactionType::Expense, -amount, "", ""};
}

Transaction earn(const std::string &date, MoneyCents amount) {
    return {"", Date(date), "Pay", "income", TransactionType::Income, amount, "", ""};
}

struct Setup {
    MemoryStore store;
    CategoryRepository categoryRepo{store};
    BudgetRepository budgetRepo{store};
    GoalRepository goalRepo{store};
    CategoryService categories{categoryRepo};
    BudgetService budgets{budgetRepo, categories};
    GoalService goals{goalRepo};
};
} // namespace

int main() {
    test("Set a budget for a category (FR-7, FR-8)", [] {
        Setup s;
        s.budgets.set({"", "groceries", BudgetPeriod::Monthly, 20000});
        auto list = s.budgets.list();
        check(list.size() == 1 && list[0].id == "groceries_monthly", "Saved as groceries_monthly");
        check(list[0].amountCents == 20000, "$200 budget");
    });

    test("Setting the same category and period again replaces it", [] {
        Setup s;
        s.budgets.set({"", "groceries", BudgetPeriod::Monthly, 20000});
        s.budgets.set({"", "groceries", BudgetPeriod::Monthly, 25000});
        auto list = s.budgets.list();
        check(list.size() == 1 && list[0].amountCents == 25000, "One budget with the new amount");
        s.budgets.set({"", "groceries", BudgetPeriod::Weekly, 5000});
        check(s.budgets.list().size() == 2, "A weekly budget is separate from the monthly one");
    });

    test("Invalid budgets are rejected", [] {
        Setup s;
        fails(400, [&] { s.budgets.set({"", "groceries", BudgetPeriod::Monthly, 0}); }, "Zero amount");
        fails(400, [&] { s.budgets.set({"", "spaceships", BudgetPeriod::Monthly, 100}); }, "Unknown category");
        fails(400, [&] { s.budgets.set({"", "food", BudgetPeriod::Monthly, 100}); }, "Archived category");
        check(s.budgets.list().empty(), "Nothing saved");
    });

    test("Remove a budget", [] {
        Setup s;
        s.budgets.set({"", "rent", BudgetPeriod::Monthly, 90000});
        s.budgets.remove("rent_monthly");
        check(s.budgets.list().empty(), "Budget removed");
    });

    test("Budgeted, spent and remaining for the current month (FR-9)", [] {
        Setup s;
        s.budgets.set({"", "groceries", BudgetPeriod::Monthly, 20000});
        Ledger ledger({spend("2026-11-02", 9000), spend("2026-11-06", 6000)}, now);
        auto result = s.budgets.summaries(ledger, now);
        check(result.size() == 1, "One summary");
        check(result[0].budgetedCents == 20000 && result[0].spentCents == 15000, "$200 budgeted, $150 spent");
        check(result[0].remainingCents == 5000 && !result[0].overBudget, "$50 left, not over");
        check(result[0].category.name == "Groceries", "Category attached");
    });

    test("Going over budget is flagged (FR-11)", [] {
        Setup s;
        s.budgets.set({"", "groceries", BudgetPeriod::Monthly, 20000});
        Ledger over({spend("2026-11-02", 22500)}, now);
        auto result = s.budgets.summaries(over, now);
        check(result[0].overBudget && result[0].remainingCents == -2500, "Over by $25");
        Ledger exact({spend("2026-11-02", 20000)}, now);
        check(!s.budgets.summaries(exact, now)[0].overBudget, "Spending exactly the budget is not over");
    });

    test("Budgets reset at the start of each new month or week (FR-10)", [] {
        Setup s;
        s.budgets.set({"", "groceries", BudgetPeriod::Monthly, 20000});
        s.budgets.set({"", "groceries", BudgetPeriod::Weekly, 5000});
        // Oct 30 = last month; Sun Nov 1 = this month but last week; Nov 3 and Sun Nov 8 = this week
        Ledger ledger({spend("2026-10-30", 15000), spend("2026-11-01", 2000), spend("2026-11-03", 3000),
                       spend("2026-11-08", 1000)},
                      now);
        auto result = s.budgets.summaries(ledger, now);
        for (const auto &summary : result) {
            if (summary.period == BudgetPeriod::Monthly)
                check(summary.spentCents == 6000, "October spending doesn't count in November ($60)");
            else
                check(summary.spentCents == 4000 && summary.range.start == Date("2026-11-02"),
                      "Week of Mon Nov 2 leaves out Sun Nov 1 ($40)");
        }
        check(ledger.transactions().size() == 4, "History is kept, not deleted");
    });

    test("Semester budgets cover the whole term", [] {
        Setup s;
        s.budgets.set({"", "tuition", BudgetPeriod::Semester, 700000});
        Ledger ledger({spend("2026-09-05", 650000, "tuition"), spend("2026-08-25", 1000, "tuition")}, now);
        auto result = s.budgets.summaries(ledger, now);
        check(result[0].spentCents == 650000, "Only September onwards counts");
        check(result[0].range.start == Date("2026-09-01") && result[0].range.end == Date("2027-01-01"), "Fall term");
    });

    test("Income doesn't count as spending, and archived categories are skipped", [] {
        Setup s;
        auto coffee = s.categories.create("Coffee");
        s.budgets.set({"", coffee, BudgetPeriod::Monthly, 3000});
        s.budgets.set({"", "groceries", BudgetPeriod::Monthly, 20000});
        Ledger ledger({earn("2026-11-01", 50000)}, now);
        check(s.budgets.summaries(ledger, now).size() == 2, "Both budgets before removal");
        s.categories.remove(coffee);
        auto result = s.budgets.summaries(ledger, now);
        check(result.size() == 1 && result[0].spentCents == 0, "Coffee skipped; income not spending");
    });

    test("Create, edit and remove savings goals", [] {
        Setup s;
        auto id = s.goals.create({"", "Spring trip", GoalKind::Savings, 150000});
        Ledger ledger({}, now);
        check(s.goals.progress(ledger, now).size() == 1, "Goal saved");
        s.goals.update(id, {"", "Spring trip", GoalKind::Savings, 200000});
        check(s.goals.progress(ledger, now)[0].goal.targetCents == 200000, "Target updated");
        s.goals.remove(id);
        check(s.goals.progress(ledger, now).empty(), "Goal removed");
        fails(400, [&] { s.goals.create({"", "", GoalKind::Savings, 100}); }, "Blank title rejected");
        fails(400, [&] { s.goals.create({"", "Trip", GoalKind::Savings, 0}); }, "Zero target rejected");
    });

    test("Savings goal progress uses the overall balance", [] {
        Setup s;
        s.goals.create({"", "Emergency fund", GoalKind::Savings, 150000});
        Ledger ledger({earn("2026-09-01", 100000), spend("2026-11-02", 25000)}, now);
        auto result = s.goals.progress(ledger, now);
        check(result[0].currentCents == 75000 && result[0].percent == 50, "$750 of $1500 = 50%");
    });

    test("Goal progress stays between 0% and 100%", [] {
        Setup s;
        s.goals.create({"", "Fund", GoalKind::Savings, 10000});
        Ledger negative({spend("2026-11-02", 5000)}, now);
        auto low = s.goals.progress(negative, now)[0];
        check(low.currentCents == 0 && low.percent == 0, "Negative balance shows 0");
        Ledger rich({earn("2026-11-01", 50000)}, now);
        check(s.goals.progress(rich, now)[0].percent == 100, "Past the target caps at 100%");
    });

    test("Spending-limit goals only count this month's expenses", [] {
        Setup s;
        s.goals.create({"", "Spend under $400", GoalKind::SpendingLimit, 40000});
        Ledger ledger({spend("2026-10-20", 30000), spend("2026-11-02", 10000), earn("2026-11-01", 90000)}, now);
        auto result = s.goals.progress(ledger, now)[0];
        check(result.currentCents == 10000 && result.percent == 25, "$100 of $400 = 25%");
    });

    std::cout << '\n' << checks - failures << '/' << checks << " BudgetService checks passed.\n";
    return failures == 0 ? 0 : 1;
}
