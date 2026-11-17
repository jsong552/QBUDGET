// Domain invariants run on repository writes, including direct service calls (not only JSON requests).
#pragma once
#include "models.hpp"
namespace qbudget {
inline void validName(const std::string &value, size_t limit = 200) {
    require(value.size() <= limit && value.find_first_not_of(" \t\r\n") != std::string::npos,
            "Enter a nonblank name or description.");
}
inline void validAmount(MoneyCents value, bool positive = false) {
    require(value >= -maxRecordCents && value <= maxRecordCents && (!positive || value > 0),
            "Enter a valid amount greater than zero within the supported range.");
}
inline void validSignedAmount(TransactionType type, MoneyCents value) {
    validAmount(value);
    require((type == TransactionType::Income && value > 0) || (type == TransactionType::Expense && value < 0),
            "Invalid transaction amount or type.");
}
inline void validateRecord(const Category &v) {
    validName(v.name, 80);
}
inline void validateRecord(const Transaction &v) {
    validName(v.description);
    validName(v.categoryId, 150);
    validSignedAmount(v.type, v.amountCents);
    require(v.note.size() <= 1000, "Note is too long.");
}
inline void validateRecord(const CategoryBudget &v) {
    validName(v.categoryId, 150);
    validAmount(v.amountCents, true);
    require(v.period == BudgetPeriod::Weekly || v.period == BudgetPeriod::Monthly ||
                v.period == BudgetPeriod::Semester,
            "Invalid budget period.");
}
inline void validateRecord(const SavingsGoal &v) {
    validName(v.title);
    validAmount(v.targetCents, true);
    require(v.kind == GoalKind::Savings || v.kind == GoalKind::SpendingLimit, "Invalid goal kind.");
}
inline void validateRecord(const CalendarEvent &v) {
    validName(v.title);
    validName(v.kind, 40);
    validAmount(v.amountCents, true);
}
inline void validateRecord(const RecurringEntry &v) {
    validName(v.description);
    validName(v.categoryId, 150);
    validSignedAmount(v.type, v.amountCents);
    require(v.frequency == RecurrenceFrequency::Weekly || v.frequency == RecurrenceFrequency::Monthly,
            "Invalid frequency.");
    require(!v.endDate || v.startDate <= *v.endDate, "Invalid end date.");
}
inline void validateRecord(const Bursary &v) {
    validName(v.name);
    validAmount(v.amountCents, true);
    require(v.status == BursaryStatus::Applied || v.status == BursaryStatus::Approved ||
                v.status == BursaryStatus::Received,
            "Invalid bursary status.");
}
inline void validateRecord(const StudentFee &v) {
    validName(v.name);
    validAmount(v.amountCents, true);
    require(v.status == FeeStatus::Kept || v.status == FeeStatus::OptedOut, "Invalid fee status.");
}
} // namespace qbudget
