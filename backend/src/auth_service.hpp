// Validates bearer tokens with Firebase and returns a trusted identity, never a decoded client UID.
#pragma once
#include "http_transport.hpp"
#include "models.hpp"
namespace qbudget {
/** Decodes base64url text (as used in JWTs); returns "" if it isn't valid base64url. */
inline std::string decodeBase64Url(const std::string &text) {
    std::string out;
    int buffer = 0, bits = 0;
    for (char c : text) {
        int value;
        if (c >= 'A' && c <= 'Z')
            value = c - 'A';
        else if (c >= 'a' && c <= 'z')
            value = c - 'a' + 26;
        else if (c >= '0' && c <= '9')
            value = c - '0' + 52;
        else if (c == '-' || c == '+')
            value = 62;
        else if (c == '_' || c == '/')
            value = 63;
        else if (c == '=')
            break;
        else
            return "";
        buffer = (buffer << 6) | value;
        bits += 6;
        if (bits >= 8) {
            bits -= 8;
            out += static_cast<char>((buffer >> bits) & 0xFF);
            buffer &= (1 << bits) - 1;
        }
    }
    return out;
}
/**
 * When the user last actually signed in: the `auth_time` claim of their ID token (Unix seconds), or 0 if unknown.
 * Only call this for a token Firebase has just verified; the claim is read, not re-verified.
 */
inline std::int64_t tokenSignInTime(const std::string &token) {
    auto first = token.find('.');
    auto second = first == std::string::npos ? first : token.find('.', first + 1);
    if (second == std::string::npos)
        return 0;
    auto payload = Json::parse(decodeBase64Url(token.substr(first + 1, second - first - 1)), nullptr, false);
    if (!payload.is_object() || !payload.contains("auth_time") || !payload["auth_time"].is_number_integer())
        return 0;
    return payload["auth_time"].get<std::int64_t>();
}
class AuthService {
    Transport transport;

    static std::string apiKey() {
        auto key = env("FIREBASE_API_KEY", env("VITE_FIREBASE_API_KEY").c_str());
        if (key.empty())
            throw ApiError(503, "Set the Firebase API key for the backend and restart it.");
        return key;
    }

  public:
    explicit AuthService(Transport client = https) : transport(std::move(client)) {}
    AuthenticatedUser authenticate(const std::string &header) const {
        if (header.rfind("Bearer ", 0) != 0)
            throw ApiError(401, "Please sign in.");
        auto token = header.substr(7);
        if (token.empty() || token.size() > 16384 || token.find_first_of("\r\n ") != std::string::npos)
            throw ApiError(401, "Invalid login token.");
        auto key = apiKey();
        auto response =
            transport("identitytoolkit.googleapis.com", "POST", "/v1/accounts:lookup?key=" + encode(key),
                      Json{{"idToken", token}}.dump(), "");
        if (response.status == 400 || response.status == 401)
            throw ApiError(401, "Your login could not be verified. Sign in again.");
        if (response.status != 200)
            throw ApiError(
                502, "Firebase authentication is unavailable. Check the backend Firebase configuration.");
        auto data = parseResponse(response);
        if (!data.contains("users") || data["users"].size() != 1)
            throw ApiError(401, "Invalid login.");
        auto user = data["users"][0];
        if (user.value("disabled", false))
            throw ApiError(401, "This account is disabled.");
        AuthenticatedUser identity{user.at("localId"), user.value("email", ""), user.value("displayName", ""), token};
        identity.signedInAt = tokenSignInTime(token);
        return identity;
    }
    /** Deletes the user's Firebase sign-in. Firebase only allows this soon after a real sign-in. */
    void deleteSignIn(const AuthenticatedUser &user) const {
        auto key = apiKey();
        auto response = transport("identitytoolkit.googleapis.com", "POST", "/v1/accounts:delete?key=" + encode(key),
                                  Json{{"idToken", user.token}}.dump(), "");
        if (response.status == 200)
            return;
        if (response.body.find("USER_NOT_FOUND") != std::string::npos)
            return; // already gone, e.g. deleted by an earlier attempt
        if (response.body.find("CREDENTIAL_TOO_OLD_LOGIN_AGAIN") != std::string::npos)
            throw ApiError(403, recentSignInMessage);
        if (response.status == 400 || response.status == 401)
            throw ApiError(401, "Your login could not be verified. Sign in again.");
        throw ApiError(502, "Firebase could not delete your sign-in. Try again.");
    }
};
} // namespace qbudget
