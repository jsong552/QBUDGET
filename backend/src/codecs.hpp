// JSON adapters for API and Firestore boundaries. Domain services consume typed records.
#pragma once
#include "document_store.hpp"
#include "models.hpp"
#include <algorithm>
namespace qbudget {
inline std::string readText(const Json &j, const char *key, size_t limit = 200) {
    require(j.contains(key) && j[key].is_string(), std::string("Missing text: ") + key);
    auto value = j[key].get<std::string>();
    require(value.size() <= limit && value.find_first_not_of(" \t\r\n") != std::string::npos,
            std::string("Invalid ") + key);
    return value;
}
inline MoneyCents readMoney(const Json &j, const char *key, bool positive = false) {
    require(j.contains(key) && j[key].is_number_integer(), std::string(key) + " must be integer cents.");
    if (j[key].is_number_unsigned())
        require(j[key].get<std::uint64_t>() <= static_cast<std::uint64_t>(maxRecordCents),
                "Amount exceeds supported range.");
    auto value = j[key].get<MoneyCents>();
    require(value >= -maxRecordCents && value <= maxRecordCents, "Amount exceeds supported range.");
    require(!positive || value > 0, "Amount must be greater than zero.");
    return value;
}
inline void validateId(const std::string &id) {
    require(!id.empty() && id.size() <= 150 &&
                id.find_first_not_of("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_") ==
                    std::string::npos,
            "Invalid record ID.");
}
inline void to_json(Json &j, const Date &value) {
    j = value.str();
}
inline void from_json(const Json &j, Date &value) {
    require(j.is_string(), "Date must be a string.");
    value = Date(j.get<std::string>());
}
template <typename E> E enumValue(const Json &j, std::initializer_list<std::pair<const char *, E>> values) {
    require(j.is_string(), "Invalid enum value.");
    for (const auto &item : values)
        if (j == item.first)
            return item.second;
    throw ApiError(400, "Unsupported value: " + j.get<std::string>());
}
inline void to_json(Json &j, TransactionType v) {
    j = v == TransactionType::Income ? "income" : "expense";
}
inline void from_json(const Json &j, TransactionType &v) {
    v = enumValue<TransactionType>(
        j, {{"income", TransactionType::Income}, {"expense", TransactionType::Expense}});
}
inline void to_json(Json &j, BudgetPeriod v) {
    j = v == BudgetPeriod::Weekly ? "weekly" : v == BudgetPeriod::Monthly ? "monthly" : "semester";
}
inline void from_json(const Json &j, BudgetPeriod &v) {
    v = enumValue<BudgetPeriod>(j, {{"weekly", BudgetPeriod::Weekly},
                                    {"monthly", BudgetPeriod::Monthly},
                                    {"semester", BudgetPeriod::Semester}});
}
inline void to_json(Json &j, GoalKind v) {
    j = v == GoalKind::Savings ? "savings" : "spending_limit";
}
inline void from_json(const Json &j, GoalKind &v) {
    v = enumValue<GoalKind>(j, {{"savings", GoalKind::Savings}, {"spending_limit", GoalKind::SpendingLimit}});
}
inline void to_json(Json &j, RecurrenceFrequency v) {
    j = v == RecurrenceFrequency::Weekly ? "weekly" : "monthly";
}
inline void from_json(const Json &j, RecurrenceFrequency &v) {
    v = enumValue<RecurrenceFrequency>(
        j, {{"weekly", RecurrenceFrequency::Weekly}, {"monthly", RecurrenceFrequency::Monthly}});
}
inline void to_json(Json &j, BursaryStatus v) {
    j = v == BursaryStatus::Applied ? "applied" : v == BursaryStatus::Approved ? "approved" : "received";
}
inline void from_json(const Json &j, BursaryStatus &v) {
    v = enumValue<BursaryStatus>(j, {{"applied", BursaryStatus::Applied},
                                     {"approved", BursaryStatus::Approved},
                                     {"received", BursaryStatus::Received}});
}
inline void to_json(Json &j, FeeStatus v) {
    j = v == FeeStatus::Kept ? "kept" : "opted_out";
}
inline void from_json(const Json &j, FeeStatus &v) {
    v = enumValue<FeeStatus>(j, {{"kept", FeeStatus::Kept}, {"opted_out", FeeStatus::OptedOut}});
}
inline void to_json(Json &j, const UserProfile &v) {
    j = {{"fullName", v.fullName}, {"studentId", v.studentId ? Json(*v.studentId) : Json(nullptr)}};
}
inline void from_json(const Json &j, UserProfile &v) {
    v.fullName = readText(j, "fullName", 100);
    v.studentId.reset();
    if (j.contains("studentId") && !j["studentId"].is_null())
        v.studentId = readText(j, "studentId", 40);
}
inline void to_json(Json &j, const Category &v) {
    j = {{"id", v.id}, {"name", v.name}, {"custom", v.custom}, {"archived", v.archived}};
}
inline void from_json(const Json &j, Category &v) {
    v = {j.value("id", ""), readText(j, "name", 80), true, j.value("archived", false)};
}
inline void to_json(Json &j, const Transaction &v) {
    j = {{"id", v.id},
         {"date", v.date},
         {"description", v.description},
         {"categoryId", v.categoryId},
         {"type", v.type},
         {"amountCents", v.amountCents},
         {"note", v.note},
         {"recurrenceId", v.recurrenceId},
         {"voided", v.voided}};
}
inline void from_json(const Json &j, Transaction &v) {
    v.id = j.value("id", "");
    v.date = j.at("date").get<Date>();
    v.description = readText(j, "description");
    v.categoryId = readText(j, "categoryId", 150);
    validateId(v.categoryId);
    v.type = j.at("type").get<TransactionType>();
    v.amountCents = readMoney(j, "amountCents");
    require(v.type == TransactionType::Income ? v.amountCents > 0 : v.amountCents < 0,
            "Income must be positive; expense storage values must be negative.");
    v.note = j.value("note", "");
    require(v.note.size() <= 1000, "Note is too long.");
    v.recurrenceId = j.value("recurrenceId", "");
    v.voided = j.value("voided", false);
}
inline void to_json(Json &j, const CategoryBudget &v) {
    j = {{"id", v.id}, {"categoryId", v.categoryId}, {"period", v.period}, {"amountCents", v.amountCents}};
}
inline void from_json(const Json &j, CategoryBudget &v) {
    v = {j.value("id", ""), readText(j, "categoryId", 150), j.at("period").get<BudgetPeriod>(),
         readMoney(j, "amountCents", true)};
    validateId(v.categoryId);
}
inline void to_json(Json &j, const SavingsGoal &v) {
    j = {{"id", v.id}, {"title", v.title}, {"kind", v.kind}, {"targetCents", v.targetCents}};
}
inline void from_json(const Json &j, SavingsGoal &v) {
    v = {j.value("id", ""), readText(j, "title"), j.at("kind").get<GoalKind>(),
         readMoney(j, "targetCents", true)};
}
inline void to_json(Json &j, const CalendarEvent &v) {
    j = {{"id", v.id},
         {"title", v.title},
         {"kind", v.kind},
         {"date", v.date},
         {"amountCents", v.amountCents},
         {"hasReminder", v.hasReminder},
         {"paid", v.paid}};
}
inline void from_json(const Json &j, CalendarEvent &v) {
    v = {j.value("id", ""),
         readText(j, "title"),
         readText(j, "kind", 40),
         j.at("date").get<Date>(),
         readMoney(j, "amountCents", true),
         j.at("hasReminder").get<bool>(),
         j.value("paid", false)};
}
inline void to_json(Json &j, const RecurringEntry &v) {
    j = {{"id", v.id},
         {"description", v.description},
         {"categoryId", v.categoryId},
         {"type", v.type},
         {"amountCents", v.amountCents},
         {"startDate", v.startDate},
         {"endDate", v.endDate ? Json(*v.endDate) : Json(nullptr)},
         {"frequency", v.frequency},
         {"active", v.active}};
}
inline void from_json(const Json &j, RecurringEntry &v) {
    v.id = j.value("id", "");
    v.description = readText(j, "description");
    v.categoryId = readText(j, "categoryId", 150);
    validateId(v.categoryId);
    v.type = j.at("type").get<TransactionType>();
    v.amountCents = readMoney(j, "amountCents");
    require(v.type == TransactionType::Income ? v.amountCents > 0 : v.amountCents < 0,
            "Invalid recurring amount sign.");
    v.startDate = j.at("startDate").get<Date>();
    v.endDate.reset();
    if (j.contains("endDate") && !j["endDate"].is_null())
        v.endDate = j["endDate"].get<Date>();
    require(!v.endDate || v.startDate <= *v.endDate, "End date precedes start date.");
    v.frequency = j.at("frequency").get<RecurrenceFrequency>();
    v.active = j.value("active", true);
}
inline void to_json(Json &j, const Bursary &v) {
    j = {{"id", v.id}, {"name", v.name}, {"amountCents", v.amountCents}, {"status", v.status}};
}
inline void from_json(const Json &j, Bursary &v) {
    v = {j.value("id", ""), readText(j, "name"), readMoney(j, "amountCents", true),
         j.at("status").get<BursaryStatus>()};
}
inline void to_json(Json &j, const StudentFee &v) {
    j = {{"id", v.id},
         {"name", v.name},
         {"amountCents", v.amountCents},
         {"deadline", v.deadline},
         {"status", v.status}};
}
inline void from_json(const Json &j, StudentFee &v) {
    v = {j.value("id", ""), readText(j, "name"), readMoney(j, "amountCents", true),
         j.at("deadline").get<Date>(), j.at("status").get<FeeStatus>()};
}
inline void to_json(Json &j, const SemesterPlan &v) {
    j = {{"startDate", v.startDate},
         {"endDate", v.endDate},
         {"expectedIncomeCents", v.expectedIncomeCents},
         {"faculty", v.faculty},
         {"studentStatus", v.studentStatus},
         {"courseCount", v.courseCount},
         {"tuitionPerCourseCents", v.tuitionPerCourseCents},
         {"additionalFeesCents", v.additionalFeesCents}};
}
inline void from_json(const Json &j, SemesterPlan &v) {
    v.startDate = j.at("startDate").get<Date>();
    v.endDate = j.at("endDate").get<Date>();
    require(v.startDate < v.endDate, "Semester end must follow its start.");
    v.expectedIncomeCents = readMoney(j, "expectedIncomeCents");
    v.faculty = j.value("faculty", "");
    v.studentStatus = j.value("studentStatus", "");
    require(j.at("courseCount").is_number_integer() && j["courseCount"] >= 0 && j["courseCount"] <= 30,
            "Course count must be 0 to 30.");
    v.courseCount = j["courseCount"].get<int>();
    v.tuitionPerCourseCents = readMoney(j, "tuitionPerCourseCents");
    v.additionalFeesCents = readMoney(j, "additionalFeesCents");
    require(v.expectedIncomeCents >= 0 && v.tuitionPerCourseCents >= 0 && v.additionalFeesCents >= 0,
            "Plan amounts cannot be negative.");
    require(v.faculty.size() <= 100 && v.studentStatus.size() <= 100, "Student details are too long.");
}
inline void to_json(Json &j, const DisplayPreferences &v) {
    j = {{"theme", v.theme},
         {"currency", v.currency},
         {"weekStart", v.weekStart},
         {"dateFormat", v.dateFormat}};
}
inline void from_json(const Json &j, DisplayPreferences &v) {
    v = {j.value("theme", "light"), j.value("currency", "CAD"), j.value("weekStart", "sunday"),
         j.value("dateFormat", "MMM_DD_YYYY")};
    require(v.theme == "light" || v.theme == "dark" || v.theme == "system", "Invalid theme.");
    require(v.currency == "CAD", "Only CAD is supported; changing labels is not currency conversion.");
    require(v.weekStart == "sunday" || v.weekStart == "monday", "Invalid week start.");
    require(v.dateFormat == "MMM_DD_YYYY" || v.dateFormat == "DD_MM_YYYY" || v.dateFormat == "YYYY_MM_DD",
            "Invalid date format.");
}
inline void to_json(Json &j, const ReminderSettings &v) {
    j = {{"emailEnabled", v.emailEnabled}, {"leadTime", v.leadTime}};
}
inline void from_json(const Json &j, ReminderSettings &v) {
    v = {j.value("emailEnabled", false), j.value("leadTime", "1_day")};
    require(v.leadTime == "1_day" || v.leadTime == "3_days" || v.leadTime == "1_week",
            "Invalid reminder timing.");
}
inline void to_json(Json &j, const NotificationPreferences &v) {
    j = {{"payment_reminders", v.paymentReminders},
         {"forecast_updates", v.forecastUpdates},
         {"goal_updates", v.goalUpdates},
         {"product_announcements", v.productAnnouncements}};
}
inline void from_json(const Json &j, NotificationPreferences &v) {
    v = {j.value("payment_reminders", true), j.value("forecast_updates", false),
         j.value("goal_updates", false), j.value("product_announcements", false)};
}
inline void to_json(Json &j, const SeriesPoint &v) {
    j = {{"date", v.date}, {"amountCents", v.amountCents}};
}
inline void to_json(Json &j, const AppNotification &v) {
    j = {{"id", v.id}, {"message", v.message}, {"createdAt", v.createdAt}, {"read", v.read}};
}
inline void to_json(Json &j, const ForecastMonth &v) {
    j = {{"month", v.month},
         {"incomeCents", v.incomeCents},
         {"expensesCents", v.expensesCents},
         {"projectedBalanceCents", v.projectedBalanceCents}};
}
inline void to_json(Json &j, const BudgetSummary &v) {
    j = {{"category", v.category},
         {"period", v.period},
         {"startDate", v.range.start},
         {"endDate", v.range.end},
         {"budgetedCents", v.budgetedCents},
         {"spentCents", v.spentCents},
         {"remainingCents", v.remainingCents},
         {"overBudget", v.overBudget}};
}
inline void to_json(Json &j, const SemesterSummary &v) {
    j = {{"plan", v.plan},
         {"estimatedTuitionCents", v.estimatedTuitionCents},
         {"scheduledCostsCents", v.scheduledCostsCents},
         {"expectedIncomeCents", v.expectedIncomeCents},
         {"plannedCostsCents", v.plannedCostsCents},
         {"remainingCents", v.remainingCents},
         {"optedOutSavingsCents", v.optedOutSavingsCents}};
}
} // namespace qbudget
