/*
 * Description: Function tests for StudentService (FR-13 to FR-17). Covers bursaries and their
 *              statuses, opt-out student fees, the default and saved semester plan, and the
 *              semester summary of expected income versus planned costs. Uses the in-memory
 *              test store.
 */
#include "../backend/src/student_service.hpp"
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

StudentFee fee(const std::string &name, MoneyCents amount, FeeStatus status, const std::string &deadline = "2026-09-30") {
    return {"", name, amount, Date(deadline), status};
}

CalendarEvent event(const std::string &kind, const std::string &date, MoneyCents amount, bool paid = false) {
    return {"", "Payment", kind, Date(date), amount, true, paid};
}

struct Setup {
    MemoryStore store;
    BursaryRepository bursaryRepo{store};
    FeeRepository feeRepo{store};
    SettingsRepository settingsRepo{store};
    StudentService service{bursaryRepo, feeRepo, settingsRepo};
};
} // namespace

int main() {
    test("Track bursaries with an amount and status (FR-15)", [] {
        Setup s;
        auto id = s.service.addBursary({"", "Queen's General Bursary", 150000, BursaryStatus::Applied});
        auto list = s.service.listBursaries();
        check(list.size() == 1 && list[0].status == BursaryStatus::Applied, "Saved as Applied");
        s.service.updateBursary(id, {"", "Queen's General Bursary", 150000, BursaryStatus::Received});
        check(s.service.listBursaries()[0].status == BursaryStatus::Received, "Status changed to Received");
        s.service.removeBursary(id);
        check(s.service.listBursaries().empty(), "Removed");
        fails(400, [&] { s.service.addBursary({"", "Bursary", 0, BursaryStatus::Applied}); }, "Zero amount rejected");
    });

    test("List opt-out student fees as Kept or Opted Out (FR-16)", [] {
        Setup s;
        auto id = s.service.addFee(fee("Health plan", 25000, FeeStatus::Kept));
        s.service.addFee(fee("Yearbook", 4000, FeeStatus::OptedOut));
        check(s.service.listFees().size() == 2, "Both fees saved");
        s.service.updateFee(id, fee("Health plan", 25000, FeeStatus::OptedOut));
        int optedOut = 0;
        for (const auto &item : s.service.listFees())
            if (item.status == FeeStatus::OptedOut)
                optedOut++;
        check(optedOut == 2, "Health plan now opted out");
        s.service.removeFee(id);
        check(s.service.listFees().size() == 1, "Removed");
        fails(400, [&] { s.service.addFee(fee("", 100, FeeStatus::Kept)); }, "Blank name rejected");
    });

    test("Default semester plan matches the current term", [] {
        Setup s;
        auto fall = s.service.plan(now);
        check(fall.startDate == Date("2026-09-01") && fall.endDate == Date("2027-01-01"), "Fall: Sep 1 to Jan 1");
        auto winter = s.service.plan(Date("2027-02-10"));
        check(winter.startDate == Date("2027-01-01") && winter.endDate == Date("2027-05-01"), "Winter: Jan 1 to May 1");
        check(fall.courseCount == 0 && fall.expectedIncomeCents == 0, "Starts empty");
    });

    test("Save and reload the semester plan (FR-13)", [] {
        Setup s;
        SemesterPlan plan;
        plan.faculty = "Computing";
        plan.courseCount = 5;
        plan.tuitionPerCourseCents = 100000;
        s.service.savePlan(plan);
        auto loaded = s.service.plan(now);
        check(loaded.faculty == "Computing" && loaded.courseCount == 5 && loaded.tuitionPerCourseCents == 100000,
              "Saved values come back");
    });

    test("Semester summary: expected income vs planned costs (FR-14)", [] {
        Setup s;
        SemesterPlan plan;
        plan.expectedIncomeCents = 500000;
        plan.courseCount = 5;
        plan.tuitionPerCourseCents = 100000;
        plan.additionalFeesCents = 10000;
        s.service.savePlan(plan);
        s.service.addBursary({"", "Approved bursary", 50000, BursaryStatus::Approved});
        s.service.addBursary({"", "Pending bursary", 30000, BursaryStatus::Applied});
        s.service.addFee(fee("Athletics", 2000, FeeStatus::Kept));
        auto summary = s.service.summary(now, {event("rent", "2026-12-01", 100000)});
        check(summary.estimatedTuitionCents == 510000, "Tuition: 5 x $1000 + $100 fees = $5100");
        check(summary.expectedIncomeCents == 550000, "Income: $5000 + approved $500 (applied not counted)");
        check(summary.scheduledCostsCents == 100000, "December rent");
        check(summary.plannedCostsCents == 612000, "Costs: $5100 + $1000 rent + $20 kept fee");
        check(summary.remainingCents == -62000, "Short by $620");
    });

    test("Money saved from opted-out fees (FR-17)", [] {
        Setup s;
        s.service.addFee(fee("Health plan", 25000, FeeStatus::OptedOut));
        s.service.addFee(fee("Yearbook", 4000, FeeStatus::OptedOut));
        s.service.addFee(fee("Athletics", 2000, FeeStatus::Kept));
        auto summary = s.service.summary(now, {});
        check(summary.optedOutSavingsCents == 29000, "$250 + $40 saved");
        check(summary.plannedCostsCents == 2000, "Only the kept fee is a cost");
    });

    test("All this semester's non-tuition items are counted, paid or not", [] {
    Setup s;
    s.service.addFee(fee("Last year's fee", 9000, FeeStatus::Kept, "2026-04-01"));
    auto summary = s.service.summary(now, {event("rent", "2026-11-20", 90000, true),
                                           event("tuition", "2026-12-01", 500000),
                                           event("rent", "2027-01-15", 90000)});
    check(summary.scheduledCostsCents == 90000, "Paid November rent still counts");
    check(summary.plannedCostsCents == 90000, "Tuition-type and next-term items skipped");
});

    std::cout << '\n' << checks - failures << '/' << checks << " StudentService checks passed.\n";
    return failures == 0 ? 0 : 1;
}
