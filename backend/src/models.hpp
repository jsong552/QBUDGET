// Typed domain records and calculation results. All money is CAD integer cents.
#pragma once
#include "date.hpp"
#include <cstdint>
#include <optional>
#include <string>
#include <vector>
namespace qbudget {
using MoneyCents = std::int64_t;
inline constexpr MoneyCents maxRecordCents = 100000000000LL;
inline constexpr MoneyCents maxApiMoneyCents = 9007199254740991LL;
inline MoneyCents addMoney(MoneyCents a, MoneyCents b) {
    require(b <= maxApiMoneyCents && b >= -maxApiMoneyCents, "Money exceeds the supported range.");
    require((b <= 0 || a <= maxApiMoneyCents - b) && (b >= 0 || a >= -maxApiMoneyCents - b),
            "Total exceeds the supported range.");
    return a + b;
}
enum class TransactionType { Income, Expense };
enum class GoalKind { Savings, SpendingLimit };
enum class RecurrenceFrequency { Weekly, Monthly };
enum class BursaryStatus { Applied, Approved, Received };
enum class FeeStatus { Kept, OptedOut };
struct AuthenticatedUser {
    std::string uid, email, name, token;
};
struct UserProfile {
    std::string fullName;
    std::optional<std::string> studentId;
};
struct Category {
    std::string id, name;
    bool custom = false;
    bool archived = false;
};
struct Transaction {
    std::string id;
    Date date;
    std::string description, categoryId;
    TransactionType type = TransactionType::Expense;
    MoneyCents amountCents = 0; // signed: income positive, expense negative
    std::string note;
    std::string recurrenceId; // empty for manually entered transactions
    bool voided = false;      // recurring deletion tombstone prevents regeneration
};
struct TransactionFilter {
    std::string search, categoryId = "all", type = "all", sortBy = "date";
    bool descending = true;
    std::optional<DateRange> range;
};
struct CategoryBudget {
    std::string id, categoryId;
    BudgetPeriod period = BudgetPeriod::Monthly;
    MoneyCents amountCents = 0;
};
struct BudgetSummary {
    Category category;
    BudgetPeriod period;
    DateRange range;
    MoneyCents budgetedCents, spentCents, remainingCents;
    bool overBudget;
};
struct LedgerTotals {
    MoneyCents incomeCents = 0, expensesCents = 0;
    MoneyCents balance() const {
        return incomeCents - expensesCents;
    }
};
struct CategoryTotal {
    Category category;
    MoneyCents amountCents = 0;
    int percent = 0;
};
struct SeriesPoint {
    Date date;
    MoneyCents amountCents = 0;
};
struct SavingsGoal {
    std::string id, title;
    GoalKind kind = GoalKind::Savings;
    MoneyCents targetCents = 0;
};
struct GoalProgress {
    SavingsGoal goal;
    MoneyCents currentCents;
    int percent;
};
struct CalendarEvent {
    std::string id, title, kind;
    Date date;
    MoneyCents amountCents = 0;
    bool hasReminder = true;
    bool paid = false;
};
struct UpcomingEvent {
    CalendarEvent event;
    int daysAway;
    bool urgent;
};
struct RecurringEntry {
    std::string id, description, categoryId;
    TransactionType type = TransactionType::Expense;
    MoneyCents amountCents = 0;
    Date startDate;
    std::optional<Date> endDate;
    RecurrenceFrequency frequency = RecurrenceFrequency::Monthly;
    bool active = true;
};
struct Bursary {
    std::string id, name;
    MoneyCents amountCents = 0;
    BursaryStatus status = BursaryStatus::Applied;
};
struct StudentFee {
    std::string id, name;
    MoneyCents amountCents = 0;
    Date deadline;
    FeeStatus status = FeeStatus::Kept;
};
struct SemesterPlan {
    Date startDate{"2026-09-01"}, endDate{"2027-01-01"}; // end exclusive
    MoneyCents expectedIncomeCents = 0;
    std::string faculty, studentStatus;
    int courseCount = 0;
    MoneyCents tuitionPerCourseCents = 0, additionalFeesCents = 0;
};
struct SemesterSummary {
    SemesterPlan plan;
    MoneyCents estimatedTuitionCents, scheduledCostsCents, expectedIncomeCents, plannedCostsCents,
        remainingCents, optedOutSavingsCents;
};
struct ForecastMonth {
    Date month;
    MoneyCents incomeCents, expensesCents, projectedBalanceCents;
};
struct DisplayPreferences {
    std::string theme = "light", currency = "CAD", weekStart = "sunday", dateFormat = "MMM_DD_YYYY";
};
struct ReminderSettings {
    bool emailEnabled = false;
    std::string leadTime = "1_day";
};
struct NotificationPreferences {
    bool paymentReminders = true, forecastUpdates = false, goalUpdates = false, productAnnouncements = false;
};
struct AppNotification {
    std::string id, message;
    Date createdAt;
    bool read = false;
};
} // namespace qbudget
