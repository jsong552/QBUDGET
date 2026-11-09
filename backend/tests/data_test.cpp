// Domain, repository, HTTP adapter and Firebase transport regression tests. No real cloud data is touched.
#include "../src/api_controller.hpp"
#include "../src/auth_service.hpp"
#include "../src/firestore_client.hpp"
#include "memory_store.hpp"
#include <iostream>
#include <functional>
using namespace qbudget;
int checks = 0;
void check(bool value, const std::string &message) {
    checks++;
    if (!value)
        throw std::runtime_error(message);
}
void fails(int status, const std::function<void()> &action) {
    bool caught = false;
    try {
        action();
    } catch (const ApiError &error) {
        caught = true;
        check(error.status == status, "Wrong error status");
    }
    check(caught, "Expected rejection");
}
Json call(const DocumentStore &store, const std::string &method, const std::string &path, Json data = nullptr,
          httplib::Params params = {}) {
    httplib::Request request;
    request.method = method;
    request.path = path;
    request.params = std::move(params);
    request.body = data.dump();
    return ApiController(store, {"alice", "alice@example.com", "Alice", "token"}, Date("2026-11-08"))
        .handle(request);
}
Transaction transaction(std::string date, MoneyCents amount = -2450, std::string category = "groceries") {
    return {"",
            Date(date),
            "Example",
            category,
            amount > 0 ? TransactionType::Income : TransactionType::Expense,
            amount,
            "",
            ""};
}
int main() {
    try {
#ifdef _WIN32
        _putenv_s("FIREBASE_PROJECT_ID", "test-project");
        _putenv_s("FIREBASE_API_KEY", "test-key");
#else
        setenv("FIREBASE_PROJECT_ID", "test-project", 1);
        setenv("FIREBASE_API_KEY", "test-key", 1);
#endif
        check(Date("2024-02-28").addDays(1) == Date("2024-02-29"), "Leap year");
        check(Date("2026-12-31").addMonths(2) == Date("2027-02-28"), "Month clamp");
        fails(400, [] { Date("2025-02-29"); });
        fails(400, [] {
            Json j = {{"amountCents", 1.5}};
            readMoney(j, "amountCents");
        });
        fails(400, [] {
            Json j = {{"amountCents", 18446744073709551615ULL}};
            readMoney(j, "amountCents");
        });
        fails(400, [] { addMoney(maxApiMoneyCents, 1); });
        auto week = DateRange::containing(Date("2026-11-08"), BudgetPeriod::Weekly);
        check(week.start == Date("2026-11-02") && week.end == Date("2026-11-09"), "Monday week boundary");
        auto semester = DateRange::containing(Date("2026-12-31"), BudgetPeriod::Semester);
        check(semester.start == Date("2026-09-01") && semester.end == Date("2027-01-01"),
              "Semester boundary");
        MemoryStore db;
        CategoryRepository categoryRepo(db);
        CategoryService categories(categoryRepo);
        TransactionRepository transactionRepo(db);
        TransactionService transactions(transactionRepo, categories);
        auto defaults = categories.list();
        check(defaults.size() == 7, "RD default categories plus income");
        check(categories.find("housing").archived, "Legacy category preserved");
        auto custom = categories.create("Books");
        auto id = transactions.create(transaction("2026-11-01", -3000, custom));
        auto row = transaction("2026-11-02", -4000, custom);
        transactions.update(id, row);
        check(transactions.list()[0].amountCents == -4000, "Typed update persisted");
        categories.remove(custom);
        check(categories.find(custom).archived, "Category archival");
        fails(400, [&] { transactions.create(transaction("2026-11-03", -100, custom)); });
        transactions.update(id, row); // historical reference can still be edited
        transactions.remove(id);
        check(transactions.list().empty(), "Manual delete");
        fails(400, [&] { transactions.create(transaction("2026-11-08", 0)); });
        transactions.create(transaction("2026-11-01", 100000, "income"));
        transactions.create(transaction("2026-11-07", -2450));
        transactions.create(transaction("2026-10-15", -1000));
        transactions.create(transaction("2026-12-01", -9999));
        Ledger ledger(transactionRepo.list(), Date("2026-11-08"));
        check(ledger.totals().incomeCents == 100000 && ledger.totals().expensesCents == 3450,
              "Actual totals exclude future transactions");
        auto month = DateRange::containing(Date("2026-11-08"), BudgetPeriod::Monthly);
        check(ledger.totals(month).expensesCents == 2450, "Month filtering");
        BudgetRepository budgetRepo(db);
        BudgetService budgets(budgetRepo, categories);
        budgets.set({"", "groceries", BudgetPeriod::Monthly, 2000});
        budgets.set({"", "groceries", BudgetPeriod::Monthly, 2200});
        check(budgets.list().size() == 1, "Budget upsert does not duplicate");
        auto summaries = budgets.summaries(ledger, Date("2026-11-08"));
        check(summaries[0].overBudget && summaries[0].remainingCents == -250,
              "Over-budget warning and exact cents");
        auto reset =
            budgets.summaries(Ledger(transactionRepo.list(), Date("2026-12-01")), Date("2026-12-01"));
        check(reset[0].spentCents == 9999, "New period includes only new-period spending");
        check(transactionRepo.list().size() == 4, "Reset retains history");
        auto summary = call(db, "GET", "/api/transactions/summary", nullptr, {{"period", "last_month"}});
        check(summary["totalIncomeCents"] == 0 && summary["totalExpensesCents"] == 1000,
              "Selected-period API totals");
        auto view = call(db, "GET", "/api/transactions/view", nullptr, {{"period", "last_month"}});
        check(view["transactions"].size() == 1 && view["summary"]["totalExpensesCents"] == 1000,
              "Bundled list and summary agree");
        fails(400, [&] {
            auto value = Json(transaction("2026-11-08"));
            value["ownerUid"] = "bob";
            call(db, "POST", "/api/transactions", value);
        });
        fails(400, [&] { call(db, "DELETE", "/api/transactions/../../bob"); });
        fails(405, [&] { call(db, "POST", "/api/transactions/summary", Json::object()); });
        fails(404, [&] { call(db, "GET", "/api/not-a-route"); });
        MemoryStore bob;
        check(call(bob, "GET", "/api/transactions").empty(),
              "Separate account store cannot see Alice's data");
        RecurringRepository recurringRepo(db);
        RecurrenceService recurring(recurringRepo, transactionRepo, categories);
        RecurringEntry monthly{"",
                               "Rent",
                               "rent",
                               TransactionType::Expense,
                               -10000,
                               Date("2026-01-31"),
                               Date("2026-03-31"),
                               RecurrenceFrequency::Monthly,
                               true};
        auto dates = RecurrenceService::occurrences(monthly, {Date("2026-01-01"), Date("2026-04-01")});
        check(dates.size() == 3 && dates[1] == Date("2026-02-28") && dates[2] == Date("2026-03-31"),
              "Monthly recurrence retains original anchor");
        auto recurringId = recurring.create(monthly);
        check(recurring.sync(Date("2026-03-31")) == 3, "Due entries generated");
        check(recurring.sync(Date("2026-03-31")) == 0, "Sync is idempotent");
        auto generatedId = "rec_" + recurringId + "_2026-01-31";
        transactions.remove(generatedId);
        check(recurring.sync(Date("2026-03-31")) == 0, "Deleted recurrence stays deleted");
        check(transactionRepo.find(generatedId)->voided, "Deletion tombstone retained");
        auto scheduleCategory = categories.create("Subscriptions");
        auto archivedSchedule = monthly;
        archivedSchedule.categoryId = scheduleCategory;
        auto archivedId = recurring.create(archivedSchedule);
        categories.remove(scheduleCategory);
        archivedSchedule.active = false;
        recurring.update(archivedId, archivedSchedule);
        check(!recurringRepo.find(archivedId)->active, "Archived category schedule can still be paused");
        recurring.remove(archivedId);
        EventRepository eventRepo(db);
        CalendarService calendar(eventRepo);
        auto eventId = calendar.create({"", "Rent", "rent", Date("2026-11-10"), 60000, true, false});
        auto event = *eventRepo.find(eventId);
        check(calendar.upcoming(Date("2026-11-08")).size() == 1, "Upcoming payment");
        event.paid = true;
        calendar.update(eventId, event);
        check(calendar.upcoming(Date("2026-11-08")).empty(), "Paid event excluded");
        BursaryRepository bursaryRepo(db);
        FeeRepository feeRepo(db);
        SettingsRepository settingsRepo(db);
        StudentService students(bursaryRepo, feeRepo, settingsRepo);
        SemesterPlan plan;
        plan.startDate = Date("2026-09-01");
        plan.endDate = Date("2027-01-01");
        plan.expectedIncomeCents = 500000;
        plan.courseCount = 5;
        plan.tuitionPerCourseCents = 100000;
        plan.additionalFeesCents = 10000;
        students.savePlan(plan);
        students.addBursary({"", "Award", 50000, BursaryStatus::Approved});
        students.addBursary({"", "Pending", 99999, BursaryStatus::Applied});
        students.addFee({"", "Health", 10000, Date("2026-11-20"), FeeStatus::OptedOut});
        students.addFee({"", "Activity", 2000, Date("2026-11-20"), FeeStatus::Kept});
        auto studentSummary = students.summary(Date("2026-11-08"), calendar.list());
        check(studentSummary.estimatedTuitionCents == 510000 && studentSummary.expectedIncomeCents == 550000,
              "Tuition arithmetic and approved bursary only");
        check(studentSummary.optedOutSavingsCents == 10000 && studentSummary.plannedCostsCents == 512000,
              "Opt-out savings and kept fees");
        Ledger empty({}, Date("2026-11-08"));
        ForecastService forecast;
        auto projection = forecast.forecast(
            empty, {{"", "Due", "rent", Date("2026-11-10"), 10000, true, false}}, {}, Date("2026-11-08"));
        check(projection[0].expensesCents == 10000 && projection[0].projectedBalanceCents == -10000,
              "Known obligations floor with no history");
        Ledger trend({transaction("2026-11-01", -3000)}, Date("2026-11-08"));
        projection = forecast.forecast(trend, {}, {}, Date("2026-11-08"));
        check(projection[0].expensesCents == 2200 && projection[1].expensesCents == 3100,
              "30-day forecast rounded to cents");
        NotificationService notifier;
        auto alerts = notifier.list(Date("2026-11-08"), {}, summaries, {}, {});
        check(!alerts.empty(), "Budget alerts generated");
        check(call(bob, "GET", "/api/calendar/summary")["nextPayment"].is_null(), "Empty calendar response");
        auto profile = call(db, "PUT", "/api/me", {{"fullName", "Alice Example"}, {"studentId", nullptr}});
        check(profile["id"] == "alice" && profile["initials"] == "AE",
              "Identity cannot be replaced by profile");
        fails(401, [] { AuthService{}.authenticate(""); });
        auto identity = AuthService([](const auto &, const auto &, const auto &, const auto &body,
                                       const auto &) -> HttpResult {
                            check(Json::parse(body)["idToken"] == "valid", "Auth token forwarded");
                            return {200, R"({"users":[{"localId":"alice","email":"alice@example.com"}]})"};
                        }).authenticate("Bearer valid");
        check(identity.uid == "alice", "UID comes from Firebase");
        fails(401, [] {
            AuthService([](const auto &, const auto &, const auto &, const auto &,
                           const auto &) -> HttpResult {
                return {400, "{}"};
            }).authenticate("Bearer expired");
        });
        int calls = 0;
        FirestoreClient firestore(
            identity,
            [&](const auto &host, const auto &method, const auto &path, const auto &,
                const auto &token) -> HttpResult {
                check(host == "firestore.googleapis.com" && token == "valid", "Firestore uses user token");
                check(path.find("/documents/users/alice") != std::string::npos,
                      "Account-scoped Firestore path");
                if (method == "GET" && ++calls == 1)
                    return {
                        200,
                        R"({"documents":[{"name":"projects/test/databases/(default)/documents/users/alice/transactions/a","fields":{"amountCents":{"integerValue":"-2450"}}}],"nextPageToken":"next"})"};
                if (method == "GET") {
                    check(path.find("pageToken=next") != std::string::npos, "Pagination token followed");
                    return {200, "{}"};
                }
                return {400, R"({"error":{"status":"FAILED_PRECONDITION"}})"};
            });
        check(firestore.list("transactions").size() == 1, "Firestore pages decoded");
        check(!firestore.createOnce("/transactions/duplicate", {{"amountCents", 10}}),
              "Actual Firestore precondition status handled");
        Json encoded = {{"amountCents", -2450}, {"studentId", nullptr}, {"enabled", true}};
        check(document({{"fields", toValue(encoded)["mapValue"]["fields"]}}) == encoded,
              "Firestore scalar roundtrip");
        std::cout << checks << " backend checks passed.\n";
        return 0;
    } catch (const std::exception &error) {
        std::cerr << "TEST FAILURE after " << checks << " checks: " << error.what() << '\n';
        return 1;
    }
}
