/*
 * File: student_service_test.cpp
 * Description: Function tests for StudentService (FR-13 to FR-17). Covers bursaries and their
 *              statuses, opt-out student fees, the default and saved semester plan, and the
 *              semester summary of expected income versus planned costs, including recurring
 *              costs inside and outside the semester through GET /api/semester. Uses the
 *              in-memory test store.
 */
#include "../backend/src/api_controller.hpp"
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
    EventRepository eventRepo{store};
    RecurringRepository recurringRepo{store};
};

RecurringEntry recurring(const std::string &description, MoneyCents amount, const std::string &start,
                         RecurrenceFrequency frequency = RecurrenceFrequency::Monthly,
                         std::optional<Date> end = std::nullopt, bool active = true) {
    auto type = amount > 0 ? TransactionType::Income : TransactionType::Expense;
    auto category = amount > 0 ? "income" : "rent";
    return {"", description, category, type, amount, Date(start), end, frequency, active};
}

// Calls the real API route, the same way the Semester and Calendar pages do.
Json call(const DocumentStore &store, const std::string &method, const std::string &path, const Json &data = nullptr,
          const std::string &month = "") {
    httplib::Request request;
    request.method = method;
    request.path = path;
    request.body = data.dump();
    if (!month.empty())
        request.params.emplace("month", month);
    return ApiController(store, {"uid1", "alex@example.com", "Alex Student", "token"}, now).handle(request);
}

// Expense total the Calendar page shows for one month.
MoneyCents calendarExpenses(const DocumentStore &store, const std::string &month) {
    MoneyCents total = 0;
    auto view = call(store, "GET", "/api/calendar/events", nullptr, month);
    for (const auto &row : view["events"])
        if (row["type"] == "expense")
            total += row["amountCents"].get<MoneyCents>();
    return total;
}
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

    // Regression tests for TEST_REPORT.md bug B6: the semester summary left out recurring costs.
    // These go through GET /api/semester because the fix is in which payments the route passes in.
    test("Semester summary counts recurring rent inside the semester", [] {
        Setup s;
        s.recurringRepo.add(recurring("Rent", -90000, "2026-09-01"));
        auto summary = call(s.store, "GET", "/api/semester")["summary"];
        check(summary["scheduledCostsCents"] == 360000, "Sep, Oct, Nov and Dec rent (Jan 1 is next term)");
        check(summary["plannedCostsCents"] == 360000 && summary["remainingCents"] == -360000,
              "Rent is in planned costs and remaining");
        auto calendar = calendarExpenses(s.store, "2026-09-01") + calendarExpenses(s.store, "2026-10-01") +
                        calendarExpenses(s.store, "2026-11-01") + calendarExpenses(s.store, "2026-12-01");
        check(calendar == 360000, "Same total as the Calendar's Sep to Dec months");
    });

    test("Only recurring dates inside the semester count, and income isn't a cost", [] {
        Setup s;
        s.recurringRepo.add(recurring("Summer sublet", -70000, "2026-07-01", RecurrenceFrequency::Monthly,
                                      Date("2026-10-15")));                                  // Sep 1, Oct 1 count
        s.recurringRepo.add(recurring("Old lease", -85000, "2026-01-01", RecurrenceFrequency::Monthly,
                                      Date("2026-08-01")));                                  // ended before Sep
        s.recurringRepo.add(recurring("Winter rent", -90000, "2027-01-01"));                 // next term
        s.recurringRepo.add(recurring("Gym", -2500, "2026-09-03", RecurrenceFrequency::Weekly,
                                      std::nullopt, false));                                 // paused
        s.recurringRepo.add(recurring("Paycheque", 120000, "2026-09-15"));                   // income
        auto summary = call(s.store, "GET", "/api/semester")["summary"];
        check(summary["scheduledCostsCents"] == 140000, "Only the sublet's Sep 1 and Oct 1 ($700 x 2)");
        check(summary["expectedIncomeCents"] == 0, "The recurring paycheque isn't added to income or costs");
    });

    test("Paid and recorded payments are counted once, not twice", [] {
        Setup s;
        s.recurringRepo.add(recurring("Rent", -90000, "2026-09-01"));
        call(s.store, "POST", "/api/recurring/sync"); // Sep, Oct, Nov rent become transactions
        auto textbook = s.eventRepo.add({"", "Textbook", "other", Date("2026-12-12"), 6000, true, false});
        call(s.store, "POST", "/api/calendar/pay", {{"source", "event"}, {"sourceId", textbook}, {"paidDate", "2026-11-08"}});
        s.eventRepo.add({"", "Gym", "other", Date("2026-11-28"), 2500, true, false});
        s.eventRepo.add({"", "Winter tuition", "tuition", Date("2026-12-01"), 500000, true, false});
        auto summary = call(s.store, "GET", "/api/semester")["summary"];
        check(call(s.store, "GET", "/api/transactions").size() == 4, "3 rent transactions and the textbook were recorded");
        check(summary["scheduledCostsCents"] == 368500,
              "4 x $900 rent + $60 textbook + $25 gym, each once; tuition left to the tuition estimate");
    });

    std::cout << '\n' << checks - failures << '/' << checks << " StudentService checks passed.\n";
    return failures == 0 ? 0 : 1;
}
