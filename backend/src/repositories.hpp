// Typed repositories: domain records enter/leave here; JSON exists only in the adapters.
#pragma once
#include "codecs.hpp"
#include "validation.hpp"
namespace qbudget {
template <typename T> class Repository {
  protected:
    const DocumentStore &store;
    std::string collection;

  public:
    Repository(const DocumentStore &db, std::string name) : store(db), collection(std::move(name)) {}
    std::vector<T> list() const {
        std::vector<T> result;
        for (const auto &row : store.list(collection))
            result.push_back(row.template get<T>());
        return result;
    }
    std::optional<T> find(const std::string &id) const {
        validateId(id);
        auto row = store.get("/" + collection + "/" + id);
        if (row.is_null())
            return std::nullopt;
        row["id"] = id;
        return row.template get<T>();
    }
    std::string add(const T &value) const {
        validateRecord(value);
        Json row = value;
        row.erase("id");
        return store.create(collection, row);
    }
    void save(const std::string &id, const T &value, bool existing = true) const {
        validateId(id);
        validateRecord(value);
        Json row = value;
        row.erase("id");
        store.put("/" + collection + "/" + id, row, existing);
    }
    bool addOnce(const std::string &id, const T &value) const {
        validateId(id);
        validateRecord(value);
        Json row = value;
        row.erase("id");
        return store.createOnce("/" + collection + "/" + id, row);
    }
    void remove(const std::string &id) const {
        validateId(id);
        store.remove("/" + collection + "/" + id);
    }
};
class TransactionRepository : public Repository<Transaction> {
  public:
    explicit TransactionRepository(const DocumentStore &db) : Repository(db, "transactions") {}
};
class CategoryRepository : public Repository<Category> {
  public:
    explicit CategoryRepository(const DocumentStore &db) : Repository(db, "categories") {}
};
class BudgetRepository : public Repository<CategoryBudget> {
  public:
    explicit BudgetRepository(const DocumentStore &db) : Repository(db, "budgets") {}
};
class GoalRepository : public Repository<SavingsGoal> {
  public:
    explicit GoalRepository(const DocumentStore &db) : Repository(db, "goals") {}
};
class EventRepository : public Repository<CalendarEvent> {
  public:
    explicit EventRepository(const DocumentStore &db) : Repository(db, "events") {}
};
class RecurringRepository : public Repository<RecurringEntry> {
  public:
    explicit RecurringRepository(const DocumentStore &db) : Repository(db, "recurring") {}
};
class BursaryRepository : public Repository<Bursary> {
  public:
    explicit BursaryRepository(const DocumentStore &db) : Repository(db, "bursaries") {}
};
class FeeRepository : public Repository<StudentFee> {
  public:
    explicit FeeRepository(const DocumentStore &db) : Repository(db, "fees") {}
};
class ProfileRepository {
    const DocumentStore &store;

  public:
    explicit ProfileRepository(const DocumentStore &db) : store(db) {}
    std::optional<UserProfile> find() const {
        auto row = store.get("");
        return row.is_null() ? std::nullopt : std::optional<UserProfile>(row.get<UserProfile>());
    }
    void save(const UserProfile &profile) const {
        store.put("", profile);
    }
};
class SettingsRepository {
    const DocumentStore &store;

  public:
    explicit SettingsRepository(const DocumentStore &db) : store(db) {}
    template <typename T> T load(const std::string &name, const T &defaults = T{}) const {
        auto row = store.get("/settings/" + name);
        return row.is_null() ? defaults : row.get<T>();
    }
    template <typename T> void save(const std::string &name, const T &value) const {
        store.put("/settings/" + name, Json(value));
    }
};
} // namespace qbudget
