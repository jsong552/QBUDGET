#pragma once
#include "json.hpp"
#include <string>
#include <stdexcept>
#include <cstdlib>
#include <memory>
#include <functional>
#ifdef _WIN32
#include <windows.h>
#include <winhttp.h>
#else
#include <curl/curl.h>
#endif

namespace qbudget {
using Json = nlohmann::json;
struct ApiError : std::runtime_error {
    int status;
    ApiError(int code, const std::string& message) : std::runtime_error(message), status(code) {}
};
inline std::string env(const char* name, const char* fallback = "") {
    auto value = std::getenv(name); return value ? value : fallback;
}
inline std::string encode(const std::string& text) {
    const char* hex = "0123456789ABCDEF"; std::string out;
    for (unsigned char c : text) {
        if ((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') || c == '-' || c == '_' || c == '~') out += c;
        else { out += '%'; out += hex[c >> 4]; out += hex[c & 15]; }
    }
    return out;
}
struct HttpResult { int status; std::string body; };
#ifdef _WIN32
struct InternetHandle {
    HINTERNET value;
    explicit InternetHandle(HINTERNET v) : value(v) { if (!v) throw ApiError(502, "Could not connect to Firebase."); }
    ~InternetHandle() { WinHttpCloseHandle(value); }
};
inline std::wstring wide(const std::string& value) { return std::wstring(value.begin(), value.end()); }
inline HttpResult https(const std::string& host, const std::string& method, const std::string& path, const std::string& body, const std::string& token = "") {
    InternetHandle session(WinHttpOpen(L"QBudget/1.0", WINHTTP_ACCESS_TYPE_DEFAULT_PROXY, WINHTTP_NO_PROXY_NAME, WINHTTP_NO_PROXY_BYPASS, 0));
    WinHttpSetTimeouts(session.value, 10000, 10000, 10000, 20000);
    InternetHandle connection(WinHttpConnect(session.value, wide(host).c_str(), INTERNET_DEFAULT_HTTPS_PORT, 0));
    InternetHandle request(WinHttpOpenRequest(connection.value, wide(method).c_str(), wide(path).c_str(), nullptr, WINHTTP_NO_REFERER, WINHTTP_DEFAULT_ACCEPT_TYPES, WINHTTP_FLAG_SECURE));
    std::wstring headers = L"Content-Type: application/json\r\n";
    if (!token.empty()) headers += L"Authorization: Bearer " + wide(token) + L"\r\n";
    if (!WinHttpSendRequest(request.value, headers.c_str(), static_cast<DWORD>(headers.size()), body.empty() ? WINHTTP_NO_REQUEST_DATA : const_cast<char*>(body.data()), static_cast<DWORD>(body.size()), static_cast<DWORD>(body.size()), 0) || !WinHttpReceiveResponse(request.value, nullptr))
        throw ApiError(502, "Firebase could not be reached. Try again.");
    DWORD status = 0, size = sizeof(status);
    WinHttpQueryHeaders(request.value, WINHTTP_QUERY_STATUS_CODE | WINHTTP_QUERY_FLAG_NUMBER, WINHTTP_HEADER_NAME_BY_INDEX, &status, &size, WINHTTP_NO_HEADER_INDEX);
    std::string output; char buffer[8192]; DWORD count;
    while (true) {
        if (!WinHttpReadData(request.value, buffer, sizeof(buffer), &count)) throw ApiError(502, "Firebase response was interrupted.");
        if (!count) break;
        output.append(buffer, count);
        if (output.size() > 16 * 1024 * 1024) throw ApiError(502, "Firebase response is too large.");
    }
    return {static_cast<int>(status), output};
}
#else
inline size_t receive(char* data, size_t size, size_t count, void* target) {
    auto& text = *static_cast<std::string*>(target); auto length = size * count;
    if (text.size() + length > 16 * 1024 * 1024) return 0;
    text.append(data, length); return length;
}
inline HttpResult https(const std::string& host, const std::string& method, const std::string& path, const std::string& body, const std::string& token = "") {
    static const int initialized = curl_global_init(CURL_GLOBAL_DEFAULT);
    if (initialized != CURLE_OK) throw ApiError(502, "HTTPS initialization failed.");
    std::unique_ptr<CURL, decltype(&curl_easy_cleanup)> curl(curl_easy_init(), curl_easy_cleanup);
    if (!curl) throw ApiError(502, "HTTPS initialization failed.");
    curl_slist* raw = curl_slist_append(nullptr, "Content-Type: application/json");
    if (!token.empty()) raw = curl_slist_append(raw, ("Authorization: Bearer " + token).c_str());
    std::unique_ptr<curl_slist, decltype(&curl_slist_free_all)> headers(raw, curl_slist_free_all);
    const auto url = "https://" + host + path; std::string output;
    curl_easy_setopt(curl.get(), CURLOPT_URL, url.c_str());
    curl_easy_setopt(curl.get(), CURLOPT_CUSTOMREQUEST, method.c_str());
    curl_easy_setopt(curl.get(), CURLOPT_HTTPHEADER, headers.get());
    curl_easy_setopt(curl.get(), CURLOPT_POSTFIELDS, body.c_str());
    curl_easy_setopt(curl.get(), CURLOPT_POSTFIELDSIZE, static_cast<long>(body.size()));
    curl_easy_setopt(curl.get(), CURLOPT_WRITEFUNCTION, receive);
    curl_easy_setopt(curl.get(), CURLOPT_WRITEDATA, &output);
    curl_easy_setopt(curl.get(), CURLOPT_CONNECTTIMEOUT, 10L);
    curl_easy_setopt(curl.get(), CURLOPT_TIMEOUT, 25L);
    curl_easy_setopt(curl.get(), CURLOPT_NOSIGNAL, 1L);
    if (curl_easy_perform(curl.get()) != CURLE_OK) throw ApiError(502, "Firebase could not be reached. Try again.");
    long status = 0; curl_easy_getinfo(curl.get(), CURLINFO_RESPONSE_CODE, &status);
    return {static_cast<int>(status), output};
}
#endif
inline Json parseResponse(const HttpResult& response) {
    try { return Json::parse(response.body); }
    catch (...) { throw ApiError(502, "Firebase returned an invalid response."); }
}
using Transport = std::function<HttpResult(const std::string&, const std::string&, const std::string&, const std::string&, const std::string&)>;
// Firebase's accounts:lookup validates the ID token remotely. Never trust a decoded UID.
struct Identity { std::string uid, email, name, token; };
inline Identity authenticate(const std::string& header, const Transport& transport = https) {
    if (header.rfind("Bearer ", 0) != 0) throw ApiError(401, "Please sign in.");
    auto token = header.substr(7);
    if (token.empty() || token.size() > 16384 || token.find_first_of("\r\n ") != std::string::npos) throw ApiError(401, "Invalid login token.");
    auto key = env("FIREBASE_API_KEY", env("VITE_FIREBASE_API_KEY").c_str());
    if (key.empty()) throw ApiError(503, "Set the Firebase API key for the backend and restart it.");
    auto response = transport("identitytoolkit.googleapis.com", "POST", "/v1/accounts:lookup?key=" + encode(key), Json{{"idToken", token}}.dump(), "");
    if (response.status == 400 || response.status == 401) throw ApiError(401, "Your login could not be verified. Sign in again.");
    if (response.status != 200) throw ApiError(502, "Firebase authentication is unavailable. Check the backend Firebase configuration.");
    auto data = parseResponse(response);
    if (!data.contains("users") || data["users"].size() != 1) throw ApiError(401, "Invalid login.");
    auto user = data["users"][0];
    if (user.value("disabled", false)) throw ApiError(401, "This account is disabled.");
    return {user.at("localId"), user.value("email", ""), user.value("displayName", ""), token};
}
inline Json toValue(const Json& value) {
    if (value.is_null()) return {{"nullValue", nullptr}};
    if (value.is_boolean()) return {{"booleanValue", value}};
    if (value.is_number_integer()) return {{"integerValue", std::to_string(value.get<int64_t>())}};
    if (value.is_string()) return {{"stringValue", value}};
    if (value.is_array()) { Json items = Json::array(); for (const auto& item : value) items.push_back(toValue(item)); return {{"arrayValue", {{"values", items}}}}; }
    if (value.is_object()) { Json fields = Json::object(); for (auto it=value.begin();it!=value.end();++it) fields[it.key()]=toValue(it.value()); return {{"mapValue", {{"fields", fields}}}}; }
    throw ApiError(400, "Only integer numbers are supported.");
}
inline Json fromValue(const Json& value) {
    if (value.contains("nullValue")) return nullptr;
    if (value.contains("booleanValue")) return value["booleanValue"];
    if (value.contains("integerValue")) return std::stoll(value["integerValue"].get<std::string>());
    if (value.contains("stringValue")) return value["stringValue"];
    if (value.contains("arrayValue")) { Json items=Json::array(); for(auto& v:value["arrayValue"].value("values",Json::array())) items.push_back(fromValue(v)); return items; }
    if (value.contains("mapValue")) { Json result=Json::object(); auto fields=value["mapValue"].value("fields",Json::object()); for(auto it=fields.begin();it!=fields.end();++it) result[it.key()]=fromValue(it.value()); return result; }
    throw ApiError(502,"Unsupported stored field type.");
}
inline Json document(const Json& data) {
    Json out=Json::object(); auto fields=data.value("fields",Json::object());
    for(auto it=fields.begin();it!=fields.end();++it) out[it.key()]=fromValue(it.value());
    return out;
}
class Firestore {
    Identity identity;
    Transport transport;
    std::string base;
    Json request(const std::string& method, const std::string& path, const Json& body = nullptr, bool missing = false) const {
        auto response=transport("firestore.googleapis.com",method,base+path,body.is_null()?"":body.dump(),identity.token);
        if(response.status==404 && missing) return nullptr;
        if(response.status==401) throw ApiError(401,"Your session expired. Sign in again.");
        if(response.status==403) throw ApiError(403,"Firestore denied access. Publish firestore.rules for this Firebase project.");
        if(response.status==404) throw ApiError(404,"Record or Firestore database not found.");
        if(response.status==409 || response.status==412) throw ApiError(409,"This record changed or no longer exists. Reload and try again.");
        if(response.status<200 || response.status>=300) throw ApiError(502,"Firestore request failed. Check that the default Firestore database exists.");
        return response.body.empty()?Json::object():parseResponse(response);
    }
public:
    explicit Firestore(Identity user, Transport client = https):identity(std::move(user)),transport(std::move(client)) {
        auto project=env("FIREBASE_PROJECT_ID",env("VITE_FIREBASE_PROJECT_ID").c_str());
        if(project.empty()) throw ApiError(503,"Set the Firebase project ID for the backend.");
        base="/v1/projects/"+encode(project)+"/databases/(default)/documents/users/"+encode(identity.uid);
    }
    Json get(const std::string& path) const { auto data=request("GET",path,nullptr,true); return data.is_null()?data:document(data); }
    Json list(const std::string& collection) const {
        Json out=Json::array(); std::string page;
        do {
            auto data=request("GET","/"+collection+"?pageSize=300"+(page.empty()?"":"&pageToken="+encode(page)));
            for(auto& d:data.value("documents",Json::array())) {
                auto value=document(d); auto name=d.at("name").get<std::string>(); value["id"]=name.substr(name.rfind('/')+1); out.push_back(value);
            }
            if(out.size()>10000) throw ApiError(413,"Too many records for this version of QBudget.");
            page=data.value("nextPageToken","");
        } while(!page.empty());
        return out;
    }
    void put(const std::string& path,const Json& value,bool existing=false) const {
        std::string query=existing?"?currentDocument.exists=true":"?";
        for(auto it=value.begin();it!=value.end();++it) query+="&updateMask.fieldPaths="+encode(it.key());
        request("PATCH",path+query,{{"fields",toValue(value)["mapValue"]["fields"]}});
    }
    void create(const std::string& collection,const Json& value) const {
        request("POST","/"+collection,{{"fields",toValue(value)["mapValue"]["fields"]}});
    }
    void remove(const std::string& path) const { request("DELETE",path); }
};
} // namespace qbudget
