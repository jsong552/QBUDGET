// HTTP/JSON adapter and dependency composition. Services own business behavior; this class owns routes and
// response shapes.
#pragma once
#include "httplib.h"
#include "budget_service.hpp"
#include "forecast_service.hpp"
#include "student_service.hpp"
#include "notification_service.hpp"
namespace qbudget {
class ApiController {
    AuthenticatedUser user;
    Date now;
    TransactionRepository transactionRepository;
    CategoryRepository categoryRepository;
    BudgetRepository budgetRepository;
    GoalRepository goalRepository;
    EventRepository eventRepository;
    RecurringRepository recurringRepository;
    BursaryRepository bursaryRepository;
    FeeRepository feeRepository;
    ProfileRepository profileRepository;
    SettingsRepository settingsRepository;
    CategoryService categories;
    TransactionService transactions;
    BudgetService budgets;
    GoalService goals;
    CalendarService calendar;
    RecurrenceService recurrence;
    StudentService students;
    ProfileService profiles;
    SettingsService settings;
    ForecastService forecasts;
    NotificationService notifications;
    std::optional<Ledger> cachedLedger; // per request only, never shared between users
    Ledger &ledger() {
        if (!cachedLedger)
            cachedLedger.emplace(transactionRepository.list(), now);
        return *cachedLedger;
    }
    static std::string param(const httplib::Request &req, const char *key, const std::string &fallback = "") {
        return req.has_param(key) ? req.get_param_value(key) : fallback;
    }
    static Json body(const httplib::Request &req) {
        try {
            auto value = Json::parse(req.body);
            require(value.is_object(), "Send a JSON object.");
            require(!value.contains("ownerUid") && !value.contains("uid"),
                    "Ownership is determined by your login, not request data.");
            return value;
        } catch (const Json::parse_error &) {
            throw ApiError(400, "Send valid JSON.");
        }
    }
    static std::string suffix(const std::string &path, const std::string &prefix) {
        auto id = path.substr(prefix.size() + 1);
        validateId(id);
        return id;
    }
    DateRange month() const {
        return DateRange::containing(now, BudgetPeriod::Monthly);
    }
    DateRange term() const {
        return DateRange::containing(now, BudgetPeriod::Semester);
    }
    std::optional<DateRange> period(const std::string &value) const {
        if (value == "all_time")
            return std::nullopt;
        if (value == "this_month")
            return month();
        if (value == "last_month")
            return DateRange{now.startOfMonth(-1), now.startOfMonth()};
        if (value == "this_week")
            return DateRange::containing(now, BudgetPeriod::Weekly);
        if (value == "this_term")
            return term();
        throw ApiError(400, "Invalid period.");
    }
    Json userView(const UserProfile &profile) const {
        std::istringstream words(profile.fullName);
        std::string first, second, initials;
        words >> first >> second;
        for (const auto &part : {first, second})
            if (!part.empty() && static_cast<unsigned char>(part[0]) < 128)
                initials += static_cast<char>(std::toupper(part[0]));
        if (initials.empty())
            initials = "U";
        return {{"id", user.uid},
                {"email", user.email},
                {"fullName", profile.fullName},
                {"firstName", first},
                {"initials", initials},
                {"studentId", profile.studentId ? Json(*profile.studentId) : Json(nullptr)}};
    }
    Json transactionRows(const std::vector<Transaction> &rows) const {
        auto catalogue = categories.list(true);
        Json result = Json::array();
        for (const auto &row : rows) {
            Json value = row;
            auto found = std::find_if(catalogue.begin(), catalogue.end(),
                                      [&](const Category &c) { return c.id == row.categoryId; });
            value["category"] = found == catalogue.end()
                                    ? Json(Category{row.categoryId, "Removed category", true, true})
                                    : Json(*found);
            value.erase("categoryId");
            value.erase("voided");
            result.push_back(value);
        }
        return result;
    }
    Json breakdown(const DateRange &range) {
        auto items = ledger().breakdown(range, categories.list(true));
        Json result = Json::array();
        for (const auto &item : items)
            result.push_back(
                {{"category", item.category}, {"amountCents", item.amountCents}, {"percent", item.percent}});
        return {{"totalCents", ledger().totals(range).expensesCents}, {"items", result}};
    }
    Json transactionSummary(const std::string &selected) {
        auto range = period(selected);
        auto totals = ledger().totals(range);
        auto current = ledger().totals(month());
        auto previous = ledger().totals(DateRange{now.startOfMonth(-1), now.startOfMonth()});
        return {{"totalIncomeCents", totals.incomeCents},
                {"totalExpensesCents", totals.expensesCents},
                {"remainingBalanceCents", totals.balance()},
                {"incomeChangeCents", current.incomeCents - previous.incomeCents},
                {"expensesChangeCents", current.expensesCents - previous.expensesCents},
                {"incomeChangeLabel", "this month vs last month"},
                {"expensesChangeLabel", "this month vs last month"},
                {"periodEnd", range ? range->end.addDays(-1) : month().end.addDays(-1)}};
    }
    Json transactionRoute(const httplib::Request &req) {
        if (req.path == "/api/transactions/summary")
            return transactionSummary(param(req, "period", "all_time"));
        if (req.method == "GET") {
            TransactionFilter filter;
            filter.range = period(param(req, "period", "all_time"));
            filter.type = param(req, "type", "all");
            filter.categoryId = param(req, "category", "all");
            filter.search = param(req, "search");
            filter.sortBy = param(req, "sort", "date");
            auto direction = param(req, "direction", "desc");
            require(direction == "asc" || direction == "desc", "Invalid sort direction.");
            filter.descending = direction == "desc";
            if (req.path == "/api/transactions/view")
                return {{"transactions",
                         transactionRows(transactions.filterRecords(ledger().transactions(), filter))},
                        {"summary", transactionSummary(param(req, "period", "all_time"))},
                        {"categories", categories.list()}};
            return transactionRows(transactions.filterRecords(ledger().transactions(), filter));
        }
        if (req.method == "POST" && req.path == "/api/transactions")
            transactions.create(body(req).get<Transaction>());
        else if (req.method == "PUT")
            transactions.update(suffix(req.path, "/api/transactions"), body(req).get<Transaction>());
        else if (req.method == "DELETE")
            transactions.remove(suffix(req.path, "/api/transactions"));
        else
            throw ApiError(405, "Unsupported transaction operation.");
        return nullptr;
    }
    Json categoryRoute(const httplib::Request &req) {
        if (req.method == "GET")
            return categories.list(param(req, "includeArchived") == "true");
        if (req.method == "POST")
            return {{"id", categories.create(readText(body(req), "name", 80))}};
        if (req.method == "DELETE") {
            categories.remove(suffix(req.path, "/api/categories"));
            return nullptr;
        }
        throw ApiError(405, "Unsupported category operation.");
    }
    Json budgetRoute(const httplib::Request &req) {
        if (req.method == "GET")
            return {{"budgets", budgets.list()},
                    {"summaries", budgets.summaries(ledger(), now)},
                    {"categories", categories.list()}};
        if (req.method == "PUT" || req.method == "POST")
            budgets.set(body(req).get<CategoryBudget>());
        else if (req.method == "DELETE")
            budgets.remove(suffix(req.path, "/api/budgets"));
        else
            throw ApiError(405, "Unsupported budget operation.");
        return nullptr;
    }
    Json goalRoute(const httplib::Request &req) {
        if (req.method == "GET") {
            Json result = Json::array();
            for (const auto &item : goals.progress(ledger(), now)) {
                Json row = item.goal;
                row["currentCents"] = item.currentCents;
                row["percent"] = item.percent;
                result.push_back(row);
            }
            return result;
        }
        if (req.method == "POST")
            goals.create(body(req).get<SavingsGoal>());
        else if (req.method == "PUT")
            goals.update(suffix(req.path, "/api/goals"), body(req).get<SavingsGoal>());
        else if (req.method == "DELETE")
            goals.remove(suffix(req.path, "/api/goals"));
        else
            throw ApiError(405, "Unsupported goal operation.");
        return nullptr;
    }
    Json calendarRoute(const httplib::Request &req) {
        if (req.path == "/api/calendar/reminders") {
            if (req.method == "GET")
                return settings.reminders();
            if (req.method == "PUT") {
                settings.saveReminders(body(req).get<ReminderSettings>());
                return nullptr;
            }
        }
        if (req.method != "GET") {
            if (req.method == "POST")
                calendar.create(body(req).get<CalendarEvent>());
            else if (req.method == "PUT")
                calendar.update(suffix(req.path, "/api/calendar/events"), body(req).get<CalendarEvent>());
            else if (req.method == "DELETE")
                calendar.remove(suffix(req.path, "/api/calendar/events"));
            else
                throw ApiError(405, "Unsupported calendar operation.");
            return nullptr;
        }
        auto upcoming = calendar.upcoming(now);
        if (req.path == "/api/calendar/summary") {
            MoneyCents total = 0;
            int count = 0;
            for (const auto &item : upcoming)
                if (item.daysAway <= 30) {
                    total = addMoney(total, item.event.amountCents);
                    count++;
                }
            Json next = nullptr;
            if (!upcoming.empty()) {
                const auto &e = upcoming.front().event;
                next = {{"label", e.title}, {"date", e.date}, {"amountCents", e.amountCents}};
            }
            return {{"upcomingCount", count},
                    {"upcomingTotalCents", total},
                    {"windowDays", 30},
                    {"nextPayment", next}};
        }
        if (req.path == "/api/calendar/upcoming") {
            Json result = Json::array();
            for (const auto &item : upcoming) {
                Json event = item.event;
                event["shortTitle"] = item.event.title;
                result.push_back({{"event", event}, {"daysAway", item.daysAway}, {"isUrgent", item.urgent}});
                if (result.size() == 4)
                    break;
            }
            return result;
        }
        auto selected = param(req, "month", now.str());
        if (selected.size() == 7)
            selected += "-01";
        auto start = Date(selected).startOfMonth();
        Json rows = Json::array();
        for (const auto &event : calendar.list(DateRange{start, start.startOfMonth(1)})) {
            Json row = event;
            row["shortTitle"] = event.title;
            rows.push_back(row);
        }
        return {{"month", start}, {"today", now}, {"events", rows}};
    }
    Json recurringRoute(const httplib::Request &req) {
        if (req.path == "/api/recurring/sync" && req.method == "POST")
            return {{"created", recurrence.sync(now)}};
        if (req.method == "GET")
            return recurrence.list();
        if (req.method == "POST")
            recurrence.create(body(req).get<RecurringEntry>());
        else if (req.method == "PUT")
            recurrence.update(suffix(req.path, "/api/recurring"), body(req).get<RecurringEntry>());
        else if (req.method == "DELETE")
            recurrence.remove(suffix(req.path, "/api/recurring"));
        else
            throw ApiError(405, "Unsupported recurring operation.");
        return nullptr;
    }
    Json studentRoute(const httplib::Request &req) {
        if (req.path == "/api/semester") {
            if (req.method == "GET")
                return {{"summary", students.summary(now, calendar.list())},
                        {"bursaries", students.listBursaries()},
                        {"fees", students.listFees()}};
            if (req.method == "PUT") {
                students.savePlan(body(req).get<SemesterPlan>());
                return nullptr;
            }
        }
        if (req.path.rfind("/api/bursaries", 0) == 0) {
            if (req.method == "GET")
                return students.listBursaries();
            if (req.method == "POST")
                students.addBursary(body(req).get<Bursary>());
            else if (req.method == "PUT")
                students.updateBursary(suffix(req.path, "/api/bursaries"), body(req).get<Bursary>());
            else if (req.method == "DELETE")
                students.removeBursary(suffix(req.path, "/api/bursaries"));
            else
                throw ApiError(405, "Unsupported bursary operation.");
            return nullptr;
        }
        if (req.path.rfind("/api/fees", 0) == 0) {
            if (req.method == "GET")
                return students.listFees();
            if (req.method == "POST")
                students.addFee(body(req).get<StudentFee>());
            else if (req.method == "PUT")
                students.updateFee(suffix(req.path, "/api/fees"), body(req).get<StudentFee>());
            else if (req.method == "DELETE")
                students.removeFee(suffix(req.path, "/api/fees"));
            else
                throw ApiError(405, "Unsupported fee operation.");
            return nullptr;
        }
        throw ApiError(404, "Unknown student-planning endpoint.");
    }
    Json profileRoute(const httplib::Request &req) {
        if (req.path == "/api/me") {
            if (req.method == "GET")
                return userView(profiles.get(user));
            if (req.method == "PUT" || req.method == "POST")
                return userView(profiles.update(body(req).get<UserProfile>()));
        }
        if (req.path == "/api/me/preferences") {
            if (req.method == "GET")
                return settings.display();
            if (req.method == "PATCH") {
                Json value = settings.display();
                value.update(body(req));
                settings.saveDisplay(value.get<DisplayPreferences>());
                return nullptr;
            }
        }
        if (req.path == "/api/me/notification-preferences" && req.method == "GET") {
            auto value = settings.notifications();
            return Json::array({{{"key", "payment_reminders"},
                                 {"title", "Payment reminders"},
                                 {"description", "Upcoming payments in the app"},
                                 {"enabled", value.paymentReminders}},
                                {{"key", "forecast_updates"},
                                 {"title", "Forecast updates"},
                                 {"description", "Not yet available"},
                                 {"enabled", false}},
                                {{"key", "goal_updates"},
                                 {"title", "Goal updates"},
                                 {"description", "Not yet available"},
                                 {"enabled", false}},
                                {{"key", "product_announcements"},
                                 {"title", "Product announcements"},
                                 {"description", "Not yet available"},
                                 {"enabled", false}}});
        }
        if (req.path.rfind("/api/me/notification-preferences/", 0) == 0 && req.method == "PATCH") {
            auto key = suffix(req.path, "/api/me/notification-preferences");
            require(key == "payment_reminders", "Only payment reminders are available.");
            auto value = settings.notifications();
            value.paymentReminders = body(req).at("enabled").get<bool>();
            settings.saveNotifications(value);
            return nullptr;
        }
        throw ApiError(404, "Unknown profile endpoint.");
    }
    Json dashboardSummary() {
        auto all = ledger().totals();
        auto current = ledger().totals(month());
        auto previous = ledger().totals(DateRange{now.startOfMonth(-1), now.startOfMonth()});
        MoneyCents budget = 0;
        for (const auto &value : budgets.summaries(ledger(), now))
            if (value.period == BudgetPeriod::Monthly)
                budget = addMoney(budget, value.budgetedCents);
        if (!budget)
            budget = current.incomeCents;
        int days = now.daysUntil(month().end);
        auto change =
            previous.expensesCents
                ? static_cast<MoneyCents>(std::min<double>(
                      maxApiMoneyCents, std::round(100.0 * (current.expensesCents - previous.expensesCents) /
                                                   previous.expensesCents)))
                : 0;
        return {{"greeting", "Welcome"},
                {"availableBalanceCents", all.balance()},
                {"periodEnd", month().end.addDays(-1)},
                {"budgetStatus", current.expensesCents > budget ? "over_budget" : "on_track"},
                {"spentCents", current.expensesCents},
                {"budgetCents", budget},
                {"spentPercent", progressPercent(current.expensesCents, budget)},
                {"spentThisMonthCents", current.expensesCents},
                {"spentChangePercent", change},
                {"spentChangeLabel", previous.expensesCents ? "from last month" : "no prior-month spending"},
                {"dailyAllowanceCents",
                 std::max<MoneyCents>(0, std::min(all.balance(), budget - current.expensesCents)) / days},
                {"daysRemaining", days}};
    }
    Json dashboardRoute(const httplib::Request &req) {
        auto range = param(req, "range", "month");
        require(range == "week" || range == "month" || range == "term", "Invalid activity range.");
        auto dates = range == "week"   ? DateRange{now.addDays(-6), now.addDays(1)}
                     : range == "term" ? term()
                                       : month();
        auto activity = Json{
            {"range", range}, {"points", ledger().points(dates, "daily", false)}, {"highlight", nullptr}};
        if (req.path == "/api/dashboard")
            return {
                {"summary", dashboardSummary()}, {"activity", activity}, {"categories", breakdown(month())}};
        if (req.path == "/api/dashboard/summary")
            return dashboardSummary();
        if (req.path == "/api/dashboard/activity")
            return activity;
        if (req.path == "/api/dashboard/categories")
            return breakdown(month());
        throw ApiError(404, "Unknown dashboard endpoint.");
    }
    Json forecastRoute(const httplib::Request &req) {
        auto mode = param(req, "granularity", "monthly");
        require(mode == "weekly" || mode == "monthly" || mode == "semester", "Invalid forecast granularity.");
        auto months = forecasts.forecast(ledger(), calendar.list(), recurrence.list(), now);
        MoneyCents income = 0, expenses = 0;
        for (const auto &value : months) {
            income = addMoney(income, value.incomeCents);
            expenses = addMoney(expenses, value.expensesCents);
        }
        auto projection = forecasts.series(months, now, mode);
        Json summary = {
            {"projectedIncomeCents", income},
            {"projectedIncomeCaption", "30-day trend or known recurring income"},
            {"projectedExpensesCents", expenses},
            {"projectedExpensesCaption", "30-day trend, at least known payments"},
            {"projectedBalanceCents", months.back().projectedBalanceCents},
            {"projectedBalanceCaption", "Estimate through " + now.startOfMonth(4).addDays(-1).str()},
            {"termLabel", "Current four-month term"}};
        Json series = {{"granularity", mode},
                       {"income", ledger().points(term(), mode, true)},
                       {"expenses", ledger().points(term(), mode, false)},
                       {"projectedExpenses", projection}};
        Json monthly = {{"description", "Forecast uses the last 30 days, with known payments and recurring "
                                        "entries as a floor. Estimates are not guarantees."},
                        {"months", months}};
        if (req.path == "/api/forecast") {
            httplib::Request goalReq;
            goalReq.method = "GET";
            return {{"summary", summary},
                    {"series", series},
                    {"categories", breakdown(term())},
                    {"breakdown", monthly},
                    {"goals", goalRoute(goalReq)}};
        }
        if (req.path == "/api/forecast/summary")
            return summary;
        if (req.path == "/api/forecast/series")
            return series;
        if (req.path == "/api/forecast/categories")
            return breakdown(term());
        if (req.path == "/api/forecast/monthly")
            return monthly;
        throw ApiError(404, "Unknown forecast endpoint.");
    }

