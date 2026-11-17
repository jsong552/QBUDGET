// Scheduled payments and recurring transaction generation; deterministic dates support testing.
#pragma once
#include "transaction_service.hpp"
namespace qbudget {
class CalendarService {
    EventRepository &repository;

  public:
    explicit CalendarService(EventRepository &repo) : repository(repo) {}
    std::vector<CalendarEvent> list(std::optional<DateRange> range = std::nullopt) const {
        auto values = repository.list();
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
            if (!event.paid && now <= event.date) {
                auto days = now.daysUntil(event.date);
                result.push_back({event, days, days <= 3});
            }
        return result;
    }
    std::string create(const CalendarEvent &event) const {
        return repository.add(event);
    }
    void update(const std::string &id, const CalendarEvent &event) const {
        repository.save(id, event);
    }
    void remove(const std::string &id) const {
        repository.remove(id);
    }
};
class RecurrenceService {
    RecurringRepository &repository;
    TransactionRepository &transactions;
    CategoryService &categories;

  public:
    RecurrenceService(RecurringRepository &repo, TransactionRepository &ledger, CategoryService &catalogue)
        : repository(repo), transactions(ledger), categories(catalogue) {}
    std::vector<RecurringEntry> list() const {
        return repository.list();
    }
    std::string create(const RecurringEntry &entry) const {
        categories.requireActive(entry.categoryId);
        return repository.add(entry);
    }
    void update(const std::string &id, const RecurringEntry &entry) const {
        auto current = repository.find(id);
        if (!current)
            throw ApiError(404, "Recurring entry not found.");
        if (current->categoryId != entry.categoryId)
            categories.requireActive(entry.categoryId);
        repository.save(id, entry);
    }
    void remove(const std::string &id) const {
        repository.remove(id);
    }
    static std::vector<Date> occurrences(const RecurringEntry &entry, const DateRange &range) {
        std::vector<Date> result;
        if (!entry.active)
            return result;
        // Anchored at the original day: Jan 31 -> Feb 28 -> Mar 31, not Mar 28.
        for (int index = 0; index < 7000; index++) {
            auto date = entry.frequency == RecurrenceFrequency::Weekly ? entry.startDate.addDays(index * 7)
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
        for (const auto &entry : list()) {
            auto dates = occurrences(entry, {entry.startDate, now.addDays(1)});
            require(dates.size() <= 1000,
                    "Recurring schedule has over 1000 past entries. Use a more recent start date.");
            for (const auto &date : dates) {
                Transaction row{
                    "", date,    entry.description, entry.categoryId, entry.type, entry.amountCents,
                    "", entry.id};
                if (transactions.addOnce("rec_" + entry.id + "_" + date.str(), row))
                    created++;
            }
        }
        return created;
    }
};
} // namespace qbudget
