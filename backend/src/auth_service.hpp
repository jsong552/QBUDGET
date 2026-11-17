// Validates bearer tokens with Firebase and returns a trusted identity, never a decoded client UID.
#pragma once
#include "http_transport.hpp"
#include "models.hpp"
namespace qbudget {
class AuthService {
    Transport transport;

  public:
    explicit AuthService(Transport client = https) : transport(std::move(client)) {}
    AuthenticatedUser authenticate(const std::string &header) const {
        if (header.rfind("Bearer ", 0) != 0)
            throw ApiError(401, "Please sign in.");
        auto token = header.substr(7);
        if (token.empty() || token.size() > 16384 || token.find_first_of("\r\n ") != std::string::npos)
            throw ApiError(401, "Invalid login token.");
        auto key = env("FIREBASE_API_KEY", env("VITE_FIREBASE_API_KEY").c_str());
        if (key.empty())
            throw ApiError(503, "Set the Firebase API key for the backend and restart it.");
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
        return {user.at("localId"), user.value("email", ""), user.value("displayName", ""), token};
    }
};
} // namespace qbudget
