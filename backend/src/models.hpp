#pragma once

#include <cstdint>
#include <optional>
#include <string>

namespace qbudget {

// See docs/data-model.md for storage, JSON, and validation conventions.
// These are data containers; they do not validate untrusted requests.
using MoneyCents = std::int64_t;
using IsoDate = std::string; // Calendar date in YYYY-MM-DD form.

// Keep API amounts within JavaScript's exact integer range.
inline constexpr MoneyCents maxApiMoneyCents = 9007199254740991LL;

// Stored at users/{uid}. uid comes from a verified Firebase ID token.
// Passwords and tokens belong to Firebase Auth, never to this profile.
struct UserProfile {
    std::string id;
    std::string fullName;
    std::optional<std::string> studentId;
};

// Editable profile fields; clients cannot select the profile's owner.
struct ProfileInput {
    std::string fullName;
    std::optional<std::string> studentId;
};

// API response matching the frontend User interface. Email comes from
// Firebase Auth; firstName and initials are presentation fields.
struct User {
    std::string id;
    std::string fullName;
    std::string firstName;
    std::string initials;
    std::string email;
    std::optional<std::string> studentId;
};

struct Category {
    std::string id;
    std::string name;
};

// JSON must use "income" / "expense", not the enum's numeric value.
enum class TransactionType { Income, Expense };

// POST/PUT request fields. No id or ownerUid may be supplied by the client.
struct TransactionInput {
    IsoDate date;
    std::string description;
    std::string categoryId;
    TransactionType type = TransactionType::Expense;
    MoneyCents amountCents = 0; // Negative expense; positive income. Zero invalid.
};

// Stored at users/{ownerUid}/transactions/{id}. IDs are taken from the
// document path when reading and assigned by the server when creating.
struct TransactionRecord {
    std::string id;
    std::string ownerUid;
    IsoDate date;
    std::string description;
    std::string categoryId;
    TransactionType type = TransactionType::Expense;
    MoneyCents amountCents = 0;
};

// API response matching the frontend Transaction interface. The service
// resolves categoryId into Category; ownership stays inside the backend.
struct Transaction {
    std::string id;
    IsoDate date;
    std::string description;
    Category category;
    TransactionType type = TransactionType::Expense;
    MoneyCents amountCents = 0;
};

} // namespace qbudget
