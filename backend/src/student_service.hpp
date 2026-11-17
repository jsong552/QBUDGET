// Semester planning, bursary status and opt-out fees. Tuition rates are user-supplied estimates.
#pragma once
#include "calendar_service.hpp"
namespace qbudget {
class StudentService {
    BursaryRepository &bursaries;
    FeeRepository &fees;
    SettingsRepository &settings;

  public:
    StudentService(BursaryRepository &b, FeeRepository &f, SettingsRepository &s)
        : bursaries(b), fees(f), settings(s) {}
    std::vector<Bursary> listBursaries() const {
        return bursaries.list();
    }
    std::string addBursary(const Bursary &value) const {
        return bursaries.add(value);
    }
    void updateBursary(const std::string &id, const Bursary &value) const {
        bursaries.save(id, value);
    }
    void removeBursary(const std::string &id) const {
        bursaries.remove(id);
    }
    std::vector<StudentFee> listFees() const {
        return fees.list();
    }
    std::string addFee(const StudentFee &value) const {
        return fees.add(value);
    }
    void updateFee(const std::string &id, const StudentFee &value) const {
        fees.save(id, value);
    }
    void removeFee(const std::string &id) const {
        fees.remove(id);
    }
    SemesterPlan plan(Date now) const {
        SemesterPlan defaults;
        defaults.startDate = now.startOfTerm();
        defaults.endDate = defaults.startDate.startOfMonth(4);
        return settings.load<SemesterPlan>("semester", defaults);
    }
    void savePlan(const SemesterPlan &value) const {
        settings.save("semester", value);
    }
    SemesterSummary summary(Date now, const std::vector<CalendarEvent> &events) const {
        auto value = plan(now);
        DateRange range{value.startDate, value.endDate};
        MoneyCents approved = 0, kept = 0, saved = 0, scheduled = 0;
        for (const auto &bursary : listBursaries())
            if (bursary.status == BursaryStatus::Approved)
                approved = addMoney(approved, bursary.amountCents);
        for (const auto &fee : listFees())
            if (range.contains(fee.deadline)) {
                if (fee.status == FeeStatus::OptedOut)
                    saved = addMoney(saved, fee.amountCents);
                else
                    kept = addMoney(kept, fee.amountCents);
            }
        for (const auto &event : events)
            if (!event.paid && range.contains(event.date) && event.kind != "tuition")
                scheduled = addMoney(scheduled, event.amountCents);
        auto tuition = addMoney(value.tuitionPerCourseCents * value.courseCount, value.additionalFeesCents);
        auto costs = addMoney(addMoney(tuition, scheduled), kept);
        auto income = addMoney(value.expectedIncomeCents, approved);
        return {value, tuition, scheduled, income, costs, income - costs, saved};
    }
};
} // namespace qbudget
