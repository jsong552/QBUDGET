// Shared application errors and invariant checks; translated to HTTP at the API boundary.
#pragma once
#include <stdexcept>
#include <string>
namespace qbudget {
struct ApiError : std::runtime_error {
    int status;
    ApiError(int code, const std::string &message) : std::runtime_error(message), status(code) {}
};
inline void require(bool condition, const std::string &message) {
    if (!condition)
        throw ApiError(400, message);
}
} // namespace qbudget
