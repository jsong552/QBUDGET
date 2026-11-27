/*
 * Description: Function tests for AuthService (Use Case 1: SignIn). Covers rejecting missing or
 *              badly formed login tokens, a missing Firebase key, failed or disabled logins, and
 *              returning the right user for a valid token, including when they last signed in.
 *              Also deleting the Firebase sign-in (account deletion). Firebase is replaced by a
 *              fake transport, so no network is used.
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

// Firebase-style ID tokens (header.payload.signature, base64url without padding). The first says the user signed
// in at 1764060000 (auth_time); the second has no sign-in time.
const std::string tokenSignedInAt1764060000 =
    "eyJhbGciOiJSUzI1NiIsImtpZCI6InRlc3QifQ.eyJhdXRoX3RpbWUiOjE3NjQwNjAwMDAsInVzZXJfaWQiOiJhbGljZSJ9.sig";
const std::string tokenWithoutSignInTime = "eyJhbGciOiJSUzI1NiIsImtpZCI6InRlc3QifQ.eyJ1c2VyX2lkIjoiYWxpY2UifQ.sig";

AuthenticatedUser alice() {
    return {"alice", "alice@queensu.ca", "Alice", "alice-token"};
}
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

    test("Base64url text decodes like Firebase writes it (no padding, - and _)", [] {
        check(decodeBase64Url("aGVsbG8") == "hello", "Plain text without padding");
        check(decodeBase64Url("_-8") == std::string("\xFF\xEF"), "URL-safe characters");
        check(decodeBase64Url("a$b").empty(), "Invalid characters give nothing");
    });

    test("The sign-in time is read from the verified token", [] {
        auto auth = firebaseReplies(200, aliceJson);
        check(auth.authenticate("Bearer " + tokenSignedInAt1764060000).signedInAt == 1764060000, "auth_time read");
        check(auth.authenticate("Bearer " + tokenWithoutSignInTime).signedInAt == 0, "No auth_time: unknown");
        check(auth.authenticate("Bearer good-token").signedInAt == 0, "Not a JWT: unknown");
        check(auth.authenticate("Bearer a.!!!.c").signedInAt == 0, "Garbled payload: unknown");
    });

    test("Deleting the sign-in sends the user's token to Firebase", [] {
        std::string seenHost, seenMethod, seenPath, seenBody;
        AuthService auth([&](const std::string &host, const std::string &method, const std::string &path,
                             const std::string &body, const std::string &) -> HttpResult {
            seenHost = host;
            seenMethod = method;
            seenPath = path;
            seenBody = body;
            return {200, "{}"};
        });
        auth.deleteSignIn(alice());
        check(seenHost == "identitytoolkit.googleapis.com" && seenMethod == "POST", "Asks Firebase");
        check(seenPath.rfind("/v1/accounts:delete?key=test-key", 0) == 0, "Delete endpoint with the API key");
        check(Json::parse(seenBody)["idToken"] == "alice-token", "Sends the user's token");
    });

    test("A sign-in that was already deleted counts as done", [] {
        auto auth = firebaseReplies(400, R"({"error":{"code":400,"message":"USER_NOT_FOUND"}})");
        auth.deleteSignIn(alice()); // no error means a retry after a partial failure can finish
        check(true, "No error");
    });

    test("An old sign-in gets the 'sign in again' message", [] {
        failsWith(403, recentSignInMessage, [] {
            firebaseReplies(400, R"({"error":{"code":400,"message":"CREDENTIAL_TOO_OLD_LOGIN_AGAIN"}})")
                .deleteSignIn(alice());
        }, "Credential too old");
    });

    test("Deleting the sign-in: rejected token, Firebase down, missing key", [] {
        fails(401, [] {
            firebaseReplies(400, R"({"error":{"code":400,"message":"INVALID_ID_TOKEN"}})").deleteSignIn(alice());
        }, "Invalid token gives 401");
        fails(502, [] { firebaseReplies(500, "{}").deleteSignIn(alice()); }, "Firebase down gives 502");
        setKey("");
        fails(503, [] { firebaseReplies(200, "{}").deleteSignIn(alice()); }, "No key gives 503");
        setKey("test-key");
    });

    std::cout << '\n' << checks - failures << '/' << checks << " AuthService checks passed.\n";
    return failures == 0 ? 0 : 1;
}
