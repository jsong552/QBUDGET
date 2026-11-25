// User profile and preferences. Identity comes only from AuthService, never from request fields.
#pragma once
#include "repositories.hpp"
namespace qbudget {
/** Text without surrounding spaces, tabs or line breaks. */
inline std::string trimSpaces(const std::string &value) {
    auto first = value.find_first_not_of(" \t\r\n");
    if (first == std::string::npos)
        return "";
    return value.substr(first, value.find_last_not_of(" \t\r\n") - first + 1);
}
/** One row of Settings > Notification preferences. */
struct NotificationOption {
    std::string key, title, description;
    bool enabled = false;
    /** False while the app doesn't send this kind of notification yet; it can't be switched on until it does. */
    bool available = false;
};
inline void to_json(Json &j, const NotificationOption &v) {
    j = {{"key", v.key},
         {"title", v.title},
         {"description", v.description},
         {"enabled", v.enabled},
         {"available", v.available}};
}
class ProfileService {
    ProfileRepository &repository;

  public:
    explicit ProfileService(ProfileRepository &repo) : repository(repo) {}
    UserProfile get(const AuthenticatedUser &identity) const {
        auto value = repository.find();
        if (value)
            return *value;
        auto name =
            identity.name.empty() ? identity.email.substr(0, identity.email.find('@')) : identity.name;
        if (name.empty())
            name = "Student";
        return {name, std::nullopt};
    }
    /** Saves the profile without surrounding spaces (a blank student ID clears it); rejects invalid values. */
    UserProfile update(UserProfile value) const {
        value.fullName = trimSpaces(value.fullName);
        if (value.studentId) {
            value.studentId = trimSpaces(*value.studentId);
            if (value.studentId->empty())
                value.studentId.reset();
        }
        validateRecord(value);
        repository.save(value);
        return value;
    }
};
class SettingsService {
    SettingsRepository &repository;

    /** A notification type, the saved on/off flag behind it, and whether the app sends it yet. */
    struct NotificationType {
        const char *key, *title, *description;
        bool NotificationPreferences::*flag;
        bool available;
    };
    // To offer a new type once the app sends it (NotificationService), set `available` to true here.
    static const std::vector<NotificationType> &notificationTypes() {
        static const std::vector<NotificationType> types = {
            {"payment_reminders", "Payment reminders", "Upcoming payments in the app",
             &NotificationPreferences::paymentReminders, true},
            {"forecast_updates", "Forecast updates", "Not yet available", &NotificationPreferences::forecastUpdates,
             false},
            {"goal_updates", "Goal updates", "Not yet available", &NotificationPreferences::goalUpdates, false},
            {"product_announcements", "Product announcements", "Not yet available",
             &NotificationPreferences::productAnnouncements, false}};
        return types;
    }

  public:
    explicit SettingsService(SettingsRepository &repo) : repository(repo) {}
    DisplayPreferences display() const {
        return repository.load<DisplayPreferences>("display");
    }
    void saveDisplay(const DisplayPreferences &value) const {
        validateRecord(value);
        repository.save("display", value);
    }
    ReminderSettings reminders() const {
        return repository.load<ReminderSettings>("reminders");
    }
    void saveReminders(const ReminderSettings &value) const {
        validateRecord(value);
        require(!value.emailEnabled, "Email delivery is not configured. In-app reminders remain available.");
        repository.save("reminders", value);
    }
    NotificationPreferences notifications() const {
        return repository.load<NotificationPreferences>("notifications");
    }
    void saveNotifications(const NotificationPreferences &value) const {
        repository.save("notifications", value);
    }
    /** Every notification type with its saved on/off value and whether the app sends it yet. */
    std::vector<NotificationOption> notificationOptions() const {
        auto saved = notifications();
        std::vector<NotificationOption> rows;
        for (const auto &type : notificationTypes())
            rows.push_back({type.key, type.title, type.description, saved.*type.flag, type.available});
        return rows;
    }
    /** Switches one notification type on or off. Only types the app actually sends can be switched. */
    void setNotification(const std::string &key, bool enabled) const {
        const auto &types = notificationTypes();
        auto type = std::find_if(types.begin(), types.end(), [&](const NotificationType &t) { return key == t.key; });
        if (type == types.end())
            throw ApiError(404, "Unknown notification type.");
        require(type->available, std::string(type->title) + " aren't available yet.");
        auto value = notifications();
        value.*type->flag = enabled;
        saveNotifications(value);
    }
};
} // namespace qbudget