  public:
    ApiController(const DocumentStore &db, AuthenticatedUser identity, Date date = Date::current())
        : user(std::move(identity)), now(date), transactionRepository(db), categoryRepository(db),
          budgetRepository(db), goalRepository(db), eventRepository(db), recurringRepository(db),
          bursaryRepository(db), feeRepository(db), profileRepository(db), settingsRepository(db),
          categories(categoryRepository), transactions(transactionRepository, categories),
          budgets(budgetRepository, categories), goals(goalRepository), calendar(eventRepository),
          recurrence(recurringRepository, transactionRepository, categories),
          students(bursaryRepository, feeRepository, settingsRepository), profiles(profileRepository),
          settings(settingsRepository) {}
    Json handle(const httplib::Request &req) {
        // Ordered patterns: fixed routes precede record IDs so reserved names cannot become writes.
        static const std::vector<std::pair<std::regex, std::string>> routes = {
            {std::regex(R"(/api/transactions/(summary|view))"), "GET"},
            {std::regex(R"(/api/transactions)"), "GET POST"},
            {std::regex(R"(/api/transactions/.+)"), "PUT DELETE"},
            {std::regex(R"(/api/categories)"), "GET POST"},
            {std::regex(R"(/api/categories/.+)"), "DELETE"},
            {std::regex(R"(/api/budgets)"), "GET POST PUT"},
            {std::regex(R"(/api/budgets/.+)"), "DELETE"},
            {std::regex(R"(/api/goals)"), "GET POST"},
            {std::regex(R"(/api/goals/.+)"), "PUT DELETE"},
            {std::regex(R"(/api/calendar/(summary|upcoming))"), "GET"},
            {std::regex(R"(/api/calendar/reminders)"), "GET PUT"},
            {std::regex(R"(/api/calendar/events)"), "GET POST"},
            {std::regex(R"(/api/calendar/events/.+)"), "PUT DELETE"},
            {std::regex(R"(/api/recurring/sync)"), "POST"},
            {std::regex(R"(/api/recurring)"), "GET POST"},
            {std::regex(R"(/api/recurring/.+)"), "PUT DELETE"},
            {std::regex(R"(/api/semester)"), "GET PUT"},
            {std::regex(R"(/api/(bursaries|fees))"), "GET POST"},
            {std::regex(R"(/api/(bursaries|fees)/.+)"), "PUT DELETE"},
            {std::regex(R"(/api/me)"), "GET PUT POST"},
            {std::regex(R"(/api/me/preferences)"), "GET PATCH"},
            {std::regex(R"(/api/me/notification-preferences)"), "GET"},
            {std::regex(R"(/api/me/notification-preferences/.+)"), "PATCH"},
            {std::regex(R"(/api/dashboard(/(summary|activity|categories))?)"), "GET"},
            {std::regex(R"(/api/forecast(/(summary|series|categories|monthly))?)"), "GET"},
            {std::regex(R"(/api/(notifications|app/today))"), "GET"}};
        bool matched = false;
        for (const auto &[pattern, methods] : routes)
            if (std::regex_match(req.path, pattern)) {
                if ((" " + methods + " ").find(" " + req.method + " ") == std::string::npos)
                    throw ApiError(405, "Unsupported method for this endpoint.");
                matched = true;
                break;
            }
        if (!matched)
            throw ApiError(404, "Endpoint not found.");
        if (req.path.rfind("/api/transactions", 0) == 0)
            return transactionRoute(req);
        if (req.path.rfind("/api/categories", 0) == 0)
            return categoryRoute(req);
        if (req.path.rfind("/api/budgets", 0) == 0)
            return budgetRoute(req);
        if (req.path.rfind("/api/goals", 0) == 0)
            return goalRoute(req);
        if (req.path.rfind("/api/calendar/", 0) == 0)
            return calendarRoute(req);
        if (req.path.rfind("/api/recurring", 0) == 0)
            return recurringRoute(req);
        if (req.path == "/api/semester" || req.path.rfind("/api/bursaries", 0) == 0 ||
            req.path.rfind("/api/fees", 0) == 0)
            return studentRoute(req);
        if (req.path.rfind("/api/me", 0) == 0)
            return profileRoute(req);
        if (req.method != "GET")
            throw ApiError(405, "Unsupported operation.");
        if (req.path.rfind("/api/dashboard", 0) == 0)
            return dashboardRoute(req);
        if (req.path.rfind("/api/forecast", 0) == 0)
            return forecastRoute(req);
        if (req.path == "/api/notifications")
            return notifications.list(now, calendar.upcoming(now), budgets.summaries(ledger(), now),
                                      settings.reminders(), settings.notifications());
        if (req.path == "/api/app/today") {
            std::ostringstream out;
            auto tm = utcParts(dateTime(now.str()));
            out << std::put_time(&tm, "%A, %B %d, %Y");
            return out.str();
        }
        throw ApiError(404, "Endpoint not found.");
    }
};
} // namespace qbudget
