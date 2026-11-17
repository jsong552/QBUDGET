// Generates account-local payment reminders and category over-budget warnings; no email side effects.
#pragma once
#include "budget_service.hpp"
#include "calendar_service.hpp"
#include "profile_service.hpp"
namespace qbudget {
class NotificationService {
  public:
    std::vector<AppNotification> list(Date now, const std::vector<UpcomingEvent> &events,
                                      const std::vector<BudgetSummary> &budgets,
                                      const ReminderSettings &reminders,
                                      const NotificationPreferences &preferences) const {
        std::vector<AppNotification> result;
        int lead = reminders.leadTime == "1_week" ? 7 : reminders.leadTime == "3_days" ? 3 : 1;
        if (preferences.paymentReminders)
            for (const auto &item : events)
                if (item.daysAway <= lead && item.event.hasReminder)
                    result.push_back({"payment_" + item.event.id,
                                      item.event.title + " is due " + item.event.date.str(), now, false});
        for (const auto &budget : budgets)
            if (budget.overBudget)
                result.push_back({"budget_" + budget.category.id + "_" + budget.range.start.str() + "_" +
                                      budget.range.end.str(),
                                  budget.category.name + " has exceeded its budget for " +
                                      budget.range.start.str() + " to " + budget.range.end.addDays(-1).str(),
                                  now, false});
        return result;
    }
};
} // namespace qbudget
