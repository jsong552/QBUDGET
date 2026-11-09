// Persistence interface isolates domain repositories from Firebase and enables deterministic tests.
#pragma once
#include "json.hpp"
#include <string>
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
};
} // namespace qbudget
