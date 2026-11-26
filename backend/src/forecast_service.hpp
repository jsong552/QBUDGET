// Transparent forecast: trailing 30-day averages, with known future obligations as a floor.
#pragma once
#include "calendar_service.hpp"
namespace qbudget {
class ForecastService {
  public:
    // Two completed months avoid treating a current-month grant/windfall as monthly pay.
    // With less history retain the documented trailing-30-day estimate.
    std::optional<MoneyCents> monthlyIncomeBaseline(const Ledger &ledger, Date now) const {
        auto earlier = ledger.totals(DateRange{now.startOfMonth(-2), now.startOfMonth(-1)}).incomeCents;
        auto previous = ledger.totals(DateRange{now.startOfMonth(-1), now.startOfMonth()}).incomeCents;
        if (earlier <= 0 || previous <= 0) return std::nullopt;
        return addMoney(earlier, previous) / 2;
    }
    std::vector<SeriesPoint> series(const std::vector<ForecastMonth> &months, Date now,
                                    const std::string &granularity, bool income = false) const {
        std::map<std::string, MoneyCents> groups;
        for (const auto &month : months) {
            const auto total = income ? month.incomeCents : month.expensesCents;
            auto start = month.month < now ? now.addDays(1) : month.month;
            if (start == now)
                start = now.addDays(1);
            auto end = month.month.startOfMonth(1);
            int days = start.daysUntil(end);
            if (days <= 0) {
                auto key = granularity == "weekly" ? now.startOfWeek()
                         : granularity == "semester" ? now.startOfTerm() : month.month;
                groups[key.str()] = addMoney(groups[key.str()], total);
                continue;
            }
            for (int i = 0; i < days; i++) {
                auto date = start.addDays(i);
                auto key = granularity == "weekly"     ? date.startOfWeek()
                           : granularity == "semester" ? date.startOfTerm()
                                                       : date.startOfMonth();
                auto amount = total / days + (i < total % days ? 1 : 0);
                groups[key.str()] = addMoney(groups[key.str()], amount);
            }
        }
        std::vector<SeriesPoint> result;
        for (const auto &[date, amount] : groups)
            result.push_back({Date(date), amount});
        return result;
    }
    std::vector<ForecastMonth> forecast(const Ledger &ledger, const std::vector<CalendarEvent> &events,
                                        const std::vector<RecurringEntry> &recurring, Date now,
                                        int months = 4) const {
        require(months >= 1 && months <= 12, "Forecast horizon must be 1 to 12 months.");
        auto baseline = ledger.totals(DateRange{now.addDays(-29), now.addDays(1)});
        auto monthlyIncome = monthlyIncomeBaseline(ledger, now);
        auto receivedThisMonth = ledger.totals(DateRange{now.startOfMonth(), now.addDays(1)}).incomeCents;
        MoneyCents balance = ledger.totals().balance();
        std::vector<ForecastMonth> result;
        for (int index = 0; index < months; index++) {
            auto start = now.startOfMonth(index), end = start.startOfMonth(1);
            auto futureStart = index == 0 ? now.addDays(1) : start;
            int days = futureStart.daysUntil(end);
            // Round integer cents half up; no floating point money calculation.
            auto income = (baseline.incomeCents / 30) * days + ((baseline.incomeCents % 30) * days + 15) / 30;
            if (monthlyIncome)
                income = index == 0 ? (days > 0 ? std::max<MoneyCents>(0, *monthlyIncome - receivedThisMonth) : 0)
                                    : *monthlyIncome;
            auto expenses =
                (baseline.expensesCents / 30) * days + ((baseline.expensesCents % 30) * days + 15) / 30;
            MoneyCents knownIncome = 0, knownExpenses = 0;
            for (const auto &entry : recurring) {
                auto dates = RecurrenceService::occurrences(entry, {futureStart, end});
                auto count = std::count_if(dates.begin(), dates.end(), [&](Date date) {
                    auto id = "rec_" + entry.id + "_" + date.str();
                    return std::none_of(ledger.transactions().begin(), ledger.transactions().end(),
                                        [&](const Transaction &t) { return t.id == id; });
                });
                auto amount = entry.amountCents * static_cast<MoneyCents>(count);
                if (amount > 0)
                    knownIncome = addMoney(knownIncome, amount);
                else
                    knownExpenses = addMoney(knownExpenses, -amount);
            }
            for (const auto &event : events)
                if (!event.paid && now <= event.date && DateRange{start, end}.contains(event.date))
                    knownExpenses = addMoney(knownExpenses, event.amountCents);
            income = std::max(income, knownIncome);
            expenses = std::max(expenses, knownExpenses);
            balance = addMoney(addMoney(balance, income), -expenses);
            result.push_back({start, income, expenses, balance});
        }
        return result;
    }
};
} // namespace qbudget
