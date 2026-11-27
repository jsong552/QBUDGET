// Permanently deletes the signed-in student's account: every QBudget record, then their Firebase sign-in.
#pragma once
#include "repositories.hpp"
#include <ctime>
#include <functional>
namespace qbudget {
class AccountService {
    const DocumentStore &store;

  public:
    /**
     * Every collection under users/{uid}, in deletion order. ADD ANY NEW PER-USER COLLECTION HERE, or deleting an
     * account leaves its records behind (Firestore can't list a user's collections from a normal sign-in).
     * Categories go first: if the published Firestore rules don't allow deleting them yet, the first batch fails
     * and nothing at all is deleted. Recurring schedules go next, so no transactions are generated part-way through.
     */
    static const std::vector<std::string> &collections() {
        static const std::vector<std::string> names = {"categories", "recurring", "transactions",
                                                       "budgets",    "goals",     "events",
                                                       "bursaries",  "fees",      "settings"};
        return names;
    }
    /** How recent the last real sign-in must be. Firebase refuses to delete a sign-in that isn't (about 5 minutes). */
    static constexpr std::int64_t recentSignInSeconds = 4 * 60;

    explicit AccountService(const DocumentStore &db) : store(db) {}

    /**
     * Checks for a recent sign-in first, so nothing is deleted if Firebase would refuse to delete the sign-in.
     * Then deletes all records and the profile, and finally the sign-in. Safe to retry after a failure part-way.
     */
    void deleteAccount(const AuthenticatedUser &user, const std::function<void(const AuthenticatedUser &)> &deleteSignIn,
                       std::time_t now = std::time(nullptr)) const {
        if (user.signedInAt <= 0 || now - user.signedInAt > recentSignInSeconds)
            throw ApiError(403, recentSignInMessage);
        std::vector<std::string> paths;
        for (const auto &collection : collections())
            for (const auto &row : store.list(collection))
                paths.push_back("/" + collection + "/" + row.at("id").get<std::string>());
        paths.push_back(""); // the profile document itself
        store.removeAll(paths);
        deleteSignIn(user);
    }
};
} // namespace qbudget
