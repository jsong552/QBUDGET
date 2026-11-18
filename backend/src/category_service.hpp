// Category catalogue and archival policy. Legacy categories remain readable, not selectable for new entries.
#pragma once
#include "repositories.hpp"
#include <cctype>
namespace qbudget {
inline std::string trimName(const std::string &value) {
    auto first = value.find_first_not_of(" \t\r\n");
    if (first == std::string::npos)
        return "";
    return value.substr(first, value.find_last_not_of(" \t\r\n") - first + 1);
}
// Category names compare trimmed and case-insensitively, so "Books", " books" and "BOOKS" are one category.
inline std::string nameKey(const std::string &value) {
    auto key = trimName(value);
    for (char &c : key)
        c = static_cast<char>(std::tolower(static_cast<unsigned char>(c)));
    return key;
}
class CategoryService {
    CategoryRepository &repository;

  public:
    explicit CategoryService(CategoryRepository &repo) : repository(repo) {}
    std::vector<Category> list(bool includeArchived = false) const {
        std::vector<Category> result = {{"groceries", "Groceries"},
                                        {"rent", "Rent"},
                                        {"tuition", "Tuition"},
                                        {"personal_hygiene", "Personal Hygiene"},
                                        {"hobbies", "Hobbies"},
                                        {"other", "Other"},
                                        {"income", "Income"},
                                        {"food", "Food", false, true},
                                        {"dining", "Dining", false, true},
                                        {"housing", "Housing", false, true},
                                        {"school", "School", false, true},
                                        {"transportation", "Transportation", false, true},
                                        {"utilities", "Utilities", false, true}};
        for (auto item : repository.list()) {
            // Custom documents cannot shadow built-in IDs, even when written directly to Firestore.
            auto same = std::find_if(result.begin(), result.end(),
                                     [&](const Category &c) { return c.id == item.id; });
            if (same == result.end())
                result.push_back(item);
        }
        if (!includeArchived)
            result.erase(
                std::remove_if(result.begin(), result.end(), [](const Category &c) { return c.archived; }),
                result.end());
        return result;
    }
    Category find(const std::string &id) const {
        for (auto item : list(true))
            if (item.id == id)
                return item;
        throw ApiError(400, "Unknown category. Choose an existing category.");
    }
    void requireActive(const std::string &id) const {
        require(!find(id).archived, "This category was removed. Choose an active category.");
    }
    std::string create(const std::string &name) const {
        auto trimmed = trimName(name);
        require(!trimmed.empty() && trimmed.size() <= 80, "Enter a category name.");
        auto key = nameKey(trimmed);
        auto all = list(true);
        // Archived names stay free: legacy built-ins can be recreated as custom categories.
        for (const auto &c : all)
            require(c.archived || nameKey(c.name) != key, "A category with this name already exists.");
        // Reusing an archived custom name restores that category, reconnecting its transactions and budgets.
        for (auto c : all)
            if (c.custom && c.archived && nameKey(c.name) == key) {
                c.archived = false;
                c.name = trimmed;
                repository.save(c.id, c);
                return c.id;
            }
        return repository.add(Category{"", trimmed, true, false});
    }
    void remove(const std::string &id) const {
        auto all = list(true);
        auto found = std::find_if(all.begin(), all.end(), [&](const Category &c) { return c.id == id; });
        if (found == all.end())
            throw ApiError(404, "Category not found.");
        require(found->custom, "Default categories cannot be removed.");
        if (found->archived)
            return;
        found->archived = true;
        repository.save(id, *found); // preserve references and historical chart labels
    }
};
} // namespace qbudget
