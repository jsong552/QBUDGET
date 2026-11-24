/*
 * Description: Function tests for Date and DateRange (date.hpp). Covers date validation,
 *              adding days and months, week/month/semester boundaries and budget period ranges.
 *              Pure calculations; no store or network.
 */
#include "../backend/src/date.hpp"
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
} // namespace

int main() {
    test("Valid dates are accepted and stored as YYYY-MM-DD", [] {
        check(Date("2026-11-08").str() == "2026-11-08", "Date keeps its text");
        check(Date("2024-02-29").str() == "2024-02-29", "Leap day accepted in a leap year");
        check(Date().str() == "1970-01-01", "Default date is 1970-01-01");
    });

    test("Badly formatted or impossible dates are rejected", [] {
        fails(400, [] { Date("2026-2-01"); }, "Missing zero padding");
        fails(400, [] { Date("2026/02/01"); }, "Wrong separator");
        fails(400, [] { Date("abcd-ef-gh"); }, "Letters instead of digits");
        fails(400, [] { Date("2026-02-30"); }, "February 30th");
        fails(400, [] { Date("2026-02-29"); }, "Leap day in a non-leap year");
        fails(400, [] { Date("2026-13-01"); }, "Month 13");
        fails(400, [] { Date("1969-12-31"); }, "Before 1970");
        fails(400, [] { Date("2101-01-01"); }, "After 2100");
    });

    test("addDays crosses month, year and leap-day boundaries", [] {
        check(Date("2026-11-30").addDays(1) == Date("2026-12-01"), "Into next month");
        check(Date("2026-12-31").addDays(1) == Date("2027-01-01"), "Into next year");
        check(Date("2024-02-28").addDays(1) == Date("2024-02-29"), "Leap year has Feb 29");
        check(Date("2026-02-28").addDays(1) == Date("2026-03-01"), "Non-leap year skips to Mar 1");
        check(Date("2026-03-01").addDays(-1) == Date("2026-02-28"), "Negative days go backwards");
    });

    test("addMonths clamps to the last day of shorter months", [] {
        check(Date("2026-01-31").addMonths(1) == Date("2026-02-28"), "Jan 31 + 1 month = Feb 28");
        check(Date("2024-01-31").addMonths(1) == Date("2024-02-29"), "Leap year gives Feb 29");
        check(Date("2026-12-31").addMonths(2) == Date("2027-02-28"), "Crosses the year and clamps");
        check(Date("2026-03-31").addMonths(-1) == Date("2026-02-28"), "Going back a month also clamps");
        check(Date("2026-11-08").addMonths(0) == Date("2026-11-08"), "Zero months is the same date");
    });

    test("startOfMonth with offsets", [] {
        Date now("2026-11-08");
        check(now.startOfMonth() == Date("2026-11-01"), "Start of this month");
        check(now.startOfMonth(1) == Date("2026-12-01"), "Start of next month");
        check(now.startOfMonth(2) == Date("2027-01-01"), "Offset rolls into next year");
        check(now.startOfMonth(-11) == Date("2025-12-01"), "Negative offset rolls into last year");
    });

    test("Weeks start on Monday", [] {
        check(Date("2026-11-08").startOfWeek() == Date("2026-11-02"), "Sunday belongs to the week before");
        check(Date("2026-11-09").startOfWeek() == Date("2026-11-09"), "Monday is its own week start");
        check(Date("2026-11-14").startOfWeek() == Date("2026-11-09"), "Saturday goes back to Monday");
    });

    test("Semesters start on Jan 1, May 1 and Sep 1", [] {
        check(Date("2027-02-15").startOfTerm() == Date("2027-01-01"), "Winter term");
        check(Date("2026-06-30").startOfTerm() == Date("2026-05-01"), "Summer term");
        check(Date("2026-11-08").startOfTerm() == Date("2026-09-01"), "Fall term");
        check(Date("2026-12-31").startOfTerm() == Date("2026-09-01"), "Last day of fall term");
    });

    test("daysUntil counts forwards and backwards", [] {
        check(Date("2026-11-08").daysUntil(Date("2026-11-11")) == 3, "3 days ahead");
        check(Date("2026-11-08").daysUntil(Date("2026-11-08")) == 0, "Same day is 0");
        check(Date("2026-11-08").daysUntil(Date("2026-11-06")) == -2, "Past dates are negative");
        check(Date("2024-02-01").daysUntil(Date("2024-03-01")) == 29, "Leap February has 29 days");
    });

    test("Date comparisons", [] {
        check(Date("2026-11-08") < Date("2026-11-09"), "Earlier is less than later");
        check(Date("2026-11-08") <= Date("2026-11-08"), "A date is <= itself");
        check(!(Date("2026-12-01") < Date("2026-11-30")), "Later is not less than earlier");
    });

    test("DateRange includes the start but not the end", [] {
        DateRange november{Date("2026-11-01"), Date("2026-12-01")};
        check(november.contains(Date("2026-11-01")), "First day included");
        check(november.contains(Date("2026-11-30")), "Last day included");
        check(!november.contains(Date("2026-12-01")), "End date excluded");
        check(!november.contains(Date("2026-10-31")), "Day before excluded");
    });

    test("Budget period ranges for weekly, monthly and semester", [] {
        Date now("2026-11-08");
        auto week = DateRange::containing(now, BudgetPeriod::Weekly);
        auto month = DateRange::containing(now, BudgetPeriod::Monthly);
        auto term = DateRange::containing(now, BudgetPeriod::Semester);
        check(week.start == Date("2026-11-02") && week.end == Date("2026-11-09"), "Weekly is Mon to Mon");
        check(month.start == Date("2026-11-01") && month.end == Date("2026-12-01"), "Monthly is the 1st to the 1st");
        check(term.start == Date("2026-09-01") && term.end == Date("2027-01-01"), "Fall semester is Sep to Jan");
        auto winter = DateRange::containing(Date("2027-02-15"), BudgetPeriod::Semester);
        check(winter.start == Date("2027-01-01") && winter.end == Date("2027-05-01"), "Winter semester is Jan to May");
    });

    std::cout << '\n' << checks - failures << '/' << checks << " Date checks passed.\n";
    return failures == 0 ? 0 : 1;
}
