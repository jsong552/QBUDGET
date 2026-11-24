/*
 * Description: Function tests for CategoryService (FR-5, FR-6). Covers the default categories,
 *              adding custom categories, name rules, removing (archiving) categories and looking
 *              categories up. Uses the in-memory test store.
 */
#include "../backend/src/category_service.hpp"
#include "../backend/tests/memory_store.hpp"
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

bool listed(const std::vector<Category> &list, const std::string &id) {
    for (const auto &item : list)
        if (item.id == id)
            return true;
    return false;
}

struct Setup {
    MemoryStore store;
    CategoryRepository repo{store};
    CategoryService service{repo};
};
} // namespace

int main() {
    test("Default categories from the RD are available (FR-5)", [] {
        Setup s;
        auto list = s.service.list();
        check(list.size() == 7, "6 RD categories plus Income");
        for (const char *id : {"groceries", "rent", "tuition", "personal_hygiene", "hobbies", "other", "income"})
            check(listed(list, id), std::string("Has ") + id);
        check(s.service.find("personal_hygiene").name == "Personal Hygiene", "Display name");
    });

    test("Old retired categories only show when asked for", [] {
        Setup s;
        check(!listed(s.service.list(), "food"), "Hidden by default");
        auto all = s.service.list(true);
        check(all.size() == 13 && listed(all, "food"), "Shown with includeArchived");
        check(s.service.find("food").archived, "Marked as archived");
    });

    test("Add a custom category (FR-6)", [] {
        Setup s;
        auto id = s.service.create("Coffee");
        auto coffee = s.service.find(id);
        check(coffee.name == "Coffee" && coffee.custom && !coffee.archived, "Saved as an active custom category");
        check(s.service.list().size() == 8, "Shows up in the list");
    });

    test("Custom category names are checked", [] {
        Setup s;
        s.service.create("Coffee");
        fails(400, [&] { s.service.create("Coffee"); }, "Duplicate name");
        fails(400, [&] { s.service.create("Groceries"); }, "Same name as a default");
        fails(400, [&] { s.service.create(""); }, "Empty name");
        fails(400, [&] { s.service.create("   "); }, "Spaces only");
        fails(400, [&] { s.service.create(std::string(81, 'x')); }, "Over 80 characters");
        check(!s.service.create(std::string(80, 'x')).empty(), "Exactly 80 characters is fine");
    });

    test("Removing a custom category archives it instead of deleting it (FR-6)", [] {
        Setup s;
        auto id = s.service.create("Coffee");
        s.service.remove(id);
        check(!listed(s.service.list(), id), "No longer in the normal list");
        check(s.service.find(id).archived, "Still found (old entries keep their label)");
        fails(400, [&] { s.service.requireActive(id); }, "Can't be used for new entries");
    });

    test("Default categories can't be removed", [] {
        Setup s;
        fails(400, [&] { s.service.remove("groceries"); }, "Removing Groceries");
        check(listed(s.service.list(), "groceries"), "Groceries still there");
    });

    test("Looking up categories", [] {
        Setup s;
        fails(400, [&] { s.service.find("spaceships"); }, "Unknown category");
        s.service.requireActive("rent");
        check(true, "Active default passes requireActive");
        fails(400, [&] { s.service.requireActive("food"); }, "Archived default fails requireActive");
    });

    test("A saved document can't replace a built-in category", [] {
        Setup s;
        s.repo.save("groceries", Category{"groceries", "Hacked", true, false}, false);
        check(s.service.find("groceries").name == "Groceries", "Built-in name wins");
        check(s.service.list().size() == 7, "No duplicate entry");
    });

    std::cout << '\n' << checks - failures << '/' << checks << " CategoryService checks passed.\n";
    return failures == 0 ? 0 : 1;
}
