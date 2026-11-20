// Function tests for NotificationService: payment reminder lead times, preference gating,
// over-budget warnings, notification ids/messages and output ordering. Pure; no store or network.
#include "../backend/src/notification_service.hpp"
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

UpcomingEvent upcoming(const std::string &id, int daysAway, bool hasReminder = true,
                       const std::string &title = "Rent") {
    CalendarEvent event{id, title, "rent", now.addDays(daysAway), 60000, hasReminder, false};
    return {event, daysAway, daysAway <= 3};
}

BudgetSummary budget(const std::string &categoryId, const std::string &name, bool overBudget,
                     DateRange range = DateRange::containing(now, BudgetPeriod::Monthly)) {
    MoneyCents budgeted = 20000, spent = overBudget ? 22500 : 15000;
    return {{categoryId, name, false, false}, BudgetPeriod::Monthly, range, budgeted, spent,
            budgeted - spent, overBudget};
}

ReminderSettings lead(const std::string &leadTime) {
    ReminderSettings settings;
    settings.leadTime = leadTime;
    return settings;
}

NotificationPreferences paymentRemindersOn(bool enabled) {
    NotificationPreferences preferences;
    preferences.paymentReminders = enabled;
    return preferences;
}

bool hasId(const std::vector<AppNotification> &list, const std::string &id) {
    for (const auto &item : list)
        if (item.id == id)
            return true;
    return false;
}
} // namespace

int main() {
    NotificationService service;

    test("No events and no budgets produce no notifications", [&] {
        check(service.list(now, {}, {}, {}, {}).empty(), "Expected empty list");
    });

    test("Default lead time is 1 day", [&] {
        auto result = service.list(now, {upcoming("e0", 0), upcoming("e1", 1), upcoming("e2", 2)}, {},
                                   ReminderSettings{}, {});
        check(result.size() == 2, "Only events due within 1 day are included");
        check(hasId(result, "payment_e0") && hasId(result, "payment_e1"), "now and tomorrow included");
        check(!hasId(result, "payment_e2"), "Event 2 days away excluded");
    });

    test("3_days lead time includes day 3 but not day 4", [&] {
        auto result = service.list(now, {upcoming("e3", 3), upcoming("e4", 4)}, {}, lead("3_days"), {});
        check(hasId(result, "payment_e3"), "Day 3 included (inclusive boundary)");
        check(!hasId(result, "payment_e4"), "Day 4 excluded");
    });

    test("1_week lead time includes day 7 but not day 8", [&] {
        auto result = service.list(now, {upcoming("e7", 7), upcoming("e8", 8)}, {}, lead("1_week"), {});
        check(hasId(result, "payment_e7"), "Day 7 included (inclusive boundary)");
        check(!hasId(result, "payment_e8"), "Day 8 excluded");
    });

    test("Unrecognised lead time falls back to 1 day", [&] {
        auto result = service.list(now, {upcoming("e1", 1), upcoming("e2", 2)}, {}, lead("2_weeks"), {});
        check(result.size() == 1 && result[0].id == "payment_e1", "Falls back to 1-day window");
    });

    test("Events with reminders turned off are skipped", [&] {
        auto result = service.list(now, {upcoming("quiet", 0, false), upcoming("loud", 0, true)}, {},
                                   ReminderSettings{}, {});
        check(result.size() == 1 && result[0].id == "payment_loud", "Only hasReminder events notify");
    });

    test("Disabling payment reminders suppresses payments but keeps budget warnings", [&] {
        auto result = service.list(now, {upcoming("e0", 0)}, {budget("groceries", "Groceries", true)},
                                   ReminderSettings{}, paymentRemindersOn(false));
        check(!hasId(result, "payment_e0"), "Payment reminder suppressed");
        check(result.size() == 1 && result[0].id.rfind("budget_groceries_", 0) == 0,
              "Budget warning still generated");
    });

    test("Payment notification has expected id, message, timestamp and unread state", [&] {
        auto result = service.list(now, {upcoming("abc123", 1, true, "Phone bill")}, {}, {}, {});
        check(result.size() == 1, "One notification");
        check(result[0].id == "payment_abc123", "Id is payment_<eventId>");
        check(result[0].message == "Phone bill is due 2026-11-09", "Message names title and due date");
        check(result[0].createdAt == now, "createdAt is the supplied 'now'");
        check(!result[0].read, "New notifications are unread");
    });

    test("Only over-budget categories produce warnings", [&] {
        auto result = service.list(
            now, {}, {budget("groceries", "Groceries", false), budget("dining", "Dining", true)}, {}, {});
        check(result.size() == 1, "One warning");
        check(result[0].id.rfind("budget_dining_", 0) == 0, "Warning is for the over-budget category");
    });

    test("Budget warning id and message use the period range (end shown inclusively)", [&] {
        DateRange november{Date("2026-11-01"), Date("2026-12-01")}; // end is exclusive
        auto result = service.list(now, {}, {budget("dining", "Dining", true, november)}, {}, {});
        check(result.size() == 1, "One warning");
        check(result[0].id == "budget_dining_2026-11-01_2026-12-01", "Id uses raw start/end range");
        check(result[0].message == "Dining has exceeded its budget for 2026-11-01 to 2026-11-30",
              "Message shows last day of period, not exclusive end");
        check(result[0].createdAt == now && !result[0].read, "Timestamp and unread state");
    });

    test("Same category in different periods yields distinct ids", [&] {
        DateRange week = DateRange::containing(now, BudgetPeriod::Weekly);
        DateRange month = DateRange::containing(now, BudgetPeriod::Monthly);
        auto result = service.list(
            now, {}, {budget("dining", "Dining", true, week), budget("dining", "Dining", true, month)}, {}, {});
        check(result.size() == 2 && result[0].id != result[1].id, "Ids differ per period");
    });

    test("Payment reminders come before budget warnings, each in input order", [&] {
        auto result = service.list(now, {upcoming("first", 0), upcoming("second", 1)},
                                   {budget("a", "A", true), budget("b", "B", true)}, {}, {});
        check(result.size() == 4, "Four notifications");
        check(result[0].id == "payment_first" && result[1].id == "payment_second", "Payments first, in order");
        check(result[2].id.rfind("budget_a_", 0) == 0 && result[3].id.rfind("budget_b_", 0) == 0,
              "Budgets after, in order");
    });

    test("Overdue events (negative daysAway) are still reminded", [&] {
        auto result = service.list(now, {upcoming("late", -2)}, {}, {}, {});
        check(result.size() == 1 && result[0].id == "payment_late", "Overdue event included");
    });

    std::cout << '\n' << checks - failures << '/' << checks << " NotificationService checks passed.\n";
    return failures == 0 ? 0 : 1;
}
