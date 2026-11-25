// Opt-in real provider check with synthetic data only. Never reads Firebase or creates cloud records.
#include "../src/gemini_forecast_service.hpp"
#include <iostream>
using namespace qbudget;
int main() {
    GeminiForecastService service;
    if (service.status()["enabled"] != true) {
        std::cerr << "Set GEMINI_API_KEY in this process before running the live smoke test.\n";
        return 2;
    }
    Date now = Date::current();
    Ledger ledger({{"", now.addDays(-5), "Synthetic income", "income", TransactionType::Income, 120000, "", ""},
                   {"", now.addDays(-3), "Synthetic expense", "groceries", TransactionType::Expense, -15000, "", ""}}, now);
    auto input = aiForecastInput(ledger, {}, {}, {{"groceries", "Groceries", false, false}}, {}, {}, now);
    auto result = service.analyze("synthetic-smoke-test", input);
    // Print no budget data, prompt, credential or raw provider response.
    std::cout << Json{{"source", result["source"]}, {"reason", result["reason"]},
        {"model", result["model"]}, {"months", result["months"].size()}}.dump() << '\n';
    return result["source"] == "gemini" ? 0 : 1;
}
