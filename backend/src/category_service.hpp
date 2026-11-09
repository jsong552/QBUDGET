// Category catalogue and archival policy. Legacy categories remain readable, not selectable for new entries.
#pragma once
#include "repositories.hpp"
namespace qbudget {
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
    std::string create(std::string name) const {
        require(!name.empty() && name.size() <= 80 && name.find_first_not_of(" \t\r\n") != std::string::npos,
                "Enter a category name.");
        for (const auto &c : list())
            require(c.name != name, "A category with this name already exists.");
        return repository.add(Category{"", std::move(name), true, false});
    }
    void remove(const std::string &id) const {
        auto value = find(id);
        require(value.custom, "Default categories cannot be removed.");
        value.archived = true;
        repository.save(id, value); // preserve references and historical chart labels
    }
};
} // namespace qbudget
