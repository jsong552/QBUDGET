/*
 * Description: Function tests for ProfileService and SettingsService (Settings page). Covers
 *              the default profile name, saving the profile, default display/reminder/notification
 *              settings, saving each type of setting, and which themes are allowed. Also the
 *              profile rules (trimmed names, 100-character limit, 8-digit student ID), checks on
 *              settings saved directly, and the notification list and its API routes. Uses the
 *              in-memory test store.
 */
#include "../backend/src/api_controller.hpp"
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

// Like fails, but also checks the message the user would see.
void failsWith(int status, const std::string &text, const std::function<void()> &action, const std::string &message) {
    try {
        action();
        check(false, message + " (no error thrown)");
    } catch (const ApiError &error) {
        check(error.status == status && std::string(error.what()).find(text) != std::string::npos,
              message + " (got " + std::to_string(error.status) + " \"" + error.what() + "\")");
    }
}

// Sends one request through the real API routes for the signed-in test user.
Json call(const DocumentStore &store, const std::string &method, const std::string &path, const Json &data = nullptr) {
    httplib::Request request;
    request.method = method;
    request.path = path;
    request.body = data.dump();
    return ApiController(store, {"uid1", "alex@example.com", "Alex Student", "token"}, Date("2026-11-08"))
        .handle(request);
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
        check(display.theme == "system" && display.currency == "CAD", "System theme, CAD");
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

    test("Saved display settings without a theme use the system theme", [] {
        Setup s;
        s.store.put("/settings/display", {{"currency", "CAD"}, {"weekStart", "monday"}, {"dateFormat", "YYYY_MM_DD"}});
        auto loaded = s.settings.display();
        check(loaded.theme == "system", "Missing theme falls back to system");
        check(loaded.weekStart == "monday" && loaded.dateFormat == "YYYY_MM_DD", "Other saved settings kept");
    });

    test("Only light, dark and system themes are accepted", [] {
        for (const std::string theme : {"light", "dark", "system"})
            check(Json{{"theme", theme}}.get<DisplayPreferences>().theme == theme, theme + " accepted");
        for (const std::string theme : {"purple", "", "Dark"})
            fails(400, [&] { Json{{"theme", theme}}.get<DisplayPreferences>(); }, "'" + theme + "' rejected");
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

    test("Full name and student ID are saved without surrounding spaces", [] {
        Setup s;
        auto saved = s.profiles.update({"  Alex Johnson \t", std::string(" 20231234 ")});
        check(saved.fullName == "Alex Johnson" && saved.studentId && *saved.studentId == "20231234",
              "Returned trimmed");
        auto loaded = s.profiles.get({"uid1", "", "", "token"});
        check(loaded.fullName == "Alex Johnson" && loaded.studentId && *loaded.studentId == "20231234",
              "Saved trimmed");
    });

    test("A blank student ID clears it", [] {
        Setup s;
        s.profiles.update({"Alex", std::string("20231234")});
        check(!s.profiles.update({"Alex", std::string("   ")}).studentId, "Spaces only clears it");
        check(!s.profiles.get({"uid1", "", "", "token"}).studentId, "Cleared when saved");
    });

    test("A blank full name is rejected with a clear message", [] {
        Setup s;
        for (const std::string name : {"", "   ", "\t\n"})
            failsWith(400, "Enter your full name.", [&] { s.profiles.update({name, std::nullopt}); },
                      "Blank name rejected");
    });

    test("The 100-character name limit counts characters, not bytes", [] {
        Setup s;
        check(s.profiles.update({std::string(100, 'a'), std::nullopt}).fullName.size() == 100,
              "100 characters accepted");
        failsWith(400, "at most 100 characters", [&] { s.profiles.update({std::string(101, 'a'), std::nullopt}); },
                  "101 characters rejected");
        std::string accented;
        for (int i = 0; i < 100; i++)
            accented += "\xC3\xA9"; // é: one character, two bytes
        auto saved = s.profiles.update({accented, std::nullopt});
        check(saved.fullName.size() == 200 && characterCount(saved.fullName) == 100,
              "100 accented characters (200 bytes) accepted");
    });

    test("Line breaks and tabs inside a name are rejected", [] {
        Setup s;
        for (const std::string name : {"Alex\nJohnson", "Alex\tJohnson"})
            failsWith(400, "can't contain line breaks or tabs", [&] { s.profiles.update({name, std::nullopt}); },
                      "Control character rejected");
    });

    test("Student ID must be exactly 8 digits", [] {
        Setup s;
        check(s.profiles.update({"Alex", std::string("20231234")}).studentId == std::string("20231234"),
              "8 digits accepted");
        for (const std::string id : {"2023123", "202312345", "2023123a", "2023 1234"})
            failsWith(400, "exactly 8 digits", [&] { s.profiles.update({"Alex", id}); },
                      "'" + id + "' rejected");
    });

    test("Nothing is saved when a profile is rejected", [] {
        Setup s;
        failsWith(400, "Enter your full name.", [&] { s.profiles.update({" ", std::nullopt}); }, "Blank name");
        check(s.profiles.get({"uid1", "alex@example.com", "Alex Student", "token"}).fullName == "Alex Student",
              "Still the sign-in name");
    });

    test("Profiles saved under older rules still load", [] {
        Setup s;
        s.store.put("", {{"fullName", "  Old Name  "}, {"studentId", "ABC 12"}});
        auto loaded = s.profiles.get({"uid1", "", "", "token"});
        check(loaded.fullName == "  Old Name  ", "Old name loads unchanged");
        check(loaded.studentId && *loaded.studentId == "ABC 12", "Old student ID loads unchanged");
    });

    test("Profile requests with the wrong types get clear messages", [] {
        failsWith(400, "Enter your full name.", [] { Json{{"fullName", 5}}.get<UserProfile>(); }, "Number as name");
        failsWith(400, "exactly 8 digits", [] { Json{{"fullName", "Alex"}, {"studentId", 20231234}}.get<UserProfile>(); },
                  "Number as student ID");
    });

    test("Settings saved directly are checked too", [] {
        Setup s;
        DisplayPreferences purple;
        purple.theme = "purple";
        failsWith(400, "Invalid theme.", [&] { s.settings.saveDisplay(purple); }, "Unknown theme");
        DisplayPreferences usFormat;
        usFormat.dateFormat = "MM_DD_YYYY";
        failsWith(400, "Invalid date format.", [&] { s.settings.saveDisplay(usFormat); }, "Unknown date format");
        ReminderSettings twoWeeks;
        twoWeeks.leadTime = "2_weeks";
        failsWith(400, "Invalid reminder timing.", [&] { s.settings.saveReminders(twoWeeks); }, "Unknown timing");
        check(s.settings.display().theme == "system" && s.settings.reminders().leadTime == "1_day",
              "Nothing was saved");
    });

    test("The notification list shows saved values and which types the app sends", [] {
        Setup s;
        auto options = s.settings.notificationOptions();
        check(options.size() == 4 && options[0].key == "payment_reminders" && options[1].key == "forecast_updates" &&
                  options[2].key == "goal_updates" && options[3].key == "product_announcements",
              "Four types in order");
        check(options[0].available && options[0].enabled, "Payment reminders available and on");
        check(!options[1].available && !options[2].available && !options[3].available && !options[1].enabled &&
                  !options[2].enabled && !options[3].enabled,
              "The others are unavailable and off");
    });

    test("Payment reminders can be switched off and on", [] {
        Setup s;
        s.settings.setNotification("payment_reminders", false);
        check(!s.settings.notifications().paymentReminders && !s.settings.notificationOptions()[0].enabled,
              "Switched off");
        s.settings.setNotification("payment_reminders", true);
        check(s.settings.notifications().paymentReminders, "Switched back on");
    });

    test("Types the app doesn't send yet can't be switched on", [] {
        Setup s;
        failsWith(400, "Forecast updates aren't available yet.",
                  [&] { s.settings.setNotification("forecast_updates", true); }, "Forecast updates");
        failsWith(400, "Goal updates aren't available yet.", [&] { s.settings.setNotification("goal_updates", true); },
                  "Goal updates");
        failsWith(400, "Product announcements aren't available yet.",
                  [&] { s.settings.setNotification("product_announcements", true); }, "Product announcements");
        auto saved = s.settings.notifications();
        check(!saved.forecastUpdates && !saved.goalUpdates && !saved.productAnnouncements, "Nothing switched on");
    });

    test("Unknown notification types are rejected", [] {
        Setup s;
        failsWith(404, "Unknown notification type.", [&] { s.settings.setNotification("weekly_digest", true); },
                  "Unknown type");
    });

    test("Notification API routes", [] {
        Setup s;
        auto list = call(s.store, "GET", "/api/me/notification-preferences");
        check(list.size() == 4 && list[0]["available"] == true && list[1]["available"] == false &&
                  list[0]["enabled"] == true,
              "List includes saved values and availability");
        failsWith(400, "Send enabled as true or false.",
                  [&] { call(s.store, "PATCH", "/api/me/notification-preferences/payment_reminders", {{"enabled", "no"}}); },
                  "Text instead of true/false");
        failsWith(400, "Send enabled as true or false.",
                  [&] { call(s.store, "PATCH", "/api/me/notification-preferences/payment_reminders", Json::object()); },
                  "Missing enabled");
        call(s.store, "PATCH", "/api/me/notification-preferences/payment_reminders", {{"enabled", false}});
        check(!s.settings.notifications().paymentReminders, "PATCH saved the change");
    });

    test("Saving the profile through the API trims it", [] {
        Setup s;
        auto user = call(s.store, "PUT", "/api/me", {{"fullName", "  Sam Lee "}, {"studentId", "  "}});
        check(user["fullName"] == "Sam Lee" && user["initials"] == "SL", "Name trimmed, initials from it");
        check(user["studentId"].is_null(), "Blank student ID cleared");
    });

    std::cout << '\n' << checks - failures << '/' << checks << " Profile and Settings checks passed.\n";
    return failures == 0 ? 0 : 1;
}
