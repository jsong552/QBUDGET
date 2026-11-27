// Scheduled payments and recurring transaction generation; deterministic dates support testing.
#pragma once
#include "transaction_service.hpp"
#include <unordered_set>
namespace qbudget {
class CalendarService {
    EventRepository &repository;
    TransactionRepository *transactions;

  public:
    explicit CalendarService(EventRepository &repo, TransactionRepository *ledger = nullptr)
        : repository(repo), transactions(ledger) {}
    std::vector<CalendarEvent> list(std::optional<DateRange> range = std::nullopt) const {
        auto values = repository.list();
        if (transactions) {
            auto recorded = transactions->list();
            for (auto &event : values)
                for (const auto &row : recorded)
                    // Paid and deliberately skipped occurrences are no longer future obligations.
                    if (row.id == "cal_" + event.id) event.paid = true;
        }
        values.erase(
            std::remove_if(values.begin(), values.end(),
                           [&](const CalendarEvent &e) { return range && !range->contains(e.date); }),
            values.end());
        std::sort(values.begin(), values.end(),
                  [](const CalendarEvent &a, const CalendarEvent &b) { return a.date < b.date; });
        return values;
    }
    std::vector<UpcomingEvent> upcoming(Date now) const {
        std::vector<UpcomingEvent> result;
        for (const auto &event : list())
            if (!event.paid) {
                auto days = now.daysUntil(event.date);
                result.push_back({event, days, days <= 3});
            }
        return result;
    }
    std::string create(const CalendarEvent &event) const {
        return repository.add(event);
    }
    void update(const std::string &id, const CalendarEvent &event) const {
        auto current = repository.find(id);
        if (!current) throw ApiError(404, "Calendar event not found.");
        if (transactions && transactions->find("cal_" + id)) {
            require(current->amountCents == event.amountCents && current->date == event.date &&
                    current->kind == event.kind, "Recorded payments retain their amount, due date and kind. Edit the transaction separately.");
        }
        repository.save(id, event);
    }
    void remove(const std::string &id) const {
        repository.remove(id);
    }
};
    // remove surrounding whitespace from recurrence service descriptions
    // Taken from Theo's trimName function in category_services.hpp
    inline std::string trimWhitespace(const std::string &value) {
        auto first = value.find_first_not_of(" \t\r\n");
        if (first == std::string::npos)
            return "";
        return value.substr(first, value.find_last_not_of(" \t\r\n") - first + 1);
    }

    class RecurrenceService {
        RecurringRepository &repository;
        TransactionRepository &transactions;
        CategoryService &categories;

    public:
        RecurrenceService(RecurringRepository &repo, TransactionRepository &ledger, CategoryService &catalogue)
            : repository(repo), transactions(ledger), categories(catalogue) {
        }

        std::vector<RecurringEntry> list() const {
            auto result = repository.list();

            // sort RecurringEntry list by start date, then description alphabetically if start date is the same,
            // then by id if both start date and description are the same.
            std::sort(result.begin(), result.end(), [](const RecurringEntry &a, const RecurringEntry &b) {
                if (a.startDate == b.startDate) {
                    if (a.description == b.description) {
                        return a.id < b.id;
                    }
                    return a.description < b.description;
                }
                return a.startDate < b.startDate;
            });
            return result;
        }

        std::string create(const RecurringEntry &entry) const {
            auto value = entry;
            value.description = trimWhitespace(entry.description);
            require(!value.description.empty(), "Enter a description.");

            require(!(value.categoryId == "income" && value.type == TransactionType::Expense),
                    "Income entries use the income category; expenses use a spending category.");

            categories.requireActive(value.categoryId);
            return repository.add(value);
        }

        void update(const std::string &id, const RecurringEntry &entry) const {
            auto current = repository.find(id);
            if (!current)
                throw ApiError(404, "Recurring entry not found.");

            auto value = entry;
            value.description = trimWhitespace(value.description);
            require(!value.description.empty(), "Enter a description");

            if (current->categoryId != value.categoryId || current->type != value.type) {
                require(!(value.categoryId == "income" && value.type == TransactionType::Expense),
                        "Income entries use the income category; expenses use a spending category.");
            }

            if (current->categoryId != value.categoryId)
                categories.requireActive(value.categoryId);
            repository.save(id, value);
        }

        void remove(const std::string &id) const {
            if (!repository.find(id)) {
                throw ApiError(404, "Recurring entry not found.");
            }
            repository.remove(id);
        }

        static std::vector<Date> occurrences(const RecurringEntry &entry, const DateRange &range) {
            std::vector<Date> result;
            if (!entry.active)
                return result;
            // Anchored at the original day: Jan 31 -> Feb 28 -> Mar 31, not Mar 28.
            for (int index = 0; index < 7000; index++) {
                auto date = entry.frequency == RecurrenceFrequency::Weekly
                                ? entry.startDate.addDays(index * 7)
                                : entry.startDate.addMonths(index);
                if (!(date < range.end) || (entry.endDate && *entry.endDate < date))
                    return result;
                if (range.contains(date))
                    result.push_back(date);
            }
            throw ApiError(400, "Recurring schedule is too long.");
        }

        int sync(Date now) const {
            int created = 0;
            for (const auto &entry: list()) {
                if (!entry.active) {
                    continue;
                }
                std::vector<Date> dates;
                try {
                    dates = occurrences(entry, {entry.startDate, now.addDays(1)});
                } catch (const ApiError &e) {
                    continue; // move on to next without this schedule
                }

                if (dates.size() > 1000) {
                    continue; // very old schedule with too many entries
                }
                std::unordered_set<std::string> current;
                for (const auto &date: dates) {
                    current.insert("rec_" + entry.id + "_" + date.str());
                }

                for (auto row: transactions.list()) {
                    if (row.recurrenceId != entry.id || row.voided) {
                        continue;
                    }
                    if (!(row.date <= now)) {
                        continue;
                    }
                    if (current.count(row.id)) {
                        continue;
                    }
                    row.voided = true;
                    transactions.save(row.id, row);
                }

                for (const auto &date: dates) {
                    Transaction row{
                        "", date, entry.description, entry.categoryId, entry.type, entry.amountCents,
                        "Recurring occurrence due " + date.str(), entry.id
                    };
                    if (transactions.addOnce("rec_" + entry.id + "_" + date.str(), row)) {
                        created++;
                    }
                }
            }
            return created;
        }
    };

    // Helper to tell user that their start date is too old for a recurring expense
    inline void requireNewerSchedule(const RecurringEntry &entry, Date now) {
        std::vector<Date> dates;
        try {
            dates = RecurrenceService::occurrences(entry, {entry.startDate, now.addDays(1)});
        } catch (const ApiError &e) {
            throw ApiError(400, "Use a more recent start date for this recurring schedule.");
        }
        require(dates.size() <= 1000, "Use a more recent start date for this recurring schedule.");
    }
} // namespace qbudget
