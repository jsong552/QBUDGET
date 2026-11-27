// Calendar projections share transaction IDs with recurring synchronization.
#pragma once
#include "calendar_service.hpp"
namespace qbudget {
class CalendarPlanner {
    EventRepository &events;
    RecurringRepository &schedules;
    TransactionRepository &transactions;
  public:
    CalendarPlanner(EventRepository &e, RecurringRepository &r, TransactionRepository &t)
        : events(e), schedules(r), transactions(t) {}
    Json rows(DateRange range) const {
        std::map<std::string, Transaction> recorded;
        for (const auto &t : transactions.list()) recorded[t.id] = t;
        Json result = Json::array();
        auto append = [&](CalendarEvent event, const std::string &source, const std::string &sourceId,
                          const std::string &transactionId, TransactionType type) {
            auto found = recorded.find(transactionId);
            bool skipped = found != recorded.end() && found->second.voided;
            bool paid = found != recorded.end() ? !skipped : event.paid;
            Json row = event;
            row["paid"] = paid;
            row["skipped"] = skipped;
            row["shortTitle"] = event.title;
            row["source"] = source;
            row["sourceId"] = sourceId;
            row["transactionId"] = found != recorded.end() && !skipped ? Json(transactionId) : Json(nullptr);
            row["type"] = type;
            if (source == "recurring" && found != recorded.end() && !skipped) {
                const auto &actual = found->second;
                row["amountCents"] = actual.amountCents < 0 ? -actual.amountCents : actual.amountCents;
                row["type"] = actual.type;
            }
            result.push_back(row);
        };
        for (auto e : events.list())
            if (range.contains(e.date)) append(e, "event", e.id, "cal_" + e.id, TransactionType::Expense);
        for (const auto &entry : schedules.list()) {
            for (auto date : RecurrenceService::occurrences(entry, range)) {
                auto id = "rec_" + entry.id + "_" + date.str();
                CalendarEvent e{id, entry.description, "recurring", date,
                                entry.amountCents < 0 ? -entry.amountCents : entry.amountCents, true, false};
                append(e, "recurring", entry.id, id, entry.type);
            }
        }
        std::sort(result.begin(), result.end(), [](const Json &a, const Json &b) {
            return a["date"] == b["date"] ? a["id"] < b["id"] : a["date"] < b["date"];
        });
        return result;
    }
    std::vector<CalendarEvent> eventsIn(const DateRange &range) const {
        std::map<std::string, Transaction> recorded;
        for (const auto &t : transactions.list()) {
            recorded[t.id] = t;
        }

        std::vector<CalendarEvent> result;
        for (auto e: events.list()) {
            if (range.contains(e.date)) {
                e.paid = recorded.count("cal_" + e.id) > 0;
                result.push_back(e);
            }
        }
        for (const auto &entry: schedules.list()) {
            if (entry.type == TransactionType::Income) {
                continue;
            }
            for (auto date: RecurrenceService::occurrences(entry, range)) {
                auto id = "rec_" + entry.id + "_" + date.str();
                CalendarEvent e{id, entry.description, "recurring", date, entry.amountCents < 0 ? -entry.amountCents : entry.amountCents, true, recorded.count(id) > 0};
                result.push_back(e);
            }
        }
        return result;
    }
    Json outstanding(Date now) const {
        Date start = now;
        for (const auto &e : events.list()) if (e.date < start) start = e.date;
        for (const auto &r : schedules.list()) if (r.active && r.startDate < start) start = r.startDate;
        Json result = Json::array();
        for (const auto &row : rows({start, now.addMonths(12).addDays(1)})) {
            if (row["paid"] == false && row["skipped"] == false && row["type"] == "expense") {
                auto days = now.daysUntil(row["date"].get<Date>());
                result.push_back({{"event", row}, {"daysAway", days}, {"isUrgent", days <= 3}});
            }
        }
        return result;
    }
    std::string record(const Json &input, Date now) const {
        auto source = readText(input, "source"), id = readText(input, "sourceId");
        validateId(id);
        auto paidDate = input.at("paidDate").get<Date>();
        require(!(now < paidDate), "The payment date cannot be in the future.");
        Transaction row;
        std::string transactionId;
        if (source == "event") {
            auto event = events.find(id);
            if (!event) throw ApiError(404, "Calendar event not found.");
            transactionId = "cal_" + id;
            require(!event->paid || transactions.find(transactionId).has_value(),
                    "This legacy event is already marked paid. Check your transaction history before recording it again.");
            auto category = event->kind == "rent" ? "rent" : event->kind == "tuition" ? "tuition" : "other";
            row = {"", paidDate, event->title, category, TransactionType::Expense, -event->amountCents,
                   "Calendar payment due " + event->date.str(), "calendar:" + id};
        } else {
            require(source == "recurring", "Invalid calendar source.");
            auto entry = schedules.find(id);
            if (!entry) throw ApiError(404, "Recurring schedule not found.");
            auto date = input.at("date").get<Date>();
            require(!RecurrenceService::occurrences(*entry, {date, date.addDays(1)}).empty(),
                    "This date is not an active occurrence of the schedule.");
            transactionId = "rec_" + id + "_" + date.str();
            row = {"", paidDate, entry->description, entry->categoryId, entry->type, entry->amountCents,
                   "Recurring occurrence due " + date.str(), id};
        }
        // A single create-only write is retry-safe, including a lost HTTP response.
        transactions.addOnce(transactionId, row);
        auto saved = transactions.find(transactionId);
        require(saved && !saved->voided,
                "This occurrence was deleted from transactions and is skipped. Add a manual transaction if needed.");
        return transactionId;
    }
};
} // namespace qbudget
