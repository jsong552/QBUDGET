/*
 * Description: Function tests for ForecastService (Use Case 3: ViewForecast). Covers the
 *              30-day spending average, starting balance, known upcoming payments and recurring
 *              entries as a minimum, the forecast horizon and the chart series for each
 *              granularity. Pure; uses an in-memory Ledger, no store or network.
 */
#include "../backend/src/forecast_service.hpp"
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

const Date now("2026-11-08"); // Nov 9-30 is 22 days left in the month

Transaction entry(const std::string &date, MoneyCents amount) {
    return {"", Date(date), "Entry", amount > 0 ? "income" : "groceries",
            amount > 0 ? TransactionType::Income : TransactionType::Expense, amount, "", ""};
}

CalendarEvent payment(const std::string &date, MoneyCents amount, bool paid = false) {
    return {"", "Payment", "rent", Date(date), amount, true, paid};
}

RecurringEntry schedule(const std::string &start, MoneyCents amount, RecurrenceFrequency frequency) {
    return {"r1", "Schedule", amount > 0 ? "income" : "rent",
            amount > 0 ? TransactionType::Income : TransactionType::Expense,
            amount, Date(start), std::nullopt, frequency, true};
}
} // namespace

int main() {
    ForecastService service;
    Ledger empty({}, now);

    test("Empty ledger forecasts four months of zeros", [&] {
        auto result = service.forecast(empty, {}, {}, now);
        check(result.size() == 4, "Default horizon is 4 months");
        check(result[0].month == Date("2026-11-01") && result[3].month == Date("2027-02-01"), "Nov to Feb");
        for (const auto &month : result)
            check(month.incomeCents == 0 && month.expensesCents == 0 && month.projectedBalanceCents == 0,
                  "All zeros for " + month.month.str());
    });

    test("Forecast horizon must be 1 to 12 months", [&] {
        check(service.forecast(empty, {}, {}, now, 1).size() == 1, "1 month allowed");
        check(service.forecast(empty, {}, {}, now, 12).size() == 12, "12 months allowed");
        fails(400, [&] { service.forecast(empty, {}, {}, now, 0); }, "0 months rejected");
        fails(400, [&] { service.forecast(empty, {}, {}, now, 13); }, "13 months rejected");
    });

    test("Spending is projected from the last 30 days (only the days left this month)", [&] {
        Ledger ledger({entry("2026-11-01", -3000)}, now); // $30 in the window = $1/day
        auto result = service.forecast(ledger, {}, {}, now);
        check(result[0].expensesCents == 2200, "November: 22 days left x $1 = $22.00");
        check(result[1].expensesCents == 3100, "December: 31 days x $1 = $31.00");
        check(result[0].projectedBalanceCents == -5200, "Balance: -$30 so far - $22 = -$52.00");
        check(result[1].projectedBalanceCents == -8300, "Balance keeps going down: -$83.00");
    });

    test("Old transactions count toward the balance but not the average", [&] {
        Ledger ledger({entry("2026-09-01", 100000)}, now); // outside the 30-day window
        auto result = service.forecast(ledger, {}, {}, now);
        check(result[0].incomeCents == 0, "No recent income, so no projected income");
        check(result[0].projectedBalanceCents == 100000, "Starting balance of $1000 carried over");
    });

    test("Future-dated transactions are ignored", [&] {
        Ledger ledger({entry("2026-11-20", -3000)}, now);
        auto result = service.forecast(ledger, {}, {}, now);
        check(result[0].expensesCents == 0 && result[0].projectedBalanceCents == 0, "Not counted yet");
    });

    test("Unpaid upcoming payments set the minimum expenses for their month", [&] {
        auto result = service.forecast(empty,
                                       {payment("2026-11-20", 50000), payment("2026-11-25", 9999, true),
                                        payment("2026-11-05", 7777), payment("2026-12-01", 90000)},
                                       {}, now);
        check(result[0].expensesCents == 50000, "Only the unpaid future November payment counts");
        check(result[1].expensesCents == 90000, "December rent lands in December");
        check(result[1].projectedBalanceCents == -140000, "Both payments reduce the balance");
    });

    test("The minimum never lowers a higher average", [&] {
        Ledger ledger({entry("2026-11-01", -3000)}, now);
        auto result = service.forecast(ledger, {payment("2026-11-20", 1000)}, {}, now);
        check(result[0].expensesCents == 2200, "max($22 average, $10 payment) = $22");
    });

    test("Recurring income and expenses are included", [&] {
        auto paycheque = schedule("2026-10-15", 120000, RecurrenceFrequency::Monthly);
        auto groceries = schedule("2026-11-09", -1000, RecurrenceFrequency::Weekly);
        auto result = service.forecast(empty, {}, {paycheque, groceries}, now);
        check(result[0].incomeCents == 120000, "Nov 15 paycheque");
        check(result[0].expensesCents == 4000, "Weekly $10 on Nov 9, 16, 23 and 30");
        check(result[1].incomeCents == 120000, "Dec 15 paycheque");
        check(result[0].projectedBalanceCents == 116000, "$1200 - $40 = $1160");
    });

    test("Daily average rounds to the nearest cent without decimals", [&] {
        Ledger ledger({entry("2026-11-01", -100)}, now); // $1 over 30 days
        auto result = service.forecast(ledger, {}, {}, now);
        check(result[0].expensesCents == 73, "22/30 of 100 cents = 73.3, rounds to 73");
    });

    test("Chart series spreads a month's spending over its remaining days", [&] {
        std::vector<ForecastMonth> months = {{Date("2026-11-01"), 0, 2200, -2200}};
        auto monthly = service.series(months, now, "monthly");
        check(monthly.size() == 1 && monthly[0].date == Date("2026-11-01") && monthly[0].amountCents == 2200,
              "Monthly: one point with the full $22");
        auto weekly = service.series(months, now, "weekly");
        check(weekly.size() == 4, "Weekly: weeks starting Nov 9, 16, 23 and 30");
        check(weekly[0].amountCents == 700 && weekly[3].amountCents == 100, "7 days = $7, last week 1 day = $1");
    });

    test("Leftover cents go to the earliest days", [&] {
        std::vector<ForecastMonth> months = {{Date("2026-11-01"), 0, 2201, -2201}};
        auto weekly = service.series(months, now, "weekly");
        check(weekly[0].amountCents == 701, "The extra cent goes in the first week");
        MoneyCents total = 0;
        for (const auto &point : weekly)
            total += point.amountCents;
        check(total == 2201, "No cents lost when splitting");
    });

    test("Future months use all their days and semester groups by term", [&] {
        std::vector<ForecastMonth> months = {{Date("2026-11-01"), 0, 2200, 0}, {Date("2026-12-01"), 0, 3100, 0}};
        auto monthly = service.series(months, now, "monthly");
        check(monthly.size() == 2 && monthly[1].amountCents == 3100, "December keeps its full $31");
        auto term = service.series(months, now, "semester");
        check(term.size() == 1 && term[0].date == Date("2026-09-01") && term[0].amountCents == 5300,
              "Nov and Dec both fall in the fall semester");
    });

    std::cout << '\n' << checks - failures << '/' << checks << " ForecastService checks passed.\n";
    return failures == 0 ? 0 : 1;
}
