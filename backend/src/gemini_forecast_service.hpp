// Optional Gemini spending projection. No writes, user identifiers or free-text records leave this layer.
#pragma once
#include "forecast_service.hpp"
#include "budget_service.hpp"
#include "http_transport.hpp"
#include <chrono>
#include <mutex>

namespace qbudget {
struct GeminiConfig {
    std::string apiKey, model;
    static GeminiConfig environment() {
        return {env("GEMINI_API_KEY"), env("GEMINI_MODEL", "gemini-3.5-flash-lite")};
    }
    bool valid() const {
        return !apiKey.empty() && apiKey.find_first_of("\r\n") == std::string::npos &&
            model.rfind("gemini-", 0) == 0 && model.size() <= 100 &&
            model.find_first_not_of("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._") == std::string::npos;
    }
};

struct AiForecastInput {
    Date now;
    MoneyCents balance;
    std::vector<ForecastMonth> baseline, minimum;
    Json context;
    bool hasData;
};

inline AiForecastInput aiForecastInput(const Ledger &ledger, const std::vector<CalendarEvent> &events,
    const std::vector<RecurringEntry> &recurring, const std::vector<Category> &categories,
    const std::vector<BudgetSummary> &budgets, const std::vector<GoalProgress> &goals, Date now) {
    ForecastService forecast;
    auto baseline = forecast.forecast(ledger, events, recurring, now);
    // Keep occurrence IDs so already-recorded payments stay excluded from the known-obligation floor.
    auto emptyAmounts = ledger.transactions();
    for (auto &row : emptyAmounts) row.amountCents = 0;
    auto minimum = forecast.forecast(Ledger(emptyAmounts, now), events, recurring, now);
    Json history = Json::array(), categoryTotals = Json::array(), limits = Json::array(), targets = Json::array();
    int recordCount = 0;
    DateRange recent{now.addDays(-89), now.addDays(1)};
    for (const auto &row : ledger.transactions())
        if (!row.voided && recent.contains(row.date)) recordCount++;
    for (int index = -2; index <= 0; index++) {
        auto start = now.startOfMonth(index);
        auto end = index == 0 ? now.addDays(1) : start.startOfMonth(1);
        auto totals = ledger.totals(DateRange{start, end});
        history.push_back({{"start", start}, {"endExclusive", end}, {"observedDays", start.daysUntil(end)},
            {"incomeCents", totals.incomeCents}, {"expensesCents", totals.expensesCents}});
    }
    // Built-in category names are fixed code. Custom names, goal titles, descriptions and notes are omitted.
    auto label = [&](const Category &category) {
        static const std::vector<std::string> builtins{"rent", "tuition", "groceries", "dining", "transport", "other", "income"};
        return !category.custom && std::find(builtins.begin(), builtins.end(), category.id) != builtins.end()
            ? category.id : std::string("custom category");
    };
    std::map<std::string, MoneyCents> grouped;
    for (const auto &item : ledger.breakdown(recent, categories))
        grouped[label(item.category)] = addMoney(grouped[label(item.category)], item.amountCents);
    for (const auto &[name, amount] : grouped) categoryTotals.push_back({{"category", name}, {"expensesCents", amount}});
    for (const auto &item : budgets) {
        if (limits.size() == 30) break;
        limits.push_back({{"category", label(item.category)}, {"period", item.period},
            {"budgetedCents", item.budgetedCents}, {"spentCents", item.spentCents},
            {"start", item.range.start}, {"endExclusive", item.range.end}});
    }
    for (const auto &item : goals) {
        if (targets.size() == 20) break;
        targets.push_back({{"kind", item.goal.kind}, {"targetCents", item.goal.targetCents}, {"currentCents", item.currentCents}});
    }
    bool hasData = recordCount > 0;
    for (const auto &month : minimum) hasData = hasData || month.incomeCents > 0 || month.expensesCents > 0;
    Json context = {{"asOf", now}, {"currency", "CAD"}, {"recentRecordCount", recordCount},
        {"currentBalanceCents", ledger.totals().balance()}, {"history", history},
        {"last90DaysCategorySpending", categoryTotals}, {"budgets", limits}, {"goals", targets},
        {"baseline", baseline}, {"knownMinimum", minimum},
        {"firstMonthStarts", now.addDays(1)}, {"budgetsIncluded", limits.size()}, {"goalsIncluded", targets.size()}};
    return {now, ledger.totals().balance(), baseline, minimum, context, hasData};
}

class GeminiForecastService {
    struct Entry {
        bool pending = false;
        std::chrono::steady_clock::time_point attempted{}, completed{};
        std::string snapshot;
        Json result;
    };
    GeminiConfig config;
    Transport transport;
    std::mutex mutex;
    std::map<std::string, Entry> accounts;
    int inFlight = 0;

