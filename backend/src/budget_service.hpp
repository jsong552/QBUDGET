// Category budgets reset by calculating a new period; transaction history is never erased.
#pragma once
#include "transaction_service.hpp"
namespace qbudget {
class BudgetService {
    BudgetRepository &repository;
    CategoryService &categories;

  public:
    BudgetService(BudgetRepository &repo, CategoryService &catalogue)
        : repository(repo), categories(catalogue) {}
    std::vector<CategoryBudget> list() const {
        return repository.list();
    }
    void set(const CategoryBudget &budget) const {
        categories.requireActive(budget.categoryId);
        auto suffix = budget.period == BudgetPeriod::Weekly    ? "weekly"
                      : budget.period == BudgetPeriod::Monthly ? "monthly"
                                                               : "semester";
        repository.save(budget.categoryId + "_" + suffix, budget, false);
    }
    void remove(const std::string &id) const {
        repository.remove(id);
    }
    std::vector<BudgetSummary> summaries(const Ledger &ledger, Date now) const {
        std::vector<BudgetSummary> result;
        for (const auto &budget : list()) {
            auto category = categories.find(budget.categoryId);
            if (category.archived)
                continue;
            auto range = DateRange::containing(now, budget.period);
            auto spent = ledger.categorySpending(budget.categoryId, range);
            result.push_back({category, budget.period, range, budget.amountCents, spent,
                              budget.amountCents - spent, spent > budget.amountCents});
        }
        return result;
    }
};
class GoalService {
    GoalRepository &repository;

  public:
    explicit GoalService(GoalRepository &repo) : repository(repo) {}
    std::string create(const SavingsGoal &goal) const {
        return repository.add(goal);
    }
    void update(const std::string &id, const SavingsGoal &goal) const {
        repository.save(id, goal);
    }
    void remove(const std::string &id) const {
        repository.remove(id);
    }
    std::vector<GoalProgress> progress(const Ledger &ledger, Date now) const {
        std::vector<GoalProgress> result;
        for (const auto &goal : repository.list()) {
            auto current =
                goal.kind == GoalKind::SpendingLimit
                    ? ledger.totals(DateRange::containing(now, BudgetPeriod::Monthly)).expensesCents
                    : std::max<MoneyCents>(0, ledger.totals().balance());
            result.push_back({goal, current, progressPercent(current, goal.targetCents)});
        }
        return result;
    }
};
} // namespace qbudget
