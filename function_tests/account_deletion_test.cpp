/*
 * Description: Function tests for deleting an account (AccountService, DELETE /api/me). Creates
 *              data of every kind through the real API, deletes the account and checks nothing is
 *              left. Also the recent-sign-in rule, retrying after a failure, and Firestore batch
 *              deletes. Uses the in-memory test store and fake Firebase/Firestore, so no network.
 */
#include "../backend/src/api_controller.hpp"
#include "../backend/src/firestore_client.hpp"
#include "../backend/tests/memory_store.hpp"
#include <cstdlib>
#include <ctime>
#include <functional>
#include <iostream>
#include <set>
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

void failsWith(int status, const std::string &text, const std::function<void()> &action, const std::string &message) {
    try {
        action();
        check(false, message + " (no error thrown)");
    } catch (const ApiError &error) {
        check(error.status == status && std::string(error.what()).find(text) != std::string::npos,
              message + " (got " + std::to_string(error.status) + " \"" + error.what() + "\")");
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

void setProject(const char *value) {
#ifdef _WIN32
    _putenv_s("FIREBASE_PROJECT_ID", value);
#else
    setenv("FIREBASE_PROJECT_ID", value, 1);
#endif
}

// Wraps the in-memory store and remembers every record ever written, so a test can check that nothing is left
// behind, including in a collection the deletion list might have missed.
class TrackingStore final : public DocumentStore {
  public:
    MemoryStore inner;
    mutable std::set<std::string> written;
    Json get(const std::string &path) const override {
        return inner.get(path);
    }
    Json list(const std::string &collection) const override {
        return inner.list(collection);
    }
    void put(const std::string &path, const Json &value, bool existing = false) const override {
        inner.put(path, value, existing);
        written.insert(path);
    }
    std::string create(const std::string &collection, const Json &value) const override {
        auto id = inner.create(collection, value);
        written.insert("/" + collection + "/" + id);
        return id;
    }
    bool createOnce(const std::string &path, const Json &value) const override {
        bool created = inner.createOnce(path, value);
        if (created)
            written.insert(path);
        return created;
    }
    void remove(const std::string &path) const override {
        inner.remove(path);
    }
    std::string remaining() const {
        std::string left;
        for (const auto &path : written)
            if (!inner.get(path).is_null())
                left += (path.empty() ? std::string("(profile)") : path) + " ";
        return left;
    }
};

using SignInDeleter = std::function<void(const AuthenticatedUser &)>;

AuthenticatedUser signedIn(std::int64_t secondsAgo) {
    AuthenticatedUser user{"alice", "alice@queensu.ca", "Alice", "alice-token"};
    user.signedInAt = static_cast<std::int64_t>(std::time(nullptr)) - secondsAgo;
    return user;
}

Json call(const DocumentStore &store, const AuthenticatedUser &user, const std::string &method,
          const std::string &path, const Json &data = nullptr, SignInDeleter deleter = nullptr) {
    httplib::Request request;
    request.method = method;
    request.path = path;
    request.body = data.dump();
    return ApiController(store, user, Date("2026-11-08"), std::move(deleter)).handle(request);
}

// Creates records of every kind through the real API routes.
void addEverything(const TrackingStore &store) {
    auto user = signedIn(0);
    auto api = [&](const std::string &method, const std::string &path, const Json &data = nullptr) {
        return call(store, user, method, path, data);
    };
    auto category = api("POST", "/api/categories", {{"name", "Therapy"}})["id"].get<std::string>();
    api("POST", "/api/transactions",
        {{"date", "2026-11-02"}, {"description", "Session"}, {"categoryId", category}, {"type", "expense"},
         {"amountCents", -6000}});
    api("POST", "/api/transactions",
        {{"date", "2026-11-05"}, {"description", "Paycheque"}, {"categoryId", "income"}, {"type", "income"},
         {"amountCents", 45000}});
    api("PUT", "/api/budgets", {{"categoryId", "groceries"}, {"period", "monthly"}, {"amountCents", 30000}});
    api("POST", "/api/goals", {{"title", "Winter savings"}, {"kind", "savings"}, {"targetCents", 150000}});
    api("POST", "/api/calendar/events",
        {{"title", "Rent"}, {"kind", "rent"}, {"date", "2026-11-01"}, {"amountCents", 70000}, {"hasReminder", true}});
    auto event = store.list("events")[0]["id"].get<std::string>();
    api("POST", "/api/calendar/pay", {{"source", "event"}, {"sourceId", event}, {"paidDate", "2026-11-01"}});
    api("POST", "/api/recurring",
        {{"description", "Music streaming"}, {"categoryId", "hobbies"}, {"type", "expense"}, {"amountCents", -1199},
         {"startDate", "2026-09-07"}, {"endDate", nullptr}, {"frequency", "monthly"}, {"active", true}});
    api("POST", "/api/recurring/sync");
    api("POST", "/api/bursaries", {{"name", "Entrance bursary"}, {"amountCents", 50000}, {"status", "applied"}});
    api("POST", "/api/fees",
        {{"name", "Athletics fee"}, {"amountCents", 15000}, {"deadline", "2026-12-15"}, {"status", "kept"}});
    api("PUT", "/api/semester",
        {{"startDate", "2026-09-01"}, {"endDate", "2027-01-01"}, {"expectedIncomeCents", 500000},
         {"faculty", "Computing"}, {"studentStatus", "Ontario"}, {"courseCount", 5},
         {"tuitionPerCourseCents", 100000}, {"additionalFeesCents", 0}});
    api("PATCH", "/api/me/preferences", {{"theme", "dark"}});
    api("PUT", "/api/calendar/reminders", {{"emailEnabled", false}, {"leadTime", "3_days"}});
    api("PATCH", "/api/me/notification-preferences/payment_reminders", {{"enabled", false}});
    api("PUT", "/api/me", {{"fullName", "Alice Example"}, {"studentId", "20231234"}});
}
} // namespace

int main() {
    test("Deleting an account removes every record, then the sign-in", [] {
        TrackingStore store;
        addEverything(store);
        for (const auto &collection : AccountService::collections())
            check(!store.list(collection).empty(), collection + " had records to delete");
        check(!store.get("").is_null(), "The profile existed");
        int calls = 0;
        std::string leftWhenSignInDeleted = "(not called)";
        auto result = call(store, signedIn(30), "DELETE", "/api/me", nullptr, [&](const AuthenticatedUser &user) {
            calls++;
            leftWhenSignInDeleted = store.remaining();
            check(user.uid == "alice", "Deletes this user's sign-in");
        });
        check(result.is_null(), "Nothing returned (204)");
        check(store.remaining().empty(), "Nothing left behind: " + store.remaining());
        check(calls == 1 && leftWhenSignInDeleted.empty(), "Sign-in deleted once, only after all data was gone");
    });

    test("A sign-in that isn't recent is refused before anything is deleted", [] {
        TrackingStore store;
        addEverything(store);
        auto before = store.remaining();
        int calls = 0;
        failsWith(403, recentSignInMessage, [&] {
            call(store, signedIn(5 * 60), "DELETE", "/api/me", nullptr, [&](const AuthenticatedUser &) { calls++; });
        }, "Signed in 5 minutes ago");
        check(store.remaining() == before && calls == 0, "Nothing deleted, sign-in kept");
    });

    test("The recent-sign-in window is 4 minutes, and an unknown sign-in time is refused", [] {
        TrackingStore store;
        AccountService accounts(store);
        AuthenticatedUser user{"alice", "alice@queensu.ca", "Alice", "alice-token"};
        user.signedInAt = 1000;
        int calls = 0;
        auto count = [&](const AuthenticatedUser &) { calls++; };
        accounts.deleteAccount(user, count, 1000 + 240);
        check(calls == 1, "Exactly 4 minutes later is allowed");
        failsWith(403, recentSignInMessage, [&] { accounts.deleteAccount(user, count, 1000 + 241); }, "4 minutes 1 second");
        user.signedInAt = 0;
        failsWith(403, recentSignInMessage, [&] { accounts.deleteAccount(user, count, 1000); }, "Unknown sign-in time");
    });

    test("Deleting an account with no data still deletes the sign-in", [] {
        TrackingStore store;
        int calls = 0;
        call(store, signedIn(0), "DELETE", "/api/me", nullptr, [&](const AuthenticatedUser &) { calls++; });
        check(calls == 1, "Sign-in deleted");
    });

    test("If deleting the sign-in fails, trying again finishes the job", [] {
        TrackingStore store;
        addEverything(store);
        failsWith(502, "Firebase could not delete", [&] {
            call(store, signedIn(0), "DELETE", "/api/me", nullptr, [](const AuthenticatedUser &) {
                throw ApiError(502, "Firebase could not delete your sign-in. Try again.");
            });
        }, "First attempt fails at the sign-in");
        check(store.remaining().empty(), "The data was already deleted");
        int calls = 0;
        call(store, signedIn(0), "DELETE", "/api/me", nullptr, [&](const AuthenticatedUser &) { calls++; });
        check(calls == 1, "The retry deletes the sign-in");
    });

    test("A server without sign-in deletion set up refuses and deletes nothing", [] {
        TrackingStore store;
        addEverything(store);
        auto before = store.remaining();
        failsWith(503, "not configured", [&] { call(store, signedIn(0), "DELETE", "/api/me"); }, "No deleter");
        check(store.remaining() == before, "Nothing deleted");
    });

    test("Firestore gets the deletes in batches of 500, for this user only", [] {
        setProject("test-project");
        std::vector<std::string> requests;
        std::vector<Json> bodies;
        bool userToken = true;
        FirestoreClient firestore(signedIn(0), [&](const std::string &host, const std::string &method,
                                                   const std::string &path, const std::string &body,
                                                   const std::string &token) -> HttpResult {
            userToken = userToken && host == "firestore.googleapis.com" && token == "alice-token";
            requests.push_back(method + " " + path);
            bodies.push_back(Json::parse(body));
            return {200, "{}"};
        });
        std::vector<std::string> paths;
        for (int i = 0; i < 501; i++)
            paths.push_back("/transactions/t" + std::to_string(i));
        paths.push_back(""); // the profile document
        firestore.removeAll(paths);
        const std::string commit = "POST /v1/projects/test-project/databases/(default)/documents:commit";
        const std::string alice = "projects/test-project/databases/(default)/documents/users/alice";
        check(requests.size() == 2 && requests[0] == commit && requests[1] == commit && userToken,
              "Two commit requests with the user's own login");
        if (bodies.size() != 2)
            return; // the checks below would read a batch that doesn't exist
        check(bodies[0]["writes"].size() == 500 && bodies[1]["writes"].size() == 2, "500 deletes, then the last 2");
        check(bodies[0]["writes"][0]["delete"] == alice + "/transactions/t0" &&
                  bodies[1]["writes"][0]["delete"] == alice + "/transactions/t500",
              "Full record names under users/alice");
        check(bodies[1]["writes"][1]["delete"] == alice, "The profile document is deleted last");
    });

    test("If Firestore refuses, the message says to publish the rules", [] {
        setProject("test-project");
        FirestoreClient firestore(signedIn(0), [](const std::string &, const std::string &, const std::string &,
                                                  const std::string &, const std::string &) -> HttpResult {
            return {403, R"({"error":{"status":"PERMISSION_DENIED"}})"};
        });
        failsWith(403, "Publish firestore.rules", [&] { firestore.removeAll({"/categories/c1"}); },
                  "Permission denied");
    });

    std::cout << '\n' << checks - failures << '/' << checks << " Account deletion checks passed.\n";
    return failures == 0 ? 0 : 1;
}
