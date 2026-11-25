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
// Mirrors the JSON codec so a plan is checked the same way whether it arrives over HTTP or from a service
// call.
inline void validateRecord(const SemesterPlan &v) {
    require(v.startDate < v.endDate, "Semester end must follow its start.");
    require(v.courseCount >= 0 && v.courseCount <= 30, "Course count must be 0 to 30.");
    for (auto amount : {v.expectedIncomeCents, v.tuitionPerCourseCents, v.additionalFeesCents})
        require(amount >= 0 && amount <= maxRecordCents,
                "Plan amounts must be zero or more and within the supported range.");
    require(v.faculty.size() <= 100 && v.studentStatus.size() <= 100, "Student details are too long.");
}
/** Characters (Unicode code points) in UTF-8 text, so limits treat accented and non-Latin names fairly. */
inline size_t characterCount(const std::string &text) {
    size_t count = 0;
    for (unsigned char c : text)
        if ((c & 0xC0) != 0x80)
            count++;
    return count;
}
inline bool hasControlCharacter(const std::string &text) {
    for (unsigned char c : text)
        if (c < 0x20 || c == 0x7F)
            return true;
    return false;
}
// Checked when a profile is saved (ProfileService::update trims it first). Reading stays lenient so profiles saved
// under older rules still load.
inline void validateRecord(const UserProfile &v) {
    require(v.fullName.find_first_not_of(" \t\r\n") != std::string::npos, "Enter your full name.");
    require(!hasControlCharacter(v.fullName), "Your full name can't contain line breaks or tabs.");
    require(characterCount(v.fullName) <= 100, "Your full name can be at most 100 characters.");
    require(!v.studentId ||
                (v.studentId->size() == 8 && v.studentId->find_first_not_of("0123456789") == std::string::npos),
            "Your student ID must be exactly 8 digits.");
}
inline void validateRecord(const DisplayPreferences &v) {
    require(v.theme == "light" || v.theme == "dark" || v.theme == "system", "Invalid theme.");
    require(v.currency == "CAD", "Only CAD is supported; changing labels is not currency conversion.");
    require(v.weekStart == "sunday" || v.weekStart == "monday", "Invalid week start.");
    require(v.dateFormat == "MMM_DD_YYYY" || v.dateFormat == "DD_MM_YYYY" || v.dateFormat == "YYYY_MM_DD",
            "Invalid date format.");
}
inline void validateRecord(const ReminderSettings &v) {
    require(v.leadTime == "1_day" || v.leadTime == "3_days" || v.leadTime == "1_week", "Invalid reminder timing.");
}
} // namespace qbudget
