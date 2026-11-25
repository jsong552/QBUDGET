// Persistence interface isolates domain repositories from Firebase and enables deterministic tests.
#pragma once
#include "json.hpp"
#include <string>
#include <vector>
namespace qbudget {
using Json = nlohmann::json;
class DocumentStore {
  public:
    virtual ~DocumentStore() = default;
    virtual Json get(const std::string &path) const = 0;
    virtual Json list(const std::string &collection) const = 0;
    virtual void put(const std::string &path, const Json &value, bool existing = false) const = 0;
    virtual std::string create(const std::string &collection, const Json &value) const = 0;
    virtual bool createOnce(const std::string &path, const Json &value) const = 0;
    virtual void remove(const std::string &path) const = 0;
    /** Deletes several records. Stores that can batch deletes override this; by default they go one at a time. */
    virtual void removeAll(const std::vector<std::string> &paths) const {
        for (const auto &path : paths)
            remove(path);
    }
};
} // namespace qbudget
