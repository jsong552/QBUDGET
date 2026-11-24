/*
 * Description: Function tests for AuthService (Use Case 1: SignIn). Covers rejecting missing or
 *              badly formed login tokens, a missing Firebase key, failed or disabled logins, and
 *              returning the right user for a valid token. Firebase is replaced by a fake
 *              transport, so no network is used.
 */
#include "../backend/src/auth_service.hpp"
#include <cstdlib>
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

void setKey(const char *value) {
#ifdef _WIN32
    _putenv_s("FIREBASE_API_KEY", value);
    _putenv_s("VITE_FIREBASE_API_KEY", "");
#else
    if (*value)
        setenv("FIREBASE_API_KEY", value, 1);
    else
        unsetenv("FIREBASE_API_KEY");
    unsetenv("VITE_FIREBASE_API_KEY");
#endif
}

// Fake Firebase that always answers with the given status and body.
AuthService firebaseReplies(int status, const std::string &body) {
    return AuthService([status, body](const std::string &, const std::string &, const std::string &,
                                      const std::string &, const std::string &) -> HttpResult {
        return {status, body};
    });
}

const std::string aliceJson = R"({"users":[{"localId":"alice","email":"alice@queensu.ca","displayName":"Alice"}]})";
} // namespace

int main() {
    setKey("test-key");

    test("Requests without a Bearer token are rejected", [] {
        auto auth = firebaseReplies(200, aliceJson);
        fails(401, [&] { auth.authenticate(""); }, "No header");
        fails(401, [&] { auth.authenticate("Basic abc123"); }, "Wrong scheme");
        fails(401, [&] { auth.authenticate("bearer abc123"); }, "Lowercase bearer");
    });

    test("Empty or badly formed tokens are rejected", [] {
        auto auth = firebaseReplies(200, aliceJson);
        fails(401, [&] { auth.authenticate("Bearer "); }, "Empty token");
        fails(401, [&] { auth.authenticate("Bearer abc def"); }, "Token with a space");
        fails(401, [&] { auth.authenticate("Bearer abc\ndef"); }, "Token with a newline");
        fails(401, [&] { auth.authenticate("Bearer " + std::string(16385, 'a')); }, "Token too long");
    });

    test("Missing Firebase API key gives a 503", [] {
        setKey("");
        fails(503, [] { firebaseReplies(200, aliceJson).authenticate("Bearer valid"); }, "No key set");
        setKey("test-key");
    });

    test("A valid token returns the Firebase user", [] {
        std::string seenHost, seenMethod, seenPath, seenBody;
        AuthService auth([&](const std::string &host, const std::string &method, const std::string &path,
                             const std::string &body, const std::string &) -> HttpResult {
            seenHost = host;
            seenMethod = method;
            seenPath = path;
            seenBody = body;
            return {200, aliceJson};
        });
        auto user = auth.authenticate("Bearer good-token");
        check(user.uid == "alice" && user.email == "alice@queensu.ca", "User ID and email");
        check(user.name == "Alice" && user.token == "good-token", "Name and token");
        check(seenHost == "identitytoolkit.googleapis.com" && seenMethod == "POST", "Asks Firebase");
        check(seenPath.find("key=test-key") != std::string::npos, "Sends the API key");
        check(Json::parse(seenBody)["idToken"] == "good-token", "Sends the token");
    });

    test("Expired or rejected tokens give a 401", [] {
        fails(401, [] { firebaseReplies(400, "{}").authenticate("Bearer expired"); }, "Firebase says 400");
        fails(401, [] { firebaseReplies(401, "{}").authenticate("Bearer expired"); }, "Firebase says 401");
    });

    test("Firebase being down gives a 502", [] {
        fails(502, [] { firebaseReplies(500, "{}").authenticate("Bearer valid"); }, "Firebase says 500");
    });

    test("No user or a disabled account is rejected", [] {
        fails(401, [] { firebaseReplies(200, R"({"users":[]})").authenticate("Bearer valid"); }, "No users");
        fails(401, [] { firebaseReplies(200, "{}").authenticate("Bearer valid"); }, "Missing users list");
        fails(401, [] {
            firebaseReplies(200, R"({"users":[{"localId":"bob","disabled":true}]})").authenticate("Bearer valid");
        }, "Disabled account");
    });

    std::cout << '\n' << checks - failures << '/' << checks << " AuthService checks passed.\n";
    return failures == 0 ? 0 : 1;
}
