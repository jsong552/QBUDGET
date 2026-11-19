// Derive the user's calendar date from server time and the browser's current UTC offset.
#pragma once
#include "date.hpp"
#include "httplib.h"
namespace qbudget {
inline Date requestDate(const httplib::Request &request, std::time_t instant = std::time(nullptr)) {
    int offset = 0;
    if (request.has_header("X-Timezone-Offset")) {
        require(request.get_header_value_count("X-Timezone-Offset") == 1,
                "Send a single X-Timezone-Offset header.");
        const auto value = request.get_header_value("X-Timezone-Offset");
        const auto digits = !value.empty() && (value[0] == '-' || value[0] == '+') ? 1u : 0u;
        require(value.size() > digits && value.size() <= 4 &&
                    value.find_first_not_of("0123456789", digits) == std::string::npos,
                "X-Timezone-Offset must be an integer number of minutes.");
        offset = std::stoi(value);
        require(offset >= -840 && offset <= 840,
                "X-Timezone-Offset must be between -840 and 840 minutes.");
    }
    // JavaScript getTimezoneOffset() is positive west of UTC: Toronto winter is +300.
    // Shift only the instant used to find 'today'; date-only arithmetic stays in UTC.
    return Date(dateString(utcParts(instant - static_cast<std::time_t>(offset) * 60)));
}
} // namespace qbudget
