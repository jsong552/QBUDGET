// Deterministic in-memory test double. One store instance represents one authenticated account.
#pragma once
#include "../src/document_store.hpp"
#include "../src/errors.hpp"
#include <map>
namespace qbudget {
class MemoryStore final : public DocumentStore {
    mutable std::map<std::string, Json> records;
    mutable int sequence = 0;

  public:
    mutable int listCalls = 0;
    Json get(const std::string &path) const override {
        auto found = records.find(path);
        return found == records.end() ? Json(nullptr) : found->second;
    }
    Json list(const std::string &collection) const override {
        listCalls++;
        Json result = Json::array();
        auto prefix = "/" + collection + "/";
        for (const auto &[path, data] : records)
            if (path.rfind(prefix, 0) == 0) {
                auto row = data;
                row["id"] = path.substr(prefix.size());
                result.push_back(row);
            }
        return result;
    }
    void put(const std::string &path, const Json &value, bool existing = false) const override {
        if (existing && !records.count(path))
            throw ApiError(404, "Record not found.");
        if (!records.count(path))
            records[path] = Json::object();
        records[path].update(value);
    }
    std::string create(const std::string &collection, const Json &value) const override {
        auto id = "test_" + std::to_string(++sequence);
        put("/" + collection + "/" + id, value);
        return id;
    }
    bool createOnce(const std::string &path, const Json &value) const override {
        if (records.count(path))
            return false;
        put(path, value);
        return true;
    }
    void remove(const std::string &path) const override {
        records.erase(path);
    }
};
} // namespace qbudget