    static void valid(bool ok) { if (!ok) throw ApiError(502, "Invalid Gemini response."); }
    static std::string text(const Json &object, const char *field, size_t maximum) {
        valid(object.contains(field) && object[field].is_string());
        auto value = object[field].get<std::string>();
        valid(!value.empty() && value.size() <= maximum && value.find_first_not_of(" \r\n\t") != std::string::npos);
        return value;
    }
    static Json strings(const Json &object, const char *field) {
        valid(object.contains(field) && object[field].is_array() && object[field].size() <= 4);
        Json result = Json::array();
        for (const auto &value : object[field]) result.push_back(text(Json{{"value", value}}, "value", 600));
        return result;
    }
    static Json shape() {
        Json list = {{"type", "array"}, {"maxItems", 4}, {"items", {{"type", "string"}, {"maxLength", 600}}}};
        return {{"type", "object"}, {"additionalProperties", false},
            {"required", {"summary", "months", "risks", "suggestions", "assumptions"}},
            {"properties", {
                {"summary", {{"type", "string"}, {"maxLength", 1000}}},
                {"months", {{"type", "array"}, {"minItems", 4}, {"maxItems", 4},
                    {"items", {{"type", "object"}, {"additionalProperties", false}, {"required", {"month", "expensesCents"}},
                        {"properties", {{"month", {{"type", "string"}}},
                            {"expensesCents", {{"type", "integer"}, {"minimum", 0}, {"maximum", maxRecordCents}}}}}}}}},
                {"risks", list}, {"suggestions", list}, {"assumptions", list}}}};
    }
    Json response(const AiForecastInput &input, const std::vector<ForecastMonth> &months,
        const std::string &source, const std::string &reason, const std::string &message) const {
        ForecastService forecast;
        Json series = Json::object();
        for (const auto *mode : {"weekly", "monthly", "semester"}) series[mode] = forecast.series(months, input.now, mode);
        return {{"source", source}, {"reason", reason}, {"message", message}, {"asOf", input.now},
            {"model", source == "gemini" ? Json(config.model) : Json(nullptr)}, {"cached", false},
            {"generatedAt", nullptr}, {"summary", ""}, {"risks", Json::array()},
            {"suggestions", Json::array()}, {"assumptions", Json::array()},
            {"months", months}, {"projectedExpenses", series}};
    }
    Json fallback(const AiForecastInput &input, const std::string &reason, const std::string &message) const {
        return response(input, input.baseline, "baseline", reason, message);
    }
    Json generate(const AiForecastInput &input) const {
        const std::string instruction =
            "You help a university student understand their CAD budget. Use only the numeric snapshot provided. "
            "Return four spending projections in the exact baseline month order. Money is integer CAD cents. "
            "The first month covers only firstMonthStarts through month end; other months are full months. "
            "Income stays at the supplied baseline. Never invent income or change goals, budgets or records. "
            "Each expensesCents must be at least the corresponding knownMinimum.expensesCents. "
            "If no days remain in the first month, use its baseline expenses. "
            "Use the baseline when evidence is sparse. Explain changes and incomplete history in assumptions. "
            "Give a brief summary, up to four budget risks and up to four practical spending/saving suggestions. "
            "Do not recommend investments, loans or financial products. These are estimates, not guarantees. "
            "Output plain text within JSON strings, no HTML or Markdown. No tools or external information.";
        Json request = {{"systemInstruction", {{"parts", {{{"text", instruction}}}}}},
            {"contents", {{{"role", "user"}, {"parts", {{{"text", input.context.dump()}}}}}}},
            {"generationConfig", {{"candidateCount", 1}, {"maxOutputTokens", 4096},
                {"responseMimeType", "application/json"}, {"responseJsonSchema", shape()}}}};
        HttpResult result;
        try {
            result = transport("generativelanguage.googleapis.com", "POST",
                "/v1beta/models/" + config.model + ":generateContent", request.dump(), config.apiKey);
        } catch (...) {
            return fallback(input, "unavailable", "Gemini could not be reached. Your standard forecast is still available.");
        }
        if (result.status == 429)
            return fallback(input, "quota", "Gemini's usage limit was reached. Try again later; your standard forecast is available.");
        if (result.status == 401 || result.status == 403)
            return fallback(input, "access_denied", "Gemini access is unavailable for this server. Your standard forecast is still available.");
        if (result.status == 400 || result.status == 404)
            return fallback(input, "configuration", "Gemini could not process the forecast request. Your standard forecast is still available.");
        if (result.status != 200)
            return fallback(input, "unavailable", "Gemini is unavailable. Your standard forecast is still available.");
        try {
            valid(result.body.size() <= 65536);
            auto envelope = Json::parse(result.body);
            valid(envelope.contains("candidates") && envelope["candidates"].is_array() && envelope["candidates"].size() == 1);
            auto candidate = envelope["candidates"][0];
            valid(candidate.value("finishReason", "") == "STOP");
            std::string output;
            for (const auto &part : candidate.at("content").at("parts"))
                if (!part.value("thought", false) && part.contains("text")) output += part["text"].get<std::string>();
            auto data = Json::parse(output);
            valid(data.is_object() && data.contains("months") && data["months"].is_array() && data["months"].size() == input.baseline.size());
            auto months = input.baseline;
            auto balance = input.balance;
            for (size_t index = 0; index < months.size(); index++) {
                const auto &row = data["months"][index];
                valid(row.at("month") == months[index].month.str() && row.at("expensesCents").is_number_integer());
                valid(row["expensesCents"] >= 0 && row["expensesCents"] <= maxRecordCents);
                auto amount = row["expensesCents"].get<MoneyCents>();
                valid(amount >= input.minimum[index].expensesCents);
                if (index == 0 && input.now.addDays(1) == input.now.startOfMonth(1))
                    valid(amount == input.baseline[index].expensesCents);
                months[index].expensesCents = amount;
                balance = addMoney(addMoney(balance, months[index].incomeCents), -amount);
                months[index].projectedBalanceCents = balance;
            }
            auto answer = response(input, months, "gemini", "", "");
            answer["summary"] = text(data, "summary", 1000);
            answer["risks"] = strings(data, "risks");
            answer["suggestions"] = strings(data, "suggestions");
            answer["assumptions"] = strings(data, "assumptions");
            answer["generatedAt"] = std::time(nullptr);
            return answer;
        } catch (...) {
            return fallback(input, "invalid_response", "Gemini did not return a usable forecast. Your standard forecast is still available.");
        }
    }
  public:
    explicit GeminiForecastService(GeminiConfig settings = GeminiConfig::environment(),
        Transport send = [](const auto &host, const auto &method, const auto &path, const auto &body, const auto &key) {
            return httpsWithHeaders(host, method, path, body, "", {{"x-goog-api-key", key}});
        }) : config(std::move(settings)), transport(std::move(send)) {}
    Json status() const { return {{"enabled", config.valid()}}; }
    Json analyze(const std::string &uid, const AiForecastInput &input) {
        if (!config.valid()) return fallback(input, "not_configured", "AI forecasting has not been configured on this server.");
        if (!input.hasData) return fallback(input, "insufficient_data", "Add income, expenses or scheduled payments to generate an AI forecast.");
        auto snapshot = input.context.dump();
        if (snapshot.size() > 64000) return fallback(input, "too_large", "This budget is too large for AI analysis. Your standard forecast is available.");
        auto now = std::chrono::steady_clock::now();
        {
            std::lock_guard<std::mutex> guard(mutex);
            for (auto it = accounts.begin(); it != accounts.end();) {
                if (!it->second.pending && now - it->second.attempted > std::chrono::minutes(10)) it = accounts.erase(it);
                else ++it;
            }
            if (!accounts.count(uid) && accounts.size() >= 128)
                return fallback(input, "busy", "AI forecasting is busy. Please try again shortly.");
            auto &entry = accounts[uid];
            if (!entry.result.is_null() && entry.snapshot == snapshot && now - entry.completed < std::chrono::minutes(5)) {
                auto cached = entry.result;
                cached["cached"] = true;
                return cached;
            }
            if (entry.pending || inFlight >= 2) return fallback(input, "busy", "AI forecasting is busy. Please try again shortly.");
            if (entry.attempted != std::chrono::steady_clock::time_point{} && now - entry.attempted < std::chrono::seconds(30))
                return fallback(input, "rate_limited", "Please wait 30 seconds between AI requests. Your standard forecast is available.");
            entry.attempted = now;
            entry.pending = true;
            inFlight++;
        }
        Json answer;
        try { answer = generate(input); }
        catch (...) { answer = fallback(input, "unavailable", "AI forecasting is unavailable. Your standard forecast is available."); }
        {
            std::lock_guard<std::mutex> guard(mutex);
            auto &entry = accounts.at(uid);
            entry.pending = false;
            inFlight--;
            if (answer["source"] == "gemini") {
                entry.snapshot = std::move(snapshot);
                entry.result = answer;
                entry.completed = std::chrono::steady_clock::now();
            }
        }
        return answer;
    }
};
inline GeminiForecastService &sharedGeminiForecast() {
    static GeminiForecastService service;
    return service;
}
} // namespace qbudget
