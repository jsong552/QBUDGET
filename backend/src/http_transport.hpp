// HTTPS transport: WinHTTP on Windows, libcurl elsewhere; injectable for offline tests.
#pragma once
#include "errors.hpp"
#include "json.hpp"
#include <cstdlib>
#include <memory>
#include <functional>
#ifdef _WIN32
#ifndef WIN32_LEAN_AND_MEAN
#define WIN32_LEAN_AND_MEAN
#endif
#include <windows.h>
#include <winhttp.h>
#else
#include <curl/curl.h>
#endif
namespace qbudget {
using Json = nlohmann::json;
inline std::string env(const char *name, const char *fallback = "") {
    auto value = std::getenv(name);
    return value ? value : fallback;
}
inline std::string encode(const std::string &text) {
    const char *hex = "0123456789ABCDEF";
    std::string out;
    for (unsigned char c : text) {
        if ((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') || c == '-' ||
            c == '_' || c == '~')
            out += c;
        else {
            out += '%';
            out += hex[c >> 4];
            out += hex[c & 15];
        }
    }
    return out;
}
struct HttpResult {
    int status;
    std::string body;
};
#ifdef _WIN32
struct InternetHandle {
    HINTERNET value;
    explicit InternetHandle(HINTERNET v) : value(v) {
        if (!v)
            throw ApiError(502, "Could not connect to Firebase.");
    }
    ~InternetHandle() {
        WinHttpCloseHandle(value);
    }
};
inline std::wstring wide(const std::string &value) {
    return std::wstring(value.begin(), value.end());
}
inline HttpResult https(const std::string &host, const std::string &method, const std::string &path,
                        const std::string &body, const std::string &token = "") {
    InternetHandle session(WinHttpOpen(L"QBudget/1.0", WINHTTP_ACCESS_TYPE_DEFAULT_PROXY,
                                       WINHTTP_NO_PROXY_NAME, WINHTTP_NO_PROXY_BYPASS, 0));
    WinHttpSetTimeouts(session.value, 10000, 10000, 10000, 20000);
    InternetHandle connection(
        WinHttpConnect(session.value, wide(host).c_str(), INTERNET_DEFAULT_HTTPS_PORT, 0));
    InternetHandle request(WinHttpOpenRequest(connection.value, wide(method).c_str(), wide(path).c_str(),
                                              nullptr, WINHTTP_NO_REFERER, WINHTTP_DEFAULT_ACCEPT_TYPES,
                                              WINHTTP_FLAG_SECURE));
    std::wstring headers = L"Content-Type: application/json\r\n";
    if (!token.empty())
        headers += L"Authorization: Bearer " + wide(token) + L"\r\n";
    if (!WinHttpSendRequest(request.value, headers.c_str(), static_cast<DWORD>(headers.size()),
                            body.empty() ? WINHTTP_NO_REQUEST_DATA : const_cast<char *>(body.data()),
                            static_cast<DWORD>(body.size()), static_cast<DWORD>(body.size()), 0) ||
        !WinHttpReceiveResponse(request.value, nullptr))
        throw ApiError(502, "Firebase could not be reached. Try again.");
    DWORD status = 0, size = sizeof(status);
    WinHttpQueryHeaders(request.value, WINHTTP_QUERY_STATUS_CODE | WINHTTP_QUERY_FLAG_NUMBER,
                        WINHTTP_HEADER_NAME_BY_INDEX, &status, &size, WINHTTP_NO_HEADER_INDEX);
    std::string output;
    char buffer[8192];
    DWORD count;
    while (true) {
        if (!WinHttpReadData(request.value, buffer, sizeof(buffer), &count))
            throw ApiError(502, "Firebase response was interrupted.");
        if (!count)
            break;
        output.append(buffer, count);
        if (output.size() > 16 * 1024 * 1024)
            throw ApiError(502, "Firebase response is too large.");
    }
    return {static_cast<int>(status), output};
}
#else
inline size_t receive(char *data, size_t size, size_t count, void *target) {
    auto &text = *static_cast<std::string *>(target);
    auto length = size * count;
    if (text.size() + length > 16 * 1024 * 1024)
        return 0;
    text.append(data, length);
    return length;
}
inline HttpResult https(const std::string &host, const std::string &method, const std::string &path,
                        const std::string &body, const std::string &token = "") {
    static const int initialized = curl_global_init(CURL_GLOBAL_DEFAULT);
    if (initialized != CURLE_OK)
        throw ApiError(502, "HTTPS initialization failed.");
    std::unique_ptr<CURL, decltype(&curl_easy_cleanup)> curl(curl_easy_init(), curl_easy_cleanup);
    if (!curl)
        throw ApiError(502, "HTTPS initialization failed.");
    curl_slist *raw = curl_slist_append(nullptr, "Content-Type: application/json");
    if (!token.empty())
        raw = curl_slist_append(raw, ("Authorization: Bearer " + token).c_str());
    std::unique_ptr<curl_slist, decltype(&curl_slist_free_all)> headers(raw, curl_slist_free_all);
    const auto url = "https://" + host + path;
    std::string output;
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
    if (curl_easy_perform(curl.get()) != CURLE_OK)
        throw ApiError(502, "Firebase could not be reached. Try again.");
    long status = 0;
    curl_easy_getinfo(curl.get(), CURLINFO_RESPONSE_CODE, &status);
    return {static_cast<int>(status), output};
}
#endif
inline Json parseResponse(const HttpResult &response) {
    try {
        return Json::parse(response.body);
    } catch (...) {
        throw ApiError(502, "Firebase returned an invalid response.");
    }
}
using Transport = std::function<HttpResult(const std::string &, const std::string &, const std::string &,
                                           const std::string &, const std::string &)>;

} // namespace qbudget
