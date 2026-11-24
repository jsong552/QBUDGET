/*
 * Description: Function tests for ProfileService and SettingsService (Settings page). Covers
 *              the default profile name, saving the profile, default display/reminder/notification
 *              settings, and saving each type of setting. Uses the in-memory test store.
 */
#include "../backend/src/profile_service.hpp"
#include "../backend/tests/memory_store.hpp"
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

void fails(int status, const std::function<void()> &action, const std::string &message) {
    try {
        action();
        check(false, message + " (no error thrown)");
    } catch (const ApiError &error) {
        check(error.status == status, message + " (wrong status " + std::to_string(error.status) + ")");
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

struct Setup {
    MemoryStore store;
    ProfileRepository profileRepo{store};
    SettingsRepository settingsRepo{store};
    ProfileService profiles{profileRepo};
    SettingsService settings{settingsRepo};
};
} // namespace

int main() {
    test("New profile uses the sign-in name", [] {
        Setup s;
        auto profile = s.profiles.get({"uid1", "alex@example.com", "Alex Student", "token"});
        check(profile.fullName == "Alex Student", "Display name used");
        check(!profile.studentId, "No student ID yet");
    });

    test("Without a name, the email (or 'Student') is used", [] {
        Setup s;
        check(s.profiles.get({"uid1", "alex@example.com", "", "token"}).fullName == "alex", "Part before the @");
        check(s.profiles.get({"uid1", "", "", "token"}).fullName == "Student", "Falls back to Student");
    });

    test("Saved profile is returned instead of the sign-in name", [] {
        Setup s;
        s.profiles.update({"Alex Jordan Student", std::string("12345678")});
        auto profile = s.profiles.get({"uid1", "alex@example.com", "Alex Student", "token"});
        check(profile.fullName == "Alex Jordan Student", "Saved name wins");
        check(profile.studentId && *profile.studentId == "12345678", "Student ID saved");
    });

    test("Default settings", [] {
        Setup s;
        auto display = s.settings.display();
        check(display.theme == "light" && display.currency == "CAD", "Light theme, CAD");
        check(display.weekStart == "sunday" && display.dateFormat == "MMM_DD_YYYY", "Week start and date format");
        auto reminders = s.settings.reminders();
        check(!reminders.emailEnabled && reminders.leadTime == "1_day", "Email off, 1 day lead time");
        auto notifications = s.settings.notifications();
        check(notifications.paymentReminders && !notifications.forecastUpdates && !notifications.goalUpdates &&
                  !notifications.productAnnouncements,
              "Only payment reminders on");
    });

    test("Save display preferences", [] {
        Setup s;
        DisplayPreferences dark;
        dark.theme = "dark";
        dark.weekStart = "monday";
        s.settings.saveDisplay(dark);
        auto loaded = s.settings.display();
        check(loaded.theme == "dark" && loaded.weekStart == "monday", "Dark theme and Monday saved");
    });

    test("Save reminder lead time", [] {
        Setup s;
        ReminderSettings reminders;
        reminders.leadTime = "3_days";
        s.settings.saveReminders(reminders);
        check(s.settings.reminders().leadTime == "3_days", "3 days saved");
    });

    test("Turning on email reminders is rejected while email isn't set up", [] {
        Setup s;
        ReminderSettings email;
        email.emailEnabled = true;
        fails(400, [&] { s.settings.saveReminders(email); }, "Email reminders not configured yet");
        check(!s.settings.reminders().emailEnabled, "Setting stays off");
    });

    test("Save notification preferences", [] {
        Setup s;
        NotificationPreferences preferences;
        preferences.paymentReminders = false;
        preferences.goalUpdates = true;
        s.settings.saveNotifications(preferences);
        auto loaded = s.settings.notifications();
        check(!loaded.paymentReminders && loaded.goalUpdates, "Both changes saved");
    });

    std::cout << '\n' << checks - failures << '/' << checks << " Profile and Settings checks passed.\n";
    return failures == 0 ? 0 : 1;
}
