// Firebase-specific REST document encoding, pagination and account-scoped persistence.
#pragma once
#include "http_transport.hpp"
#include "document_store.hpp"
#include "models.hpp"
namespace qbudget {
inline Json toValue(const Json &value) {
    if (value.is_null())
        return {{"nullValue", nullptr}};
    if (value.is_boolean())
        return {{"booleanValue", value}};
    if (value.is_number_integer())
        return {{"integerValue", std::to_string(value.get<int64_t>())}};
    if (value.is_string())
        return {{"stringValue", value}};
    if (value.is_array()) {
        Json items = Json::array();
        for (const auto &item : value)
            items.push_back(toValue(item));
        return {{"arrayValue", {{"values", items}}}};
    }
    if (value.is_object()) {
        Json fields = Json::object();
        for (auto it = value.begin(); it != value.end(); ++it)
            fields[it.key()] = toValue(it.value());
        return {{"mapValue", {{"fields", fields}}}};
    }
    throw ApiError(400, "Only integer numbers are supported.");
}
inline Json fromValue(const Json &value) {
    if (value.contains("nullValue"))
        return nullptr;
    if (value.contains("booleanValue"))
        return value["booleanValue"];
    if (value.contains("integerValue"))
        return std::stoll(value["integerValue"].get<std::string>());
    if (value.contains("stringValue"))
        return value["stringValue"];
    if (value.contains("arrayValue")) {
        Json items = Json::array();
        for (auto &v : value["arrayValue"].value("values", Json::array()))
            items.push_back(fromValue(v));
        return items;
    }
    if (value.contains("mapValue")) {
        Json result = Json::object();
        auto fields = value["mapValue"].value("fields", Json::object());
        for (auto it = fields.begin(); it != fields.end(); ++it)
            result[it.key()] = fromValue(it.value());
        return result;
    }
    throw ApiError(502, "Unsupported stored field type.");
}
inline Json document(const Json &data) {
    Json out = Json::object();
    auto fields = data.value("fields", Json::object());
    for (auto it = fields.begin(); it != fields.end(); ++it)
        out[it.key()] = fromValue(it.value());
    return out;
}
class FirestoreClient final : public DocumentStore {
    AuthenticatedUser identity;
    Transport transport;
    std::string base;
    Json request(const std::string &method, const std::string &path, const Json &body = nullptr,
                 bool missing = false) const {
        auto response = transport("firestore.googleapis.com", method, base + path,
                                  body.is_null() ? "" : body.dump(), identity.token);
        if (response.status == 404 && missing)
            return nullptr;
        if (response.status == 401)
            throw ApiError(401, "Your session expired. Sign in again.");
        if (response.status == 403)
            throw ApiError(403,
                           "Firestore denied access. Publish firestore.rules for this Firebase project.");
        if (response.status == 404)
            throw ApiError(404, "Record or Firestore database not found.");
        if (response.status == 400 && response.body.find("FAILED_PRECONDITION") != std::string::npos)
            throw ApiError(409, "This record already exists or changed.");
        if (response.status == 409 || response.status == 412)
            throw ApiError(409, "This record changed or no longer exists. Reload and try again.");
        if (response.status < 200 || response.status >= 300)
            throw ApiError(502,
                           "Firestore request failed. Check that the default Firestore database exists.");
        return response.body.empty() ? Json::object() : parseResponse(response);
    }

  public:
    explicit FirestoreClient(AuthenticatedUser user, Transport client = https)
        : identity(std::move(user)), transport(std::move(client)) {
        auto project = env("FIREBASE_PROJECT_ID", env("VITE_FIREBASE_PROJECT_ID").c_str());
        if (project.empty())
            throw ApiError(503, "Set the Firebase project ID for the backend.");
        base = "/v1/projects/" + encode(project) + "/databases/(default)/documents/users/" +
               encode(identity.uid);
    }
    Json get(const std::string &path) const {
        auto data = request("GET", path, nullptr, true);
        return data.is_null() ? data : document(data);
    }
    Json list(const std::string &collection) const {
        Json out = Json::array();
        std::string page;
        do {
            auto data = request("GET", "/" + collection + "?pageSize=300" +
                                           (page.empty() ? "" : "&pageToken=" + encode(page)));
            for (auto &d : data.value("documents", Json::array())) {
                auto value = document(d);
                auto name = d.at("name").get<std::string>();
                value["id"] = name.substr(name.rfind('/') + 1);
                out.push_back(value);
            }
            if (out.size() > 10000)
                throw ApiError(413, "Too many records for this version of QBudget.");
            page = data.value("nextPageToken", "");
        } while (!page.empty());
        return out;
    }
    void put(const std::string &path, const Json &value, bool existing = false) const {
        std::string query = existing ? "?currentDocument.exists=true" : "?";
        for (auto it = value.begin(); it != value.end(); ++it)
            query += "&updateMask.fieldPaths=" + encode(it.key());
        request("PATCH", path + query, {{"fields", toValue(value)["mapValue"]["fields"]}});
    }
    std::string create(const std::string &collection, const Json &value) const override {
        auto result = request("POST", "/" + collection, {{"fields", toValue(value)["mapValue"]["fields"]}});
        auto name = result.at("name").get<std::string>();
        return name.substr(name.rfind('/') + 1);
    }
    bool createOnce(const std::string &path, const Json &value) const override {
        try {
            request("PATCH", path + "?currentDocument.exists=false",
                    {{"fields", toValue(value)["mapValue"]["fields"]}});
            return true;
        } catch (const ApiError &error) {
            if (error.status == 409)
                return false;
            throw;
        }
    }
    void remove(const std::string &path) const {
        request("DELETE", path);
    }
};
} // namespace qbudget
