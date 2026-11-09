// User profile and preferences. Identity comes only from AuthService, never from request fields.
#pragma once
#include "repositories.hpp"
namespace qbudget {
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
    UserProfile update(const UserProfile &value) const {
        repository.save(value);
        return value;
    }
};
class SettingsService {
    SettingsRepository &repository;

  public:
    explicit SettingsService(SettingsRepository &repo) : repository(repo) {}
    DisplayPreferences display() const {
        return repository.load<DisplayPreferences>("display");
    }
    void saveDisplay(const DisplayPreferences &value) const {
        repository.save("display", value);
    }
    ReminderSettings reminders() const {
        return repository.load<ReminderSettings>("reminders");
    }
    void saveReminders(const ReminderSettings &value) const {
        require(!value.emailEnabled, "Email delivery is not configured. In-app reminders remain available.");
        repository.save("reminders", value);
    }
    NotificationPreferences notifications() const {
        return repository.load<NotificationPreferences>("notifications");
    }
    void saveNotifications(const NotificationPreferences &value) const {
        repository.save("notifications", value);
    }
};
} // namespace qbudget
