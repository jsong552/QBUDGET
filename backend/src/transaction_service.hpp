// Transaction use cases and pure ledger calculations, independent of HTTP/Firestore JSON.
#pragma once
#include "category_service.hpp"
#include <map>
#include <cmath>
namespace qbudget {
inline std::string lower(std::string value) {
    for (char &c : value)
        c = static_cast<char>(std::tolower(static_cast<unsigned char>(c)));
    return value;
}
inline int progressPercent(MoneyCents current, MoneyCents target) {
    return target <= 0 ? 0 : static_cast<int>(std::clamp(std::round(100.0 * current / target), 0.0, 100.0));
}
class Ledger {
    std::vector<Transaction> records;
    Date asOf;

  public:
    Ledger(std::vector<Transaction> transactions, Date now) : records(std::move(transactions)), asOf(now) {}
    const std::vector<Transaction> &transactions() const {
        return records;
    }
    LedgerTotals totals(std::optional<DateRange> range = std::nullopt) const {
        LedgerTotals result;
        for (const auto &row : records) {
            if (row.voided || !(row.date <= asOf) || (range && !range->contains(row.date)))
                continue;
            if (row.type == TransactionType::Income)
                result.incomeCents = addMoney(result.incomeCents, row.amountCents);
            else
                result.expensesCents = addMoney(result.expensesCents, -row.amountCents);
        }
        return result;
    }
    MoneyCents categorySpending(const std::string &id, const DateRange &range) const {
        MoneyCents amount = 0;
        for (const auto &row : records)
            if (!row.voided && row.categoryId == id && row.type == TransactionType::Expense &&
                row.date <= asOf && range.contains(row.date))
                amount = addMoney(amount, -row.amountCents);
        return amount;
    }
    std::vector<CategoryTotal> breakdown(const DateRange &range,
                                         const std::vector<Category> &categories) const {
        std::vector<CategoryTotal> result;
        auto total = totals(range).expensesCents;
        for (const auto &category : categories) {
            auto amount = categorySpending(category.id, range);
            if (amount)
                result.push_back({category, amount, progressPercent(amount, total)});
        }
        return result;
    }
    std::vector<SeriesPoint> points(const DateRange &range, const std::string &granularity,
                                    bool income) const {
        std::map<std::string, MoneyCents> groups;
        for (const auto &row : records) {
            if (row.voided || !(row.date <= asOf) || !range.contains(row.date))
                continue;
            auto date = row.date;
            if (granularity == "monthly")
                date = date.startOfMonth();
            else if (granularity == "weekly")
                date = date.startOfWeek();
            else if (granularity == "semester")
                date = date.startOfTerm();
            auto amount =
                income ? std::max<MoneyCents>(0, row.amountCents) : std::max<MoneyCents>(0, -row.amountCents);
            groups[date.str()] = addMoney(groups[date.str()], amount);
        }
        std::vector<SeriesPoint> result;
        for (const auto &[date, amount] : groups)
            result.push_back({Date(date), amount});
        return result;
    }
};
class TransactionService {
    TransactionRepository &repository;
    CategoryService &categories;

  public:
    TransactionService(TransactionRepository &repo, CategoryService &catalogue)
        : repository(repo), categories(catalogue) {}
    std::vector<Transaction> list(const TransactionFilter &filter = {}) const {
        return filterRecords(repository.list(), filter);
    }
    std::vector<Transaction> filterRecords(std::vector<Transaction> rows,
                                           const TransactionFilter &filter) const {
        require(filter.type == "all" || filter.type == "income" || filter.type == "expense",
                "Invalid type filter.");
        require(filter.sortBy == "date" || filter.sortBy == "description" || filter.sortBy == "category" ||
                    filter.sortBy == "type" || filter.sortBy == "amount",
                "Invalid sort key.");
        rows.erase(
            std::remove_if(rows.begin(), rows.end(),
                           [&](const Transaction &row) {
                               return row.voided || (filter.range && !filter.range->contains(row.date)) ||
                                      (filter.categoryId != "all" && row.categoryId != filter.categoryId) ||
                                      (filter.type == "income" && row.type != TransactionType::Income) ||
                                      (filter.type == "expense" && row.type != TransactionType::Expense) ||
                                      (!filter.search.empty() &&
                                       lower(row.description + " " + row.note).find(lower(filter.search)) ==
                                           std::string::npos);
                           }),
            rows.end());
        auto catalogue = categories.list(true);
        auto categoryName = [&](const std::string &id) {
            for (const auto &c : catalogue)
                if (c.id == id)
                    return c.name;
            return id;
        };
        auto less = [&](const Transaction &a, const Transaction &b) {
            if (filter.sortBy == "amount")
                return a.amountCents < b.amountCents;
            if (filter.sortBy == "description")
                return a.description < b.description;
            if (filter.sortBy == "type")
                return a.type < b.type;
            if (filter.sortBy == "category")
                return categoryName(a.categoryId) < categoryName(b.categoryId);
            return a.date < b.date;
        };
        std::stable_sort(rows.begin(), rows.end(), [&](const Transaction &a, const Transaction &b) {
            return filter.descending ? less(b, a) : less(a, b);
        });
        return rows;
    }
    std::string create(Transaction value) const {
        categories.requireActive(value.categoryId);
        value.recurrenceId.clear();
        value.voided = false;
        return repository.add(value);
    }
    void update(const std::string &id, Transaction value) const {
        auto current = repository.find(id);
        if (!current)
            throw ApiError(404, "Transaction not found.");
        if (current->categoryId != value.categoryId)
            categories.requireActive(value.categoryId);
        value.recurrenceId = current->recurrenceId;
        value.voided = current->voided;
        repository.save(id, value);
    }
    void remove(const std::string &id) const {
        auto current = repository.find(id);
        if (!current)
            throw ApiError(404, "Transaction not found.");
        if (current->recurrenceId.empty())
            repository.remove(id);
        else {
            current->voided = true;
            repository.save(id, *current);
        }
    }
};
} // namespace qbudget
